import type { Aviso, City, Reporter } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type { AvisoFilters, CreateAvisoInput } from '../validators/aviso.js'
import type { Viewer } from '../lib/viewer.js'
import { canSeeContact, isOwner } from '../lib/viewer.js'

const MARK_THRESHOLD = 3

type SerializedAviso = Aviso & { city: City; reporter: Reporter }

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function serializeAviso(aviso: SerializedAviso, marks = 0, viewer?: Viewer) {
  const contactVisibility = (aviso.contactVisibility ?? 'public') as 'public' | 'users'
  const contactRestricted = !canSeeContact(
    contactVisibility,
    viewer,
    aviso.reporter.userId,
  )

  return {
    id: aviso.id,
    isOwner: isOwner(viewer, aviso.reporter.userId),
    type: aviso.type,
    urgency: aviso.urgency,
    status: aviso.status,
    title: aviso.title,
    description: aviso.description,
    address: aviso.address ?? null,
    lat: aviso.lat ?? null,
    lng: aviso.lng ?? null,
    city: {
      code: aviso.city.code,
      name: aviso.city.name,
    },
    reporter: {
      name: aviso.reporter.name,
      phone: contactRestricted ? null : (aviso.reporter.phone ?? null),
      whatsapp: contactRestricted ? null : (aviso.reporter.whatsapp ?? null),
      email: contactRestricted ? null : (aviso.reporter.email ?? null),
    },
    contactVisibility,
    contactRestricted,
    marks,
    createdAt: aviso.createdAt,
    updatedAt: aviso.updatedAt,
  }
}

async function buildWhere(filters: AvisoFilters) {
  const where: Record<string, unknown> = {}
  if (filters.status === 'active') {
    where.status = 'open'
  } else if (filters.status) {
    where.status = filters.status
  }
  if (filters.urgency) where.urgency = filters.urgency
  if (filters.city) where.city = { code: filters.city }
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { address: { contains: filters.q, mode: 'insensitive' } },
    ]
  }
  return where
}

export async function listAvisos(filters: AvisoFilters, viewer?: Viewer) {
  const where = await buildWhere(filters)
  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const [avisos, total, markGroups] = await prisma.$transaction([
    prisma.aviso.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { city: true, reporter: true },
    }),
    prisma.aviso.count({ where }),
    prisma.avisoMark.groupBy({
      by: ['avisoId'],
      _count: { _all: true },
    }),
  ])

  const marksById = new Map<string, number>()
  for (const group of markGroups) {
    marksById.set(group.avisoId, group._count._all)
  }

  return {
    avisos: avisos.map((aviso) =>
      serializeAviso(aviso, marksById.get(aviso.id) ?? 0, viewer),
    ),
    total,
    limit,
    offset,
  }
}

export async function getAviso(id: string, viewer?: Viewer) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Aviso no encontrado')

  const [aviso, marks] = await prisma.$transaction([
    prisma.aviso.findUnique({
      where: { id },
      include: { city: true, reporter: true },
    }),
    prisma.avisoMark.count({ where: { avisoId: id } }),
  ])
  if (!aviso) throw new ApiError(404, 'Aviso no encontrado')
  return serializeAviso(aviso, marks, viewer)
}

export async function createAviso(input: CreateAvisoInput, viewer?: Viewer) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  const created = await prisma.$transaction(async (tx) => {
    const reporter = await tx.reporter.create({
      data: {
        name: input.reporter.name,
        phone: input.reporter.phone ?? null,
        whatsapp: input.reporter.whatsapp ?? null,
        email: input.reporter.email || null,
      },
    })

    return tx.aviso.create({
      data: {
        type: 'info',
        urgency: input.urgency,
        status: 'open',
        title: input.title,
        description: input.description,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
        contactVisibility: input.contactVisibility,
      },
      include: { reporter: true, city: true },
    })
  })

  return serializeAviso(created, 0, viewer)
}

export async function markAviso(id: string, markerId?: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Aviso no encontrado')

  const aviso = await prisma.aviso.findUnique({ where: { id } })
  if (!aviso) throw new ApiError(404, 'Aviso no encontrado')

  if (aviso.status === 'open') {
    if (markerId) {
      const existing = await prisma.avisoMark.findFirst({
        where: { avisoId: id, markerId },
      })
      if (existing) return getAviso(id)
    }

    const [, count] = await prisma.$transaction([
      prisma.avisoMark.create({
        data: { avisoId: id, markerId: markerId ?? null },
      }),
      prisma.avisoMark.count({ where: { avisoId: id } }),
    ])

    if (count >= MARK_THRESHOLD) {
      await prisma.aviso.update({
        where: { id },
        data: { status: 'closed' },
      })
    }
    return getAviso(id)
  }

  // cerrado → cualquiera puede reabrirlo diciendo que sigue vigente
  await prisma.$transaction([
    prisma.avisoMark.deleteMany({ where: { avisoId: id } }),
    prisma.aviso.update({ where: { id }, data: { status: 'open' } }),
  ])
  return getAviso(id)
}

export async function setAvisoStatus(id: string, status: 'open' | 'closed') {
  if (!isUuid.test(id)) throw new ApiError(404, 'Aviso no encontrado')

  const aviso = await prisma.aviso.findUnique({ where: { id } })
  if (!aviso) throw new ApiError(404, 'Aviso no encontrado')

  if (status === 'open') {
    await prisma.avisoMark.deleteMany({ where: { avisoId: id } })
  }
  await prisma.aviso.update({ where: { id }, data: { status } })
  return getAviso(id)
}
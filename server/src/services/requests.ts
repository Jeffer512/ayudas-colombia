import type { City, HelpOrg, Reporter, Request, RequestEvent } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import { uploadPhoto } from './uploads.js'
import type {
  CreateRequestInput,
  HelpRequestInput,
  RequestFilters,
  UpdateRequestStatusInput,
} from '../validators/request.js'
import type { Viewer } from '../lib/viewer.js'
import { canSeeContact, isOwner } from '../lib/viewer.js'

type SerializedRequest = Request & {
  city: City
  reporter: Reporter
  events?: RequestEvent[]
  org?: HelpOrg | null
}

const TRANSITIONS: Record<string, string[]> = {
  open: ['resolved', 'duplicate', 'invalid'],
  resolved: ['open', 'duplicate', 'invalid'],
  duplicate: ['open'],
  invalid: ['open'],
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

const STALE_REQUEST_MS = 3 * 24 * 60 * 60 * 1000
const AUTO_CLOSE_NOTE = 'Cerrada automáticamente por inactividad'
const CLOSED_STATES = ['resolved', 'duplicate', 'invalid']

function generateResolveCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function serializeRequest(
  request: SerializedRequest,
  helperCount = 0,
  helperList?: { name: string | null; note: string | null; createdAt: Date }[],
  viewer?: Viewer,
) {
  const ownerId = request.reporter.userId
  const contactVisibility = (request.contactVisibility ?? 'public') as 'public' | 'users'
  const contactRestricted = !canSeeContact(contactVisibility, viewer, ownerId)

  return {
    id: request.id,
    isOwner: isOwner(viewer, ownerId),
    type: request.type,
    transport: request.transport ?? null,
    items: request.items ?? [],
    urgency: request.urgency,
    status: request.status,
    title: request.title,
    description: request.description,
    photo: request.photoUrl ?? null,
    address: request.address ?? null,
    lat: request.lat ?? null,
    lng: request.lng ?? null,
    city: {
      code: request.city.code,
      name: request.city.name,
    },
    reporter: {
      name: request.reporter.name,
      phone: contactRestricted ? null : (request.reporter.phone ?? null),
      whatsapp: contactRestricted ? null : (request.reporter.whatsapp ?? null),
      email: contactRestricted ? null : (request.reporter.email ?? null),
    },
    contactVisibility,
    contactRestricted,
    organization: request.org
      ? { id: request.org.id, name: request.org.name, category: request.org.category }
      : null,
    helpers: helperCount,
    helperList: helperList
      ? helperList.map((helper) => ({
          name: helper.name ?? null,
          note: helper.note ?? null,
          createdAt: helper.createdAt,
        }))
      : undefined,
    resolvedAt: request.resolvedAt,
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    events: request.events
      ? request.events.map((e) => ({
          id: e.id.toString(),
          status: e.status,
          note: e.note ?? null,
          actorName: e.actorName ?? null,
          createdAt: e.createdAt,
        }))
      : undefined,
  }
}

export async function listRequests(filters: RequestFilters, viewer?: Viewer) {
  const where: Record<string, unknown> = {}
  if (filters.type) where.type = filters.type
  if (filters.status === 'active') {
    where.status = 'open'
  } else if (filters.status) {
    where.status = filters.status
  }
  if (filters.urgency) where.urgency = filters.urgency
  if (filters.city) where.city = { code: filters.city }
  if (filters.org) where.helpOrgId = filters.org
  if (filters.q) {
    where.OR = [
      { title: { contains: filters.q, mode: 'insensitive' } },
      { description: { contains: filters.q, mode: 'insensitive' } },
      { address: { contains: filters.q, mode: 'insensitive' } },
    ]
  }

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const [requests, total, helperGroups] = await prisma.$transaction([
    prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { city: true, reporter: true, org: true },
    }),
    prisma.request.count({ where }),
    prisma.requestHelper.groupBy({
      by: ['requestId'],
      _count: { _all: true },
    }),
  ])

  const helpersById = new Map<string, number>()
  for (const group of helperGroups) {
    helpersById.set(group.requestId, group._count._all)
  }

  return {
    requests: requests.map((request) =>
      serializeRequest(request, helpersById.get(request.id) ?? 0, undefined, viewer),
    ),
    total,
    limit,
    offset,
  }
}

export async function getRequest(id: string, viewer?: Viewer) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const [request, helpers, helperList] = await prisma.$transaction([
    prisma.request.findUnique({
      where: { id },
      include: {
        city: true,
        reporter: true,
        org: true,
        events: { orderBy: { createdAt: 'asc' } },
      },
    }),
    prisma.requestHelper.count({ where: { requestId: id } }),
    prisma.requestHelper.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'desc' },
      select: { name: true, note: true, createdAt: true },
    }),
  ])
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')
  return serializeRequest(request, helpers, helperList, viewer)
}

export async function createRequest(input: CreateRequestInput, viewer?: Viewer) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  if (input.transport && input.type !== 'supplies_request') {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a solicitudes de suministros',
    )
  }

  if (input.photo && input.type !== 'missing_person' && input.type !== 'missing_pet') {
    throw new ApiError(
      400,
      'La foto solo aplica a personas y mascotas desaparecidas',
    )
  }

  const photoUrl = input.photo ? await uploadPhoto(input.photo) : null

  const created = await prisma.$transaction(async (tx) => {
    const reporter = await tx.reporter.create({
      data: {
        userId: viewer?.sub ?? null,
        name: input.reporter.name,
        phone: input.reporter.phone ?? null,
        whatsapp: input.reporter.whatsapp ?? null,
        email: input.reporter.email || null,
      },
    })

    return tx.request.create({
      data: {
        type: input.type,
        transport: input.transport ?? null,
        items: input.items ?? [],
        urgency: input.urgency,
        status: 'open',
        title: input.title,
        description: input.description,
        photoUrl,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
        contactVisibility: input.contactVisibility,
        resolveCode: generateResolveCode(),
        events: {
          create: [
            {
              status: 'open',
              note: 'Solicitud creada',
              actorName: input.reporter.name,
            },
          ],
        },
      },
      include: { reporter: true, city: true, events: true },
    })
  })

  return { ...serializeRequest(created, 0, undefined, viewer), resolveCode: created.resolveCode }
}

export async function helpRequest(
  id: string,
  input: HelpRequestInput,
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const request = await prisma.request.findUnique({
    where: { id },
    include: { reporter: true },
  })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')

  if (isOwner(viewer, request.reporter.userId)) {
    throw new ApiError(403, 'No puedes ayudar en tu propio pedido')
  }

  if (request.status !== 'open') {
    throw new ApiError(400, 'Este pedido ya se cerró')
  }

  if (input.markerId) {
    const existing = await prisma.requestHelper.findFirst({
      where: { requestId: id, markerId: input.markerId },
    })
    if (existing) return getRequest(id)
  }

  await prisma.requestHelper.create({
    data: {
      requestId: id,
      markerId: input.markerId ?? null,
      name: input.name ?? null,
      note: input.note ?? null,
    },
  })
  return getRequest(id)
}

export async function updateRequestStatus(
  id: string,
  input: UpdateRequestStatusInput,
  isAdmin = false,
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const request = await prisma.request.findUnique({
    where: { id },
    include: { reporter: true },
  })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')

  const isOwnerFlag = isOwner(viewer, request.reporter.userId)

  const from = request.status
  if (from === input.status) {
    return getRequest(id, viewer)
  }

  const allowed = TRANSITIONS[from] ?? []
  if (!allowed.includes(input.status)) {
    throw new ApiError(
      400,
      `No se puede cambiar el estado de '${from}' a '${input.status}'`,
    )
  }

  let resolvedAt = request.resolvedAt
  if (input.status === 'resolved') {
    const code = (input.resolveCode ?? '').trim()
    if (!isAdmin && !isOwnerFlag && (!request.resolveCode || code !== request.resolveCode)) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
    resolvedAt = request.resolvedAt ?? new Date()
  } else if (input.status === 'open') {
    if (
      !isAdmin &&
      !isOwnerFlag &&
      CLOSED_STATES.includes(from) &&
      (!request.resolveCode || (input.resolveCode ?? '').trim() !== request.resolveCode)
    ) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
    resolvedAt = null
  }

  await prisma.$transaction([
    prisma.request.update({
      where: { id },
      data: { status: input.status, resolvedAt },
    }),
    prisma.requestEvent.create({
      data: {
        requestId: id,
        status: input.status,
        note: input.note ?? null,
        actorName: input.actorName ?? null,
      },
    }),
  ])

  return getRequest(id, viewer)
}

export async function closeStaleRequests() {
  const stale = await prisma.request.findMany({
    where: {
      status: 'open',
      updatedAt: { lt: new Date(Date.now() - STALE_REQUEST_MS) },
    },
    select: { id: true },
  })

  for (const { id } of stale) {
    await prisma.$transaction([
      prisma.request.update({
        where: { id },
        data: { status: 'resolved', resolvedAt: new Date() },
      }),
      prisma.requestEvent.create({
        data: {
          requestId: id,
          status: 'resolved',
          note: AUTO_CLOSE_NOTE,
          actorName: 'Sistema',
        },
      }),
    ])
    console.log(`[auto-close] request ${id}`)
  }

  return stale.length
}
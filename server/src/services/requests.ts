import type { City, HelpOrg, Reporter, Request, RequestEvent } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import { uploadPhoto } from './uploads.js'
import type {
  CreateRequestInput,
  HelpRequestInput,
  RequestFilters,
  UpdateRequestInput,
  UpdateRequestStatusInput,
} from '../validators/request.js'
import type { Viewer } from '../lib/viewer.js'
import { canSeeContact, isOwner } from '../lib/viewer.js'
import { generateResolveCode, hashResolveCode, verifyResolveCode } from '../lib/verification.js'

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

const CLOSED_STATES = ['resolved', 'duplicate', 'invalid']

const URGENCY_RANK: Record<string, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
}

function byUrgencyThenNewest(a: Request, b: Request): number {
  const rankA = URGENCY_RANK[a.urgency] ?? 4
  const rankB = URGENCY_RANK[b.urgency] ?? 4
  if (rankA !== rankB) return rankA - rankB
  return b.createdAt.getTime() - a.createdAt.getTime()
}

export function serializeRequest(
  request: SerializedRequest,
  helperCount = 0,
  helperList?: {
    name: string | null
    note: string | null
    transport: string | null
    status: string
    phone: string | null
    whatsapp: string | null
    createdAt: Date
  }[],
  viewer?: Viewer,
  linkedOfferPresent?: boolean,
) {
  const ownerId = request.reporter.userId
  const owner = isOwner(viewer, ownerId)
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
          transport: helper.transport ?? null,
          status: helper.status,
          ...(owner
            ? { phone: helper.phone ?? null, whatsapp: helper.whatsapp ?? null }
            : {}),
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
    ...(linkedOfferPresent !== undefined ? { linkedOfferPresent } : {}),
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

  const [allRequests, total, helperGroups] = await prisma.$transaction([
    prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: { city: true, reporter: true, org: true },
    }),
    prisma.request.count({ where }),
    prisma.requestHelper.groupBy({
      by: ['requestId'],
      _count: { _all: true },
    }),
  ])

  const sorted = [...allRequests].sort(byUrgencyThenNewest)
  const requests = sorted.slice(offset, offset + limit)

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

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      city: true,
      reporter: true,
      org: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')

  const [helpers, helperList] = await Promise.all([
    prisma.requestHelper.count({ where: { requestId: id } }),
    prisma.requestHelper.findMany({
      where: { requestId: id },
      orderBy: { createdAt: 'desc' },
      select: {
        name: true,
        note: true,
        transport: true,
        status: true,
        phone: true,
        whatsapp: true,
        createdAt: true,
      },
    }),
  ])

  const linkedOffers =
    viewer && viewer.sub
      ? await prisma.offer.count({
          where: {
            requestId: id,
            reporter: { userId: viewer.sub },
            status: { in: ['open', 'in_transit'] },
          },
        })
      : 0

  return serializeRequest(request, helpers, helperList, viewer, linkedOffers > 0)
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

  const resolveCode = generateResolveCode()

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
        resolveCode: await hashResolveCode(resolveCode),
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

  return { ...serializeRequest(created, 0, undefined, viewer), resolveCode }
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

  const isSupplies = request.type === 'supplies_request'
  const transport = input.transport ?? null
  const phone = input.phone?.trim() || null
  const whatsapp = input.whatsapp?.trim() || null
  const name = input.name?.trim() || null

  if (isSupplies) {
    if (!transport) {
      throw new ApiError(400, 'Indica si puedes transportar los suministros')
    }
    const requesterPicksUp = request.transport === 'can_transport'
    if (requesterPicksUp && !phone && !whatsapp) {
      throw new ApiError(
        400,
        'Deja tu teléfono o WhatsApp para coordinar la recogida',
      )
    }
    if (transport === 'needs_transport' && !phone && !whatsapp) {
      throw new ApiError(
        400,
        'Deja tu teléfono o WhatsApp para que quien transporte pueda contactarte',
      )
    }
  } else if (transport) {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a solicitudes de suministros',
    )
  }

  const needsLinkedOffer =
    isSupplies && transport === 'needs_transport' && request.transport !== 'can_transport'
  if (needsLinkedOffer && !name) {
    throw new ApiError(400, 'Escribe tu nombre para coordinar la entrega')
  }

  await prisma.$transaction(async (tx) => {
    const helper = await tx.requestHelper.create({
      data: {
        requestId: id,
        markerId: input.markerId ?? null,
        name,
        note: input.note?.trim() || null,
        transport,
        phone,
        whatsapp,
      },
    })

    if (needsLinkedOffer) {
      const reporter = await tx.reporter.create({
        data: {
          userId: viewer?.sub ?? null,
          name: name ?? 'Voluntario anónimo',
          phone,
          whatsapp,
        },
      })
      const offer = await tx.offer.create({
        data: {
          type: 'supplies_offered',
          transport: 'needs_transport',
          items: request.items ?? [],
          status: 'open',
          title: `Suministros para el pedido: ${request.title}`,
          description: input.note?.trim() || null,
          address: request.address,
          lat: request.lat,
          lng: request.lng,
          cityId: request.cityId,
          reporterId: reporter.id,
          contactVisibility: 'users',
          resolveCode: await hashResolveCode(generateResolveCode()),
          requestId: id,
        },
      })
      await tx.requestHelper.update({
        where: { id: helper.id },
        data: { offerId: offer.id },
      })
    }

    await tx.request.update({
      where: { id },
      data: { updatedAt: new Date() },
    })
  })

  return getRequest(id, viewer)
}

export async function updateRequest(
  id: string,
  input: UpdateRequestInput,
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      reporter: true,
      _count: { select: { helpers: true } },
    },
  })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')

  if (request.status !== 'open') {
    throw new ApiError(400, 'Solo se puede editar un pedido abierto')
  }

  if (request._count.helpers > 0) {
    throw new ApiError(
      409,
      'Ya hay personas ayudando, el pedido no se puede editar',
    )
  }

  if (!isOwner(viewer, request.reporter.userId)) {
    const code = (input.resolveCode ?? '').trim()
    if (!await verifyResolveCode(code, request.resolveCode)) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
  }

  if (input.transport && request.type !== 'supplies_request') {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a solicitudes de suministros',
    )
  }

  if (
    input.photo !== undefined &&
    request.type !== 'missing_person' &&
    request.type !== 'missing_pet'
  ) {
    throw new ApiError(
      400,
      'La foto solo aplica a personas y mascotas desaparecidas',
    )
  }

  let photoUrl: string | null | undefined
  if (input.photo === null) {
    photoUrl = null
  } else if (input.photo) {
    photoUrl = await uploadPhoto(input.photo)
  }

const updated = await prisma.$transaction([
    prisma.request.update({
      where: { id },
      data: {
        ...(input.title !== undefined ? { title: input.title } : {}),
        ...(input.description !== undefined
          ? { description: input.description }
          : {}),
        ...(photoUrl !== undefined ? { photoUrl } : {}),
        ...(input.address !== undefined ? { address: input.address } : {}),
        ...(input.lat !== undefined ? { lat: input.lat } : {}),
        ...(input.lng !== undefined ? { lng: input.lng } : {}),
        ...(input.urgency !== undefined ? { urgency: input.urgency } : {}),
        ...(input.transport !== undefined ? { transport: input.transport } : {}),
        ...(input.items !== undefined ? { items: input.items } : {}),
        ...(input.contactVisibility !== undefined
          ? { contactVisibility: input.contactVisibility }
          : {}),
        ...(input.reporter
          ? {
              reporter: {
                update: {
                  name: input.reporter.name,
                  phone: input.reporter.phone ?? null,
                  whatsapp: input.reporter.whatsapp ?? null,
                  email: input.reporter.email || null,
                },
              },
            }
          : {}),
      },
    }),
    prisma.requestEvent.create({
      data: {
        requestId: id,
        status: 'open',
        note: 'Solicitud actualizada',
        actorName: input.reporter?.name ?? request.reporter.name,
      },
    }),
  ])

  return getRequest(id, viewer)
}

export async function verifyRequestCode(
  id: string,
  input: { resolveCode: string },
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const request = await prisma.request.findUnique({
    where: { id },
    include: { reporter: true },
  })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')

  const code = (input.resolveCode ?? '').trim()
  if (!isOwner(viewer, request.reporter.userId)) {
    if (!await verifyResolveCode(code, request.resolveCode)) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
  }

  return { ok: true }
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
    if (!isAdmin && !isOwnerFlag && !await verifyResolveCode(code, request.resolveCode)) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
    resolvedAt = request.resolvedAt ?? new Date()
  } else if (input.status === 'open') {
    if (
      !isAdmin &&
      !isOwnerFlag &&
      CLOSED_STATES.includes(from) &&
      !await verifyResolveCode((input.resolveCode ?? '').trim(), request.resolveCode)
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
    ...(CLOSED_STATES.includes(input.status)
      ? [
          prisma.offer.updateMany({
            where: { requestId: id, status: 'open' },
            data: { status: 'unavailable', resolvedAt: new Date() },
          }),
        ]
      : []),
  ])

  return getRequest(id, viewer)
}
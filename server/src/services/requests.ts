import type { City, Reporter, Request, RequestEvent } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  CreateRequestInput,
  RequestFilters,
  UpdateRequestStatusInput,
} from '../validators/request.js'

type SerializedRequest = Request & {
  city: City
  reporter: Reporter
  events?: RequestEvent[]
}

const TRANSITIONS: Record<string, string[]> = {
  open: ['in_progress', 'resolved', 'duplicate', 'invalid'],
  in_progress: ['open', 'resolved', 'duplicate', 'invalid'],
  resolved: ['open', 'duplicate', 'invalid'],
  duplicate: ['open'],
  invalid: ['open'],
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateResolveCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function serializeRequest(request: SerializedRequest) {
  return {
    id: request.id,
    type: request.type,
    transport: request.transport ?? null,
    urgency: request.urgency,
    status: request.status,
    title: request.title,
    description: request.description,
    address: request.address ?? null,
    lat: request.lat ?? null,
    lng: request.lng ?? null,
    city: {
      code: request.city.code,
      name: request.city.name,
    },
    reporter: {
      contactType: request.reporter.contactType,
      name: request.reporter.name,
      organizationName: request.reporter.organizationName ?? null,
      organizationType: request.reporter.organizationType ?? null,
      phone: request.reporter.phone ?? null,
    },
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

export async function listRequests(filters: RequestFilters) {
  const where: Record<string, unknown> = {}
  if (filters.type) where.type = filters.type
  if (filters.status === 'active') {
    where.status = { in: ['open', 'in_progress'] }
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

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const [requests, total] = await prisma.$transaction([
    prisma.request.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { city: true, reporter: true },
    }),
    prisma.request.count({ where }),
  ])

  return {
    requests: requests.map(serializeRequest),
    total,
    limit,
    offset,
  }
}

export async function getRequest(id: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const request = await prisma.request.findUnique({
    where: { id },
    include: {
      city: true,
      reporter: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')
  return serializeRequest(request)
}

export async function createRequest(input: CreateRequestInput) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  if (input.transport && input.type !== 'supplies_request') {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a solicitudes de suministros',
    )
  }

  const created = await prisma.$transaction(async (tx) => {
    const reporter = await tx.reporter.create({
      data: {
        contactType: input.reporter.contactType,
        name: input.reporter.name,
        organizationName: input.reporter.organizationName ?? null,
        organizationType: input.reporter.organizationType ?? null,
        phone: input.reporter.phone,
        email: input.reporter.email || null,
      },
    })

    return tx.request.create({
      data: {
        type: input.type,
        transport: input.transport ?? null,
        urgency: input.urgency,
        status: 'open',
        title: input.title,
        description: input.description,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
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

  return { ...serializeRequest(created), resolveCode: created.resolveCode }
}

export async function updateRequestStatus(
  id: string,
  input: UpdateRequestStatusInput,
  isAdmin = false,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Solicitud no encontrada')

  const request = await prisma.request.findUnique({ where: { id } })
  if (!request) throw new ApiError(404, 'Solicitud no encontrada')

  const from = request.status
  if (from === input.status) {
    return getRequest(id)
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
    if (!isAdmin && (!request.resolveCode || code !== request.resolveCode)) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
    resolvedAt = request.resolvedAt ?? new Date()
  } else if (input.status === 'open') {
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

  return getRequest(id)
}
import type { City, Offer, Reporter } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  CreateOfferInput,
  OfferFilters,
  UpdateOfferStatusInput,
} from '../validators/offer.js'

type SerializedOffer = Offer & { city: City; reporter: Reporter }

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateResolveCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function serializeOffer(offer: SerializedOffer) {
  return {
    id: offer.id,
    type: offer.type,
    transport: offer.transport ?? null,
    status: offer.status,
    title: offer.title,
    description: offer.description,
    address: offer.address ?? null,
    lat: offer.lat ?? null,
    lng: offer.lng ?? null,
    city: {
      code: offer.city.code,
      name: offer.city.name,
    },
    reporter: {
      contactType: offer.reporter.contactType,
      name: offer.reporter.name,
      organizationName: offer.reporter.organizationName ?? null,
      organizationType: offer.reporter.organizationType ?? null,
      phone: offer.reporter.phone ?? null,
    },
    resolvedAt: offer.resolvedAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  }
}

export async function listOffers(filters: OfferFilters) {
  const where: Record<string, unknown> = {}
  if (filters.type) where.type = filters.type
  if (filters.status === 'active') {
    where.status = 'open'
  } else if (filters.status) {
    where.status = filters.status
  }
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

  const [offers, total] = await prisma.$transaction([
    prisma.offer.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { city: true, reporter: true },
    }),
    prisma.offer.count({ where }),
  ])

  return {
    offers: offers.map(serializeOffer),
    total,
    limit,
    offset,
  }
}

export async function getOffer(id: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { city: true, reporter: true },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')
  return serializeOffer(offer)
}

export async function createOffer(input: CreateOfferInput) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  if (input.transport && input.type !== 'supplies_offered') {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a ofertas de suministros',
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

    return tx.offer.create({
      data: {
        type: input.type,
        transport: input.transport ?? null,
        status: 'open',
        title: input.title,
        description: input.description,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
        resolveCode: generateResolveCode(),
      },
      include: { reporter: true, city: true },
    })
  })

  return { ...serializeOffer(created), resolveCode: created.resolveCode }
}

export async function updateOfferStatus(id: string, input: UpdateOfferStatusInput) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({ where: { id } })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  const from = offer.status
  if (from === input.status) {
    return getOffer(id)
  }

  const TRANSITIONS: Record<string, string[]> = {
    open: ['fulfilled', 'unavailable'],
    fulfilled: [],
    unavailable: ['open'],
  }
  const allowed = TRANSITIONS[from] ?? []
  if (!allowed.includes(input.status)) {
    throw new ApiError(
      400,
      `No se puede cambiar el estado de '${from}' a '${input.status}'`,
    )
  }

  const code = (input.resolveCode ?? '').trim()
  if (!offer.resolveCode || code !== offer.resolveCode) {
    throw new ApiError(403, 'Código de cierre incorrecto')
  }

  const resolvedAt =
    input.status === 'fulfilled' ? (offer.resolvedAt ?? new Date()) : null

  await prisma.offer.update({
    where: { id },
    data: { status: input.status, resolvedAt },
  })

  return getOffer(id)
}
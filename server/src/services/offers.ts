import type { City, Offer, OfferClaim, Reporter } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  CreateOfferInput,
  OfferFilters,
  UpdateOfferStatusInput,
} from '../validators/offer.js'

type ClaimWithUser = OfferClaim & { claimer: { name: string } | null }

type SerializedOffer = Offer & {
  city: City
  reporter: Reporter
  claims?: ClaimWithUser[]
}

const OFFER_TRANSITIONS: Record<string, string[]> = {
  open: ['fulfilled', 'unavailable'],
  in_transit: ['open', 'fulfilled', 'unavailable'],
  fulfilled: [],
  unavailable: ['open'],
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateResolveCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function serializeOffer(offer: SerializedOffer) {
  const activeClaim = (offer.claims ?? []).find((c) => c.status === 'committed')

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
      name: offer.reporter.name,
      phone: offer.reporter.phone ?? null,
      whatsapp: offer.reporter.whatsapp ?? null,
      email: offer.reporter.email ?? null,
    },
    claim: activeClaim
      ? {
          id: activeClaim.id,
          status: activeClaim.status,
          claimerName: activeClaim.claimer?.name ?? null,
          note: activeClaim.note ?? null,
          claimedAt: activeClaim.claimedAt,
        }
      : null,
    canClaim: canClaimOffer(offer),
    resolvedAt: offer.resolvedAt,
    createdAt: offer.createdAt,
    updatedAt: offer.updatedAt,
  }
}

export function canClaimOffer(offer: SerializedOffer): boolean {
  return (
    offer.type === 'supplies_offered' &&
    offer.transport === 'needs_transport' &&
    offer.status === 'open' &&
    !(offer.claims ?? []).some((claim) => claim.status === 'committed')
  )
}

const OFFER_INCLUDE = {
  city: true,
  reporter: true,
  claims: {
    include: { claimer: { select: { name: true } } },
    orderBy: { claimedAt: 'desc' as const },
  },
}

export async function listOffers(filters: OfferFilters) {
  const where: Record<string, unknown> = {}
  if (filters.forTransport === 'true') {
    where.type = 'supplies_offered'
    where.transport = 'needs_transport'
    where.status = 'open'
  } else {
    if (filters.type) where.type = filters.type
    if (filters.status === 'active') {
      where.status = 'open'
    } else if (filters.status) {
      where.status = filters.status
    }
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
      include: OFFER_INCLUDE,
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
    include: OFFER_INCLUDE,
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')
  return serializeOffer(offer)
}

export async function claimOffer(id: string, userId: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      claims: { where: { status: 'committed' }, take: 1 },
    },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  if (offer.type !== 'supplies_offered' || offer.transport !== 'needs_transport') {
    throw new ApiError(400, 'Esta oferta no necesita transporte')
  }
  if (offer.status !== 'open') {
    throw new ApiError(409, 'Ya hay alguien llevando esta oferta')
  }
  if (offer.claims.length > 0) {
    throw new ApiError(409, 'Alguien ya se comprometió a llevar esta oferta')
  }

  await prisma.$transaction([
    prisma.offerClaim.create({
      data: { offerId: id, claimerId: userId, status: 'committed' },
    }),
    prisma.offer.update({
      where: { id },
      data: { status: 'in_transit' },
    }),
  ])

  return getOffer(id)
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
        name: input.reporter.name,
        phone: input.reporter.phone ?? null,
        whatsapp: input.reporter.whatsapp ?? null,
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

export async function updateOfferStatus(
  id: string,
  input: UpdateOfferStatusInput,
  isAdmin = false,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({ where: { id } })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  const from = offer.status
  if (from === input.status) {
    return getOffer(id)
  }

  const allowed = OFFER_TRANSITIONS[from] ?? []
  if (!allowed.includes(input.status)) {
    throw new ApiError(
      400,
      `No se puede cambiar el estado de '${from}' a '${input.status}'`,
    )
  }

  const code = (input.resolveCode ?? '').trim()
  if (!isAdmin && (!offer.resolveCode || code !== offer.resolveCode)) {
    throw new ApiError(403, 'Código de cierre incorrecto')
  }

  const resolvedAt =
    input.status === 'fulfilled' ? (offer.resolvedAt ?? new Date()) : null

  await prisma.$transaction([
    prisma.offer.update({
      where: { id },
      data: { status: input.status, resolvedAt },
    }),
    prisma.offerClaim.updateMany({
      where: { offerId: id, status: 'committed' },
      data: {
        status: input.status === 'fulfilled' ? 'delivered' : 'cancelled',
        resolvedAt: new Date(),
      },
    }),
  ])

  return getOffer(id)
}
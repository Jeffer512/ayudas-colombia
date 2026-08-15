import type { City, Offer, OfferClaim, Reporter } from '@prisma/client'
import { Prisma } from '@prisma/client'
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

export function serializeOffer(offer: SerializedOffer, currentUserId?: string) {
  const activeClaim = (offer.claims ?? []).find((c) => c.status === 'committed')

  return {
    id: offer.id,
    isOwner: currentUserId != null && offer.reporter.userId === currentUserId,
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
          mine: currentUserId != null && activeClaim.claimerId === currentUserId,
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

export async function listOffers(filters: OfferFilters, currentUserId?: string) {
  const where: Record<string, unknown> = {}
  if (filters.forTransport === 'true' || filters.forTransport === 'assigned') {
    where.type = 'supplies_offered'
    where.transport = 'needs_transport'
    where.status = filters.forTransport === 'assigned' ? 'in_transit' : 'open'
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
    offers: offers.map((offer) => serializeOffer(offer, currentUserId)),
    total,
    limit,
    offset,
  }
}

export async function getOffer(id: string, currentUserId?: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: OFFER_INCLUDE,
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')
  return serializeOffer(offer, currentUserId)
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

  try {
    await prisma.$transaction(async (tx) => {
      const flipped = await tx.offer.updateMany({
        where: { id, status: 'open' },
        data: { status: 'in_transit' },
      })
      if (flipped.count === 0) {
        throw new ApiError(409, 'Alguien ya se comprometió a llevar esta oferta')
      }
      await tx.offerClaim.create({
        data: { offerId: id, claimerId: userId, status: 'committed' },
      })
    })
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'Alguien ya se comprometió a llevar esta oferta')
    }
    throw err
  }

  return getOffer(id, userId)
}

export async function cancelClaim(id: string, userId: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: {
      claims: { where: { status: 'committed' }, take: 1 },
    },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')
  if (offer.status !== 'in_transit') {
    throw new ApiError(409, 'Esta oferta no está siendo transportada')
  }
  if (!offer.claims.some((claim) => claim.claimerId === userId)) {
    throw new ApiError(403, 'Solo quien se comprometió puede cancelar el compromiso')
  }

  await prisma.$transaction(async (tx) => {
    const flipped = await tx.offer.updateMany({
      where: { id, status: 'in_transit' },
      data: { status: 'open', resolvedAt: null },
    })
    if (flipped.count === 0) {
      throw new ApiError(409, 'Esta oferta ya dejó de estar en tránsito')
    }
    await tx.offerClaim.updateMany({
      where: { offerId: id, status: 'committed', claimerId: userId },
      data: { status: 'cancelled', resolvedAt: new Date() },
    })
  })

  return getOffer(id, userId)
}

export async function createOffer(input: CreateOfferInput, currentUserId?: string) {
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
        userId: currentUserId ?? null,
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

  return { ...serializeOffer(created, currentUserId), resolveCode: created.resolveCode }
}

export async function updateOfferStatus(
  id: string,
  input: UpdateOfferStatusInput,
  isAdmin = false,
  currentUserId?: string,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { reporter: true, claims: true },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  const isOwner = currentUserId != null && offer.reporter.userId === currentUserId
  const isClaimer =
    currentUserId != null &&
    offer.claims.some(
      (claim) =>
        claim.status === 'committed' && claim.claimerId === currentUserId,
    )

  if (isClaimer && input.status !== 'fulfilled') {
    throw new ApiError(
      403,
      'El voluntario comprometido solo puede confirmar la entrega',
    )
  }

  const from = offer.status
  if (from === input.status) {
    return getOffer(id, currentUserId)
  }

  const allowed = OFFER_TRANSITIONS[from] ?? []
  if (!allowed.includes(input.status)) {
    throw new ApiError(
      400,
      `No se puede cambiar el estado de '${from}' a '${input.status}'`,
    )
  }

  const code = (input.resolveCode ?? '').trim()
  if (
    !isAdmin &&
    !isOwner &&
    !isClaimer &&
    (!offer.resolveCode || code !== offer.resolveCode)
  ) {
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

  return getOffer(id, currentUserId)
}
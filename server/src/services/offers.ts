import type { City, Offer, OfferClaim, Reporter } from '@prisma/client'
import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  ClaimInput,
  CreateOfferInput,
  OfferFilters,
  UpdateOfferInput,
  UpdateOfferStatusInput,
} from '../validators/offer.js'
import type { Viewer } from '../lib/viewer.js'
import {
  canSeeContact,
  isOwner,
  offerVisibleToAudience,
} from '../lib/viewer.js'
import type { ContactVisibility, OfferAudience } from '../constants.js'
import { generateResolveCode } from '../lib/verification.js'

type ClaimWithUser = OfferClaim & { claimer: { name: string } | null }

type SerializedOffer = Offer & {
  city: City
  reporter: Reporter
  claims?: ClaimWithUser[]
  request?: {
    id: string
    title: string
    address: string | null
    city: { code: string; name: string }
  } | null
  destinationOrg?: { id: string; name: string; category: string } | null
  volunteerDetails?: {
    capabilities: string[]
    availability: string | null
  } | null
  transportDetails?: {
    vehicleType: string | null
    capacity: string | null
  } | null
}

const OFFER_TRANSITIONS: Record<string, string[]> = {
  open: ['fulfilled', 'unavailable'],
  in_transit: ['open', 'fulfilled', 'unavailable'],
  fulfilled: [],
  unavailable: ['open'],
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function serializeOffer(offer: SerializedOffer, viewer?: Viewer) {
  const activeClaim = (offer.claims ?? []).find((c) => c.status === 'committed')
  const ownerId = offer.reporter.userId
  const contactVisibility = (offer.contactVisibility ?? 'public') as ContactVisibility
  const audience = (offer.audience ?? 'users') as OfferAudience
  const isClaimerOfLinked =
    offer.requestId != null &&
    activeClaim != null &&
    isOwner(viewer, activeClaim.claimerId)
  const contactRestricted =
    !canSeeContact(contactVisibility, viewer, ownerId) && !isClaimerOfLinked

  const destination =
    offer.requestId != null && offer.request
      ? {
          type: 'request' as const,
          request: {
            id: offer.request.id,
            title: offer.request.title,
            address: offer.request.address ?? null,
            city: offer.request.city,
          },
        }
      : offer.destinationOrg
        ? {
            type: offer.destinationOrg.category === 'acopio' ? ('acopio' as const) : ('org' as const),
            org: { id: offer.destinationOrg.id, name: offer.destinationOrg.name },
          }
        : { type: 'anywhere' as const }

  return {
    id: offer.id,
    isOwner: isOwner(viewer, ownerId),
    type: offer.type,
    transport: offer.transport ?? null,
    items: offer.items ?? [],
    zone: offer.zone ?? null,
    volunteer: offer.volunteerDetails
      ? {
          capabilities: offer.volunteerDetails.capabilities,
          availability: offer.volunteerDetails.availability ?? null,
        }
      : null,
    vehicle: offer.transportDetails
      ? {
          vehicleType: offer.transportDetails.vehicleType ?? null,
          capacity: offer.transportDetails.capacity ?? null,
        }
      : null,
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
      phone: contactRestricted ? null : (offer.reporter.phone ?? null),
      whatsapp: contactRestricted ? null : (offer.reporter.whatsapp ?? null),
      email: contactRestricted ? null : (offer.reporter.email ?? null),
    },
    contactVisibility,
    contactRestricted,
    audience: offer.type === 'volunteers_offered' ? audience : 'public',
    claim: activeClaim
      ? {
          id: activeClaim.id,
          status: activeClaim.status,
          claimerName: activeClaim.claimer?.name ?? null,
          mine: isOwner(viewer, activeClaim.claimerId),
          note: activeClaim.note ?? null,
          phone: isOwner(viewer, ownerId) ? (activeClaim.phone ?? null) : null,
          whatsapp: isOwner(viewer, ownerId)
            ? (activeClaim.whatsapp ?? null)
            : null,
          claimedAt: activeClaim.claimedAt,
        }
      : null,
    destination,
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
  volunteerDetails: true,
  transportDetails: true,
  request: {
    select: {
      id: true,
      title: true,
      address: true,
      city: { select: { code: true, name: true } },
    },
  },
  destinationOrg: { select: { id: true, name: true, category: true } },
  claims: {
    include: { claimer: { select: { name: true } } },
    orderBy: { claimedAt: 'desc' as const },
  },
}

export async function listOffers(filters: OfferFilters, viewer?: Viewer) {
  const allowedVolunteerAudiences: OfferAudience[] = ['public']
  if (viewer?.sub != null) allowedVolunteerAudiences.push('users')
  if (viewer?.orgId != null) allowedVolunteerAudiences.push('orgs')
  const where = audienceAwareWhere(filters, allowedVolunteerAudiences)

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
    offers: offers.map((offer) => serializeOffer(offer, viewer)),
    total,
    limit,
    offset,
  }
}

function audienceAwareWhere(filters: OfferFilters, allowedVolunteerAudiences: OfferAudience[]) {
  const where: Record<string, unknown> = {}
  if (filters.forTransport === 'true' || filters.forTransport === 'assigned') {
    where.type = 'supplies_offered'
    where.transport = 'needs_transport'
    where.status = filters.forTransport === 'assigned' ? 'in_transit' : 'open'
  } else {
    where.requestId = null
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
  where.AND = {
    OR: [
      { type: { not: 'volunteers_offered' } },
      { audience: { in: allowedVolunteerAudiences } },
    ],
  }
  return where
}

export async function getOffer(id: string, viewer?: Viewer) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: OFFER_INCLUDE,
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')
  if (
    offer.type === 'volunteers_offered' &&
    !offerVisibleToAudience((offer.audience ?? 'users') as OfferAudience, viewer)
  ) {
    throw new ApiError(404, 'Oferta no encontrada')
  }
  return serializeOffer(offer, viewer)
}

export async function claimOffer(id: string, viewer: Viewer, input: ClaimInput = {}) {
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
        data: {
          offerId: id,
          claimerId: viewer.sub,
          status: 'committed',
          phone: input.phone?.trim() || null,
          whatsapp: input.whatsapp?.trim() || null,
        },
      })
      if (offer.requestId) {
        await tx.requestHelper.updateMany({
          where: { offerId: id },
          data: { status: 'accepted' },
        })
      }
    })
  } catch (err) {
    if (err instanceof ApiError) throw err
    if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
      throw new ApiError(409, 'Alguien ya se comprometió a llevar esta oferta')
    }
    throw err
  }

  return getOffer(id, viewer)
}

export async function cancelClaim(id: string, viewer: Viewer) {
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
  if (!offer.claims.some((claim) => claim.claimerId === viewer.sub)) {
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
      where: { offerId: id, status: 'committed', claimerId: viewer.sub },
      data: { status: 'cancelled', resolvedAt: new Date() },
    })
    await tx.requestHelper.updateMany({
      where: { offerId: id },
      data: { status: 'offered' },
    })
  })

  return getOffer(id, viewer)
}

export async function createOffer(input: CreateOfferInput, viewer?: Viewer) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  if (input.transport && input.type !== 'supplies_offered') {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a ofertas de suministros',
    )
  }

  if (input.items?.length && input.type !== 'supplies_offered') {
    throw new ApiError(400, 'El listado de ítems solo aplica a ofertas de suministros')
  }

  if (input.volunteer && input.type !== 'volunteers_offered') {
    throw new ApiError(
      400,
      'Los datos de voluntario solo aplican a ofertas de voluntariado',
    )
  }

  if (input.vehicle && input.type !== 'transport_offered') {
    throw new ApiError(400, 'Los datos de vehículo solo aplican a ofertas de transporte')
  }

  if (input.destinationOrgId && input.type !== 'supplies_offered') {
    throw new ApiError(
      400,
      'El destino solo aplica a ofertas de suministros',
    )
  }
  if (input.destinationOrgId && input.transport !== 'needs_transport') {
    throw new ApiError(
      400,
      'El destino solo aplica a ofertas de suministros que necesitan transporte',
    )
  }
  let destinationOrgId: string | null = input.destinationOrgId ?? null
  if (destinationOrgId) {
    const org = await prisma.helpOrg.findUnique({ where: { id: destinationOrgId } })
    if (!org || org.status !== 'open') {
      throw new ApiError(400, 'Destino no encontrado')
    }
    if (org.cityId !== city.id) {
      throw new ApiError(400, 'El destino debe estar en la misma ciudad de la oferta')
    }
  }

  const audience: OfferAudience =
    input.audience ??
    (input.type === 'volunteers_offered' ? 'users' : 'public')

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

    return tx.offer.create({
      data: {
        type: input.type,
        transport: input.transport ?? null,
        items: input.items ?? [],
        zone: input.zone ?? null,
        destinationOrgId,
        volunteerDetails: input.volunteer
          ? {
              create: {
                capabilities: input.volunteer.capabilities ?? [],
                availability: input.volunteer.availability ?? null,
              },
            }
          : undefined,
        transportDetails: input.vehicle
          ? {
              create: {
                vehicleType: input.vehicle.vehicleType ?? null,
                capacity: input.vehicle.capacity ?? null,
              },
            }
          : undefined,
        status: 'open',
        title: input.title,
        description: input.description,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
        contactVisibility: input.contactVisibility,
        audience,
        resolveCode: generateResolveCode(),
      },
      include: OFFER_INCLUDE,
    })
  })

  return { ...serializeOffer(created, viewer), resolveCode: created.resolveCode }
}

export async function updateOffer(
  id: string,
  input: UpdateOfferInput,
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { reporter: true, claims: { select: { status: true } } },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  if (offer.claims.some((claim) => claim.status === 'committed')) {
    throw new ApiError(
      409,
      'Ya hay un compromiso de entrega, la oferta no se puede editar',
    )
  }

  if (offer.status !== 'open') {
    throw new ApiError(400, 'Solo se puede editar una oferta abierta')
  }

  if (!isOwner(viewer, offer.reporter.userId)) {
    const code = (input.resolveCode ?? '').trim()
    if (!offer.resolveCode || code !== offer.resolveCode) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
  }

  if (input.transport && offer.type !== 'supplies_offered') {
    throw new ApiError(
      400,
      'El campo de transporte solo aplica a ofertas de suministros',
    )
  }
  if (input.items?.length && offer.type !== 'supplies_offered') {
    throw new ApiError(
      400,
      'El listado de ítems solo aplica a ofertas de suministros',
    )
  }
  if (input.volunteer && offer.type !== 'volunteers_offered') {
    throw new ApiError(
      400,
      'Los datos de voluntario solo aplican a ofertas de voluntariado',
    )
  }
  if (input.vehicle && offer.type !== 'transport_offered') {
    throw new ApiError(
      400,
      'Los datos de vehículo solo aplican a ofertas de transporte',
    )
  }

  if (
    input.destinationOrgId &&
    (offer.type !== 'supplies_offered' ||
      (input.transport ?? offer.transport) !== 'needs_transport')
  ) {
    throw new ApiError(
      400,
      'El destino solo aplica a ofertas de suministros que necesitan transporte',
    )
  }
  if (input.destinationOrgId) {
    const org = await prisma.helpOrg.findUnique({
      where: { id: input.destinationOrgId },
    })
    if (!org || org.status !== 'open') {
      throw new ApiError(400, 'Destino no encontrado')
    }
    if (org.cityId !== offer.cityId) {
      throw new ApiError(400, 'El destino debe estar en la misma ciudad de la oferta')
    }
  }

  const data: Prisma.OfferUpdateInput = {}
  if (input.title !== undefined) data.title = input.title
  if (input.description !== undefined) data.description = input.description
  if (input.items !== undefined) data.items = input.items
  if (input.zone !== undefined) data.zone = input.zone
  if (input.address !== undefined) data.address = input.address
  if (input.lat !== undefined) data.lat = input.lat
  if (input.lng !== undefined) data.lng = input.lng
  if (input.contactVisibility !== undefined) {
    data.contactVisibility = input.contactVisibility
  }
  if (input.audience !== undefined) data.audience = input.audience
  if (input.transport !== undefined) data.transport = input.transport
  if (input.destinationOrgId !== undefined) {
    data.destinationOrg = input.destinationOrgId
      ? { connect: { id: input.destinationOrgId } }
      : { disconnect: true }
  }
  if (input.volunteer !== undefined) {
    if (input.volunteer === null) {
      data.volunteerDetails = { delete: true }
    } else {
      data.volunteerDetails = {
        upsert: {
          create: {
            capabilities: input.volunteer.capabilities ?? [],
            availability: input.volunteer.availability ?? null,
          },
          update: {
            capabilities: input.volunteer.capabilities ?? [],
            availability: input.volunteer.availability ?? null,
          },
        },
      }
    }
  }
  if (input.vehicle !== undefined) {
    if (input.vehicle === null) {
      data.transportDetails = { delete: true }
    } else {
      data.transportDetails = {
        upsert: {
          create: {
            vehicleType: input.vehicle.vehicleType ?? null,
            capacity: input.vehicle.capacity ?? null,
          },
          update: {
            vehicleType: input.vehicle.vehicleType ?? null,
            capacity: input.vehicle.capacity ?? null,
          },
        },
      }
    }
  }
  if (input.reporter) {
    data.reporter = {
      update: {
        name: input.reporter.name,
        phone: input.reporter.phone ?? null,
        whatsapp: input.reporter.whatsapp ?? null,
        email: input.reporter.email || null,
      },
    }
  }

  const updated = await prisma.offer.update({
    where: { id },
    data,
    include: OFFER_INCLUDE,
  })
  return serializeOffer(updated, viewer)
}

export async function verifyOfferCode(
  id: string,
  input: { resolveCode: string },
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { reporter: true },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  const code = (input.resolveCode ?? '').trim()
  if (!isOwner(viewer, offer.reporter.userId)) {
    if (!offer.resolveCode || code !== offer.resolveCode) {
      throw new ApiError(403, 'Código de cierre incorrecto')
    }
  }

  return { ok: true }
}

export async function updateOfferStatus(
  id: string,
  input: UpdateOfferStatusInput,
  isAdmin = false,
  viewer?: Viewer,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Oferta no encontrada')

  const offer = await prisma.offer.findUnique({
    where: { id },
    include: { reporter: true, claims: true },
  })
  if (!offer) throw new ApiError(404, 'Oferta no encontrada')

  const isOwnerFlag = isOwner(viewer, offer.reporter.userId)
  const isClaimer =
    viewer?.sub != null &&
    offer.claims.some(
      (claim) =>
        claim.status === 'committed' && claim.claimerId === viewer.sub,
    )

  if (isClaimer && input.status !== 'fulfilled') {
    throw new ApiError(
      403,
      'El voluntario comprometido solo puede confirmar la entrega',
    )
  }

  const from = offer.status
  if (from === input.status) {
    return getOffer(id, viewer)
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
    !isOwnerFlag &&
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
    ...(input.status === 'fulfilled'
      ? [
          prisma.requestHelper.updateMany({
            where: { offerId: id },
            data: { status: 'delivered', deliveredAt: new Date() },
          }),
        ]
      : []),
  ])

  return getOffer(id, viewer)
}
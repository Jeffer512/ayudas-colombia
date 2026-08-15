import type { City, HelpOrg, HelpOrgItem } from '@prisma/client'
import { CATEGORY_TO_ORG_TYPE } from '../constants.js'
import type { HelpOrgCategory } from '../constants.js'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import { serializeStaff } from './auth.js'
import type {
  CreateHelpOrgInput,
  CreateOrgRequestInput,
  HelpOrgFilters,
  UpdateHelpOrgStatusInput,
  UpsertHelpOrgItemInput,
} from '../validators/helpOrg.js'

type HelpOrgWithCity = HelpOrg & { city: City }
type HelpOrgItemWithUpdater = HelpOrgItem & {
  updatedBy: { user: { name: string } } | null
}

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateResolveCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function serializeHelpOrg(org: HelpOrgWithCity) {
  return {
    id: org.id,
    type: org.type,
    category: org.category,
    name: org.name,
    description: org.description ?? null,
    address: org.address ?? null,
    lat: org.lat ?? null,
    lng: org.lng ?? null,
    city: {
      code: org.city.code,
      name: org.city.name,
    },
    contactName: org.contactName ?? null,
    contactPhone: org.contactPhone ?? null,
    hours: org.hours ?? null,
    accepts: org.accepts ?? null,
    status: org.status,
    createdAt: org.createdAt,
    updatedAt: org.updatedAt,
  }
}

export async function listHelpOrgs(filters: HelpOrgFilters) {
  const where: Record<string, unknown> = {}
  if (filters.city) where.city = { code: filters.city }
  if (filters.category) where.category = filters.category
  if (filters.type) where.type = filters.type
  if (filters.status) where.status = filters.status

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const [orgs, total] = await prisma.$transaction([
    prisma.helpOrg.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: {
        city: true,
        items: {
          orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
          include: { updatedBy: { include: { user: true } } },
        },
      },
    }),
    prisma.helpOrg.count({ where }),
  ])

  return {
    helpOrgs: orgs.map((org) => ({
      ...serializeHelpOrg(org),
      items: org.items.map(serializeHelpOrgItem),
    })),
    total,
    limit,
    offset,
  }
}

export async function getHelpOrg(id: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Organización no encontrada')

  const org = await prisma.helpOrg.findUnique({
    where: { id },
    include: {
      city: true,
      items: {
        orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
        include: { updatedBy: { include: { user: true } } },
      },
    },
  })
  if (!org) throw new ApiError(404, 'Organización no encontrada')
  return { ...serializeHelpOrg(org), items: org.items.map(serializeHelpOrgItem) }
}

export async function createHelpOrg(
  input: CreateHelpOrgInput,
  type: 'ciudadano' | 'oficial',
  userId?: string,
) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  const org = await prisma.helpOrg.create({
    data: {
      type: userId ? 'oficial' : type,
      category: input.category ?? 'acopio',
      name: input.name,
      description: input.description ?? null,
      address: input.address ?? null,
      lat: input.lat,
      lng: input.lng,
      cityId: city.id,
      contactName: input.contactName ?? null,
      contactPhone: input.contactPhone ?? null,
      hours: input.hours ?? null,
      accepts: input.accepts ?? null,
      resolveCode: generateResolveCode(),
    },
    include: { city: true },
  })

  if (userId) {
    await prisma.helpOrgStaff.upsert({
      where: { userId },
      update: {
        orgId: org.id,
        role: 'manager',
        status: 'active',
        approvedAt: new Date(),
      },
      create: {
        userId,
        orgId: org.id,
        role: 'manager',
        status: 'active',
        approvedAt: new Date(),
      },
    })
  }

  return { ...serializeHelpOrg(org), resolveCode: org.resolveCode }
}

export async function updateHelpOrgStatus(
  id: string,
  input: UpdateHelpOrgStatusInput,
  isAdmin = false,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Organización no encontrada')

  const org = await prisma.helpOrg.findUnique({
    where: { id },
    include: { city: true },
  })
  if (!org) throw new ApiError(404, 'Organización no encontrada')

  if (org.status === input.status) {
    return serializeHelpOrg(org)
  }

  const code = (input.resolveCode ?? '').trim()
  if (!isAdmin && (!org.resolveCode || code !== org.resolveCode)) {
    throw new ApiError(403, 'Código de cierre incorrecto')
  }

  const updated = await prisma.helpOrg.update({
    where: { id },
    data: { status: input.status },
    include: { city: true },
  })
  return serializeHelpOrg(updated)
}

export async function listMembers(orgId: string) {
  const staff = await prisma.helpOrgStaff.findMany({
    where: { orgId },
    orderBy: { createdAt: 'asc' },
    include: { user: true },
  })
  return staff.map(serializeStaff)
}

export async function approveMember(
  orgId: string,
  staffId: string,
  actorRole: string,
) {
  if (actorRole !== 'manager') {
    throw new ApiError(403, 'Solo el manager puede aprobar solicitudes')
  }
  const membership = await prisma.helpOrgStaff.findFirst({
    where: { id: staffId, orgId, status: 'pending' },
    select: { id: true },
  })
  if (!membership) {
    throw new ApiError(404, 'Solicitud no encontrada')
  }
  const updated = await prisma.helpOrgStaff.update({
    where: { id: membership.id },
    data: { status: 'active', approvedAt: new Date() },
    include: { user: true },
  })
  return serializeStaff(updated)
}

export async function rejectMember(
  orgId: string,
  staffId: string,
  actorRole: string,
) {
  if (actorRole !== 'manager') {
    throw new ApiError(403, 'Solo el manager puede rechazar solicitudes')
  }
  const membership = await prisma.helpOrgStaff.findFirst({
    where: { id: staffId, orgId, status: 'pending' },
    select: { id: true },
  })
  if (!membership) {
    throw new ApiError(404, 'Solicitud no encontrada')
  }
  await prisma.helpOrgStaff.delete({ where: { id: membership.id } })
  return { ok: true }
}

export async function createOrgRequest(
  orgId: string,
  input: CreateOrgRequestInput,
) {
  const org = await prisma.helpOrg.findUnique({
    where: { id: orgId },
    include: { city: true },
  })
  if (!org) throw new ApiError(404, 'Organización no encontrada')

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
        name: org.name,
        organizationName: org.name,
        organizationType:
          CATEGORY_TO_ORG_TYPE[org.category as HelpOrgCategory],
      },
    })

    return tx.request.create({
      data: {
        type: input.type,
        transport: input.transport ?? null,
        urgency: input.urgency ?? 'medium',
        status: 'open',
        title: input.title,
        description: input.description,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
        helpOrgId: org.id,
        contactVisibility: input.contactVisibility,
        resolveCode: generateResolveCode(),
        events: {
          create: [
            {
              status: 'open',
              note: `Solicitud publicada por ${org.name}`,
              actorName: 'Organización',
            },
          ],
        },
      },
      include: {
        reporter: true,
        city: true,
        org: true,
        events: true,
      },
    })
  })

  return {
    id: created.id,
    type: created.type,
    urgency: created.urgency,
    status: created.status,
    title: created.title,
    city: { code: created.city.code, name: created.city.name },
    contactVisibility: created.contactVisibility,
    resolveCode: created.resolveCode,
    organization: { id: org.id, name: org.name, category: org.category },
  }
}

export function serializeHelpOrgItem(item: HelpOrgItemWithUpdater) {
  return {
    id: item.id,
    orgId: item.orgId,
    kind: item.kind,
    name: item.name,
    quantity: item.quantity ?? null,
    unit: item.unit ?? null,
    updatedBy: item.updatedBy?.user.name ?? null,
    updatedAt: item.updatedAt,
    createdAt: item.createdAt,
  }
}

export async function listOrgItems(orgId: string) {
  if (!isUuid.test(orgId)) throw new ApiError(404, 'Organización no encontrada')

  const org = await prisma.helpOrg.findUnique({
    where: { id: orgId },
    select: { id: true },
  })
  if (!org) throw new ApiError(404, 'Organización no encontrada')

  const items = await prisma.helpOrgItem.findMany({
    where: { orgId },
    orderBy: [{ kind: 'asc' }, { createdAt: 'asc' }],
    include: { updatedBy: { include: { user: true } } },
  })
  return items.map(serializeHelpOrgItem)
}

export async function createOrgItem(
  orgId: string,
  input: UpsertHelpOrgItemInput,
  staffId: string,
) {
  const org = await prisma.helpOrg.findUnique({
    where: { id: orgId },
    select: { id: true },
  })
  if (!org) throw new ApiError(404, 'Organización no encontrada')

  const item = await prisma.helpOrgItem.create({
    data: {
      orgId,
      kind: input.kind,
      name: input.name,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      updatedById: staffId,
    },
    include: { updatedBy: { include: { user: true } } },
  })
  return serializeHelpOrgItem(item)
}

export async function updateOrgItem(
  orgId: string,
  itemId: string,
  input: UpsertHelpOrgItemInput,
  staffId: string,
) {
  const existing = await prisma.helpOrgItem.findFirst({
    where: { id: itemId, orgId },
    select: { id: true },
  })
  if (!existing) throw new ApiError(404, 'Elemento no encontrado')

  const item = await prisma.helpOrgItem.update({
    where: { id: existing.id },
    data: {
      kind: input.kind,
      name: input.name,
      quantity: input.quantity ?? null,
      unit: input.unit ?? null,
      updatedById: staffId,
    },
    include: { updatedBy: { include: { user: true } } },
  })
  return serializeHelpOrgItem(item)
}

export async function deleteOrgItem(orgId: string, itemId: string) {
  const existing = await prisma.helpOrgItem.findFirst({
    where: { id: itemId, orgId },
    select: { id: true },
  })
  if (!existing) throw new ApiError(404, 'Elemento no encontrado')

  await prisma.helpOrgItem.delete({ where: { id: existing.id } })
  return { ok: true }
}
import type { AcopioCenter, City } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  AcopioFilters,
  CreateAcopioInput,
  UpdateAcopioStatusInput,
} from '../validators/acopio.js'

type AcopioWithCity = AcopioCenter & { city: City }

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function generateResolveCode(): string {
  return String(Math.floor(Math.random() * 10000)).padStart(4, '0')
}

export function serializeAcopio(center: AcopioWithCity) {
  return {
    id: center.id,
    type: center.type,
    name: center.name,
    description: center.description ?? null,
    address: center.address ?? null,
    lat: center.lat ?? null,
    lng: center.lng ?? null,
    city: {
      code: center.city.code,
      name: center.city.name,
    },
    contactName: center.contactName ?? null,
    contactPhone: center.contactPhone ?? null,
    hours: center.hours ?? null,
    accepts: center.accepts ?? null,
    status: center.status,
    createdAt: center.createdAt,
    updatedAt: center.updatedAt,
  }
}

export async function listAcopios(filters: AcopioFilters) {
  const where: Record<string, unknown> = {}
  if (filters.city) where.city = { code: filters.city }
  if (filters.type) where.type = filters.type
  if (filters.status) where.status = filters.status

  const limit = filters.limit ?? 50
  const offset = filters.offset ?? 0

  const [centers, total] = await prisma.$transaction([
    prisma.acopioCenter.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { city: true },
    }),
    prisma.acopioCenter.count({ where }),
  ])

  return {
    acopios: centers.map(serializeAcopio),
    total,
    limit,
    offset,
  }
}

export async function getAcopio(id: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Centro no encontrado')

  const center = await prisma.acopioCenter.findUnique({
    where: { id },
    include: { city: true },
  })
  if (!center) throw new ApiError(404, 'Centro no encontrado')
  return serializeAcopio(center)
}

export async function createAcopio(
  input: CreateAcopioInput,
  type: 'ciudadano' | 'oficial',
) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  const center = await prisma.acopioCenter.create({
    data: {
      type,
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

  return { ...serializeAcopio(center), resolveCode: center.resolveCode }
}

export async function updateAcopioStatus(
  id: string,
  input: UpdateAcopioStatusInput,
  isAdmin = false,
) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Centro no encontrado')

  const center = await prisma.acopioCenter.findUnique({
    where: { id },
    include: { city: true },
  })
  if (!center) throw new ApiError(404, 'Centro no encontrado')

  if (center.status === input.status) {
    return serializeAcopio(center)
  }

  const code = (input.resolveCode ?? '').trim()
  if (!isAdmin && (!center.resolveCode || code !== center.resolveCode)) {
    throw new ApiError(403, 'Código de cierre incorrecto')
  }

  const updated = await prisma.acopioCenter.update({
    where: { id },
    data: { status: input.status },
    include: { city: true },
  })
  return serializeAcopio(updated)
}
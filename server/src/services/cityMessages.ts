import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  CityMessageFilters,
  CreateCityMessageInput,
} from '../validators/cityMessage.js'
import type { Viewer } from '../lib/viewer.js'

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000

export interface CityMessageDto {
  id: string
  city: { code: string; name: string }
  name: string
  body: string
  markerId: string | null
  createdAt: string
}

function serialize(message: {
  id: string
  name: string
  body: string
  markerId: string | null
  createdAt: Date
  city: { code: string; name: string }
}): CityMessageDto {
  return {
    id: message.id,
    city: { code: message.city.code, name: message.city.name },
    name: message.name,
    body: message.body,
    markerId: message.markerId,
    createdAt: message.createdAt.toISOString(),
  }
}

export async function listCityMessages(
  filters: CityMessageFilters,
  viewer: Viewer,
) {
  const city = await prisma.city.findUnique({ where: { code: filters.city } })
  if (!city) {
    return { messages: [], total: 0, limit: filters.limit, offset: filters.offset }
  }

  const since = new Date(Date.now() - RETENTION_MS)
  const where = {
    cityCode: filters.city,
    status: 'open' as const,
    createdAt: { gte: since },
  }

  const [rows, total] = await Promise.all([
    prisma.cityMessage.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip: filters.offset,
      take: filters.limit,
    }),
    prisma.cityMessage.count({ where }),
  ])

  return {
    messages: rows.map((message) => {
      const base = serialize({ ...message, city: { code: city.code, name: city.name } })
      const mine =
        message.userId != null
          ? message.userId === viewer.sub
          : filters.markerId != null && message.markerId === filters.markerId
      return { ...base, mine }
    }),
    total,
    limit: filters.limit,
    offset: filters.offset,
  }
}

export async function createCityMessage(
  input: CreateCityMessageInput,
  viewer: Viewer,
) {
  const city = await prisma.city.findUnique({ where: { code: input.city } })
  if (!city) throw new ApiError(404, 'Ciudad no encontrada')

  const message = await prisma.cityMessage.create({
    data: {
      cityCode: input.city,
      name: input.name,
      body: input.body,
      userId: viewer.sub,
      markerId: input.markerId ?? null,
    },
  })

  return serialize({ ...message, city: { code: city.code, name: city.name } })
}

export async function hideCityMessage(id: string) {
  const updated = await prisma.cityMessage.update({
    where: { id },
    data: { status: 'hidden' },
  })
  return { id: updated.id, status: updated.status }
}

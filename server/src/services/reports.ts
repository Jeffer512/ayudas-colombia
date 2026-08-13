import type { City, Report, ReportEvent, Reporter } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  CreateReportInput,
  ReportFilters,
} from '../validators/report.js'

type SerializedReport = Report & {
  city: City
  reporter: Reporter
  events?: ReportEvent[]
}

function lastDigits(phone: string): string | null {
  const digits = phone.replace(/\D/g, '')
  return digits.length >= 4 ? digits.slice(-4) : digits || null
}

export function serializeReport(report: SerializedReport) {
  return {
    id: report.id,
    type: report.type,
    urgency: report.urgency,
    status: report.status,
    title: report.title,
    description: report.description,
    address: report.address ?? null,
    lat: report.lat ?? null,
    lng: report.lng ?? null,
    city: {
      code: report.city.code,
      name: report.city.name,
    },
    reporter: {
      contactType: report.reporter.contactType,
      name: report.reporter.name,
      organizationName: report.reporter.organizationName ?? null,
      organizationType: report.reporter.organizationType ?? null,
      phone: report.reporter.phone ?? null,
    },
    resolvedAt: report.resolvedAt,
    createdAt: report.createdAt,
    updatedAt: report.updatedAt,
    events: report.events
      ? report.events.map((e) => ({
          id: e.id.toString(),
          status: e.status,
          note: e.note ?? null,
          actorName: e.actorName ?? null,
          createdAt: e.createdAt,
        }))
      : undefined,
  }
}

export async function listReports(filters: ReportFilters) {
  const where: Record<string, unknown> = {}
  if (filters.type) where.type = filters.type
  if (filters.status) where.status = filters.status
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

  const [reports, total] = await prisma.$transaction([
    prisma.report.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      skip: offset,
      include: { city: true, reporter: true },
    }),
    prisma.report.count({ where }),
  ])

  return {
    reports: reports.map(serializeReport),
    total,
    limit,
    offset,
  }
}

export async function getReport(id: string) {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!isUuid.test(id)) throw new ApiError(404, 'Reporte no encontrado')

  const report = await prisma.report.findUnique({
    where: { id },
    include: {
      city: true,
      reporter: true,
      events: { orderBy: { createdAt: 'asc' } },
    },
  })
  if (!report) throw new ApiError(404, 'Reporte no encontrado')
  return serializeReport(report)
}

export async function createReport(input: CreateReportInput) {
  const city = await prisma.city.findUnique({ where: { code: input.cityCode } })
  if (!city) throw new ApiError(400, `Ciudad no encontrada: ${input.cityCode}`)

  const report = await prisma.$transaction(async (tx) => {
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

    const created = await tx.report.create({
      data: {
        type: input.type,
        urgency: input.urgency,
        status: 'open',
        title: input.title,
        description: input.description,
        address: input.address ?? null,
        lat: input.lat ?? null,
        lng: input.lng ?? null,
        cityId: city.id,
        reporterId: reporter.id,
        phoneVerify: lastDigits(input.reporter.phone),
        events: {
          create: [
            {
              status: 'open',
              note: 'Reporte creado',
              actorName: input.reporter.name,
            },
          ],
        },
      },
      include: { reporter: true, city: true, events: true },
    })
    return created
  })

  return serializeReport(report)
}
import { Prisma } from '@prisma/client'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import type {
  CreateReportInput,
  ReportFilters,
} from '../validators/report.js'

const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

async function findTarget(kind: string, id: string) {
  switch (kind) {
    case 'request':
      return prisma.request.findUnique({ where: { id } })
    case 'offer':
      return prisma.offer.findUnique({ where: { id } })
    case 'aviso':
      return prisma.aviso.findUnique({ where: { id } })
    case 'org':
      return prisma.helpOrg.findUnique({ where: { id } })
    default:
      return null
  }
}

export async function createReport(input: CreateReportInput, reporterId: string) {
  if (!isUuid.test(input.targetId)) {
    throw new ApiError(404, 'Publicación no encontrada')
  }

  const target = await findTarget(input.kind, input.targetId)
  if (!target) {
    throw new ApiError(404, 'Publicación no encontrada')
  }

  try {
    await prisma.postReport.create({
      data: {
        kind: input.kind,
        targetId: input.targetId,
        reason: input.reason,
        note: input.note ?? null,
        reporterId,
      },
    })
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === 'P2002'
    ) {
      throw new ApiError(409, 'Ya reportaste esta publicación')
    }
    throw err
  }

  return { ok: true }
}

export async function listReports(filters: ReportFilters) {
  const where: Record<string, unknown> = {}
  if (filters.status === 'open' || filters.status === 'reviewed') {
    where.status = filters.status
  }
  if (filters.kind) where.kind = filters.kind

  const reports = await prisma.postReport.findMany({
    where,
    orderBy: { createdAt: 'desc' },
    take: 200,
    include: { reporter: { select: { name: true, email: true } } },
  })

  const kinds = [...new Set(reports.map((report) => report.kind))]
  const targetIdsByKind = new Map<string, string[]>()
  for (const report of reports) {
    const ids = targetIdsByKind.get(report.kind) ?? []
    ids.push(report.targetId)
    targetIdsByKind.set(report.kind, ids)
  }

  const titleById = new Map<string, string>()
  for (const kind of kinds) {
    const ids = [...new Set(targetIdsByKind.get(kind) ?? [])]
    const select = { id: true, title: true } as const
    let rows: { id: string; title: string }[] = []
    switch (kind) {
      case 'request':
        rows = await prisma.request.findMany({ where: { id: { in: ids } }, select })
        break
      case 'offer':
        rows = await prisma.offer.findMany({ where: { id: { in: ids } }, select })
        break
      case 'aviso':
        rows = await prisma.aviso.findMany({ where: { id: { in: ids } }, select })
        break
      case 'org':
        rows = await prisma.helpOrg.findMany({ where: { id: { in: ids } }, select })
        break
    }
    for (const row of rows) {
      titleById.set(row.id, row.title)
    }
  }

  const openCounts = await prisma.postReport.groupBy({
    by: ['kind', 'targetId'],
    where: { kind: { in: kinds }, targetId: { in: [...titleById.keys()] }, status: 'open' },
    _count: { _all: true },
  })

  const openById = new Map<string, number>()
  for (const group of openCounts) {
    openById.set(`${group.kind}:${group.targetId}`, group._count._all)
  }

  return {
    reports: reports.map((report) => ({
      id: report.id,
      kind: report.kind,
      targetId: report.targetId,
      targetTitle: titleById.get(report.targetId) ?? null,
      reason: report.reason,
      note: report.note,
      status: report.status,
      reporter: {
        name: report.reporter.name,
        email: report.reporter.email,
      },
      openReports: openById.get(`${report.kind}:${report.targetId}`) ?? 0,
      createdAt: report.createdAt,
      reviewedAt: report.reviewedAt,
    })),
  }
}

export async function reviewReport(id: string) {
  if (!isUuid.test(id)) throw new ApiError(404, 'Reporte no encontrado')

  const report = await prisma.postReport.findUnique({ where: { id } })
  if (!report) throw new ApiError(404, 'Reporte no encontrado')
  if (report.status === 'reviewed') {
    return { id: report.id, status: report.status }
  }

  await prisma.postReport.update({
    where: { id },
    data: { status: 'reviewed', reviewedAt: new Date() },
  })
  return { id: report.id, status: 'reviewed' }
}

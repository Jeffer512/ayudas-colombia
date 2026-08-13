import type {
  AcopioCenterUncheckedCreateInput,
  ReportUncheckedCreateInput,
  ReporterUncheckedCreateInput,
} from '@prisma/client'
import { TYPE_DIRECTION } from '../src/constants.js'
import { prisma } from '../src/db.js'

export async function ensureCity() {
  const existing = await prisma.city.findUnique({ where: { code: 'pereira' } })
  if (existing) return existing
  return prisma.city.create({
    data: {
      code: 'pereira',
      name: 'Pereira',
      department: 'Risaralda',
      centerLat: 4.8133,
      centerLng: -75.6961,
    },
  })
}

export async function createReporter(
  overrides: Partial<ReporterUncheckedCreateInput> = {},
) {
  return prisma.reporter.create({
    data: {
      contactType: 'individual',
      name: 'Juan Pérez',
      phone: '3105551234',
      ...overrides,
    },
  })
}

export async function createReport(
  reportData: Partial<ReportUncheckedCreateInput> = {},
  reporterData: Partial<ReporterUncheckedCreateInput> = {},
) {
  const city = await ensureCity()
  const reporter = await createReporter(reporterData)
  const type = reportData.type ?? 'volunteers_request'
  const direction = reportData.direction ?? TYPE_DIRECTION[type] ?? 'info'
  return prisma.report.create({
    data: {
      type,
      direction,
      urgency: 'medium',
      status: 'open',
      title: 'Necesitamos voluntarios en el Centro',
      description: 'Se requiere ayuda para mover escombros en la calle 12.',
      cityId: city.id,
      reporterId: reporter.id,
      resolveCode: '1234',
      ...reportData,
      events: {
        create: {
          status: 'open',
          actorName: 'Juan Pérez',
          note: 'Reporte creado',
        },
      },
    },
    include: { city: true, reporter: true, events: true },
  })
}

export async function createAcopio(
  data: Partial<AcopioCenterUncheckedCreateInput> = {},
) {
  const city = await ensureCity()
  return prisma.acopioCenter.create({
    data: {
      type: 'ciudadano',
      name: 'Centro cívico de ayuda',
      lat: 4.8133,
      lng: -75.6961,
      cityId: city.id,
      ...data,
    },
    include: { city: true },
  })
}
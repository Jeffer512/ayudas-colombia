import type {
  ReportUncheckedCreateInput,
  ReporterUncheckedCreateInput,
} from '@prisma/client'
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
  return prisma.report.create({
    data: {
      type: 'volunteers_request',
      urgency: 'medium',
      status: 'open',
      title: 'Necesitamos voluntarios en el Centro',
      description: 'Se requiere ayuda para mover escombros en la calle 12.',
      cityId: city.id,
      reporterId: reporter.id,
      phoneVerify: '1234',
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
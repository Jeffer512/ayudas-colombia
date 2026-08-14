import type {
  AcopioCenterUncheckedCreateInput,
  AvisoUncheckedCreateInput,
  OfferUncheckedCreateInput,
  RequestUncheckedCreateInput,
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
      name: 'Juan Pérez',
      phone: '3105551234',
      ...overrides,
    },
  })
}

export async function createRequest(
  requestData: Partial<RequestUncheckedCreateInput> = {},
  reporterData: Partial<ReporterUncheckedCreateInput> = {},
) {
  const city = await ensureCity()
  const reporter = await createReporter(reporterData)
  return prisma.request.create({
    data: {
      type: 'volunteers_request',
      urgency: 'medium',
      status: 'open',
      title: 'Necesitamos voluntarios en el Centro',
      description: 'Se requiere ayuda para mover escombros en la calle 12.',
      cityId: city.id,
      reporterId: reporter.id,
      resolveCode: '1234',
      ...requestData,
      events: {
        create: {
          status: 'open',
          actorName: 'Juan Pérez',
          note: 'Solicitud creada',
        },
      },
    },
    include: { city: true, reporter: true, events: true },
  })
}

export async function createOffer(
  offerData: Partial<OfferUncheckedCreateInput> = {},
) {
  const city = await ensureCity()
  const reporter = await createReporter()
  return prisma.offer.create({
    data: {
      type: 'supplies_offered',
      status: 'open',
      title: 'Ofrezco suministros para repartir',
      description: 'Tengo agua y comida para entregar a las familias afectadas.',
      cityId: city.id,
      reporterId: reporter.id,
      resolveCode: '1234',
      ...offerData,
    },
    include: { city: true, reporter: true },
  })
}

export async function createAviso(avisoData: Partial<AvisoUncheckedCreateInput> = {}) {
  const city = await ensureCity()
  const reporter = await createReporter()
  return prisma.aviso.create({
    data: {
      type: 'info',
      urgency: 'medium',
      status: 'open',
      title: 'Punto de distribución de agua funcionando',
      description: 'El parque principal reparte agua desde las 7am.',
      cityId: city.id,
      reporterId: reporter.id,
      ...avisoData,
    },
    include: { city: true, reporter: true },
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
      resolveCode: '1234',
      ...data,
    },
    include: { city: true },
  })
}
import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { cities } from './cities.js'
import { hashResolveCode } from '../src/lib/verification.js'

const prisma = new PrismaClient()

type SampleEntry = {
  title: string
  description: string
  status: 'open' | 'resolved'
  urgency: 'critical' | 'high' | 'medium' | 'low'
  address: string
  lat: number | null
  lng: number | null
  transport?: 'can_transport' | 'needs_transport'
  photoUrl?: string
  reporter: { name: string; phone: string }
}

type SampleOffer = {
  type: 'supplies_offered' | 'volunteers_offered' | 'transport_offered'
  status: 'open' | 'in_transit' | 'fulfilled' | 'unavailable'
  title: string
  description: string
  address: string
  lat: number | null
  lng: number | null
  transport?: 'can_transport' | 'needs_transport'
  reporter: { name: string; phone: string }
}

const sampleRequests: Record<string, SampleEntry> = {
  missing_person: {
    title: 'Se busca a Carlos Ramírez, 62 años',
    description:
      'Carlos Ramírez, de 62 años, salió a comprar medicinas el martes y no regresó. Vestía camisa verde y tenía dificultad para caminar.',
    status: 'open',
    urgency: 'critical',
    address: 'Barrio Kennedy, cerca de la avenida 30 de agosto',
    lat: 4.8,
    lng: -75.72,
    reporter: { name: 'Lucía Ramírez', phone: '3105551001' },
  },
  missing_pet: {
    title: 'Perro Golden perdido en zona de Villa Verde',
    description:
      'Se perdió un golden retriever llamado Tobi en Villa Verde durante las lluvias del sábado. Es muy querido por los niños del conjunto.',
    status: 'open',
    urgency: 'low',
    address: 'Villa Verde, conjunto Los Alamos',
    lat: 4.82,
    lng: -75.68,
    photoUrl: 'https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=800&q=80',
    reporter: { name: 'Andrés Giraldo', phone: '3105551002' },
  },
  supplies_request: {
    title: 'Necesitamos agua potable en el Centro',
    description:
      'Las familias de la cuadra de la iglesia requieren agua para cocinar y beber. Hay más de 20 familias afectadas desde el corte del suministro. Podemos recogerla si hay forma de transportarla.',
    status: 'open',
    urgency: 'high',
    address: 'Centro, calle 12 #4-50 junto a la iglesia',
    lat: 4.8102,
    lng: -75.698,
    transport: 'needs_transport',
    reporter: { name: 'María Gómez', phone: '3158765432' },
  },
  volunteers_request: {
    title: 'Voluntarios para el albergue del barrio Cuba',
    description:
      'Se necesita gente para repartir comida y organizar los kits de aseo en el albergue temporal que abrió la junta de acción comunal.',
    status: 'open',
    urgency: 'medium',
    address: 'Barrio Cuba, salón comunal',
    lat: 4.82,
    lng: -75.71,
    reporter: {
      name: 'Laura Cifuentes',
      phone: '3100000000',
    },
  },
  medical_request: {
    title: 'Se necesita enfermera para adulto mayor lesionado',
    description:
      'Un vecino de 78 años se lastimó al evacuar y necesita curaciones en casa mientras llega la atención médica.',
    status: 'open',
    urgency: 'high',
    address: 'Barrio La Libertad, carrera 15 #30-10',
    lat: 4.8005,
    lng: -75.6904,
    reporter: { name: 'Dora Londoño', phone: '3105551004' },
  },
}

const sampleOffers: SampleOffer[] = [
  {
    type: 'supplies_offered',
    status: 'open',
    title: 'Ofrezco 100 kits de aseo para repartir',
    description:
      'Una bodega local puso a disposición 100 kits de aseo básico. Se coordina la entrega con los centros de acopio. Cuento con vehículo para entregarlos.',
    address: 'Bodega Distrisalud, km 5',
    lat: 4.8203,
    lng: -75.7205,
    transport: 'can_transport',
    reporter: {
      name: 'Carmen Vila',
      phone: '3105551006',
    },
  },
  {
    type: 'supplies_offered',
    status: 'open',
    title: '50 cobijas y colchonetas listas en el barrio Kennedy',
    description:
      'Reunimos 50 cobijas y 30 colchonetas para entregar a las familias de la zona alta. Ya están empacadas, solo falta quién las lleve al punto de entrega.',
    address: 'Barrio Kennedy, bodega comunal calle 25',
    lat: 4.8002,
    lng: -75.7201,
    transport: 'needs_transport',
    reporter: { name: 'Lucía Ramírez', phone: '3105551001' },
  },
  {
    type: 'supplies_offered',
    status: 'open',
    title: '40 mercados de comida para repartir',
    description:
      'Una empresa donó 40 mercados completos con granos, aceite y enlatados. Están en la bodega de la fundación y necesitan transporte hasta los barrios afectados.',
    address: 'Fundación Manos Abiertas, carrera 18 #32-14',
    lat: 4.8067,
    lng: -75.704,
    transport: 'needs_transport',
    reporter: { name: 'Pedro Salazar', phone: '3105551003' },
  },
  {
    type: 'supplies_offered',
    status: 'open',
    title: 'Donación de agua embotellada en el Centro',
    description:
      '12 estibas de agua embotellada esperan traslado desde la plaza de mercado hasta los puntos de distribución del parque principal.',
    address: 'Plaza de mercado, costado norte',
    lat: 4.8112,
    lng: -75.699,
    transport: 'needs_transport',
    reporter: { name: 'María Gómez', phone: '3158765432' },
  },
  {
    type: 'volunteers_offered',
    status: 'open',
    title: 'Grupo de brigadistas disponible el fin de semana',
    description:
      '10 brigadistas de primeros auxilios pueden apoyar jornadas de evacuación y atención este fin de semana. Traemos nuestro propio equipo.',
    address: 'Base operativa, zona industrial',
    lat: 4.8156,
    lng: -75.705,
    reporter: {
      name: 'Óscar Prieto',
      phone: '3105551007',
    },
  },
  {
    type: 'transport_offered',
    status: 'fulfilled',
    title: 'Camioneta disponible para traslados de carga',
    description:
      'Una camioneta con estacas puede ayudar a mover donaciones entre centros de acopio. Sin costo para la comunidad.',
    address: 'Barrio Providencia, parqueadero público',
    lat: 4.8088,
    lng: -75.7033,
    reporter: { name: 'Rubén Castaño', phone: '3105551009' },
  },
]

const sampleAvisos: Omit<SampleEntry, 'status'>[] = [
  {
    title: 'Daños en la vía de acceso a la vereda El Tigre',
    description:
      'El deslizamiento bloqueó parte de la vía principal y hay riesgo en dos viviendas cercanas. Se recomienda no transitar de noche.',
    urgency: 'high',
    address: 'Vereda El Tigre, km 3',
    lat: 4.84,
    lng: -75.73,
    reporter: { name: 'Rosalba Duque', phone: '3105551010' },
  },
  {
    title: 'Punto de distribución de agua funcionando',
    description:
      'El parque principal está funcionando como punto de distribución de agua desde las 7am. Llevar recipientes. Capacidad limitada.',
    urgency: 'medium',
    address: 'Parque principal, costado oriental',
    lat: 4.8135,
    lng: -75.6965,
    reporter: {
      name: 'Nataly Trujillo',
      phone: '3105551011',
    },
  },
]

const sampleOrgs = [
  {
    type: 'oficial',
    category: 'acopio',
    name: 'Centro de acopio central (Coliseo)',
    description:
      'Centro principal coordinado por la red de emergencias. Recibe agua, alimentos no perecederos, ropa, kits de aseo y medicamentos no vencidos.',
    address: 'Coliseo Municipal, calle 14 #18-25',
    lat: 4.8171,
    lng: -75.6999,
    contactName: 'Nataly Trujillo',
    contactPhone: '3105551011',
    hours: '7am - 9pm',
    accepts: 'Agua, alimentos no perecederos, ropa, kits de aseo',
    status: 'open',
  },
  {
    type: 'ciudadano',
    category: 'acopio',
    name: 'Centro ciudadano La Florida',
    description:
      'Recolecta donaciones para las familias de la zona sur. Organizado por la junta de acción comunal.',
    address: 'Carrera 20 #40-25',
    lat: 4.8033,
    lng: -75.6961,
    contactName: 'María Gómez',
    contactPhone: '3158765432',
    hours: '8am - 6pm',
    accepts: 'Alimentos no perecederos, útiles de aseo',
    status: 'open',
  },
  {
    type: 'ciudadano',
    category: 'acopio',
    name: 'Bodega vecinal Villa Verde',
    description:
      'Punto de acopio pequeño en el conjunto residencial. Preferible coordinar antes de llevar cargas grandes.',
    address: 'Villa Verde, conjunto Los Alamos, torre 2',
    lat: 4.8205,
    lng: -75.6812,
    contactName: 'Andrés Giraldo',
    contactPhone: '3105551002',
    hours: 'Lunes a sábado, 9am - 5pm',
    accepts: 'Ropa, cobijas, agua embotellada',
    status: 'open',
  },
  {
    type: 'ciudadano',
    category: 'albergue',
    name: 'Albergue temporal Barrio Cuba',
    description:
      'Albergue temporal montado en el salón comunal mientras dure la emergencia. Recibe familias evacuadas y voluntarios para cocina y limpieza.',
    address: 'Salón comunal, barrio Cuba',
    lat: 4.82,
    lng: -75.7099,
    contactName: 'Laura Cifuentes',
    contactPhone: '3100000000',
    hours: 'Por confirmar cada día',
    accepts: 'Colchonetas, cobijas, kits de aseo',
    status: 'open',
  },
  {
    type: 'ciudadano',
    category: 'psicologia',
    name: 'Equipo de apoyo psicosocial',
    description:
      'Profesionales en psicología ofrecen atención en crisis y contención emocional a familias afectadas por la emergencia.',
    address: 'Consultorio 3, edificio Galería',
    lat: 4.8115,
    lng: -75.7008,
    contactName: 'Dora Londoño',
    contactPhone: '3105551004',
    hours: '9am - 5pm',
    accepts: 'Citas de primera atención en el punto fijo',
    status: 'open',
  },
  {
    type: 'ciudadano',
    category: 'voluntarios',
    name: 'Red de voluntarios Jóvenes al rescate',
    description:
      'Grupo de 40 voluntarios disponibles para evacuaciones, reparto de donaciones y apoyo logístico.',
    address: 'Casa de la juventud, carrera 8 #22-10',
    lat: 4.8188,
    lng: -75.7051,
    contactName: 'Óscar Prieto',
    contactPhone: '3105551007',
    hours: '8am - 8pm',
    accepts: 'Inscripción de voluntarios',
    status: 'open',
  },
]

async function createReporter(entry: { reporter: { name: string; phone: string } }) {
  return prisma.reporter.create({
    data: {
      name: entry.reporter.name,
      phone: entry.reporter.phone,
    },
  })
}

function eventsFor(type: 'request', status: string, actorName: string) {
  const events: { status: string; actorName: string; note: string }[] = [
    { status: 'open', actorName, note: 'Solicitud creada' },
  ]
  if (status === 'resolved') {
    events.push({
      status: 'resolved',
      actorName,
      note: 'Se resolvió con el código de cierre',
    })
  }
  return events
}

async function main() {
  const isProd = process.env.NODE_ENV === 'production'
  const databaseUrl = process.env.DATABASE_URL ?? ''
  const host = databaseUrl ? new URL(databaseUrl).hostname : ''
  const localHosts = new Set(['localhost', '127.0.0.1', '::1'])
  if (isProd || !localHosts.has(host)) {
    console.error(
      'seed-dev solo se ejecuta en desarrollo contra la base local de Docker ' +
        '(borra todos los datos). Usa "npm run db:seed:prod -w server" para sembrar ' +
        'solo las ciudades en otros entornos.',
    )
    process.exit(1)
  }

  const seeded = []
  for (const entry of cities) {
    const saved = await prisma.city.upsert({
      where: { code: entry.code },
      update: {},
      create: entry,
    })
    seeded.push(saved)
    console.log(`Ciudad sembrada: ${saved.name}`)
  }
  const city = seeded.find((saved) => saved.code === cities[0].code) ?? seeded[0]

  await prisma.requestEvent.deleteMany()
  await prisma.request.deleteMany()
  await prisma.avisoMark.deleteMany()
  await prisma.aviso.deleteMany()
  await prisma.offerClaim.deleteMany()
  await prisma.offer.deleteMany()
  await prisma.reporter.deleteMany()
  await prisma.helpOrgStaff.deleteMany()
  await prisma.helpOrg.deleteMany()

  for (const [type, sample] of Object.entries(sampleRequests)) {
    const reporter = await createReporter(sample)
    const request = await prisma.request.create({
      data: {
        type,
        transport: sample.transport ?? null,
        urgency: sample.urgency,
        status: sample.status,
        title: sample.title,
        description: sample.description,
        photoUrl: sample.photoUrl ?? null,
        address: sample.address,
        lat: sample.lat,
        lng: sample.lng,
        cityId: city.id,
        reporterId: reporter.id,
        resolveCode: await hashResolveCode('1234'),
        resolvedAt: sample.status === 'resolved' ? new Date() : null,
        events: { create: eventsFor('request', sample.status, sample.reporter.name) },
      },
    })
    console.log(`Solicitud (${type}/${sample.status}): ${request.title.slice(0, 40)}`)
  }

  for (const sample of sampleOffers) {
    const reporter = await createReporter(sample)
    const offer = await prisma.offer.create({
      data: {
        type: sample.type,
        transport: sample.transport ?? null,
        status: sample.status,
        title: sample.title,
        description: sample.description,
        address: sample.address,
        lat: sample.lat,
        lng: sample.lng,
        cityId: city.id,
        reporterId: reporter.id,
        resolveCode: await hashResolveCode('1234'),
        resolvedAt: sample.status === 'fulfilled' ? new Date() : null,
      },
    })
    console.log(`Oferta (${offer.type}/${offer.status}): ${offer.title.slice(0, 40)}`)
  }

  for (const [i, sample] of sampleAvisos.entries()) {
    const reporter = await createReporter(sample as unknown as SampleEntry)
    const aviso = await prisma.aviso.create({
      data: {
        type: 'info',
        urgency: sample.urgency,
        status: i === 0 ? 'closed' : 'open',
        title: sample.title,
        description: sample.description,
        address: sample.address,
        lat: sample.lat,
        lng: sample.lng,
        cityId: city.id,
        reporterId: reporter.id,
        marks: { create: i === 0 ? [{ markerId: 'seed-1' }, { markerId: 'seed-2' }, { markerId: 'seed-3' }] : [] },
      },
    })
    console.log(`Aviso (info/${aviso.status}): ${aviso.title.slice(0, 40)}`)
  }

  for (const org of sampleOrgs) {
    const created = await prisma.helpOrg.create({
      data: { ...org, cityId: city.id },
    })
    console.log(
      `Red de ayudas (${created.category}/${created.type}/${created.status}): ${created.name}`,
    )
  }

  await prisma.helpOrgItem.deleteMany()
  const [coliseo] = await prisma.helpOrg.findMany({
    where: { cityId: city.id },
    orderBy: { name: 'asc' },
  })
  if (coliseo) {
    const sampleItems = [
      { kind: 'available', name: 'Agua embotellada', quantity: 200, unit: 'botellas' },
      { kind: 'available', name: 'Kits de aseo', quantity: 60, unit: 'kits' },
      { kind: 'available', name: 'Ropa de abrigo', quantity: 0, unit: 'prendas' },
      { kind: 'needed', name: 'Colchonetas', quantity: 40, unit: 'unidades' },
      { kind: 'needed', name: 'Cobijas', quantity: 25, unit: 'unidades' },
      { kind: 'needed', name: 'Voluntarios para reparto', quantity: 10, unit: 'personas' },
    ]
    for (const item of sampleItems) {
      await prisma.helpOrgItem.create({
        data: { orgId: coliseo.id, ...item },
      })
    }
    console.log(`Inventario sembrado para: ${coliseo.name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
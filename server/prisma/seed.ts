import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cities = [
  {
    code: 'pereira',
    name: 'Pereira',
    department: 'Risaralda',
    centerLat: 4.8133,
    centerLng: -75.6961,
  },
]

type SampleEntry = {
  title: string
  description: string
  status: 'open' | 'in_progress' | 'resolved'
  urgency: 'critical' | 'high' | 'medium' | 'low'
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
    status: 'in_progress',
    urgency: 'medium',
    address: 'Barrio Cuba, salón comunal',
    lat: 4.82,
    lng: -75.71,
    reporter: {
      name: 'Laura Cifuentes',
      phone: '3100000000',
    },
  },
  shelter_request: {
    title: 'Familia requiere refugio tras colapso de vivienda',
    description:
      'Una familia de 4 personas quedó sin techo luego del colapso de su vivienda en la zona alta. Necesitan refugio temporal por varias semanas.',
    status: 'open',
    urgency: 'critical',
    address: 'Zona alta, vereda El Tigre',
    lat: 4.8401,
    lng: -75.7302,
    reporter: { name: 'Pedro Salazar', phone: '3105551003' },
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
  transport_request: {
    title: 'Requieren transporte para trasladar insumos médicos',
    description:
      'Hay medicamentos y material sanitario en la bodega del hospital para llevar a los puestos de salud de las veredas.',
    status: 'open',
    urgency: 'medium',
    address: 'Hospital San Jorge, bodega 2',
    lat: 4.8112,
    lng: -75.699,
    transport: 'needs_transport',
    reporter: { name: 'Jairo Mejía', phone: '3105551005' },
  },
}

const sampleOffers: SampleEntry[] = [
  {
    title: 'Ofrezco 100 kits de aseo para repartir',
    description:
      'Una bodega local puso a disposición 100 kits de aseo básico. Se coordina la entrega con los centros de acopio. Cuento con vehículo para entregarlos.',
    status: 'open',
    urgency: 'medium',
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
    title: 'Grupo de brigadistas disponible el fin de semana',
    description:
      '10 brigadistas de primeros auxilios pueden apoyar jornadas de evacuación y atención este fin de semana. Traemos nuestro propio equipo.',
    status: 'open',
    urgency: 'medium',
    address: 'Base operativa, zona industrial',
    lat: 4.8156,
    lng: -75.705,
    reporter: {
      name: 'Óscar Prieto',
      phone: '3105551007',
    },
  },
  {
    title: 'Dispongo de casa para acoger 5 personas',
    description:
      'Ofrezco mi casa en las afueras para alojar hasta 5 personas por tiempo indefinido. Hay cocina, baño y espacio para dos familias.',
    status: 'open',
    urgency: 'low',
    address: 'Vereda Yarumal, finca La Esperanza',
    lat: 4.79,
    lng: -75.66,
    reporter: { name: 'Héctor Uribe', phone: '3105551008' },
  },
  {
    title: 'Camioneta disponible para traslados de carga',
    description:
      'Una camioneta con estacas puede ayudar a mover donaciones entre centros de acopio. Sin costo para la comunidad.',
    status: 'open',
    urgency: 'low',
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

const sampleAcopios = [
  {
    type: 'oficial',
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
    name: 'Centro de acopio Barrio Cuba',
    description:
      'Centro temporal montado en el salón comunal mientras dure la emergencia.',
    address: 'Salón comunal, barrio Cuba',
    lat: 4.82,
    lng: -75.7099,
    contactName: 'Laura Cifuentes',
    contactPhone: '3100000000',
    hours: 'Por confirmar cada día',
    accepts: 'Víveres y kits de aseo',
    status: 'closed',
  },
]

async function createReporter(entry: SampleEntry) {
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
  if (status === 'in_progress') {
    events.push({
      status: 'in_progress',
      actorName: 'Voluntario asignado',
      note: 'Ya se está coordinando la ayuda',
    })
  }
  if (status === 'resolved') {
    events.push(
      { status: 'in_progress', actorName: 'Coordinación de ayuda', note: 'Se empezó a atender el caso' },
      { status: 'resolved', actorName, note: 'Se resolvió con el código de cierre' },
    )
  }
  return events
}

async function main() {
  const city = await prisma.city.upsert({
    where: { code: cities[0].code },
    update: {},
    create: cities[0],
  })
  console.log(`Ciudad sembrada: ${city.name}`)

  await prisma.requestEvent.deleteMany()
  await prisma.request.deleteMany()
  await prisma.avisoMark.deleteMany()
  await prisma.aviso.deleteMany()
  await prisma.offer.deleteMany()
  await prisma.reporter.deleteMany()
  await prisma.acopioCenter.deleteMany()

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
        address: sample.address,
        lat: sample.lat,
        lng: sample.lng,
        cityId: city.id,
        reporterId: reporter.id,
        resolveCode: '1234',
        resolvedAt: sample.status === 'resolved' ? new Date() : null,
        events: { create: eventsFor('request', sample.status, sample.reporter.name) },
      },
    })
    console.log(`Solicitud (${type}/${sample.status}): ${request.title.slice(0, 40)}`)
  }

  for (const [i, sample] of sampleOffers.entries()) {
    const reporter = await createReporter(sample)
    const fulfilled = i === 3
    const offer = await prisma.offer.create({
      data: {
        type: ['supplies_offered', 'volunteers_offered', 'shelter_offered', 'transport_offered'][i],
        transport: sample.transport ?? null,
        status: fulfilled ? 'fulfilled' : 'open',
        title: sample.title,
        description: sample.description,
        address: sample.address,
        lat: sample.lat,
        lng: sample.lng,
        cityId: city.id,
        reporterId: reporter.id,
        resolveCode: '1234',
        resolvedAt: fulfilled ? new Date() : null,
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

  for (const acopio of sampleAcopios) {
    const created = await prisma.acopioCenter.create({
      data: { ...acopio, cityId: city.id, resolveCode: '1234' },
    })
    console.log(`Centro de acopio (${created.type}/${created.status}): ${created.name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
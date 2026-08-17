import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createOffer, ensureCity } from './factories.js'

const app = createApp()

function tokenFrom(body: { verificationUrl?: string | null }): string | undefined {
  if (!body.verificationUrl) return undefined
  const url = new URL(body.verificationUrl, 'http://localhost')
  return url.searchParams.get('token') ?? undefined
}

async function loginCitizen(email = 'voluntaria@correo.org') {
  const res = await request(app).post('/api/auth/register').send({
    email,
    password: 'contrasena-segura',
    name: 'Voluntaria',
  })
  await request(app).post('/api/auth/verify-email').send({ token: tokenFrom(res.body) })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password: 'contrasena-segura' })
  return agent
}

const validOffer = {
  type: 'supplies_offered',
  title: 'Ofrezco 100 kits de aseo',
  description: 'Pongo a disposición kits de aseo básico para las familias afectadas.',
  address: 'Carrera 20 #40-25',
  lat: 4.8133,
  lng: -75.6961,
  cityCode: 'pereira',
  reporter: {
    name: 'Carmen Vila',
    phone: '3105552222',
  },
}

describe('GET /api/offers', () => {
  it('devuelve listado vacío sin ofertas', async () => {
    const res = await request(app).get('/api/offers')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ offers: [], total: 0, limit: 50, offset: 0 })
  })

  it('lista ofertas sin urgencia ni código', async () => {
    await createOffer({ title: 'Camioneta disponible' })
    const res = await request(app).get('/api/offers')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    const offer = res.body.offers[0]
    expect(offer).toMatchObject({
      status: 'open',
      type: 'supplies_offered',
      city: { code: 'pereira' },
    })
    expect(offer.urgency).toBeUndefined()
    expect(offer.resolveCode).toBeUndefined()
    expect(offer.events).toBeUndefined()
  })

  it('el filtro active solo incluye ofertas abiertas', async () => {
    await createOffer({ status: 'open' })
    await createOffer({ status: 'fulfilled', resolvedAt: new Date() })
    const res = await request(app).get('/api/offers').query({ status: 'active' })
    expect(res.body.total).toBe(1)
  })
})

describe('POST /api/offers', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.offer.deleteMany()
  })

  it('crea una oferta abierta sin urgencia y devuelve el código una vez', async () => {
    const res = await request(app).post('/api/offers').send(validOffer)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'supplies_offered',
      status: 'open',
      title: validOffer.title,
    })
    expect(res.body.resolveCode).toMatch(/^\d{4}$/)

    const detail = await request(app).get(`/api/offers/${res.body.id}`)
    expect(detail.body.resolveCode).toBeUndefined()
  })

  it('crea una oferta sin descripción guardando null', async () => {
    const res = await request(app)
      .post('/api/offers')
      .send({
        type: 'supplies_offered',
        title: 'Ofrezco 100 kits de aseo',
        address: 'Carrera 20 #40-25',
        cityCode: 'pereira',
        reporter: { name: 'Carmen Vila', phone: '3105552222' },
      })

    expect(res.status).toBe(201)
    expect(res.body.description).toBeNull()

    const stored = await prisma.offer.findUnique({ where: { id: res.body.id } })
    expect(stored?.description).toBeNull()
  })

  it('permite transporte solo para ofertas de suministros', async () => {
    const ok = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, transport: 'can_transport' })
    expect(ok.status).toBe(201)
    expect(ok.body.transport).toBe('can_transport')

    const bad = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, type: 'shelter_offered', transport: 'needs_transport' })
    expect(bad.status).toBe(400)
  })

  it('rechaza tipos de oferta inválidos y coordenadas fuera de rango', async () => {
    const badType = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, type: 'supplies_request' })
    expect(badType.status).toBe(400)

    const badLat = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, lat: 120 })
    expect(badLat.status).toBe(400)
  })

  it('guarda ítems y zona en ofertas de suministros', async () => {
    const res = await request(app)
      .post('/api/offers')
      .send({
        ...validOffer,
        items: ['Agua', 'Galletas'],
        zone: 'Barrio San Nicolás',
        transport: 'can_transport',
      })

    expect(res.status).toBe(201)
    expect(res.body.items).toEqual(['Agua', 'Galletas'])
    expect(res.body.zone).toBe('Barrio San Nicolás')
    expect(res.body.transport).toBe('can_transport')

    const detail = await request(app).get(`/api/offers/${res.body.id}`)
    expect(detail.body.items).toEqual(['Agua', 'Galletas'])
    expect(detail.body.zone).toBe('Barrio San Nicolás')
  })

  it('guarda la ficha de voluntario y la zona en ofertas de voluntariado', async () => {
    const agent = await loginCitizen()
    const res = await agent
      .post('/api/offers')
      .send({
        ...validOffer,
        type: 'volunteers_offered',
        title: 'Voluntaria para atender albergue',
        description: 'Ayudo en la recepción y entrega de donaciones en el albergue.',
        zone: 'Dosquebradas',
        volunteer: {
          capabilities: ['Atención al público', 'Primeros auxilios'],
          availability: 'Fines de semana y tarde de lunes a viernes',
        },
      })

    expect(res.status).toBe(201)
    expect(res.body.zone).toBe('Dosquebradas')
    expect(res.body.volunteer).toEqual({
      capabilities: ['Atención al público', 'Primeros auxilios'],
      availability: 'Fines de semana y tarde de lunes a viernes',
    })

    const detail = await agent.get(`/api/offers/${res.body.id}`)
    expect(detail.body.volunteer.capabilities).toEqual([
      'Atención al público',
      'Primeros auxilios',
    ])
  })

  it('guarda los datos del vehículo en ofertas de transporte', async () => {
    const res = await request(app)
      .post('/api/offers')
      .send({
        ...validOffer,
        type: 'transport_offered',
        title: 'Camioneta disponible para carga',
        description: 'Ofrezco mi camioneta para trasladar donaciones dentro de la ciudad.',
        vehicle: { vehicleType: 'Camioneta', capacity: '2 toneladas' },
      })

    expect(res.status).toBe(201)
    expect(res.body.vehicle).toEqual({
      vehicleType: 'Camioneta',
      capacity: '2 toneladas',
    })

    const detail = await request(app).get(`/api/offers/${res.body.id}`)
    expect(detail.body.vehicle).toEqual({
      vehicleType: 'Camioneta',
      capacity: '2 toneladas',
    })
  })

  it('rechaza datos de rol que no corresponden al tipo de oferta', async () => {
    const volunteerOnSupplies = await request(app)
      .post('/api/offers')
      .send({
        ...validOffer,
        volunteer: { capabilities: ['Cocina'] },
      })
    expect(volunteerOnSupplies.status).toBe(400)

    const vehicleOnVolunteers = await request(app)
      .post('/api/offers')
      .send({
        ...validOffer,
        type: 'volunteers_offered',
        title: 'Voluntaria en cocina',
        description: 'Ayudo a preparar alimentos en la sede de la cruz roja.',
        vehicle: { vehicleType: 'Motocicleta' },
      })
    expect(vehicleOnVolunteers.status).toBe(400)

    const itemsOnVolunteers = await request(app)
      .post('/api/offers')
      .send({
        ...validOffer,
        type: 'volunteers_offered',
        title: 'Voluntaria en cocina',
        description: 'Ayudo a preparar alimentos en la sede de la cruz roja.',
        items: ['Harina'],
      })
    expect(itemsOnVolunteers.status).toBe(400)
  })
})

describe('POST /api/offers/:id/status', () => {
  it('marca como entregada con el código del autor', async () => {
    const offer = await createOffer()
    const res = await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'fulfilled', resolveCode: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('fulfilled')
    expect(res.body.resolvedAt).not.toBeNull()
  })

  it('rechaza cerrar sin el código correcto', async () => {
    const offer = await createOffer()
    const res = await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'unavailable', resolveCode: '9999' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })

  it('permite reabrir una oferta no disponible', async () => {
    const offer = await createOffer({ status: 'unavailable' })
    const res = await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
  })

  it('rechaza una transición no permitida', async () => {
    const offer = await createOffer({ status: 'fulfilled', resolvedAt: new Date() })
    const res = await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/offers/:id/status · dueño de la oferta', () => {
  beforeEach(async () => {
    await ensureCity()
  })

  it('el dueño cierra su oferta sin código de cierre', async () => {
    const agent = await loginCitizen('donante@correo.org')
    const created = await agent
      .post('/api/offers')
      .send({ ...validOffer, reporter: { name: 'Donante', phone: '3101113333' } })
    expect(created.status).toBe(201)
    expect(created.body.isOwner).toBe(true)

    const closed = await agent
      .post(`/api/offers/${created.body.id}/status`)
      .send({ status: 'fulfilled', note: 'Entregado por quien lo ofreció' })

    expect(closed.status).toBe(200)
    expect(closed.body.status).toBe('fulfilled')
  })

  it('el dueño reabre su oferta no disponible sin código', async () => {
    const agent = await loginCitizen('donante2@correo.org')
    const created = await agent
      .post('/api/offers')
      .send({ ...validOffer, reporter: { name: 'Donante', phone: '3101113333' } })
    await agent
      .post(`/api/offers/${created.body.id}/status`)
      .send({ status: 'unavailable', note: 'Cerrada por el dueño' })

    const reopened = await agent
      .post(`/api/offers/${created.body.id}/status`)
      .send({ status: 'open', note: 'Reabierta por el dueño' })

    expect(reopened.status).toBe(200)
    expect(reopened.body.status).toBe('open')
  })

  it('un usuario ajeno no cierra sin el código aunque tenga sesión', async () => {
    const owner = await loginCitizen('donante3@correo.org')
    const created = await owner
      .post('/api/offers')
      .send({ ...validOffer, reporter: { name: 'Donante', phone: '3101113333' } })

    const stranger = await loginCitizen('extraño@correo.org')
    const res = await stranger
      .post(`/api/offers/${created.body.id}/status`)
      .send({ status: 'fulfilled', note: 'Intento ajeno' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })
})

describe('GET /api/offers con forTransport', () => {
  it('solo muestra ofertas de suministros que necesitan transporte y están abiertas', async () => {
    await createOffer({ transport: 'needs_transport' })
    await createOffer({ transport: 'can_transport' })
    await createOffer({ type: 'shelter_offered' })
    await createOffer({ type: 'transport_offered' })
    await createOffer({ transport: 'needs_transport', status: 'fulfilled', resolvedAt: new Date() })

    const res = await request(app).get('/api/offers').query({ forTransport: 'true' })

    expect(res.status).toBe(200)
    expect(res.body.offers).toHaveLength(1)
    expect(res.body.offers[0]).toMatchObject({
      type: 'supplies_offered',
      transport: 'needs_transport',
      status: 'open',
    })
  })

  it('solo muestra ofertas de suministros que necesitan transporte y ya fueron comprometidas', async () => {
    const agent = await loginCitizen()
    const claimed = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${claimed.id}/claim`)
    await createOffer({ transport: 'needs_transport' })
    await createOffer({ transport: 'needs_transport', status: 'fulfilled', resolvedAt: new Date() })

    const res = await request(app).get('/api/offers').query({ forTransport: 'assigned' })

    expect(res.status).toBe(200)
    expect(res.body.offers).toHaveLength(1)
    expect(res.body.offers[0]).toMatchObject({
      type: 'supplies_offered',
      transport: 'needs_transport',
      status: 'in_transit',
      claim: { status: 'committed', mine: false },
    })
  })
})

describe('POST /api/offers/:id/claim', () => {
  it('requiere sesión', async () => {
    const offer = await createOffer({ transport: 'needs_transport' })
    const res = await request(app).post(`/api/offers/${offer.id}/claim`)
    expect(res.status).toBe(401)
  })

  it('solo acepta ofertas de suministros que necesitan transporte', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'can_transport' })
    const res = await agent.post(`/api/offers/${offer.id}/claim`)
    expect(res.status).toBe(400)
  })

  it('reserva la oferta en tránsito con un único compromiso', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })

    const res = await agent.post(`/api/offers/${offer.id}/claim`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'in_transit',
      canClaim: false,
      claim: {
        status: 'committed',
        claimerName: 'Voluntaria',
      },
    })

    const twice = await agent.post(`/api/offers/${offer.id}/claim`)
    expect(twice.status).toBe(409)

    const claims = await prisma.offerClaim.findMany({ where: { offerId: offer.id } })
    expect(claims).toHaveLength(1)
    expect(claims[0]).toMatchObject({ status: 'committed', claimerId: claims[0].claimerId })
  })

  it('marca el compromiso como entregado cuando el donante cierra', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)

    const closed = await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'fulfilled', resolveCode: '1234' })

    expect(closed.status).toBe(200)
    expect(closed.body.status).toBe('fulfilled')
    expect(closed.body.claim).toBeNull()

    const claim = await prisma.offerClaim.findFirst({ where: { offerId: offer.id } })
    expect(claim?.status).toBe('delivered')
    expect(claim?.resolvedAt).not.toBeNull()
  })

  it('cancela el compromiso cuando el donante reabre la oferta', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)

    const reopened = await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })

    expect(reopened.status).toBe(200)
    expect(reopened.body.status).toBe('open')
    expect(reopened.body.canClaim).toBe(true)

    const claim = await prisma.offerClaim.findFirst({ where: { offerId: offer.id } })
    expect(claim?.status).toBe('cancelled')
  })

  it('la oferta reabierta se ofrece de nuevo en el centro de carga', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)
    await request(app)
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })

    const hub = await request(app).get('/api/offers').query({ forTransport: 'true' })
    expect(hub.body.offers).toHaveLength(1)
    expect(hub.body.offers[0].canClaim).toBe(true)
  })

  it('marca la oferta como de quien la reclama cuando está logueado', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })

    const res = await agent.post(`/api/offers/${offer.id}/claim`)

    expect(res.status).toBe(200)
    expect(res.body.claim).toMatchObject({ status: 'committed', mine: true })
  })

  it('solo deja que uno de dos reclamos simultáneos gane', async () => {
    const a = await loginCitizen()
    const b = await loginCitizen('segunda@correo.org')
    const offer = await createOffer({ transport: 'needs_transport' })

    const [ra, rb] = await Promise.all([
      a.post(`/api/offers/${offer.id}/claim`),
      b.post(`/api/offers/${offer.id}/claim`),
    ])

    const statuses = [ra.status, rb.status].sort()
    expect(statuses).toEqual([200, 409])

    const committed = await prisma.offerClaim.count({
      where: { offerId: offer.id, status: 'committed' },
    })
    expect(committed).toBe(1)
  })
})

describe('DELETE /api/offers/:id/claim', () => {
  it('requiere sesión', async () => {
    const offer = await createOffer({ transport: 'needs_transport' })
    const res = await request(app).delete(`/api/offers/${offer.id}/claim`)
    expect(res.status).toBe(401)
  })

  it('cancela el compromiso de quien la reclamó y vuelve a abrir la oferta', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)

    const res = await agent.delete(`/api/offers/${offer.id}/claim`)

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      status: 'open',
      canClaim: true,
      claim: null,
    })

    const claim = await prisma.offerClaim.findFirst({ where: { offerId: offer.id } })
    expect(claim?.status).toBe('cancelled')
    expect(claim?.resolvedAt).not.toBeNull()

    const hub = await request(app).get('/api/offers').query({ forTransport: 'true' })
    expect(hub.body.offers).toHaveLength(1)
    expect(hub.body.offers[0].canClaim).toBe(true)
  })

  it('impide cancelar el compromiso de otro usuario', async () => {
    const claimer = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })
    await claimer.post(`/api/offers/${offer.id}/claim`)

    const other = await loginCitizen('otra@correo.org')
    const res = await other.delete(`/api/offers/${offer.id}/claim`)

    expect(res.status).toBe(403)
    expect(res.body.error).toBe(
      'Solo quien se comprometió puede cancelar el compromiso',
    )

    const claim = await prisma.offerClaim.findFirst({ where: { offerId: offer.id } })
    expect(claim?.status).toBe('committed')
  })

  it('rechaza cancelar una oferta que no está en tránsito', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })

    const res = await agent.delete(`/api/offers/${offer.id}/claim`)

    expect(res.status).toBe(409)
    expect(res.body.error).toBe('Esta oferta no está siendo transportada')
  })

  it('solo deja que uno de dos cancelaciones simultáneas gane', async () => {
    const agent = await loginCitizen()
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)

    const [ra, rb] = await Promise.all([
      agent.delete(`/api/offers/${offer.id}/claim`),
      agent.delete(`/api/offers/${offer.id}/claim`),
    ])

    const statuses = [ra.status, rb.status].sort()
    expect(statuses).toEqual([200, 409])

    const offerRow = await prisma.offer.findUnique({ where: { id: offer.id } })
    expect(offerRow?.status).toBe('open')

    const cancelled = await prisma.offerClaim.count({
      where: { offerId: offer.id, status: 'cancelled' },
    })
    expect(cancelled).toBe(1)
  })
})

describe('PUT /api/offers/:id', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.offer.deleteMany()
  })

  it('edita una oferta abierta sin compromiso con el código de cierre', async () => {
    const created = await createOffer()
    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({
        title: 'Ofrezco 50 kits de aseo',
        description: 'Actualizado: kits de aseo y alimentos no perecederos.',
        items: ['Kits de aseo', 'Alimentos'],
        zone: 'Barrio El Poblado',
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      title: 'Ofrezco 50 kits de aseo',
      description: 'Actualizado: kits de aseo y alimentos no perecederos.',
      items: ['Kits de aseo', 'Alimentos'],
      zone: 'Barrio El Poblado',
    })
  })

  it('rechaza editar una oferta con compromiso de entrega', async () => {
    const agent = await loginCitizen()
    const created = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${created.id}/claim`)

    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '1234' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe(
      'Ya hay un compromiso de entrega, la oferta no se puede editar',
    )
  })

  it('rechaza editar una oferta ya entregada', async () => {
    const created = await createOffer({ status: 'fulfilled', resolvedAt: new Date() })
    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '1234' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Solo se puede editar una oferta abierta')
  })

  it('rechaza editar con un código incorrecto', async () => {
    const created = await createOffer()
    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '9999' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })

  it('no permite cambiar el tipo ni la ciudad', async () => {
    const created = await createOffer({ type: 'shelter_offered' })
    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({
        title: 'Otro título válido aquí',
        type: 'transport_offered',
        cityCode: 'manizales',
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body.type).toBe('shelter_offered')
    expect(res.body.city.code).toBe('pereira')
  })

  it('rechaza datos de rol que no corresponden al tipo de oferta', async () => {
    const supplies = await createOffer()
    const badVolunteer = await request(app)
      .put(`/api/offers/${supplies.id}`)
      .send({
        title: 'Otro título válido aquí',
        resolveCode: '1234',
        volunteer: { capabilities: ['Cocina'] },
      })
    expect(badVolunteer.status).toBe(400)

    const volunteer = await createOffer({ type: 'volunteers_offered' })
    const badItems = await request(app)
      .put(`/api/offers/${volunteer.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '1234', items: ['Harina'] })
    expect(badItems.status).toBe(400)
  })

  it('actualiza los detalles de voluntario de una oferta de voluntariado', async () => {
    const created = await createOffer({ type: 'volunteers_offered' })
    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({
        title: 'Voluntaria para atender albergue',
        volunteer: {
          capabilities: ['Atención al público', 'Cocina'],
          availability: 'Disponible toda la semana',
        },
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body.volunteer).toEqual({
      capabilities: ['Atención al público', 'Cocina'],
      availability: 'Disponible toda la semana',
    })
  })

  it('actualiza los datos de contacto del reporter', async () => {
    const created = await createOffer()
    const res = await request(app)
      .put(`/api/offers/${created.id}`)
      .send({
        title: 'Ofrezco suministros para repartir',
        reporter: { name: 'Carmen Vila', whatsapp: '3115554444' },
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body.reporter).toMatchObject({
      name: 'Carmen Vila',
      phone: null,
      whatsapp: '3115554444',
    })
  })

  it('el dueño edita su oferta sin código de cierre', async () => {
    const agent = await loginCitizen('edita-donante@correo.org')
    const created = await agent
      .post('/api/offers')
      .send({ ...validOffer, reporter: { name: 'Donante', phone: '3101113333' } })
    expect(created.status).toBe(201)
    expect(created.body.isOwner).toBe(true)

    const res = await agent
      .put(`/api/offers/${created.body.id}`)
      .send({ title: 'Oferta actualizada por su dueño' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Oferta actualizada por su dueño')
  })

  it('devuelve 404 para una oferta inexistente', async () => {
    const res = await request(app)
      .put('/api/offers/no-existe')
      .send({ title: 'Otro título válido aquí' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/offers/:id/status · voluntario comprometido', () => {
  it('el voluntario comprometido confirma la entrega sin pedir el código', async () => {
    const agent = await loginCitizen('repartidor@correo.org')
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)

    const delivered = await agent
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'fulfilled', note: 'Llegó a destino, entregado el kit' })

    expect(delivered.status).toBe(200)
    expect(delivered.body).toMatchObject({ status: 'fulfilled' })
    expect(delivered.body.claim).toBeNull()

    const claim = await prisma.offerClaim.findFirst({ where: { offerId: offer.id } })
    expect(claim?.status).toBe('delivered')
    expect(claim?.resolvedAt).not.toBeNull()
  })

  it('el voluntario comprometido no puede reabrir ni descartar la oferta', async () => {
    const agent = await loginCitizen('repartidor2@correo.org')
    const offer = await createOffer({ transport: 'needs_transport' })
    await agent.post(`/api/offers/${offer.id}/claim`)

    const reopened = await agent
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })
    expect(reopened.status).toBe(403)
    expect(reopened.body.error).toBe(
      'El voluntario comprometido solo puede confirmar la entrega',
    )

    const discarded = await agent
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'unavailable', resolveCode: '1234' })
    expect(discarded.status).toBe(403)

    const offerRow = await prisma.offer.findUnique({ where: { id: offer.id } })
    expect(offerRow?.status).toBe('in_transit')
  })

  it('un voluntario que no está comprometido sigue necesitando el código', async () => {
    const claimer = await loginCitizen()
    const stranger = await loginCitizen('otro-voluntario@correo.org')
    const offer = await createOffer({ transport: 'needs_transport' })
    await claimer.post(`/api/offers/${offer.id}/claim`)

    const res = await stranger
      .post(`/api/offers/${offer.id}/status`)
      .send({ status: 'fulfilled', note: 'No soy yo quien la lleva' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })
})
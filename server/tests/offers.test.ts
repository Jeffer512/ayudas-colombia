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
})
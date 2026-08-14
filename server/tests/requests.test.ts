import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createRequest, ensureCity } from './factories.js'

const app = createApp()

const validRequest = {
  type: 'supplies_request',
  urgency: 'high',
  title: 'Necesitamos agua potable en el Centro',
  description: 'Las familias del sector requieren agua para cocinar y beber.',
  address: 'Calle 12 #4-50',
  cityCode: 'pereira',
  reporter: {
    name: 'María Gómez',
    phone: '3158765432',
  },
}

describe('GET /api/requests', () => {
  it('devuelve listado vacío sin solicitudes', async () => {
    const res = await request(app).get('/api/requests')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      requests: [],
      total: 0,
      limit: 50,
      offset: 0,
    })
  })

  it('lista solicitudes con reporter y ciudad, más recientes primero', async () => {
    const older = await createRequest({ title: 'Primera solicitud' })
    const newer = await createRequest({ title: 'Segunda solicitud' })

    const res = await request(app).get('/api/requests')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.requests[0].id).toBe(newer.id)
    expect(res.body.requests[1].id).toBe(older.id)
    const first = res.body.requests[0]
    expect(first.city).toEqual({ code: 'pereira', name: 'Pereira' })
    expect(first.reporter.name).toBe('Juan Pérez')
    expect(first.status).toBe('open')
    expect(first.transport).toBeNull()
    expect(first.resolveCode).toBeUndefined()
  })

  it('filtra por tipo, estado y ciudad', async () => {
    await createRequest({ type: 'volunteers_request' })
    const missing = await createRequest({ type: 'missing_person' })
    const resolved = await createRequest({ status: 'resolved', resolvedAt: new Date() })

    const byType = await request(app)
      .get('/api/requests')
      .query({ type: 'missing_person' })
    expect(byType.body.total).toBe(1)
    expect(byType.body.requests[0].id).toBe(missing.id)

    const byStatus = await request(app)
      .get('/api/requests')
      .query({ status: 'resolved' })
    expect(byStatus.body.total).toBe(1)
    expect(byStatus.body.requests[0].id).toBe(resolved.id)

    const byCity = await request(app)
      .get('/api/requests')
      .query({ city: 'pereira' })
    expect(byCity.body.total).toBe(3)
  })

  it('el filtro active incluye abiertos y siendo atendidos', async () => {
    await createRequest({ status: 'open' })
    await createRequest({ status: 'in_progress' })
    await createRequest({ status: 'resolved', resolvedAt: new Date() })

    const res = await request(app).get('/api/requests').query({ status: 'active' })
    expect(res.body.total).toBe(2)
  })

  it('busca por palabra clave', async () => {
    await createRequest({ title: 'Necesitamos agua potable' })
    await createRequest({ title: 'Necesitamos pañales' })

    const res = await request(app)
      .get('/api/requests')
      .query({ q: 'agua' })
    expect(res.body.total).toBe(1)
  })

  it('rechaza tipos que no son solicitudes (ofertas y avisos)', async () => {
    await ensureCity()
    const offer = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, type: 'supplies_offered' })
    expect(offer.status).toBe(400)

    const info = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, type: 'info' })
    expect(info.status).toBe(400)
  })

  it('devuelve 404 para una solicitud inexistente', async () => {
    const res = await request(app).get('/api/requests/no-existe')
    expect(res.status).toBe(404)
  })
})

describe('POST /api/requests', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.request.deleteMany()
  })

  it('crea una solicitud abierta con evento inicial', async () => {
    const res = await request(app).post('/api/requests').send(validRequest)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'supplies_request',
      urgency: 'high',
      status: 'open',
      title: validRequest.title,
      city: { code: 'pereira', name: 'Pereira' },
    })
    expect(res.body.lat).toBeNull()
    expect(res.body.events).toHaveLength(1)
    expect(res.body.events[0]).toMatchObject({ status: 'open' })
  })

  it('genera un código de cierre de 4 dígitos y lo devuelve una sola vez', async () => {
    const res = await request(app).post('/api/requests').send(validRequest)

    expect(res.body.resolveCode).toMatch(/^\d{4}$/)

    const stored = await prisma.request.findUnique({ where: { id: res.body.id } })
    expect(stored?.resolveCode).toBe(res.body.resolveCode)

    const detail = await request(app).get(`/api/requests/${res.body.id}`)
    expect(detail.body.resolveCode).toBeUndefined()
  })

  it('permite transporte solo para solicitudes de suministros', async () => {
    const ok = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, transport: 'can_transport' })
    expect(ok.status).toBe(201)
    expect(ok.body.transport).toBe('can_transport')

    const bad = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, type: 'shelter_request', transport: 'needs_transport' })
    expect(bad.status).toBe(400)
  })

  it('usa urgencia media por defecto', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, urgency: undefined })
    expect(res.status).toBe(201)
    expect(res.body.urgency).toBe('medium')
  })

  it('acepta correo o whatsapp como único medio de contacto', async () => {
    const emailOnly = await request(app)
      .post('/api/requests')
      .send({
        ...validRequest,
        reporter: { name: 'Ana Torres', email: 'ana@correo.com' },
      })
    expect(emailOnly.status).toBe(201)
    expect(emailOnly.body.reporter).toMatchObject({
      name: 'Ana Torres',
      email: 'ana@correo.com',
      phone: null,
      whatsapp: null,
    })

    const whatsappOnly = await request(app)
      .post('/api/requests')
      .send({
        ...validRequest,
        reporter: { name: 'Andrés Mora', whatsapp: '3115550000' },
      })
    expect(whatsappOnly.status).toBe(201)
    expect(whatsappOnly.body.reporter).toMatchObject({
      whatsapp: '3115550000',
      phone: null,
      email: null,
    })
  })

  it('rechaza publicar sin ningún medio de contacto', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Ana Torres' } })
    expect(res.status).toBe(400)
  })

  it('rechaza coordenadas fuera de rango y datos inválidos', async () => {
    const badLat = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, lat: 120, lng: -75 })
    expect(badLat.status).toBe(400)

    const noTitle = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, title: 'cort' })
    expect(noTitle.status).toBe(400)

    const noCity = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, cityCode: 'bogota-desconocida' })
    expect(noCity.status).toBe(400)
  })
})

describe('POST /api/requests/:id/status', () => {
  it('marca una solicitud como siendo atendida', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'in_progress', actorName: 'Cruz Roja', note: 'Van en camino' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
    expect(res.body.events[1]).toMatchObject({
      status: 'in_progress',
      actorName: 'Cruz Roja',
    })
  })

  it('resuelve con el código de cierre correcto', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'resolved', resolveCode: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('resolved')
    expect(res.body.resolvedAt).not.toBeNull()
  })

  it('rechaza resolver con el código de cierre incorrecto', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'resolved', resolveCode: '9999' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })

  it('reabre una solicitud resuelta', async () => {
    const created = await createRequest({ status: 'resolved', resolvedAt: new Date() })
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
    expect(res.body.resolvedAt).toBeNull()
  })

  it('rechaza una transición no permitida', async () => {
    const created = await createRequest({ status: 'resolved', resolvedAt: new Date() })
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(400)
  })
})
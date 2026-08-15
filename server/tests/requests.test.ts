import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createRequest, ensureCity } from './factories.js'
import { closeStaleRequests } from '../src/services/requests.js'

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

const tinyPng =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

const validMissingPerson = {
  ...validRequest,
  type: 'missing_person',
  title: 'Se busca a Carlos Ramírez, 62 años',
  description: 'Salió ayer por la mañana y no ha regresado a casa.',
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

  it('acepta una foto para personas desaparecidas', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({ ...validMissingPerson, photo: tinyPng })

    expect(res.status).toBe(201)
    expect(res.body.photo).toBe(tinyPng)

    const stored = await prisma.request.findUnique({ where: { id: res.body.id } })
    expect(stored?.photoUrl).toBe(tinyPng)
  })

  it('la foto solo aplica a personas y mascotas desaparecidas', async () => {
    const bad = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, photo: tinyPng })
    expect(bad.status).toBe(400)

    const missingPet = await request(app)
      .post('/api/requests')
      .send({
        ...validMissingPerson,
        type: 'missing_pet',
        title: 'Perro Golden perdido en Villa Verde',
        description: 'Se escapó ayer del parque, es muy amigable.',
        photo: tinyPng,
      })
    expect(missingPet.status).toBe(201)
  })

  it('rechaza una foto que no es imagen o demasiado grande', async () => {
    const notImage = await request(app)
      .post('/api/requests')
      .send({ ...validMissingPerson, photo: 'data:text/plain;base64,hola' })
    expect(notImage.status).toBe(400)

    const huge = await request(app)
      .post('/api/requests')
      .send({ ...validMissingPerson, photo: `data:image/jpeg;base64,${'A'.repeat(8_000_001)}` })
    expect(huge.status).toBe(400)
  })

  it('la foto aparece en el listado y en el detalle', async () => {
    const created = await request(app)
      .post('/api/requests')
      .send({ ...validMissingPerson, photo: tinyPng })

    const list = await request(app).get('/api/requests')
    expect(list.body.requests[0].photo).toBe(tinyPng)

    const detail = await request(app).get(`/api/requests/${created.body.id}`)
    expect(detail.body.photo).toBe(tinyPng)
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

  it('rechaza reabrir sin el código de cierre', async () => {
    const created = await createRequest({ status: 'resolved', resolvedAt: new Date() })
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'open', note: 'Reabierto' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })

  it('rechaza una transición no permitida', async () => {
    const created = await createRequest({ status: 'resolved', resolvedAt: new Date() })
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'in_progress' })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/requests/:id/status · dueño de la solicitud', () => {
  beforeEach(async () => {
    await ensureCity()
  })

  function tokenFrom(body: { verificationUrl?: string | null }): string | undefined {
    if (!body.verificationUrl) return undefined
    return new URL(body.verificationUrl, 'http://localhost').searchParams.get('token') ?? undefined
  }

  async function loginCitizen(email: string) {
    const res = await request(app).post('/api/auth/register').send({
      email,
      password: 'contrasena-segura',
      name: 'Solicitante',
    })
    await request(app).post('/api/auth/verify-email').send({ token: tokenFrom(res.body) })
    const agent = request.agent(app)
    await agent.post('/api/auth/login').send({ email, password: 'contrasena-segura' })
    return agent
  }

  it('el dueño cierra su solicitud sin código de cierre', async () => {
    const agent = await loginCitizen('dueno@correo.org')
    const created = await agent
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Dueño', phone: '3101112222' } })
    expect(created.status).toBe(201)
    expect(created.body.isOwner).toBe(true)

    const stored = await prisma.request.findUnique({
      where: { id: created.body.id },
      include: { reporter: true },
    })
    expect(stored?.reporter.userId).not.toBeNull()

    const closed = await agent
      .post(`/api/requests/${created.body.id}/status`)
      .send({ status: 'resolved', note: 'Lo resolvió quien lo publicó' })

    expect(closed.status).toBe(200)
    expect(closed.body.status).toBe('resolved')
  })

  it('el dueño reabre su solicitud resuelta sin código', async () => {
    const agent = await loginCitizen('reabre@correo.org')
    const created = await agent
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Dueño', phone: '3101112222' } })
    await agent
      .post(`/api/requests/${created.body.id}/status`)
      .send({ status: 'resolved', note: 'Resuelto por el dueño' })

    const reopened = await agent
      .post(`/api/requests/${created.body.id}/status`)
      .send({ status: 'open', note: 'Reabierto por el dueño' })

    expect(reopened.status).toBe(200)
    expect(reopened.body.status).toBe('open')
  })

  it('un usuario ajeno no cierra sin el código aunque tenga sesión', async () => {
    const owner = await loginCitizen('otro-dueño@correo.org')
    const created = await owner
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Dueño', phone: '3101112222' } })

    const stranger = await loginCitizen('ajeno@correo.org')
    const res = await stranger
      .post(`/api/requests/${created.body.id}/status`)
      .send({ status: 'resolved', note: 'Intento ajeno' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })
})

describe('cierre automático por inactividad', () => {
  it('cierra solicitudes abiertas sin actividad por más de 3 días', async () => {
    const stale = await createRequest({
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    })
    await closeStaleRequests()

    const res = await request(app).get(`/api/requests/${stale.id}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('resolved')
    expect(res.body.resolvedAt).not.toBeNull()
    expect(
      res.body.events.some(
        (e: { note: string | null }) => e.note === 'Cerrada automáticamente por inactividad',
      ),
    ).toBe(true)
  })

  it('no cierra solicitudes con actividad reciente', async () => {
    const fresh = await createRequest({
      updatedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
    })
    await closeStaleRequests()

    const res = await request(app).get(`/api/requests/${fresh.id}`)
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
  })

  it('el cierre automático conserva el código para reabrir', async () => {
    const stale = await createRequest({
      updatedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
    })
    await closeStaleRequests()

    const res = await request(app)
      .post(`/api/requests/${stale.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
  })
})

describe('POST /api/requests/:id/help', () => {
  it('registra a una persona que va a ayudar', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ markerId: 'marker-1', name: 'Camila', note: 'Llevo agua' })

    expect(res.status).toBe(200)
    expect(res.body.helpers).toBe(1)
    expect(res.body.helperList).toEqual([
      expect.objectContaining({ name: 'Camila', note: 'Llevo agua' }),
    ])
  })

  it('no cuenta dos veces al mismo dispositivo', async () => {
    const created = await createRequest()
    await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ markerId: 'marker-1', name: 'Camila' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ markerId: 'marker-1', name: 'Camila' })

    expect(res.status).toBe(200)
    expect(res.body.helpers).toBe(1)
    expect(res.body.helperList).toHaveLength(1)
  })

  it('cuenta dispositivos distintos por separado', async () => {
    const created = await createRequest()
    await request(app).post(`/api/requests/${created.id}/help`).send({ markerId: 'm1' })
    await request(app).post(`/api/requests/${created.id}/help`).send({ markerId: 'm2' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ markerId: 'm3' })

    expect(res.status).toBe(200)
    expect(res.body.helpers).toBe(3)
  })

  it('permite ofrecer ayuda sin identificador de dispositivo', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Anónimo' })

    expect(res.status).toBe(200)
    expect(res.body.helpers).toBe(1)
  })

  it('el conteo aparece en el listado', async () => {
    const created = await createRequest()
    await request(app).post(`/api/requests/${created.id}/help`).send({ markerId: 'm1' })
    await request(app).post(`/api/requests/${created.id}/help`).send({ markerId: 'm2' })

    const res = await request(app).get('/api/requests')
    expect(res.status).toBe(200)
    expect(res.body.requests[0].id).toBe(created.id)
    expect(res.body.requests[0].helpers).toBe(2)
  })

  it('rechaza ayudar en un pedido ya resuelto', async () => {
    const created = await createRequest({ status: 'resolved', resolvedAt: new Date() })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Este pedido ya se cerró')
  })

  it('devuelve 404 si la solicitud no existe', async () => {
    const res = await request(app).post('/api/requests/no-existe/help').send({})
    expect(res.status).toBe(404)
  })
})
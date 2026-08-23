import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createRequest, createOffer, ensureCity } from './factories.js'

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

  it('ordena críticos primero y luego por fecha de publicación', async () => {
    const lowNew = await createRequest({ urgency: 'low', title: 'Reciente baja urgencia' })
    const criticalOld = await createRequest({
      urgency: 'critical',
      title: 'Antiguo crítico',
      createdAt: new Date(Date.now() - 3600_000),
    })
    const highOld = await createRequest({
      urgency: 'high',
      title: 'Antiguo alta',
      createdAt: new Date(Date.now() - 7200_000),
    })

    const res = await request(app).get('/api/requests')
    expect(res.status).toBe(200)
    expect(res.body.requests.map((r: { id: string }) => r.id)).toEqual([
      criticalOld.id,
      highOld.id,
      lowNew.id,
    ])
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

  it('el filtro active solo incluye pedidos abiertos', async () => {
    await createRequest({ status: 'open' })
    await createRequest({ status: 'resolved', resolvedAt: new Date() })

    const res = await request(app).get('/api/requests').query({ status: 'active' })
    expect(res.body.total).toBe(1)
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

  it('crea una solicitud sin descripción guardando null', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({
        type: 'supplies_request',
        urgency: 'high',
        title: 'Agua para el albergue del barrio',
        address: 'Calle 12 #4-50',
        cityCode: 'pereira',
        reporter: { name: 'María Gómez', phone: '3158765432' },
      })

    expect(res.status).toBe(201)
    expect(res.body.description).toBeNull()

    const stored = await prisma.request.findUnique({ where: { id: res.body.id } })
    expect(stored?.description).toBeNull()
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

  it('guarda y devuelve la lista de ítems solicitados', async () => {
    const res = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, items: ['Agua', 'Comida', 'Mantas'] })

    expect(res.status).toBe(201)
    expect(res.body.items).toEqual(['Agua', 'Comida', 'Mantas'])

    const detail = await request(app).get(`/api/requests/${res.body.id}`)
    expect(detail.body.items).toEqual(['Agua', 'Comida', 'Mantas'])
  })

  it('rechaza listas de ítems vacías o demasiado largas', async () => {
    const tooMany = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, items: Array.from({ length: 11 }, (_, i) => `Ítem ${i}`) })
    expect(tooMany.status).toBe(400)

    const blank = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, items: ['Agua', '   '] })
    expect(blank.status).toBe(400)
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
  it('rechaza el estado eliminado "siendo atendido"', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'in_progress', actorName: 'Cruz Roja', note: 'Van en camino' })

    expect(res.status).toBe(400)
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
    const created = await createRequest({ status: 'duplicate' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'invalid' })

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

describe('PUT /api/requests/:id', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.request.deleteMany()
  })

  it('edita una solicitud abierta sin ayudantes con el código de cierre', async () => {
    const created = await createRequest()
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({
        title: 'Necesitamos agua y comida en el Centro',
        description: 'Actualizado: también requieren mantas.',
        urgency: 'critical',
        items: ['Agua', 'Comida', 'Mantas'],
        address: 'Calle 12 #4-52',
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      title: 'Necesitamos agua y comida en el Centro',
      description: 'Actualizado: también requieren mantas.',
      urgency: 'critical',
      items: ['Agua', 'Comida', 'Mantas'],
      address: 'Calle 12 #4-52',
    })
    expect(
      res.body.events.some((e: { note: string | null }) => e.note === 'Solicitud actualizada'),
    ).toBe(true)
  })

  it('rechaza editar un pedido con personas ayudando', async () => {
    const created = await createRequest()
    await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ markerId: 'm1', name: 'Camila' })

    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '1234' })

    expect(res.status).toBe(409)
    expect(res.body.error).toBe(
      'Ya hay personas ayudando, el pedido no se puede editar',
    )
  })

  it('rechaza editar un pedido cerrado', async () => {
    const created = await createRequest({ status: 'resolved', resolvedAt: new Date() })
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '1234' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Solo se puede editar un pedido abierto')
  })

  it('rechaza editar con un código incorrecto', async () => {
    const created = await createRequest()
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({ title: 'Otro título válido aquí', resolveCode: '9999' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('Código de cierre incorrecto')
  })

  describe('POST /api/requests/:id/verify-code', () => {
    it('confirma el código de cierre correcto', async () => {
      const created = await createRequest()
      const res = await request(app)
        .post(`/api/requests/${created.id}/verify-code`)
        .send({ resolveCode: '1234' })

      expect(res.status).toBe(200)
      expect(res.body).toEqual({ ok: true })
    })

    it('rechaza un código de cierre incorrecto', async () => {
      const created = await createRequest()
      const res = await request(app)
        .post(`/api/requests/${created.id}/verify-code`)
        .send({ resolveCode: '9999' })

      expect(res.status).toBe(403)
      expect(res.body.error).toBe('Código de cierre incorrecto')
    })

    it('devuelve 404 para una solicitud inexistente', async () => {
      const res = await request(app)
        .post('/api/requests/00000000-0000-0000-0000-000000000000/verify-code')
        .send({ resolveCode: '1234' })

      expect(res.status).toBe(404)
      expect(res.body.error).toBe('Solicitud no encontrada')
    })
  })

  it('no permite cambiar el tipo ni la ciudad', async () => {
    const created = await createRequest({ type: 'shelter_request' })
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({
        title: 'Otro título válido aquí',
        type: 'missing_person',
        cityCode: 'manizales',
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body.type).toBe('shelter_request')
    expect(res.body.city.code).toBe('pereira')
  })

  it('rechaza el transporte en pedidos que no son de suministros', async () => {
    const created = await createRequest({ type: 'shelter_request' })
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({
        title: 'Otro título válido aquí',
        transport: 'needs_transport',
        resolveCode: '1234',
      })

    expect(res.status).toBe(400)
  })

  it('rechaza una foto en pedidos que no son de personas desaparecidas', async () => {
    const created = await createRequest({ type: 'supplies_request' })
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({ title: 'Otro título válido aquí', photo: tinyPng, resolveCode: '1234' })

    expect(res.status).toBe(400)
  })

  it('permite quitar la foto de una persona desaparecida', async () => {
    const created = await createRequest({ type: 'missing_person', photoUrl: tinyPng })
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({
        title: 'Se busca a Carlos Ramírez, 62 años',
        photo: null,
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body.photo).toBeNull()
  })

  it('actualiza los datos de contacto del reporter', async () => {
    const created = await createRequest()
    const res = await request(app)
      .put(`/api/requests/${created.id}`)
      .send({
        title: 'Necesitamos voluntarios en el Centro',
        reporter: { name: 'Juan Pérez', whatsapp: '3115557777' },
        resolveCode: '1234',
      })

    expect(res.status).toBe(200)
    expect(res.body.reporter).toMatchObject({
      name: 'Juan Pérez',
      phone: null,
      whatsapp: '3115557777',
    })
  })

  it('el dueño edita su pedido sin código de cierre', async () => {
    function tokenFrom(body: { verificationUrl?: string | null }): string | undefined {
      if (!body.verificationUrl) return undefined
      return new URL(body.verificationUrl, 'http://localhost').searchParams.get('token') ?? undefined
    }
    const registered = await request(app).post('/api/auth/register').send({
      email: 'edita-dueno@correo.org',
      password: 'contrasena-segura',
      name: 'Solicitante',
    })
    await request(app).post('/api/auth/verify-email').send({ token: tokenFrom(registered.body) })
    const agent = request.agent(app)
    await agent
      .post('/api/auth/login')
      .send({ email: 'edita-dueno@correo.org', password: 'contrasena-segura' })

    const created = await agent
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Dueño', phone: '3101112222' } })
    expect(created.status).toBe(201)
    expect(created.body.isOwner).toBe(true)

    const res = await agent
      .put(`/api/requests/${created.body.id}`)
      .send({ title: 'Pedido actualizado por su dueño', urgency: 'high' })

    expect(res.status).toBe(200)
    expect(res.body.title).toBe('Pedido actualizado por su dueño')
  })

  it('devuelve 404 para una solicitud inexistente', async () => {
    const res = await request(app)
      .put('/api/requests/no-existe')
      .send({ title: 'Otro título válido aquí' })
    expect(res.status).toBe(404)
  })
})

describe('POST /api/requests/:id/help', () => {
  beforeEach(async () => {
    await ensureCity()
  })

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

  it('rechaza que el dueño se ayude a sí mismo', async () => {
    const registered = await request(app).post('/api/auth/register').send({
      email: 'dueno-ayuda@correo.org',
      password: 'contrasena-segura',
      name: 'Dueño',
    })
    const token = new URL(
      registered.body.verificationUrl,
      'http://localhost',
    ).searchParams.get('token')
    await request(app).post('/api/auth/verify-email').send({ token })
    const agent = request.agent(app)
    await agent
      .post('/api/auth/login')
      .send({ email: 'dueno-ayuda@correo.org', password: 'contrasena-segura' })

    const created = await agent
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Dueño', phone: '3101112222' } })
    expect(created.status).toBe(201)

    const res = await agent
      .post(`/api/requests/${created.body.id}/help`)
      .send({ markerId: 'marker-dueno', name: 'Dueño' })

    expect(res.status).toBe(403)
    expect(res.body.error).toBe('No puedes ayudar en tu propio pedido')

    const detail = await request(app).get(`/api/requests/${created.body.id}`)
    expect(detail.body.helpers).toBe(0)
  })
})

describe('POST /api/requests/:id/help · transporte y contacto', () => {
  beforeEach(async () => {
    await ensureCity()
  })

  it('rechaza indicar transporte en un pedido que no es de suministros', async () => {
    const created = await createRequest({ type: 'volunteers_request' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', transport: 'can_transport' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe(
      'El campo de transporte solo aplica a solicitudes de suministros',
    )
  })

  it('exige indicar transporte al ayudar en un pedido de suministros', async () => {
    const created = await createRequest({ type: 'supplies_request' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', note: 'Llevo agua' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Indica si puedes transportar los suministros')
  })

  it('registra a quien puede llevar suministros sin crear una oferta vinculada', async () => {
    const created = await createRequest({ type: 'supplies_request' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', note: 'Llevo agua', transport: 'can_transport' })

    expect(res.status).toBe(200)
    expect(res.body.helpers).toBe(1)
    expect(res.body.helperList[0]).toMatchObject({
      name: 'Camila',
      note: 'Llevo agua',
      transport: 'can_transport',
      status: 'offered',
    })
    const linked = await prisma.offer.findFirst({ where: { requestId: created.id } })
    expect(linked).toBeNull()
  })

  it('exige contacto cuando quien pide puede recoger los suministros', async () => {
    const created = await createRequest({ type: 'supplies_request', transport: 'can_transport' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', transport: 'needs_transport' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe(
      'Deja tu teléfono o WhatsApp para coordinar la recogida',
    )
  })

  it('exige nombre al crear una oferta vinculada', async () => {
    const created = await createRequest({ type: 'supplies_request', transport: 'needs_transport' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ note: 'Tengo agua', transport: 'needs_transport', phone: '3115550000' })

    expect(res.status).toBe(400)
    expect(res.body.error).toContain('nombre')
  })

  it('crea una oferta vinculada cuando no puede transportar y el pedido necesita transporte', async () => {
    const created = await createRequest({
      type: 'supplies_request',
      transport: 'needs_transport',
      items: ['Agua'],
    })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({
        name: 'Camila',
        note: 'Tengo 20 botellas',
        transport: 'needs_transport',
        phone: '3115550000',
      })

    expect(res.status).toBe(200)
    expect(res.body.helpers).toBe(1)

    const helper = await prisma.requestHelper.findFirst({
      where: { requestId: created.id },
    })
    expect(helper).toMatchObject({
      name: 'Camila',
      transport: 'needs_transport',
      phone: '3115550000',
      status: 'offered',
    })

    const offer = await prisma.offer.findFirst({ where: { requestId: created.id } })
    expect(offer).not.toBeNull()
    expect(offer?.type).toBe('supplies_offered')
    expect(offer?.transport).toBe('needs_transport')
    expect(offer?.status).toBe('open')
    expect(offer?.items).toEqual(['Agua'])
    expect(offer?.contactVisibility).toBe('users')
    expect(helper?.offerId).toBe(offer?.id)

    const list = await request(app).get('/api/offers').query({ forTransport: 'true' })
    expect(list.body.offers.map((o: { id: string }) => o.id)).toContain(offer!.id)
  })

  it('reporta la oferta vinculada al dueño de la carga', async () => {
    const created = await createRequest({
      type: 'supplies_request',
      transport: 'needs_transport',
    })
    const registered = await request(app).post('/api/auth/register').send({
      email: 'carga-owner@correo.org',
      password: 'contrasena-segura',
      name: 'Cargador',
    })
    const token = new URL(
      registered.body.verificationUrl,
      'http://localhost',
    ).searchParams.get('token')
    await request(app).post('/api/auth/verify-email').send({ token })
    const agent = request.agent(app)
    await agent
      .post('/api/auth/login')
      .send({ email: 'carga-owner@correo.org', password: 'contrasena-segura' })

    await agent
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Cargador', transport: 'needs_transport', phone: '3115550000' })

    const detail = await agent.get(`/api/requests/${created.id}`)
    expect(detail.body.linkedOfferPresent).toBe(true)

    const stranger = await request(app).get(`/api/requests/${created.id}`)
    expect(stranger.body.linkedOfferPresent).toBe(false)
  })

  it('no crea oferta vinculada cuando quien pide puede recoger', async () => {
    const created = await createRequest({ type: 'supplies_request', transport: 'can_transport' })
    const res = await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', transport: 'needs_transport', phone: '3115550000' })

    expect(res.status).toBe(200)
    const linked = await prisma.offer.findFirst({ where: { requestId: created.id } })
    expect(linked).toBeNull()
  })

  it('oculta el contacto del ayudante a quienes no son el autor', async () => {
    const created = await createRequest({ type: 'supplies_request' })
    await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', transport: 'can_transport', phone: '3115550000' })

    const detail = await request(app).get(`/api/requests/${created.id}`)
    expect(detail.body.helperList[0]).toMatchObject({ name: 'Camila' })
    expect(detail.body.helperList[0].phone).toBeUndefined()
  })

  it('muestra el contacto del ayudante a quien publicó el pedido', async () => {
    const registered = await request(app).post('/api/auth/register').send({
      email: 'autora@correo.org',
      password: 'contrasena-segura',
      name: 'Autora',
    })
    const token = new URL(
      registered.body.verificationUrl,
      'http://localhost',
    ).searchParams.get('token')
    await request(app).post('/api/auth/verify-email').send({ token })
    const agent = request.agent(app)
    await agent
      .post('/api/auth/login')
      .send({ email: 'autora@correo.org', password: 'contrasena-segura' })

    const created = await agent
      .post('/api/requests')
      .send({ ...validRequest, reporter: { name: 'Autora', phone: '3101112222' } })
    await request(app)
      .post(`/api/requests/${created.body.id}/help`)
      .send({ name: 'Camila', transport: 'can_transport', phone: '3115550000' })

    const detail = await agent.get(`/api/requests/${created.body.id}`)
    expect(detail.body.helperList[0]).toMatchObject({
      name: 'Camila',
      phone: '3115550000',
    })
  })

  it('cierra las ofertas vinculadas cuando el pedido se resuelve', async () => {
    const created = await createRequest({ type: 'supplies_request', transport: 'needs_transport' })
    await request(app)
      .post(`/api/requests/${created.id}/help`)
      .send({ name: 'Camila', transport: 'needs_transport', phone: '3115550000' })

    const offer = await prisma.offer.findFirst({ where: { requestId: created.id } })
    expect(offer?.status).toBe('open')

    await request(app)
      .post(`/api/requests/${created.id}/status`)
      .send({ status: 'resolved', resolveCode: '1234' })

    const after = await prisma.offer.findFirst({ where: { requestId: created.id } })
    expect(after?.status).toBe('unavailable')
  })
})
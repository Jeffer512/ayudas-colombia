import http from 'node:http'
import type { AddressInfo } from 'node:net'
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createCityMessage, ensureCity } from './factories.js'

const app = createApp()

const ADMIN_TOKEN = 'test-admin-token'

process.env.ADMIN_TOKEN = ADMIN_TOKEN

async function registerAndVerify(email: string) {
  const body = { email, password: 'contrasena-segura', name: 'Usuario Prueba' }
  const registered = await request(app).post('/api/auth/register').send(body)
  const url = new URL(registered.body.verificationUrl, 'http://localhost')
  const token = url.searchParams.get('token')
  await request(app).post('/api/auth/verify-email').send({ token })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password: 'contrasena-segura' })
  return agent
}

describe('GET /api/city-messages', () => {
  beforeEach(async () => {
    await prisma.cityMessage.deleteMany()
    await ensureCity()
  })

  it('devuelve un listado vacío cuando no hay mensajes', async () => {
    const res = await request(app).get('/api/city-messages?city=pereira')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ messages: [], total: 0, limit: 50, offset: 0 })
  })

  it('lista los mensajes de la ciudad más recientes primero', async () => {
    const first = await createCityMessage({ body: 'Primer mensaje' })
    const second = await createCityMessage({ body: 'Segundo mensaje' })

    const res = await request(app).get('/api/city-messages?city=pereira')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.messages[0]).toMatchObject({
      id: second.id,
      name: 'Vecino de Pereira',
      body: 'Segundo mensaje',
      city: { code: 'pereira', name: 'Pereira' },
    })
    expect(res.body.messages[1].id).toBe(first.id)
    expect(res.body.messages[0].createdAt).toBeTruthy()
  })

  it('respeta la paginación', async () => {
    await createCityMessage({ body: 'Mensaje uno' })
    await createCityMessage({ body: 'Mensaje dos' })

    const res = await request(app).get('/api/city-messages?city=pereira&limit=1&offset=1')
    expect(res.status).toBe(200)
    expect(res.body.messages).toHaveLength(1)
    expect(res.body.messages[0].body).toBe('Mensaje uno')
    expect(res.body.total).toBe(2)
  })

  it('omite los mensajes ocultos por moderación', async () => {
    await createCityMessage({ body: 'Visible' })
    await createCityMessage({ body: 'Oculto', status: 'hidden' })

    const res = await request(app).get('/api/city-messages?city=pereira')
    expect(res.body.total).toBe(1)
    expect(res.body.messages[0].body).toBe('Visible')
  })

  it('omite los mensajes de más de 7 días', async () => {
    await createCityMessage({
      body: 'Antiguo',
      createdAt: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
    })

    const res = await request(app).get('/api/city-messages?city=pereira')
    expect(res.body.total).toBe(0)
  })

  it('devuelve listado vacío para una ciudad desconocida', async () => {
    const res = await request(app).get('/api/city-messages?city=no-existe')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ messages: [], total: 0, limit: 50, offset: 0 })
  })
})

describe('POST /api/city-messages', () => {
  beforeEach(async () => {
    await prisma.cityMessage.deleteMany()
    await ensureCity()
  })

  it('publica un mensaje anónimo en el tablón de la ciudad', async () => {
    const res = await request(app)
      .post('/api/city-messages')
      .send({ city: 'pereira', name: 'Ana', body: 'Se necesita agua en el barrio Centro' })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      name: 'Ana',
      body: 'Se necesita agua en el barrio Centro',
      city: { code: 'pereira', name: 'Pereira' },
    })
    expect(res.body.id).toBeTruthy()

    const stored = await prisma.cityMessage.findUnique({ where: { id: res.body.id } })
    expect(stored?.status).toBe('open')
    expect(stored?.userId).toBeNull()
  })

  it('publica un mensaje con la sesión iniciada', async () => {
    const agent = await registerAndVerify('tablon-1@example.com')
    const res = await agent
      .post('/api/city-messages')
      .send({ city: 'pereira', name: 'Lina', body: 'Ofrezco transporte al centro' })

    expect(res.status).toBe(201)
    const stored = await prisma.cityMessage.findUnique({ where: { id: res.body.id } })
    expect(stored?.userId).toBeTruthy()
  })

  it('rechaza un mensaje sin nombre', async () => {
    const res = await request(app)
      .post('/api/city-messages')
      .send({ city: 'pereira', body: 'Hola' })
    expect(res.status).toBe(400)
  })

  it('rechaza un mensaje sin contenido', async () => {
    const res = await request(app)
      .post('/api/city-messages')
      .send({ city: 'pereira', name: 'Ana', body: '' })
    expect(res.status).toBe(400)
  })

  it('rechaza un mensaje demasiado largo', async () => {
    const res = await request(app)
      .post('/api/city-messages')
      .send({ city: 'pereira', name: 'Ana', body: 'x'.repeat(501) })
    expect(res.status).toBe(400)
  })

  it('rechaza una ciudad desconocida', async () => {
    const res = await request(app)
      .post('/api/city-messages')
      .send({ city: 'no-existe', name: 'Ana', body: 'Hola' })
    expect(res.status).toBe(404)
  })

  it('reporta un mensaje del tablón y muestra su contenido como título', async () => {
    const message = await createCityMessage({ body: 'Publicidad engañosa' })
    const agent = await registerAndVerify('tablon-reporta@example.com')
    const reported = await agent
      .post('/api/reports')
      .send({ kind: 'message', targetId: message.id, reason: 'spam' })
    expect(reported.status).toBe(201)

    const list = await request(app)
      .get('/api/admin/reports?status=open')
      .set('x-admin-token', 'test-admin-token')
    expect(list.body.reports[0]).toMatchObject({
      kind: 'message',
      targetId: message.id,
      targetTitle: 'Publicidad engañosa',
      reason: 'spam',
    })
  })

  it('notifica a los conectados por SSE cuando llega un mensaje nuevo', async () => {
    const server = app.listen(0)
    await new Promise<void>((resolve) => server.once('listening', resolve))
    const { port } = server.address() as AddressInfo

    const lines: string[] = []
    const sawMessage = new Promise<void>((resolve) => {
      const req = http.get(
        `http://127.0.0.1:${port}/api/city-messages/pereira/events`,
        (res) => {
          expect(res.statusCode).toBe(200)
          expect(res.headers['content-type']).toContain('text/event-stream')
          expect(res.headers['x-accel-buffering']).toBe('no')
          res.on('data', (chunk: Buffer) => {
            for (const line of chunk.toString().split('\n')) lines.push(line)
            if (lines.some((line) => line.includes('"type":"new"'))) resolve()
          })
        },
      )
      req.on('error', () => {})
    })

    try {
      const res = await request(app)
        .post('/api/city-messages')
        .send({ city: 'pereira', name: 'SSE', body: 'Mensaje en vivo' })
      expect(res.status).toBe(201)

      await sawMessage
      const eventLine = lines.findIndex((line) => line === 'event: new')
      const dataLine = lines.findIndex((line) => line.includes('Mensaje en vivo'))
      expect(eventLine).toBeGreaterThanOrEqual(0)
      expect(dataLine).toBeGreaterThan(eventLine)

      const received = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5))
      const event = received
        .map((raw) => JSON.parse(raw))
        .find((e) => e.type === 'new')
      expect(event.message.body).toBe('Mensaje en vivo')
      expect(event.message.city.code).toBe('pereira')
    } finally {
      server.closeAllConnections()
      await new Promise<void>((resolve) => server.close(() => resolve()))
    }
  })
})

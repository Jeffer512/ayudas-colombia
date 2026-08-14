import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createAviso, ensureCity } from './factories.js'

const app = createApp()

const validAviso = {
  title: 'Punto de distribución de agua funcionando',
  description: 'El parque principal reparte agua desde las 7am. Llevar recipientes.',
  urgency: 'medium',
  cityCode: 'pereira',
  reporter: {
    name: 'Rosalba Duque',
    phone: '3105553333',
  },
}

describe('GET /api/avisos', () => {
  it('devuelve listado vacío sin avisos', async () => {
    const res = await request(app).get('/api/avisos')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ avisos: [], total: 0, limit: 50, offset: 0 })
  })

  it('lista avisos con su conteo de marcas', async () => {
    const aviso = await createAviso()
    await prisma.avisoMark.create({ data: { avisoId: aviso.id, markerId: 'm1' } })

    const res = await request(app).get('/api/avisos')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(1)
    expect(res.body.avisos[0]).toMatchObject({
      type: 'info',
      status: 'open',
      city: { code: 'pereira' },
    })
    expect(res.body.avisos[0].marks).toBe(1)
    expect(res.body.avisos[0].resolveCode).toBeUndefined()
  })

  it('filtra por estado activo', async () => {
    const opened = await createAviso({ status: 'open' })
    await createAviso({ status: 'closed' })

    const res = await request(app).get('/api/avisos').query({ status: 'active' })
    expect(res.body.total).toBe(1)
    expect(res.body.avisos[0].id).toBe(opened.id)
  })
})

describe('POST /api/avisos', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.aviso.deleteMany()
  })

  it('crea un aviso abierto de tipo info', async () => {
    const res = await request(app).post('/api/avisos').send(validAviso)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'info',
      urgency: 'medium',
      status: 'open',
      title: validAviso.title,
      marks: 0,
    })
  })

  it('rechaza datos inválidos', async () => {
    const noCity = await request(app)
      .post('/api/avisos')
      .send({ ...validAviso, cityCode: 'inexistente' })
    expect(noCity.status).toBe(400)

    const noTitle = await request(app)
      .post('/api/avisos')
      .send({ ...validAviso, title: 'x' })
    expect(noTitle.status).toBe(400)
  })
})

describe('POST /api/avisos/:id/mark', () => {
  beforeEach(async () => {
    await prisma.avisoMark.deleteMany()
    await prisma.aviso.deleteMany()
    await ensureCity()
  })

  it('cierra el aviso tras 3 marcas de desactualizado', async () => {
    const aviso = await createAviso()

    await request(app).post(`/api/avisos/${aviso.id}/mark`).send({ markerId: 'a' })
    await request(app).post(`/api/avisos/${aviso.id}/mark`).send({ markerId: 'b' })
    const res = await request(app)
      .post(`/api/avisos/${aviso.id}/mark`)
      .send({ markerId: 'c' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('closed')
    expect(res.body.marks).toBe(3)
  })

  it('no cuenta dos marcas del mismo dispositivo', async () => {
    const aviso = await createAviso()

    await request(app).post(`/api/avisos/${aviso.id}/mark`).send({ markerId: 'a' })
    const res = await request(app)
      .post(`/api/avisos/${aviso.id}/mark`)
      .send({ markerId: 'a' })

    expect(res.body.marks).toBe(1)
    expect(res.body.status).toBe('open')
  })

  it('reabre un aviso cerrado y limpia sus marcas', async () => {
    const aviso = await createAviso({ status: 'closed' })
    await prisma.avisoMark.create({ data: { avisoId: aviso.id, markerId: 'a' } })

    const res = await request(app)
      .post(`/api/avisos/${aviso.id}/mark`)
      .send({ markerId: 'b' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
    expect(res.body.marks).toBe(0)
  })

  it('devuelve 404 para un aviso inexistente', async () => {
    const res = await request(app).post('/api/avisos/no-existe/mark').send({})
    expect(res.status).toBe(404)
  })
})
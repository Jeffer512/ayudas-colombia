import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createAviso, createCityMessage, createOffer, createRequest, ensureCity } from './factories.js'

const app = createApp()

const ADMIN_TOKEN = 'test-admin-token'

describe('POST /api/admin', () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = ADMIN_TOKEN
  })

  it('exige un token de administración válido', async () => {
    const created = await createRequest()

    const noToken = await request(app)
      .post(`/api/admin/requests/${created.id}/status`)
      .send({ status: 'resolved' })
    expect(noToken.status).toBe(403)

    const badToken = await request(app)
      .post(`/api/admin/requests/${created.id}/status`)
      .set('x-admin-token', 'wrong')
      .send({ status: 'resolved' })
    expect(badToken.status).toBe(403)
  })

  it('resuelve una solicitud sin necesidad del código', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post(`/api/admin/requests/${created.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'resolved', note: 'Verificado por moderación' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('resolved')
    expect(res.body.resolveCode).toBeUndefined()
  })

  it('marca una oferta como entregada sin el código del autor', async () => {
    const offer = await createOffer()
    const res = await request(app)
      .post(`/api/admin/offers/${offer.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'fulfilled' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('fulfilled')
  })

  it('cierra y reabre un aviso como moderador', async () => {
    const aviso = await createAviso()

    const closed = await request(app)
      .post(`/api/admin/avisos/${aviso.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'closed' })
    expect(closed.status).toBe(200)
    expect(closed.body.status).toBe('closed')

    const reopened = await request(app)
      .post(`/api/admin/avisos/${aviso.id}/status`)
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'open' })
    expect(reopened.status).toBe(200)
    expect(reopened.body.status).toBe('open')
  })

  it('devuelve 404 si la entidad no existe', async () => {
    await ensureCity()
    const res = await request(app)
      .post('/api/admin/requests/no-existe/status')
      .set('x-admin-token', ADMIN_TOKEN)
      .send({ status: 'resolved' })

    expect(res.status).toBe(404)
  })

  it('exige token para ocultar un mensaje del tablón', async () => {
    const message = await createCityMessage()
    const res = await request(app).delete(`/api/admin/city-messages/${message.id}`)
    expect(res.status).toBe(403)
  })

  it('oculta un mensaje del tablón y deja de listarse', async () => {
    const message = await createCityMessage({ body: 'Contenido inapropiado' })

    const res = await request(app)
      .delete(`/api/admin/city-messages/${message.id}`)
      .set('x-admin-token', ADMIN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ id: message.id, status: 'hidden' })

    const list = await request(app).get('/api/city-messages?city=pereira')
    expect(list.body.messages).toHaveLength(0)
  })
})
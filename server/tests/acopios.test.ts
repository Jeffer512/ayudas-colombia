import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createAcopio, ensureCity } from './factories.js'

const app = createApp()
const validAcopio = {
  name: 'Centro de acopio La Florida',
  address: 'Carrera 20 # 40-25',
  lat: 4.8133,
  lng: -75.6961,
  cityCode: 'pereira',
  contactName: 'Maria',
  contactPhone: '3105552222',
  hours: '8am - 6pm',
}

describe('/api/acopios', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.acopioCenter.deleteMany()
  })

  it('crea un centro público como tipo ciudadano', async () => {
    const res = await requestPOST().send(validAcopio)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'ciudadano',
      name: 'Centro de acopio La Florida',
      city: { code: 'pereira', name: 'Pereira' },
      status: 'open',
    })
    expect(res.body.lat).toBe(4.8133)
  })

  it('crea un centro tipo oficial cuando se envía el token de administrador', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token'
    const res = await requestPOST()
      .set('x-admin-token', 'test-admin-token')
      .send(validAcopio)

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('oficial')
  })

  it('trata un token incorrecto como ciudadano', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token'
    const res = await requestPOST()
      .set('x-admin-token', 'wrong')
      .send(validAcopio)

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('ciudadano')
  })

  it('valida nombre, ciudad y coordenadas', async () => {
    const noName = await requestPOST().send({ ...validAcopio, name: '' })
    expect(noName.status).toBe(400)

    const noCity = await requestPOST().send({
      ...validAcopio,
      cityCode: 'bogota-desconocida',
    })
    expect(noCity.status).toBe(400)

    const noLat = await requestPOST().send({ ...validAcopio, lat: undefined })
    expect(noLat.status).toBe(400)
  })

  it('lista los centros con filtros', async () => {
    await createAcopio({ name: 'Centro A' })
    await createAcopio({ name: 'Centro B' })

    const res = await request(app).get('/api/acopios?city=pereira')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.acopios).toHaveLength(2)
    expect(res.body.acopios[0]).toMatchObject({
      city: { code: 'pereira' },
      type: 'ciudadano',
    })
  })

  it('obtiene un centro por id y devuelve 404 si no existe', async () => {
    const center = await createAcopio()

    const res = await request(app).get(`/api/acopios/${center.id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe(center.name)

    const missing = await request(app).get('/api/acopios/no-existe-id')
    expect(missing.status).toBe(404)
  })
})

function requestPOST() {
  return request(app).post('/api/acopios')
}
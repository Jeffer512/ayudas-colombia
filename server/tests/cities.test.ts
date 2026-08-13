import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { ensureCity } from './factories.js'

const app = createApp()

describe('GET /api/cities', () => {
  it('devuelve listado vacío cuando no hay ciudades', async () => {
    const res = await request(app).get('/api/cities')
    expect(res.status).toBe(200)
    expect(res.body.cities).toEqual([])
  })

  it('lista las ciudades activas', async () => {
    await ensureCity()
    const res = await request(app).get('/api/cities')
    expect(res.status).toBe(200)
    expect(res.body.cities).toHaveLength(1)
    expect(res.body.cities[0]).toMatchObject({
      code: 'pereira',
      name: 'Pereira',
    })
  })
})
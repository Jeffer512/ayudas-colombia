import request from 'supertest'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { createApp } from '../src/app.js'

const app = createApp()

afterEach(() => {
  vi.unstubAllGlobals()
})

describe('GET /api/geo', () => {
  it('devuelve la ubicación del cliente resolviendo el primer salto de x-forwarded-for', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async (url: string) => {
        expect(url).toContain('/json/203.0.113.9?')
        return {
          ok: true,
          json: async () => ({
            status: 'success',
            lat: 4.8133,
            lon: -75.6961,
            city: 'Pereira',
            regionName: 'Risaralda',
            country: 'Colombia',
          }),
        }
      }),
    )

    const res = await request(app)
      .get('/api/geo')
      .set('x-forwarded-for', '203.0.113.9, 10.0.0.2')

    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      lat: 4.8133,
      lng: -75.6961,
      city: 'Pereira',
      region: 'Risaralda',
      country: 'Colombia',
    })
  })

  it('devuelve 502 cuando el servicio externo falla', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: false,
        status: 429,
        json: async () => ({}),
      })),
    )

    const res = await request(app).get('/api/geo')

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Error interno del servidor')
  })

  it('devuelve 502 cuando la respuesta no es exitosa', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => ({
        ok: true,
        json: async () => ({ status: 'fail', message: 'invalid query' }),
      })),
    )

    const res = await request(app).get('/api/geo')

    expect(res.status).toBe(502)
    expect(res.body.error).toBe('Error interno del servidor')
  })
})
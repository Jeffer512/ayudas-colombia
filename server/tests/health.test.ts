import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'

describe('GET /api/health', () => {
  it('responde ok', async () => {
    const res = await request(createApp()).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })

  it('devuelve 404 para rutas inexistentes', async () => {
    const res = await request(createApp()).get('/api/inexistente')
    expect(res.status).toBe(404)
  })
})
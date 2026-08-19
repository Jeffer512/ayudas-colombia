import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'

const app = createApp()
const ADMIN_TOKEN = 'test-admin-token'

describe('trackVisit', () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = ADMIN_TOKEN
  })

  it('registra una visita para un visitante nuevo', async () => {
    await request(app).get('/api/cities').set('x-visitor-id', 'visitor-a')

    const visits = await prisma.visit.findMany({ where: { visitorId: 'visitor-a' } })
    expect(visits).toHaveLength(1)
    expect(visits[0].visitorId).toBe('visitor-a')
  })

  it('no duplica la visita del mismo visitante en el mismo día', async () => {
    await request(app).get('/api/cities').set('x-visitor-id', 'visitor-b')
    await request(app).get('/api/cities').set('x-visitor-id', 'visitor-b')

    const visits = await prisma.visit.findMany({ where: { visitorId: 'visitor-b' } })
    expect(visits).toHaveLength(1)
  })

  it('ignora las peticiones sin identificador de visitante', async () => {
    await request(app).get('/api/cities')

    expect(await prisma.visit.count()).toBe(0)
  })

  it('ignora las revisiones de salud', async () => {
    await request(app).get('/api/health').set('x-visitor-id', 'visitor-c')

    expect(await prisma.visit.count()).toBe(0)
  })
})

describe('GET /api/admin/analytics', () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = ADMIN_TOKEN
  })

  it('exige un token de administración válido', async () => {
    const res = await request(app).get('/api/admin/analytics')
    expect(res.status).toBe(403)
  })

  it('reporta visitantes únicos por día', async () => {
    const today = new Date()
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)

    await prisma.visit.createMany({
      data: [
        { visitorId: 'v1', createdAt: today },
        { visitorId: 'v2', createdAt: today },
        { visitorId: 'v3', createdAt: yesterday },
      ],
    })

    const res = await request(app)
      .get('/api/admin/analytics')
      .set('x-admin-token', ADMIN_TOKEN)

    expect(res.status).toBe(200)
    expect(res.body.today).toBe(2)
    expect(res.body.last7).toBe(3)
    expect(res.body.last30).toBe(3)
    expect(res.body.daily.at(-1).visitors).toBe(2)
    expect(res.body.daily.at(-2).visitors).toBe(1)
  })
})

import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createAviso, createHelpOrg, createOffer, createRequest } from './factories.js'

const app = createApp()

const ADMIN_TOKEN = 'test-admin-token'

async function registerAndVerify(email: string) {
  const body = {
    email,
    password: 'contrasena-segura',
    name: 'Usuario Prueba',
  }
  const registered = await request(app).post('/api/auth/register').send(body)
  const url = new URL(registered.body.verificationUrl, 'http://localhost')
  const token = url.searchParams.get('token')
  await request(app).post('/api/auth/verify-email').send({ token })
  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password: 'contrasena-segura' })
  return agent
}

describe('POST /api/reports', () => {
  beforeEach(() => {
    process.env.ADMIN_TOKEN = ADMIN_TOKEN
  })

  it('exige iniciar sesión para reportar', async () => {
    const created = await createRequest()
    const res = await request(app)
      .post('/api/reports')
      .send({ kind: 'request', targetId: created.id, reason: 'fake' })
    expect(res.status).toBe(401)
  })

  it('reporta una solicitud y la lista como abierta en el panel', async () => {
    const created = await createRequest()
    const agent = await registerAndVerify('reporta-1@example.com')

    const reported = await agent
      .post('/api/reports')
      .send({ kind: 'request', targetId: created.id, reason: 'fake', note: 'Parece ser un fraude' })

    expect(reported.status).toBe(201)
    expect(reported.body).toEqual({ ok: true })

    const list = await request(app)
      .get('/api/admin/reports?status=open')
      .set('x-admin-token', ADMIN_TOKEN)
    expect(list.status).toBe(200)
    expect(list.body.reports).toHaveLength(1)
    expect(list.body.reports[0]).toMatchObject({
      kind: 'request',
      targetId: created.id,
      targetTitle: created.title,
      reason: 'fake',
      note: 'Parece ser un fraude',
      openReports: 1,
    })
  })

  it('no permite reportar la misma publicación dos veces', async () => {
    const created = await createHelpOrg()
    const agent = await registerAndVerify('reporta-2@example.com')

    await agent
      .post('/api/reports')
      .send({ kind: 'org', targetId: created.id, reason: 'spam' })
    const second = await agent
      .post('/api/reports')
      .send({ kind: 'org', targetId: created.id, reason: 'unreachable' })

    expect(second.status).toBe(409)
  })

  it('devuelve 404 si la publicación no existe', async () => {
    const agent = await registerAndVerify('reporta-3@example.com')
    const res = await agent
      .post('/api/reports')
      .send({ kind: 'offer', targetId: '00000000-0000-0000-0000-000000000000', reason: 'other' })
    expect(res.status).toBe(404)
  })

  it('rechaza motivos y publicaciones inválidas', async () => {
    const created = await createAviso()
    const agent = await registerAndVerify('reporta-4@example.com')

    const badReason = await agent
      .post('/api/reports')
      .send({ kind: 'aviso', targetId: created.id, reason: 'invento' })
    expect(badReason.status).toBe(400)

    const croppedKind = await agent
      .post('/api/reports')
      .send({ kind: 'aviso', targetId: created.id.slice(0, -5), reason: 'spam' })
    expect(croppedKind.status).toBe(400)
  })

  it('cuenta los reportes abiertos por publicación', async () => {
    const created = await createOffer()
    const a = await registerAndVerify('reporta-5@example.com')
    await registerAndVerify('reporta-6@example.com')

    await a.post('/api/reports').send({ kind: 'offer', targetId: created.id, reason: 'fake' })
    const b = request.agent(app)
    await b.post('/api/auth/login').send({ email: 'reporta-6@example.com', password: 'contrasena-segura' })
    await b.post('/api/reports').send({ kind: 'offer', targetId: created.id, reason: 'unreachable' })

    const list = await request(app)
      .get('/api/admin/reports')
      .set('x-admin-token', ADMIN_TOKEN)
    expect(list.body.reports).toHaveLength(2)
    expect(list.body.reports.every((r: { openReports: number }) => r.openReports === 2)).toBe(true)
  })

  it('marca un reporte como revisado y lo saca del filtro abierto', async () => {
    const created = await createAviso()
    const agent = await registerAndVerify('reporta-7@example.com')
    await agent.post('/api/reports').send({ kind: 'aviso', targetId: created.id, reason: 'wrong' })

    const list = await request(app)
      .get('/api/admin/reports?status=open')
      .set('x-admin-token', ADMIN_TOKEN)
    const reportId = list.body.reports[0].id

    const reviewed = await request(app)
      .post(`/api/admin/reports/${reportId}/review`)
      .set('x-admin-token', ADMIN_TOKEN)
    expect(reviewed.status).toBe(200)
    expect(reviewed.body.status).toBe('reviewed')

    const updated = await prisma.postReport.findUnique({ where: { id: reportId } })
    expect(updated?.status).toBe('reviewed')
    expect(updated?.reviewedAt).not.toBeNull()
  })
})
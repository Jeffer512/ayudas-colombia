import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createReport } from './factories.js'

const app = createApp()

describe('POST /api/reports/:id/status', () => {
  it('marca un reporte como siendo atendido y registra el evento', async () => {
    const report = await createReport()

    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({
        status: 'in_progress',
        note: 'Cruz Roja se hace cargo',
        actorName: 'Cruz Roja',
      })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('in_progress')
    expect(res.body.events).toHaveLength(2)
    const last = res.body.events[res.body.events.length - 1]
    expect(last).toMatchObject({ status: 'in_progress', actorName: 'Cruz Roja' })
  })

  it('resuelve con el código de cierre correcto', async () => {
    const report = await createReport()

    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'resolved', resolveCode: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('resolved')
    expect(res.body.resolvedAt).not.toBeNull()
  })

  it('rechaza resolver con el código de cierre incorrecto', async () => {
    const report = await createReport()

    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'resolved', resolveCode: '9999' })

    expect(res.status).toBe(403)
  })

  it('permite pasar de siendo atendido a abierto', async () => {
    const report = await createReport()

    await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'in_progress' })
    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'open', note: 'Reabierto, aún se necesita ayuda' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
    expect(res.body.resolvedAt).toBeNull()
  })

  it('reabre un reporte resuelto', async () => {
    const report = await createReport()

    await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'resolved', resolveCode: '1234' })
    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'open' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
  })

  it('rechaza una transición no permitida (abierto directo a resuelto requiere también, ej: duplicado->resuelto)', async () => {
    const report = await createReport()

    await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'duplicate', note: 'Duplicado del reporte X' })

    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'resolved', resolveCode: '1234' })

    expect(res.status).toBe(400)
  })

  it('acepta marcar como duplicado o inválido', async () => {
    const dup = await createReport()
    const inv = await createReport()

    const dupRes = await request(app)
      .post(`/api/reports/${dup.id}/status`)
      .send({ status: 'duplicate', note: 'Ya existe el reporte #2' })
    const invRes = await request(app)
      .post(`/api/reports/${inv.id}/status`)
      .send({ status: 'invalid' })

    expect(dupRes.status).toBe(200)
    expect(dupRes.body.status).toBe('duplicate')
    expect(invRes.body.status).toBe('invalid')
  })

  it('devuelve 404 para un reporte inexistente', async () => {
    const res = await request(app)
      .post('/api/reports/00000000-0000-0000-0000-000000000000/status')
      .send({ status: 'in_progress' })

    expect(res.status).toBe(404)
  })

  it('rechaza un estado inválido', async () => {
    const report = await createReport()
    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'eliminado' })

    expect(res.status).toBe(400)
  })

  it('no crea eventos duplicados al reenviar el mismo estado', async () => {
    const report = await createReport()

    const res = await request(app)
      .post(`/api/reports/${report.id}/status`)
      .send({ status: 'open', actorName: 'Juan' })

    expect(res.status).toBe(200)
    const events = await prisma.reportEvent.count({ where: { reportId: report.id } })
    expect(events).toBe(1)
  })
})
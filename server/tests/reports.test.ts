import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { createReport } from './factories.js'

const app = createApp()

describe('GET /api/reports', () => {
  it('devuelve listado vacío sin reportes', async () => {
    const res = await request(app).get('/api/reports')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({
      reports: [],
      total: 0,
      limit: 50,
      offset: 0,
    })
  })

  it('lista reportes con reporter y ciudad, más recientes primero', async () => {
    const older = await createReport({ title: 'Primer reporte' })
    const newer = await createReport({ title: 'Segundo reporte' })

    const res = await request(app).get('/api/reports')
    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.reports[0].id).toBe(newer.id)
    expect(res.body.reports[1].id).toBe(older.id)
    const first = res.body.reports[0]
    expect(first.city).toEqual({ code: 'pereira', name: 'Pereira' })
    expect(first.reporter.name).toBe('Juan Pérez')
    expect(first.reporter.contactType).toBe('individual')
    expect(first.status).toBe('open')
    expect(first.direction).toBe('need')
    expect(first.resolveCode).toBeUndefined()
  })

  it('filtra por tipo', async () => {
    await createReport({ type: 'volunteers_request' })
    const missing = await createReport({ type: 'missing_person' })

    const res = await request(app).get('/api/reports').query({ type: 'missing_person' })
    expect(res.body.total).toBe(1)
    expect(res.body.reports[0].id).toBe(missing.id)
  })

  it('filtra por estado', async () => {
    await createReport({ status: 'open' })
    const resolved = await createReport({ status: 'resolved', resolvedAt: new Date() })

    const res = await request(app).get('/api/reports').query({ status: 'resolved' })
    expect(res.body.total).toBe(1)
    expect(res.body.reports[0].id).toBe(resolved.id)
  })

  it('el filtro active incluye abiertos y siendo atendidos, excluyendo resueltos', async () => {
    await createReport({ status: 'open' })
    const inProgress = await createReport({ status: 'in_progress' })
    await createReport({ status: 'resolved', resolvedAt: new Date() })

    const res = await request(app).get('/api/reports').query({ status: 'active' })
    expect(res.body.total).toBe(2)
    const ids = res.body.reports.map((r: { id: string }) => r.id)
    expect(ids).toContain(inProgress.id)
  })

  it('filtra por urgencia', async () => {
    await createReport({ urgency: 'low' })
    const critical = await createReport({ urgency: 'critical' })

    const res = await request(app).get('/api/reports').query({ urgency: 'critical' })
    expect(res.body.total).toBe(1)
    expect(res.body.reports[0].id).toBe(critical.id)
  })

  it('devuelve vacío para una ciudad sin reportes', async () => {
    await createReport()
    const res = await request(app).get('/api/reports').query({ city: 'cartago' })
    expect(res.body.total).toBe(0)
    expect(res.body.reports).toEqual([])
  })

  it('busca por texto en título, descripción y dirección sin importar mayúsculas', async () => {
    await createReport({
      title: 'Kit de alimentos',
      description: 'Cajas de comida disponibles',
    })
    const found = await createReport({
      title: 'Refugio El Oso',
      description: 'Calle 20 con escombros',
    })

    const byTitle = await request(app).get('/api/reports').query({ q: 'KIT' })
    expect(byTitle.body.total).toBe(1)

    const byDesc = await request(app).get('/api/reports').query({ q: 'escombros' })
    expect(byDesc.body.total).toBe(1)
    expect(byDesc.body.reports[0].id).toBe(found.id)
  })

  it('aplica paginación con limit y offset', async () => {
    await createReport({ title: 'A' })
    await createReport({ title: 'B' })

    const page1 = await request(app).get('/api/reports').query({ limit: 1, offset: 0 })
    const page2 = await request(app).get('/api/reports').query({ limit: 1, offset: 1 })

    expect(page1.body.reports).toHaveLength(1)
    expect(page2.body.reports).toHaveLength(1)
    expect(page1.body.reports[0].id).not.toBe(page2.body.reports[0].id)
    expect(page1.body.total).toBe(2)
  })

  it('rechaza un tipo de reporte inválido', async () => {
    const res = await request(app).get('/api/reports').query({ type: 'comida' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
  })
})

describe('GET /api/reports/:id', () => {
  it('devuelve un reporte con su línea de tiempo de eventos', async () => {
    const created = await createReport()
    const res = await request(app).get(`/api/reports/${created.id}`)

    expect(res.status).toBe(200)
    expect(res.body.id).toBe(created.id)
    expect(res.body.events).toHaveLength(1)
    expect(res.body.events[0]).toMatchObject({ status: 'open' })
  })

  it('devuelve 404 para un id inexistente', async () => {
    const res = await request(app).get('/api/reports/00000000-0000-0000-0000-000000000000')
    expect(res.status).toBe(404)
  })

  it('devuelve 404 para un id con formato inválido', async () => {
    const res = await request(app).get('/api/reports/no-es-un-uuid')
    expect(res.status).toBe(404)
  })
})
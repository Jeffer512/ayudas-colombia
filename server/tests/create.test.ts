import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { ensureCity } from './factories.js'

const app = createApp()

const validReport = {
  type: 'supplies_request',
  urgency: 'high',
  title: 'Necesitamos agua potable',
  description: 'Familias de la cuadra requieren agua para beber y cocinar.',
  address: 'Calle 12 #4-50, Centro',
  cityCode: 'pereira',
  reporter: {
    contactType: 'individual',
    name: 'María Gómez',
    phone: '3158765432',
    email: 'maria@example.com',
  },
}

describe('POST /api/reports', () => {

  it('crea un reporte como abierto y guarda evento inicial', async () => {
    await ensureCity()
    const res = await request(app).post('/api/reports').send(validReport)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'supplies_request',
      urgency: 'high',
      status: 'open',
      title: validReport.title,
      city: { code: 'pereira', name: 'Pereira' },
    })
    expect(res.body.lat).toBeNull()
    expect(res.body.events).toHaveLength(1)
    expect(res.body.events[0]).toMatchObject({ status: 'open' })
  })

  it('guarda el código de verificación con los últimos 4 dígitos del teléfono', async () => {
    await ensureCity()
    const res = await request(app).post('/api/reports').send(validReport)

    const stored = await prisma.report.findUnique({ where: { id: res.body.id } })
    expect(stored?.phoneVerify).toBe('5432')
  })

  it('crea el reporter asociado', async () => {
    await ensureCity()
    const res = await request(app).post('/api/reports').send(validReport)

    const reporter = await prisma.reporter.findFirst({
      where: { phone: '3158765432' },
    })
    expect(res.body.reporter.name).toBe('María Gómez')
    expect(reporter).not.toBeNull()
    expect(reporter?.contactType).toBe('individual')
  })

  it('acepta un reporte de organización con nombre de organización', async () => {
    await ensureCity()
    const res = await request(app).post('/api/reports').send({
      ...validReport,
      type: 'shelter_offered',
      reporter: {
        contactType: 'organization',
        name: 'Carlos Ruiz',
        organizationName: 'Defensa Civil Risaralda',
        organizationType: 'government',
        phone: '3120001111',
      },
    })

    expect(res.status).toBe(201)
    expect(res.body.reporter).toMatchObject({
      contactType: 'organization',
      organizationName: 'Defensa Civil Risaralda',
      organizationType: 'government',
    })
  })

  it('rechaza organización sin nombre de organización', async () => {
    await ensureCity()
    const res = await request(app).post('/api/reports').send({
      ...validReport,
      reporter: { contactType: 'organization', name: 'Carlos', phone: '3120001111' },
    })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('Datos inválidos')
  })

  it('rechaza ciudad inexistente', async () => {
    const res = await request(app)
      .post('/api/reports')
      .send({ ...validReport, cityCode: 'cartago' })
    expect(res.status).toBe(400)
    expect(res.body.error).toContain('Ciudad no encontrada')
  })

  it('rechaza un tipo de reporte inválido', async () => {
    await ensureCity()
    const res = await request(app)
      .post('/api/reports')
      .send({ ...validReport, type: 'comida' })
    expect(res.status).toBe(400)
    expect(res.body.details).toBeDefined()
  })

  it('rechaza un título muy corto', async () => {
    await ensureCity()
    const res = await request(app)
      .post('/api/reports')
      .send({ ...validReport, title: 'Agua' })
    expect(res.status).toBe(400)
  })

  it('rechaza coordenadas fuera de rango', async () => {
    await ensureCity()
    const res = await request(app)
      .post('/api/reports')
      .send({ ...validReport, lat: 120, lng: -75 })
    expect(res.status).toBe(400)
  })

  it('con teléfono muy corto guarda los dígitos que existan como verificación', async () => {
    await ensureCity()
    const res = await request(app)
      .post('/api/reports')
      .send({
        ...validReport,
        reporter: { ...validReport.reporter, phone: '999' },
      })

    const stored = await prisma.report.findUnique({ where: { id: res.body.id } })
    expect(stored?.phoneVerify).toBe('999')
  })
})
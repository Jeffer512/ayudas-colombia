import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createHelpOrg, createOffer, createRequest, ensureCity } from './factories.js'

const app = createApp()

async function registerAndLogin(email: string, name = 'Ciudadana', orgId?: string) {
  const created = await request(app).post('/api/auth/register').send({
    email,
    password: 'contrasena-segura',
    name,
    ...(orgId ? { orgId } : {}),
  })
  const url = new URL(created.body.verificationUrl, 'http://localhost')
  const token = url.searchParams.get('token')!
  await request(app).post('/api/auth/verify-email').send({ token })

  const agent = request.agent(app)
  await agent.post('/api/auth/login').send({ email, password: 'contrasena-segura' })
  return agent
}

async function loginCitizen(email = 'voluntaria2@correo.org') {
  return registerAndLogin(email, 'Voluntaria')
}

const validRequest = {
  type: 'supplies_request',
  urgency: 'medium',
  title: 'Necesitamos agua potable en el Centro',
  description: 'Las familias del sector requieren agua para cocinar y beber.',
  address: 'Calle 12 #4-50',
  lat: 4.8133,
  lng: -75.6961,
  cityCode: 'pereira',
  reporter: { name: 'María Gómez', phone: '3158765432' },
}

const validOffer = {
  type: 'supplies_offered',
  title: 'Ofrezco 100 kits de aseo',
  description: 'Pongo a disposición kits de aseo básico para las familias afectadas.',
  lat: 4.8133,
  lng: -75.6961,
  cityCode: 'pereira',
  reporter: { name: 'Carmen Vila', phone: '3105552222' },
}

beforeEach(async () => {
  await ensureCity()
})

describe('contactVisibility de solicitudes', () => {
  it('oculta el contacto a quien no tiene sesión y vela el resto del pedido', async () => {
    const created = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, contactVisibility: 'users' })
    expect(created.status).toBe(201)

    const list = await request(app).get('/api/requests')
    expect(list.body.total).toBe(1)
    expect(list.body.requests[0].reporter).toMatchObject({
      name: 'María Gómez',
      phone: null,
      whatsapp: null,
      email: null,
    })
    expect(list.body.requests[0].contactRestricted).toBe(true)
    expect(list.body.requests[0].title).toBe(validRequest.title)

    const detail = await request(app).get(`/api/requests/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(true)
    expect(detail.body.reporter.phone).toBeNull()
  })

  it('muestra el contacto a usuarios con sesión', async () => {
    const agent = await loginCitizen()
    const created = await request(app)
      .post('/api/requests')
      .send({ ...validRequest, contactVisibility: 'users' })

    const detail = await agent.get(`/api/requests/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(false)
    expect(detail.body.reporter.phone).toBe('3158765432')
  })

  it('muestra el contacto al dueño incluso sin estar publicado como público', async () => {
    const agent = await registerAndLogin('duenio-visibilidad@correo.org', 'Dueña')
    const created = await agent
      .post('/api/requests')
      .send({ ...validRequest, contactVisibility: 'users' })

    expect(created.body.contactRestricted).toBe(false)
    expect(created.body.reporter.phone).toBe('3158765432')

    const detail = await agent.get(`/api/requests/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(false)
  })

  it('usa contacto público por defecto', async () => {
    const created = await request(app).post('/api/requests').send(validRequest)
    expect(created.body.contactVisibility).toBe('public')
    expect(created.body.contactRestricted).toBe(false)
  })
})

describe('contactVisibility de ofertas', () => {
  it('oculta el contacto a visitantes anónimos', async () => {
    const created = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, contactVisibility: 'users' })

    const detail = await request(app).get(`/api/offers/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(true)
    expect(detail.body.reporter.phone).toBeNull()
    expect(detail.body.description).toBe(validOffer.description)
  })

  it('lo muestra a un usuario con sesión', async () => {
    const agent = await loginCitizen()
    const created = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, contactVisibility: 'users' })

    const detail = await agent.get(`/api/offers/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(false)
    expect(detail.body.reporter.phone).toBe('3105552222')
  })
})

describe('audiencia de ofertas de voluntarios', () => {
  it('esconde a visitantes anónimos las ofertas de voluntarios por defecto', async () => {
    const created = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, type: 'volunteers_offered' })

    expect(created.body.audience).toBe('users')

    const detail = await request(app).get(`/api/offers/${created.body.id}`)
    expect(detail.status).toBe(404)

    const list = await request(app).get('/api/offers')
    expect(list.body.offers).toHaveLength(0)
  })

  it('un usuario con sesión ve las ofertas de voluntarios para usuarios', async () => {
    const agent = await loginCitizen()
    const created = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, type: 'volunteers_offered' })

    const detail = await agent.get(`/api/offers/${created.body.id}`)
    expect(detail.status).toBe(200)

    const list = await agent.get('/api/offers')
    expect(list.body.offers).toHaveLength(1)
  })

  it('solo los miembros de una organización ven las ofertas con audiencia orgs', async () => {
    const org = await createHelpOrg()
    const member = await registerAndLogin('staff-org@correo.org', 'Miembro', org.id)
    const citizen = await loginCitizen('ciudadano-orgs@correo.org')

    const created = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, type: 'volunteers_offered', audience: 'orgs' })

    const memberDetail = await member.get(`/api/offers/${created.body.id}`)
    expect(memberDetail.status).toBe(200)
    expect(memberDetail.body.audience).toBe('orgs')

    const citizenDetail = await citizen.get(`/api/offers/${created.body.id}`)
    expect(citizenDetail.status).toBe(404)

    const citizenList = await citizen.get('/api/offers')
    expect(citizenList.body.offers).toHaveLength(0)

    const anonymous = await request(app).get('/api/offers')
    expect(anonymous.body.offers).toHaveLength(0)
  })

  it('una oferta de voluntarios pública se ve sin sesión', async () => {
    const created = await request(app)
      .post('/api/offers')
      .send({ ...validOffer, type: 'volunteers_offered', audience: 'public' })

    expect(created.body.audience).toBe('public')

    const detail = await request(app).get(`/api/offers/${created.body.id}`)
    expect(detail.status).toBe(200)
  })

  it('no aplica la audiencia a ofertas que no son de voluntarios', async () => {
    await createOffer({ audience: 'users' })
    const res = await request(app).get('/api/offers')
    expect(res.body.offers).toHaveLength(1)
    expect(res.body.offers[0].audience).toBe('public')
  })
})

describe('contactVisibility de avisos', () => {
  it('oculta el contacto a visitantes anónimos y mantiene visible el aviso', async () => {
    const created = await request(app)
      .post('/api/avisos')
      .send({
        title: 'Punto de distribución de agua funcionando',
        description: 'El parque principal reparte agua desde las 7am.',
        urgency: 'medium',
        cityCode: 'pereira',
        reporter: { name: 'Vecino', phone: '3115550000' },
        contactVisibility: 'users',
      })
    expect(created.status).toBe(201)

    const detail = await request(app).get(`/api/avisos/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(true)
    expect(detail.body.reporter.phone).toBeNull()
    expect(detail.body.title).toBe('Punto de distribución de agua funcionando')
  })

  it('muestra el contacto a un usuario con sesión', async () => {
    const agent = await loginCitizen()
    const created = await request(app)
      .post('/api/avisos')
      .send({
        title: 'Punto de distribución de agua funcionando',
        description: 'El parque principal reparte agua desde las 7am.',
        urgency: 'medium',
        cityCode: 'pereira',
        reporter: { name: 'Vecino', phone: '3115550000' },
        contactVisibility: 'users',
      })

    const detail = await agent.get(`/api/avisos/${created.body.id}`)
    expect(detail.body.contactRestricted).toBe(false)
    expect(detail.body.reporter.phone).toBe('3115550000')
  })
})
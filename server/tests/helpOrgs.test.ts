import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createHelpOrg, ensureCity } from './factories.js'

const app = createApp()
const validOrg = {
  name: 'Centro de acopio La Florida',
  address: 'Carrera 20 # 40-25',
  lat: 4.8133,
  lng: -75.6961,
  cityCode: 'pereira',
  category: 'acopio',
  contactName: 'Maria',
  contactPhone: '3105552222',
  hours: '8am - 6pm',
}

async function registerStaff(
  orgId: string,
  email = 'manager@org.org',
  name = 'Manager',
) {
  const created = await request(app).post('/api/auth/register').send({
    email,
    password: 'contrasena-segura',
    name,
    orgId,
  })
  expect(created.status).toBe(201)
  const url = new URL(created.body.verificationUrl, 'http://localhost')
  const token = url.searchParams.get('token')!
  const verified = await request(app)
    .post('/api/auth/verify-email')
    .send({ token })
  expect(verified.status).toBe(200)

  const agent = request.agent(app)
  const login = await agent.post('/api/auth/login').send({
    email,
    password: 'contrasena-segura',
  })
  expect(login.status).toBe(200)
  return agent
}

async function registerPending(orgId: string, email: string, name: string) {
  const created = await request(app).post('/api/auth/register').send({
    email,
    password: 'contrasena-segura',
    name,
    orgId,
  })
  expect(created.status).toBe(201)
  const url = new URL(created.body.verificationUrl, 'http://localhost')
  const token = url.searchParams.get('token')!
  const verified = await request(app)
    .post('/api/auth/verify-email')
    .send({ token })
  expect(verified.status).toBe(200)
}

describe('/api/help-orgs', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.helpOrg.deleteMany()
  })

  it('crea una organización pública como tipo ciudadano y devuelve el código', async () => {
    const res = await requestPOST().send(validOrg)

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'ciudadano',
      category: 'acopio',
      name: 'Centro de acopio La Florida',
      city: { code: 'pereira', name: 'Pereira' },
      status: 'open',
    })
    expect(res.body.lat).toBe(4.8133)
    expect(res.body.resolveCode).toMatch(/^\d{4}$/)
  })

  it('crea una organización tipo oficial cuando se envía el token de administrador', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token'
    const res = await requestPOST()
      .set('x-admin-token', 'test-admin-token')
      .send(validOrg)

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('oficial')
  })

  it('trata un token incorrecto como ciudadano', async () => {
    process.env.ADMIN_TOKEN = 'test-admin-token'
    const res = await requestPOST()
      .set('x-admin-token', 'wrong')
      .send(validOrg)

    expect(res.status).toBe(201)
    expect(res.body.type).toBe('ciudadano')
  })

  it('valida nombre, ciudad y coordenadas', async () => {
    const noName = await requestPOST().send({ ...validOrg, name: '' })
    expect(noName.status).toBe(400)

    const noCity = await requestPOST().send({
      ...validOrg,
      cityCode: 'bogota-desconocida',
    })
    expect(noCity.status).toBe(400)

    const noLat = await requestPOST().send({ ...validOrg, lat: undefined })
    expect(noLat.status).toBe(400)
  })

  it('lista las organizaciones y filtra por categoría', async () => {
    await createHelpOrg({ name: 'Centro A', category: 'acopio' })
    await createHelpOrg({ name: 'Centro B', category: 'albergue' })

    const res = await request(app).get('/api/help-orgs?city=pereira')

    expect(res.status).toBe(200)
    expect(res.body.total).toBe(2)
    expect(res.body.helpOrgs).toHaveLength(2)
    expect(res.body.helpOrgs[0]).toMatchObject({
      city: { code: 'pereira' },
      type: 'ciudadano',
    })

    const byCategory = await request(app)
      .get('/api/help-orgs')
      .query({ category: 'albergue' })
    expect(byCategory.body.total).toBe(1)
    expect(byCategory.body.helpOrgs[0].name).toBe('Centro B')
  })

  it('obtiene una organización por id y devuelve 404 si no existe', async () => {
    const org = await createHelpOrg()

    const res = await request(app).get(`/api/help-orgs/${org.id}`)
    expect(res.status).toBe(200)
    expect(res.body.name).toBe(org.name)

    const missing = await request(app).get('/api/help-orgs/no-existe-id')
    expect(missing.status).toBe(404)
  })
})

describe('POST /api/help-orgs/:id/status', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.helpOrg.deleteMany()
  })

  it('cierra una organización con el código del creador', async () => {
    const org = await createHelpOrg()
    const res = await request(app)
      .post(`/api/help-orgs/${org.id}/status`)
      .send({ status: 'closed', resolveCode: '1234', note: 'Cierre temporal' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('closed')
  })

  it('rechaza cerrar con código incorrecto', async () => {
    const org = await createHelpOrg()
    const res = await request(app)
      .post(`/api/help-orgs/${org.id}/status`)
      .send({ status: 'closed', resolveCode: '9999' })

    expect(res.status).toBe(403)
  })

  it('admite que el administrador cierre cualquier organización', async () => {
    const org = await createHelpOrg()
    process.env.ADMIN_TOKEN = 'test-admin-token'
    const res = await request(app)
      .post(`/api/help-orgs/${org.id}/status`)
      .set('x-admin-token', 'test-admin-token')
      .send({ status: 'closed', note: 'Moderación' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('closed')
  })

  it('reabre una organización cerrada', async () => {
    const org = await createHelpOrg({ status: 'closed' })
    const res = await request(app)
      .post(`/api/help-orgs/${org.id}/status`)
      .send({ status: 'open', resolveCode: '1234' })

    expect(res.status).toBe(200)
    expect(res.body.status).toBe('open')
  })
})

describe('personal de la organización', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.helpOrg.deleteMany()
  })

  it('requiere sesión para ver los miembros', async () => {
    const org = await createHelpOrg()
    const res = await request(app).get(`/api/help-orgs/${org.id}/members`)
    expect(res.status).toBe(401)
  })

  it('lista los miembros activos y pendientes de la organización', async () => {
    const org = await createHelpOrg()
    const manager = await registerStaff(org.id)
    await registerPending(org.id, 'colaborador@org.org', 'Colaborador')

    const res = await manager.get(`/api/help-orgs/${org.id}/members`)
    expect(res.status).toBe(200)
    expect(res.body.members).toHaveLength(2)
    expect(res.body.members[0]).toMatchObject({
      email: 'manager@org.org',
      role: 'manager',
      status: 'active',
    })
    expect(res.body.members[1]).toMatchObject({
      email: 'colaborador@org.org',
      role: 'member',
      status: 'pending',
    })
  })

  it('el segundo registro queda pendiente hasta que el manager lo apruebe', async () => {
    const org = await createHelpOrg()
    const manager = await registerStaff(org.id)
    await registerPending(org.id, 'colaborador@org.org', 'Colaborador')

    const blocked = await request(app).post('/api/auth/login').send({
      email: 'colaborador@org.org',
      password: 'contrasena-segura',
    })
    expect(blocked.status).toBe(403)
    expect(blocked.body.code).toBe('membership_pending')
  })

  it('el manager aprueba una solicitud pendiente y esa persona puede ingresar', async () => {
    const org = await createHelpOrg()
    const manager = await registerStaff(org.id)
    await registerPending(org.id, 'colaborador@org.org', 'Colaborador')

    const members = await manager.get(`/api/help-orgs/${org.id}/members`)
    const pending = members.body.members.find(
      (m: { status: string }) => m.status === 'pending',
    )

    const res = await manager.post(
      `/api/help-orgs/${org.id}/members/${pending.id}/approve`,
    )
    expect(res.status).toBe(200)
    expect(res.body.member.status).toBe('active')

    const missing = await manager.post(
      `/api/help-orgs/${org.id}/members/00000000-0000-0000-0000-000000000000/approve`,
    )
    expect(missing.status).toBe(404)

    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({
      email: 'colaborador@org.org',
      password: 'contrasena-segura',
    })
    expect(login.status).toBe(200)
    expect(login.body.staff).toMatchObject({ role: 'member', status: 'active' })
  })

  it('el manager rechaza una solicitud pendiente y se retira la membresía', async () => {
    const org = await createHelpOrg()
    const manager = await registerStaff(org.id)
    await registerPending(org.id, 'rechazado@org.org', 'Rechazado')

    const members = await manager.get(`/api/help-orgs/${org.id}/members`)
    const pending = members.body.members.find(
      (m: { status: string }) => m.status === 'pending',
    )

    const res = await manager.post(
      `/api/help-orgs/${org.id}/members/${pending.id}/reject`,
    )
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const after = await manager.get(`/api/help-orgs/${org.id}/members`)
    expect(after.body.members).toHaveLength(1)
    expect(after.body.members[0].email).toBe('manager@org.org')
  })

  it('un miembro sin rol de manager no puede aprobar solicitudes', async () => {
    const org = await createHelpOrg()
    const manager = await registerStaff(org.id)
    await registerPending(org.id, 'colaborador@org.org', 'Colaborador')
    await registerPending(org.id, 'tercero@org.org', 'Tercero')

    const members = await manager.get(`/api/help-orgs/${org.id}/members`)
    const pending = members.body.members.find(
      (m: { email: string; status: string }) =>
        m.email === 'colaborador@org.org' && m.status === 'pending',
    )
    await manager.post(
      `/api/help-orgs/${org.id}/members/${pending.id}/approve`,
    )

    const memberAgent = request.agent(app)
    const login = await memberAgent.post('/api/auth/login').send({
      email: 'colaborador@org.org',
      password: 'contrasena-segura',
    })
    expect(login.status).toBe(200)
    expect(login.body.staff.role).toBe('member')

    const third = await memberAgent.get(`/api/help-orgs/${org.id}/members`)
    const thirdPending = third.body.members.find(
      (m: { status: string }) => m.status === 'pending',
    )

    const res = await memberAgent.post(
      `/api/help-orgs/${org.id}/members/${thirdPending.id}/approve`,
    )
    expect(res.status).toBe(403)
  })

  it('no permite aprobar la membresía de otra organización', async () => {
    const orgA = await createHelpOrg({ name: 'Org A' })
    const orgB = await createHelpOrg({ name: 'Org B' })
    const managerA = await registerStaff(orgA.id)
    await registerPending(orgB.id, 'colaborador@org.org', 'Colaborador')

    const probe = await managerA.post(
      `/api/help-orgs/${orgB.id}/members/00000000-0000-0000-0000-000000000000/approve`,
    )
    expect(probe.status).toBe(403)
  })

  it('el personal publica un pedido a nombre de la organización', async () => {
    const org = await createHelpOrg()
    const agent = await registerStaff(org.id)

    const res = await agent.post(`/api/help-orgs/${org.id}/requests`).send({
      type: 'supplies_request',
      urgency: 'high',
      title: 'El centro necesita agua potable',
      description:
        'El centro de acopio agotó las reservas de agua y necesita reabastecer para las familias.',
      address: 'Coliseo Municipal',
      cityCode: 'pereira',
    })

    expect(res.status).toBe(201)
    expect(res.body).toMatchObject({
      type: 'supplies_request',
      status: 'open',
      organization: { id: org.id, name: org.name, category: org.category },
    })

    const list = await request(app)
      .get('/api/requests')
      .query({ org: org.id })
    expect(list.status).toBe(200)
    expect(list.body.total).toBe(1)
    expect(list.body.requests[0].organization).toEqual({
      id: org.id,
      name: org.name,
      category: org.category,
    })
    expect(list.body.requests[0].reporter.name).toBe(org.name)
  })

  it('exige sesión para publicar un pedido de la organización', async () => {
    const org = await createHelpOrg()
    const res = await request(app).post(`/api/help-orgs/${org.id}/requests`).send({
      type: 'supplies_request',
      title: 'Necesitamos agua',
      description: 'Descripción suficientemente larga para el pedido.',
      cityCode: 'pereira',
    })

    expect(res.status).toBe(401)
  })
})

describe('inventario de la organización (/api/help-orgs/:id/items)', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.helpOrgItem.deleteMany()
    await prisma.helpOrg.deleteMany()
  })

  it('lista el inventario vacío de una organización', async () => {
    const org = await createHelpOrg()
    const res = await request(app).get(`/api/help-orgs/${org.id}/items`)

    expect(res.status).toBe(200)
    expect(res.body.items).toEqual([])
  })

  it('devuelve 404 si la organización no existe', async () => {
    const res = await request(app).get('/api/help-orgs/no-existe/items')
    expect(res.status).toBe(404)
  })

  it('el personal crea un elemento del inventario', async () => {
    const org = await createHelpOrg()
    const agent = await registerStaff(org.id)

    const res = await agent.post(`/api/help-orgs/${org.id}/items`).send({
      kind: 'needed',
      name: 'Colchonetas',
      quantity: 40,
      unit: 'unidades',
    })

    expect(res.status).toBe(201)
    expect(res.body.item).toMatchObject({
      orgId: org.id,
      kind: 'needed',
      name: 'Colchonetas',
      quantity: 40,
      unit: 'unidades',
      updatedBy: 'Manager',
    })

    const list = await request(app).get(`/api/help-orgs/${org.id}/items`)
    expect(list.body.items).toHaveLength(1)
    expect(list.body.items[0].name).toBe('Colchonetas')
  })

  it('exige sesión para modificar el inventario', async () => {
    const org = await createHelpOrg()
    const res = await request(app).post(`/api/help-orgs/${org.id}/items`).send({
      name: 'Cobijas',
    })

    expect(res.status).toBe(401)
  })

  it('no permite que personal de otra organización modifique el inventario', async () => {
    const orgA = await createHelpOrg({ name: 'Org A' })
    const orgB = await createHelpOrg({ name: 'Org B' })
    const agent = await registerStaff(orgA.id)

    const res = await agent.post(`/api/help-orgs/${orgB.id}/items`).send({
      name: 'Cobijas',
    })

    expect(res.status).toBe(403)
  })

  it('actualiza un elemento y registra quién lo modificó', async () => {
    const org = await createHelpOrg()
    const agent = await registerStaff(org.id)
    const created = await agent
      .post(`/api/help-orgs/${org.id}/items`)
      .send({ kind: 'available', name: 'Agua', quantity: 100, unit: 'botellas' })
    const itemId = created.body.item.id

    const res = await agent
      .put(`/api/help-orgs/${org.id}/items/${itemId}`)
      .send({ kind: 'available', name: 'Agua embotellada', quantity: 80, unit: 'botellas' })

    expect(res.status).toBe(200)
    expect(res.body.item).toMatchObject({
      id: itemId,
      name: 'Agua embotellada',
      quantity: 80,
      updatedBy: 'Manager',
    })
  })

  it('elimina un elemento del inventario', async () => {
    const org = await createHelpOrg()
    const agent = await registerStaff(org.id)
    const created = await agent
      .post(`/api/help-orgs/${org.id}/items`)
      .send({ name: 'Temporal' })

    const res = await agent.delete(`/api/help-orgs/${org.id}/items/${created.body.item.id}`)
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const list = await request(app).get(`/api/help-orgs/${org.id}/items`)
    expect(list.body.items).toEqual([])
  })

  it('rechaza un tipo de elemento inválido', async () => {
    const org = await createHelpOrg()
    const agent = await registerStaff(org.id)

    const res = await agent.post(`/api/help-orgs/${org.id}/items`).send({
      kind: 'urgente',
      name: 'Cobijas',
    })

    expect(res.status).toBe(400)
  })
})

function requestPOST() {
  return request(app).post('/api/help-orgs')
}
import request from 'supertest'
import { beforeEach, describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createHelpOrg, ensureCity } from './factories.js'

const app = createApp()

async function registerVerified(email: string, name: string) {
  const created = await request(app).post('/api/auth/register').send({
    email,
    password: 'contrasena-segura',
    name,
  })
  expect(created.status).toBe(201)
  const url = new URL(created.body.verificationUrl, 'http://localhost')
  const token = url.searchParams.get('token')!
  const verified = await request(app)
    .post('/api/auth/verify-email')
    .send({ token })
  expect(verified.status).toBe(200)
}

async function loginAgent(email: string) {
  const agent = request.agent(app)
  const login = await agent.post('/api/auth/login').send({
    email,
    password: 'contrasena-segura',
  })
  expect(login.status).toBe(200)
  return agent
}

async function citizenAgent(email: string, name: string) {
  await registerVerified(email, name)
  return loginAgent(email)
}

async function joinAsManager(orgId: string, email: string, name: string) {
  const agent = await citizenAgent(email, name)
  const join = await agent.post(`/api/help-orgs/${orgId}/join`)
  expect(join.status).toBe(201)
  return agent
}

describe('revocación de rol de organización obsoleto (VULN-002)', () => {
  beforeEach(async () => {
    await ensureCity()
    await prisma.helpOrgStaff.deleteMany()
    await prisma.helpOrg.deleteMany()
  })

  it('rechaza con 403 el acceso de manager cuando se elimina la membresía en la base de datos', async () => {
    const org = await createHelpOrg()
    const manager = await joinAsManager(org.id, 'manager@org.org', 'Manager')

    const member = await prisma.helpOrgStaff.findFirstOrThrow({
      where: { orgId: org.id, role: 'manager' },
    })
    await prisma.helpOrgStaff.delete({ where: { id: member.id } })

    const edit = await manager.put(`/api/help-orgs/${org.id}`).send({
      name: 'Intento tras revocación',
    })
    expect(edit.status).toBe(403)
    expect(edit.body.error).toBe('No perteneces a esta organización')
  })

  it('rechaza acciones de manager cuando el rol se degrada a miembro en la base de datos', async () => {
    const org = await createHelpOrg()
    const manager = await joinAsManager(org.id, 'manager@org.org', 'Manager')

    await prisma.helpOrgStaff.updateMany({
      where: { orgId: org.id, role: 'manager' },
      data: { role: 'member' },
    })

    const edit = await manager.put(`/api/help-orgs/${org.id}`).send({
      name: 'Intento con rol degradado',
    })
    expect(edit.status).toBe(403)
    expect(edit.body.error).toBe('Solo el manager puede editar la organización')

    const members = await manager.get(`/api/help-orgs/${org.id}/members`)
    expect(members.status).toBe(200)
  })

  it('permite acceso de miembro a rutas de personal tras degradación, sin confiar en el claim del token', async () => {
    const org = await createHelpOrg()
    const agent = await joinAsManager(org.id, 'manager@org.org', 'Manager')

    await prisma.helpOrgStaff.updateMany({
      where: { orgId: org.id, role: 'manager' },
      data: { role: 'member' },
    })

    const me = await agent.get('/api/auth/me')
    expect(me.body.staff).toMatchObject({ role: 'member', status: 'active' })
  })
})

describe('invalidación de sesiones al cambiar la contraseña (VULN-002)', () => {
  beforeEach(async () => {
    await prisma.user.deleteMany()
  })

  it('revoca otras sesiones y la sesión actual al cambiar la contraseña', async () => {
    await registerVerified('usuario@correo.org', 'Usuario')

    const otherDevice = await loginAgent('usuario@correo.org')
    const thisDevice = await loginAgent('usuario@correo.org')

    const changed = await thisDevice.patch('/api/auth/password').send({
      currentPassword: 'contrasena-segura',
      newPassword: 'nueva-segura-123',
    })
    expect(changed.status).toBe(200)
    expect(changed.body.ok).toBe(true)

    const stillLoggedIn = await thisDevice.get('/api/auth/me')
    expect(stillLoggedIn.body.authenticated).toBe(false)

    const otherDeviceMe = await otherDevice.get('/api/auth/me')
    expect(otherDeviceMe.body.authenticated).toBe(false)

    const otherDeviceEdit = await otherDevice.patch('/api/auth/account').send({
      name: 'Otro',
    })
    expect(otherDeviceEdit.status).toBe(401)

    const oldLogin = await request(app).post('/api/auth/login').send({
      email: 'usuario@correo.org',
      password: 'contrasena-segura',
    })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app).post('/api/auth/login').send({
      email: 'usuario@correo.org',
      password: 'nueva-segura-123',
    })
    expect(newLogin.status).toBe(200)
  })
})

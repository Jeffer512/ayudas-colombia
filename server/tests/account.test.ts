import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createRequest } from './factories.js'

const app = createApp()

function tokenFrom(body: { verificationUrl?: string | null }): string | undefined {
  if (!body.verificationUrl) return undefined
  const url = new URL(body.verificationUrl, 'http://localhost')
  return url.searchParams.get('token') ?? undefined
}

async function register(overrides: Record<string, unknown> = {}) {
  const body = {
    email: 'cuenta@fundacion.org',
    password: 'contrasena-segura',
    name: 'Cuenta Prueba',
    ...overrides,
  }
  const res = await request(app).post('/api/auth/register').send(body)
  return { res, token: tokenFrom(res.body) }
}

async function authenticatedAgent(
  email = 'cuenta@fundacion.org',
  password = 'contrasena-segura',
) {
  const { token } = await register({ email })
  const agent = request.agent(app)
  const verified = await request(app).post('/api/auth/verify-email').send({ token })
  expect(verified.status).toBe(200)
  const login = await agent.post('/api/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return agent
}

describe('PATCH /api/auth/account', () => {
  it('actualiza el nombre y el /me lo refleja', async () => {
    const agent = await authenticatedAgent()

    const res = await agent.patch('/api/auth/account').send({ name: 'Nuevo Nombre' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      name: 'Nuevo Nombre',
      email: 'cuenta@fundacion.org',
      emailChanged: false,
      verificationUrl: null,
    })

    const me = await agent.get('/api/auth/me')
    expect(me.body.name).toBe('Nuevo Nombre')
  })

  it('exige autenticación', async () => {
    const res = await request(app).patch('/api/auth/account').send({ name: 'X' })
    expect(res.status).toBe(401)
  })

  it('rechaza un cuerpo vacío', async () => {
    const agent = await authenticatedAgent()
    const res = await agent.patch('/api/auth/account').send({})
    expect(res.status).toBe(400)
  })

  it('exige la contraseña actual para cambiar el correo', async () => {
    const agent = await authenticatedAgent()
    const res = await agent
      .patch('/api/auth/account')
      .send({ email: 'nuevo@fundacion.org' })
    expect(res.status).toBe(400)
  })

  it('rechaza un correo ya registrado', async () => {
    const agent = await authenticatedAgent()
    await register({ email: 'ocupado@fundacion.org', name: 'Ocupado' })

    const res = await agent
      .patch('/api/auth/account')
      .send({ email: 'ocupado@fundacion.org', password: 'contrasena-segura' })
    expect(res.status).toBe(409)
  })

  it('rechaza una contraseña incorrecta al cambiar el correo', async () => {
    const agent = await authenticatedAgent()
    const res = await agent
      .patch('/api/auth/account')
      .send({ email: 'nuevo@fundacion.org', password: 'incorrecta' })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('invalid_password')
  })

  it('cambia el correo, desmarca la verificación y bloquea el ingreso con el correo nuevo sin verificar', async () => {
    const agent = await authenticatedAgent()

    const res = await agent
      .patch('/api/auth/account')
      .send({ email: 'nuevo@fundacion.org', password: 'contrasena-segura' })
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      email: 'nuevo@fundacion.org',
      emailChanged: true,
    })
    expect(res.body.verificationUrl).toContain('verificar-correo?token=')

    const me = await agent.get('/api/auth/me')
    expect(me.body.email).toBe('nuevo@fundacion.org')
    expect(me.body.emailVerified).toBe(false)

    const blocked = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nuevo@fundacion.org', password: 'contrasena-segura' })
    expect(blocked.status).toBe(403)
    expect(blocked.body.code).toBe('email_unverified')

    const user = await prisma.user.findUnique({
      where: { email: 'nuevo@fundacion.org' },
    })
    expect(user!.emailVerifiedAt).toBeNull()
    expect(user!.verifyTokenHash).not.toBeNull()
  })

  it('el enlace de verificación del correo nuevo activa el ingreso', async () => {
    const agent = await authenticatedAgent()
    const changed = await agent
      .patch('/api/auth/account')
      .send({ email: 'renueva@fundacion.org', password: 'contrasena-segura' })
    const token = tokenFrom(changed.body)

    const verified = await request(app)
      .post('/api/auth/verify-email')
      .send({ token })
    expect(verified.status).toBe(200)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'renueva@fundacion.org', password: 'contrasena-segura' })
    expect(login.status).toBe(200)
  })

  it('no vuelve a desmarcar la verificación si el correo no cambia', async () => {
    const agent = await authenticatedAgent()
    const res = await agent
      .patch('/api/auth/account')
      .send({ email: 'cuenta@fundacion.org', password: 'contrasena-segura' })
    expect(res.status).toBe(200)
    expect(res.body.emailChanged).toBe(false)
    expect(res.body.verificationUrl).toBeNull()

    const me = await agent.get('/api/auth/me')
    expect(me.body.emailVerified).toBe(true)
  })
})

describe('DELETE /api/auth/account', () => {
  it('rechaza una contraseña incorrecta', async () => {
    const agent = await authenticatedAgent()
    const res = await agent
      .delete('/api/auth/account')
      .send({ password: 'incorrecta' })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('invalid_password')

    const user = await prisma.user.findUnique({ where: { email: 'cuenta@fundacion.org' } })
    expect(user).not.toBeNull()
  })

  it('exige autenticación', async () => {
    const res = await request(app)
      .delete('/api/auth/account')
      .send({ password: 'contrasena-segura' })
    expect(res.status).toBe(401)
  })

  it('elimina la cuenta, cierra la sesión y ya no permite ingresar', async () => {
    const agent = await authenticatedAgent()

    const res = await agent
      .delete('/api/auth/account')
      .send({ password: 'contrasena-segura' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.authenticated).toBe(false)

    const login = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cuenta@fundacion.org', password: 'contrasena-segura' })
    expect(login.status).toBe(401)
  })

  it('elimina las publicaciones del usuario al eliminar la cuenta', async () => {
    const { token } = await register()
    const agent = request.agent(app)
    await request(app).post('/api/auth/verify-email').send({ token })
    await agent
      .post('/api/auth/login')
      .send({ email: 'cuenta@fundacion.org', password: 'contrasena-segura' })

    const user = await prisma.user.findUnique({ where: { email: 'cuenta@fundacion.org' } })
    const created = await createRequest()
    await prisma.reporter.update({
      where: { id: created.reporterId },
      data: { userId: user!.id },
    })

    await agent
      .delete('/api/auth/account')
      .send({ password: 'contrasena-segura' })

    expect(
      await prisma.request.findUnique({ where: { id: created.id } }),
    ).toBeNull()
    expect(
      await prisma.user.findUnique({ where: { id: user!.id } }),
    ).toBeNull()
  })
})

describe('GET /api/auth/me', () => {
  it('reporta emailVerified para una cuenta verificada', async () => {
    const agent = await authenticatedAgent()
    const me = await agent.get('/api/auth/me')
    expect(me.body.emailVerified).toBe(true)
  })
})

describe('PATCH /api/auth/password', () => {
  it('cambia la contraseña y la anterior deja de servir', async () => {
    const agent = await authenticatedAgent()

    const res = await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'contrasena-segura', newPassword: 'nueva-contrasena' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cuenta@fundacion.org', password: 'contrasena-segura' })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'cuenta@fundacion.org', password: 'nueva-contrasena' })
    expect(newLogin.status).toBe(200)
  })

  it('rechaza una contraseña actual incorrecta', async () => {
    const agent = await authenticatedAgent()

    const res = await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'incorrecta', newPassword: 'nueva-contrasena' })
    expect(res.status).toBe(401)
    expect(res.body.code).toBe('invalid_password')
  })

  it('rechaza una contraseña nueva igual a la actual', async () => {
    const agent = await authenticatedAgent()

    const res = await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'contrasena-segura', newPassword: 'contrasena-segura' })
    expect(res.status).toBe(400)
    expect(res.body.error).toBe('La nueva contraseña debe ser diferente a la actual')
  })

  it('rechaza una contraseña nueva corta', async () => {
    const agent = await authenticatedAgent()

    const res = await agent
      .patch('/api/auth/password')
      .send({ currentPassword: 'contrasena-segura', newPassword: 'corta' })
    expect(res.status).toBe(400)
  })

  it('exige autenticación', async () => {
    const res = await request(app)
      .patch('/api/auth/password')
      .send({ currentPassword: 'contrasena-segura', newPassword: 'nueva-contrasena' })
    expect(res.status).toBe(401)
  })
})
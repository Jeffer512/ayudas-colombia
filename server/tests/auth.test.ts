import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createAcopio } from './factories.js'

const app = createApp()

async function register(overrides: Record<string, unknown> = {}) {
  const org = await createAcopio()
  const agent = request.agent(app)
  const body = {
    email: 'gerente@fundacion.org',
    password: 'contrasena-segura',
    name: 'Gerente Prueba',
    orgId: org.id,
    ...overrides,
  }
  const res = await agent.post('/api/auth/register').send(body)
  return { agent, res, org }
}

describe('POST /api/auth/register', () => {
  it('crea la cuenta del personal y abre sesión con cookie httpOnly', async () => {
    const { agent, res, org } = await register()

    expect(res.status).toBe(201)
    expect(res.body.staff).toMatchObject({
      name: 'Gerente Prueba',
      role: 'manager',
      orgId: org.id,
    })
    expect(res.body.staff.passwordHash).toBeUndefined()
    const setCookie = res.headers['set-cookie'] as unknown as string[]
    expect(setCookie).toBeDefined()
    expect(setCookie[0]).toContain('snid=')
    expect(setCookie[0]).toContain('HttpOnly')
  })

  it('el segundo miembro de una organización tiene rol member', async () => {
    const { org } = await register()
    const res = await request(app).post('/api/auth/register').send({
      email: 'colaborador@fundacion.org',
      password: 'contrasena-segura',
      name: 'Colaborador',
      orgId: org.id,
    })

    expect(res.status).toBe(201)
    expect(res.body.staff.role).toBe('member')
  })

  it('rechaza un correo ya registrado', async () => {
    const { org } = await register()
    const res = await request(app).post('/api/auth/register').send({
      email: 'gerente@fundacion.org',
      password: 'contrasena-segura',
      name: 'Otro',
      orgId: org.id,
    })

    expect(res.status).toBe(409)
  })

  it('rechaza una organización inexistente', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'x@fundacion.org',
      password: 'contrasena-segura',
      name: 'Prueba',
      orgId: 'no-existe',
    })

    expect(res.status).toBe(404)
  })

  it('rechaza una contraseña corta', async () => {
    const org = await createAcopio()
    const res = await request(app).post('/api/auth/register').send({
      email: 'corta@fundacion.org',
      password: 'corta',
      name: 'Prueba',
      orgId: org.id,
    })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('inicia sesión con credenciales correctas', async () => {
    const { org } = await register()
    const agent = request.agent(app)
    const res = await agent.post('/api/auth/login').send({
      email: 'gerente@fundacion.org',
      password: 'contrasena-segura',
    })

    expect(res.status).toBe(200)
    expect(res.body.staff).toMatchObject({
      email: 'gerente@fundacion.org',
      orgId: org.id,
    })
    const setCookie = res.headers['set-cookie'] as unknown as string[]
    expect(setCookie[0]).toContain('snid=')
  })

  it('rechaza una contraseña incorrecta', async () => {
    await register()
    const res = await request(app).post('/api/auth/login').send({
      email: 'gerente@fundacion.org',
      password: 'incorrecta',
    })

    expect(res.status).toBe(401)
  })
})

describe('GET /api/auth/me', () => {
  it('devuelve el personal desde la sesión activa', async () => {
    const { agent } = await register()
    const res = await agent.get('/api/auth/me')

    expect(res.status).toBe(200)
    expect(res.body.staff).toMatchObject({ role: 'manager' })
  })

  it('devuelve 401 sin cookie de sesión', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('cierra la sesión y el /me ya no reconoce la cookie', async () => {
    const { agent } = await register()
    const logout = await agent.post('/api/auth/logout')
    expect(logout.status).toBe(200)

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(401)
  })
})
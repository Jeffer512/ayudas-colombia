import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { createApp } from '../src/app.js'
import { prisma } from '../src/db.js'
import { createHelpOrg } from './factories.js'

const app = createApp()

type RegisterResult = { status: number; body: { verificationUrl?: string | null } }

function tokenFrom(body: { verificationUrl?: string | null }): string | undefined {
  if (!body.verificationUrl) return undefined
  const url = new URL(body.verificationUrl, 'http://localhost')
  return url.searchParams.get('token') ?? undefined
}

async function register(overrides: Record<string, unknown> = {}): Promise<
  { res: RegisterResult; token?: string; org: { id: string } } & RegisterResult
> {
  const org = await createHelpOrg()
  const body = {
    email: 'gerente@fundacion.org',
    password: 'contrasena-segura',
    name: 'Gerente Prueba',
    orgId: org.id,
    ...overrides,
  }
  const res = await request(app).post('/api/auth/register').send(body)
  return { res, token: tokenFrom(res.body), org }
}

async function verifyAndLogin(email: string, password: string, token: string) {
  const verified = await request(app)
    .post('/api/auth/verify-email')
    .send({ token })
  expect(verified.status).toBe(200)
  const agent = request.agent(app)
  const login = await agent.post('/api/auth/login').send({ email, password })
  expect(login.status).toBe(200)
  return agent
}

describe('POST /api/auth/register', () => {
  it('crea la cuenta y NO abre sesión: devuelve el enlace de verificación', async () => {
    const { res, token } = await register()

    expect(res.status).toBe(201)
    expect(token).toBeDefined()
    expect(res.body.verificationUrl).toContain('/verificar-correo?token=')
    const setCookie = res.headers['set-cookie'] as unknown as string[] | undefined
    expect(setCookie).toBeUndefined()

    const user = await prisma.user.findUnique({
      where: { email: 'gerente@fundacion.org' },
      include: { memberships: true },
    })
    expect(user).not.toBeNull()
    expect(user!.emailVerifiedAt).toBeNull()
    expect(user!.verifyTokenHash).not.toBeNull()
    expect(user!.memberships).toHaveLength(1)
    expect(user!.memberships[0]).toMatchObject({ role: 'manager', status: 'active' })
  })

  it('el primer miembro de una organización es manager activo; el siguiente queda pendiente', async () => {
    const { org } = await register()

    const second = await request(app).post('/api/auth/register').send({
      email: 'colaborador@fundacion.org',
      password: 'contrasena-segura',
      name: 'Colaborador',
      orgId: org.id,
    })
    expect(second.status).toBe(201)

    const memberships = await prisma.helpOrgStaff.findMany({
      where: { orgId: org.id },
      orderBy: { createdAt: 'asc' },
    })
    expect(memberships).toHaveLength(2)
    expect(memberships[0]).toMatchObject({ role: 'manager', status: 'active' })
    expect(memberships[1]).toMatchObject({ role: 'member', status: 'pending' })
  })

  it('permite registrarse sin organización (cuenta ciudadana)', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'ciudadana@correo.org',
      password: 'contrasena-segura',
      name: 'Ciudadana',
    })

    expect(res.status).toBe(201)
    const user = await prisma.user.findUnique({
      where: { email: 'ciudadana@correo.org' },
      include: { memberships: true },
    })
    expect(user?.memberships).toHaveLength(0)
  })

  it('rechaza un correo ya registrado', async () => {
    await register()
    const res = await request(app).post('/api/auth/register').send({
      email: 'gerente@fundacion.org',
      password: 'contrasena-segura',
      name: 'Otro',
      orgId: 'org-no-usado',
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
    const org = await createHelpOrg()
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
  it('rechaza el ingreso antes de verificar el correo', async () => {
    const { org } = await register()
    const res = await request(app).post('/api/auth/login').send({
      email: 'gerente@fundacion.org',
      password: 'contrasena-segura',
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('email_unverified')
    expect(org).toBeDefined()
  })

  it('permite ingresar después de verificar el correo', async () => {
    const { org, token } = await register()
    const agent = await verifyAndLogin(
      'gerente@fundacion.org',
      'contrasena-segura',
      token!,
    )

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.staff).toMatchObject({
      email: 'gerente@fundacion.org',
      orgId: org.id,
      role: 'manager',
      status: 'active',
    })
  })

  it('rechaza el ingreso mientras la membresía está pendiente de aprobación', async () => {
    const { org } = await register()
    const second = await request(app).post('/api/auth/register').send({
      email: 'colaborador@fundacion.org',
      password: 'contrasena-segura',
      name: 'Colaborador',
      orgId: org.id,
    })
    const token = tokenFrom(second.body)
    await request(app).post('/api/auth/verify-email').send({ token })

    const res = await request(app).post('/api/auth/login').send({
      email: 'colaborador@fundacion.org',
      password: 'contrasena-segura',
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('membership_pending')
  })

  it('permite ingresar a un ciudadano verificado y /me devuelve staff null', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'ciudadana@correo.org',
      password: 'contrasena-segura',
      name: 'Ciudadana',
    })
    await request(app).post('/api/auth/verify-email').send({ token: tokenFrom(res.body) })

    const agent = request.agent(app)
    const login = await agent.post('/api/auth/login').send({
      email: 'ciudadana@correo.org',
      password: 'contrasena-segura',
    })
    expect(login.status).toBe(200)

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body.staff).toBeNull()
  })

  it('rechaza una contraseña incorrecta', async () => {
    const { token } = await register()
    await request(app).post('/api/auth/verify-email').send({ token })
    const res = await request(app).post('/api/auth/login').send({
      email: 'gerente@fundacion.org',
      password: 'incorrecta',
    })

    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/verify-email', () => {
  it('rechaza un token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: 'no-existe-este-token' })

    expect(res.status).toBe(400)
  })

  it('marca el correo como verificado y limpiar el token', async () => {
    const { token } = await register()
    const res = await request(app)
      .post('/api/auth/verify-email')
      .send({ token })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const user = await prisma.user.findUnique({
      where: { email: 'gerente@fundacion.org' },
    })
    expect(user!.emailVerifiedAt).not.toBeNull()
    expect(user!.verifyTokenHash).toBeNull()
  })
})

describe('POST /api/auth/resend-verification', () => {
  it('envía un nuevo token y el anterior deja de servir', async () => {
    const { token: oldToken } = await register()

    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'gerente@fundacion.org' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const old = await request(app)
      .post('/api/auth/verify-email')
      .send({ token: oldToken })
    expect(old.status).toBe(400)

    const user = await prisma.user.findUnique({
      where: { email: 'gerente@fundacion.org' },
    })
    expect(user!.verifyTokenHash).not.toBeNull()
  })

  it('no revela si un correo no existe', async () => {
    const res = await request(app)
      .post('/api/auth/resend-verification')
      .send({ email: 'nadie@correo.org' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
  })
})

describe('GET /api/auth/me', () => {
  it('devuelve 401 sin cookie de sesión', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(401)
  })
})

describe('POST /api/auth/logout', () => {
  it('cierra la sesión y el /me ya no reconoce la cookie', async () => {
    const { token } = await register()
    const agent = await verifyAndLogin(
      'gerente@fundacion.org',
      'contrasena-segura',
      token!,
    )

    const logout = await agent.post('/api/auth/logout')
    expect(logout.status).toBe(200)

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(401)
  })
})
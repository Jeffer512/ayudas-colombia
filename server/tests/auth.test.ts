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
  { res: RegisterResult; token?: string } & RegisterResult
> {
  const body = {
    email: 'gerente@fundacion.org',
    password: 'contrasena-segura',
    name: 'Gerente Prueba',
    ...overrides,
  }
  const res = await request(app).post('/api/auth/register').send(body)
  return { res, token: tokenFrom(res.body) }
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

async function citizenAgent(email: string, name: string) {
  const { res, token } = await register({ email, name })
  return verifyAndLogin(email, 'contrasena-segura', token!)
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
    expect(user!.memberships).toHaveLength(0)
  })

  it('siempre crea una cuenta personal: la vinculación a una organización llega después', async () => {
    const { res } = await register({ email: 'ciudadana@correo.org', name: 'Ciudadana' })

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
    })

    expect(res.status).toBe(409)
  })

  it('rechaza una contraseña corta', async () => {
    const res = await request(app).post('/api/auth/register').send({
      email: 'corta@fundacion.org',
      password: 'corta',
      name: 'Prueba',
    })

    expect(res.status).toBe(400)
  })
})

describe('POST /api/auth/login', () => {
  it('rechaza el ingreso antes de verificar el correo', async () => {
    await register()
    const res = await request(app).post('/api/auth/login').send({
      email: 'gerente@fundacion.org',
      password: 'contrasena-segura',
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('email_unverified')
  })

  it('permite ingresar después de verificar el correo y /me no reporta staff', async () => {
    const { token } = await register()
    const agent = await verifyAndLogin(
      'gerente@fundacion.org',
      'contrasena-segura',
      token!,
    )

    const me = await agent.get('/api/auth/me')
    expect(me.status).toBe(200)
    expect(me.body).toMatchObject({
      authenticated: true,
      staff: null,
      pendingOrgId: null,
    })
  })

  it('rechaza el ingreso mientras la membresía está pendiente de aprobación', async () => {
    const org = await createHelpOrg()
    await citizenAgent('primera@fundacion.org', 'Primera').then((agent) =>
      agent.post(`/api/help-orgs/${org.id}/join`),
    )
    await citizenAgent('pendiente@fundacion.org', 'Pendiente').then((agent) =>
      agent.post(`/api/help-orgs/${org.id}/join`),
    )

    const res = await request(app).post('/api/auth/login').send({
      email: 'pendiente@fundacion.org',
      password: 'contrasena-segura',
    })

    expect(res.status).toBe(403)
    expect(res.body.code).toBe('membership_pending')
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

  it('marca el correo como verificado y limpia el token', async () => {
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
  it('devuelve autenticado:false sin cookie de sesión', async () => {
    const res = await request(app).get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({ authenticated: false, staff: null })
  })

  it('incluye el nombre y el correo del usuario autenticado', async () => {
    const { token } = await register()
    const agent = await verifyAndLogin(
      'gerente@fundacion.org',
      'contrasena-segura',
      token!,
    )

    const res = await agent.get('/api/auth/me')
    expect(res.status).toBe(200)
    expect(res.body).toMatchObject({
      authenticated: true,
      name: 'Gerente Prueba',
      email: 'gerente@fundacion.org',
      staff: null,
      pendingOrgId: null,
    })
  })
})

describe('POST /api/auth/forgot-password', () => {
  it('no revela si el correo no existe', async () => {
    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'nadie@correo.org' })

    expect(res.status).toBe(200)
    expect(res.body).toEqual({ ok: true, resetUrl: null })
  })

  it('envía un enlace y guarda el token cifrado cuando el correo existe', async () => {
    await register()

    const res = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'gerente@fundacion.org' })

    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)
    expect(res.body.resetUrl).toContain('restablecer-contrasena?token=')

    const user = await prisma.user.findUnique({
      where: { email: 'gerente@fundacion.org' },
    })
    expect(user!.resetTokenHash).not.toBeNull()
    expect(user!.resetTokenExpiresAt).not.toBeNull()
  })
})

describe('POST /api/auth/reset-password', () => {
  it('cambia la contraseña y la anterior deja de servir', async () => {
    const { token } = await register()
    await verifyAndLogin('gerente@fundacion.org', 'contrasena-segura', token!)

    const forgot = await request(app)
      .post('/api/auth/forgot-password')
      .send({ email: 'gerente@fundacion.org' })
    const resetUrl = new URL(forgot.body.resetUrl, 'http://localhost')
    const resetToken = resetUrl.searchParams.get('token')!

    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: resetToken, password: 'nueva-contrasena' })
    expect(res.status).toBe(200)
    expect(res.body.ok).toBe(true)

    const oldLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gerente@fundacion.org', password: 'contrasena-segura' })
    expect(oldLogin.status).toBe(401)

    const newLogin = await request(app)
      .post('/api/auth/login')
      .send({ email: 'gerente@fundacion.org', password: 'nueva-contrasena' })
    expect(newLogin.status).toBe(200)
  })

  it('rechaza un token inválido', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'f'.repeat(64), password: 'nueva-contrasena' })

    expect(res.status).toBe(400)
    expect(res.body.error).toBe('El enlace no es válido o expiró')
  })

  it('rechaza una contraseña corta', async () => {
    const res = await request(app)
      .post('/api/auth/reset-password')
      .send({ token: 'un-token-de-reset-válido', password: 'corta' })

    expect(res.status).toBe(400)
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
    expect(me.status).toBe(200)
    expect(me.body.authenticated).toBe(false)
  })
})
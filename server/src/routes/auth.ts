import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config.js'

import {
  currentSession,
  requireSession,
} from '../middleware/requireSession.js'
import { setSessionCookie } from '../lib/cookies.js'
import { SESSION_COOKIE } from '../lib/jwt.js'
import { getClientIp } from '../lib/clientIp.js'
import {
  changePassword,
  deleteAccount,
  getSessionUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  updateAccount,
  verifyEmail,
} from '../services/auth.js'
import {
  changePasswordSchema,
  deleteAccountSchema,
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  updateAccountSchema,
  verifyEmailSchema,
} from '../validators/auth.js'

export const authRouter = Router()

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 10 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiados registros, intenta más tarde' },
})

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const verifyLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 10 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiados intentos, intenta más tarde' },
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const accountUpdateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 10 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const accountDeleteLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 10 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: getClientIp,
  message: { error: 'Demasiados intentos de inicio de sesión, intenta más tarde' },
})

authRouter.post(
  '/register',
  registerLimiter,
  async (req, res) => {
    const input = registerSchema.parse(req.body)
    const result = await registerUser(input)
    res.status(201).json(result)
  },
)

authRouter.post(
  '/verify-email',
  verifyLimiter,
  async (req, res) => {
    const input = verifyEmailSchema.parse(req.body)
    res.json(await verifyEmail(input))
  },
)

authRouter.post(
  '/resend-verification',
  resendLimiter,
  async (req, res) => {
    const input = resendVerificationSchema.parse(req.body)
    res.json(await resendVerification(input))
  },
)

authRouter.post(
  '/login',
  loginLimiter,
  async (req, res) => {
    const input = loginSchema.parse(req.body)
    const { user, membership, staff } = await loginUser(input)
    setSessionCookie(res, {
      sub: user.id,
      orgId: membership?.orgId ?? '',
      role: membership?.role ?? 'user',
      membershipId: membership?.id,
    })
    res.json({ staff })
  },
)

authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body)
    res.json(await requestPasswordReset(input))
  },
)

authRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  async (req, res) => {
    const input = resetPasswordSchema.parse(req.body)
    res.json(await resetPassword(input))
  },
)

authRouter.patch(
  '/account',
  accountUpdateLimiter,
  requireSession,
  async (req, res) => {
    const input = updateAccountSchema.parse(req.body)
    res.json(await updateAccount(req.session!.sub, input))
  },
)

authRouter.delete(
  '/account',
  accountDeleteLimiter,
  requireSession,
  async (req, res) => {
    const input = deleteAccountSchema.parse(req.body)
    await deleteAccount(req.session!.sub, input)
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.json({ ok: true })
  },
)

authRouter.patch(
  '/password',
  passwordChangeLimiter,
  requireSession,
  async (req, res) => {
    const input = changePasswordSchema.parse(req.body)
    await changePassword(req.session!.sub, input)
    // Every session is revoked (sessionsInvalidatedAt set inside
    // changePassword), so clear this device's now-dead cookie too.
    res.clearCookie(SESSION_COOKIE, { path: '/' })
    res.json({ ok: true })
  },
)

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

authRouter.get(
  '/me',
  async (req, res) => {
    const session = await currentSession(req)
    if (!session) {
      res.json({ authenticated: false, name: null, email: null, staff: null })
      return
    }
    const sessionUser = await getSessionUser(session.sub)
    if (!sessionUser) {
      res.clearCookie(SESSION_COOKIE, { path: '/' })
      res.json({ authenticated: false, name: null, email: null, staff: null })
      return
    }
    res.json({
      authenticated: true,
      name: sessionUser.name,
      email: sessionUser.email,
      staff: sessionUser.staff,
      emailVerified: sessionUser.emailVerified,
      pendingOrgId: sessionUser.pendingOrgId,
    })
  },
)
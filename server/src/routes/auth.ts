import { Router } from 'express'
import type { Response } from 'express'
import rateLimit from 'express-rate-limit'
import { env } from '../config.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { currentSession } from '../middleware/requireSession.js'
import { SESSION_COOKIE, signSession } from '../lib/jwt.js'
import {
  getSessionUser,
  loginUser,
  registerUser,
  requestPasswordReset,
  resendVerification,
  resetPassword,
  verifyEmail,
} from '../services/auth.js'
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resendVerificationSchema,
  resetPasswordSchema,
  verifyEmailSchema,
} from '../validators/auth.js'

export const authRouter = Router()

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 10 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados registros, intenta más tarde' },
})

const resendLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

const resetPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: env.production ? 5 : 10_000,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes, intenta más tarde' },
})

function setSessionCookie(
  res: Response,
  session: { sub: string; orgId: string; role: string; membershipId?: string },
) {
  const token = signSession(session)
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.production,
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  })
}

authRouter.post(
  '/register',
  registerLimiter,
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body)
    const result = await registerUser(input)
    res.status(201).json(result)
  }),
)

authRouter.post(
  '/verify-email',
  asyncHandler(async (req, res) => {
    const input = verifyEmailSchema.parse(req.body)
    res.json(await verifyEmail(input))
  }),
)

authRouter.post(
  '/resend-verification',
  resendLimiter,
  asyncHandler(async (req, res) => {
    const input = resendVerificationSchema.parse(req.body)
    res.json(await resendVerification(input))
  }),
)

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body)
    const { user, membership, staff } = await loginUser(input)
    setSessionCookie(res, {
      sub: user.id,
      orgId: membership?.orgId ?? '',
      role: membership?.role ?? 'user',
      membershipId: membership?.id,
    })
    res.json({ staff })
  }),
)

authRouter.post(
  '/forgot-password',
  forgotPasswordLimiter,
  asyncHandler(async (req, res) => {
    const input = forgotPasswordSchema.parse(req.body)
    res.json(await requestPasswordReset(input))
  }),
)

authRouter.post(
  '/reset-password',
  resetPasswordLimiter,
  asyncHandler(async (req, res) => {
    const input = resetPasswordSchema.parse(req.body)
    res.json(await resetPassword(input))
  }),
)

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

authRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const session = currentSession(req)
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
    })
  }),
)
import { Router } from 'express'
import type { Response } from 'express'
import { env } from '../config.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireSession } from '../middleware/requireSession.js'
import { SESSION_COOKIE, signSession } from '../lib/jwt.js'
import {
  getStaffById,
  loginStaff,
  registerStaff,
} from '../services/auth.js'
import { loginSchema, registerSchema } from '../validators/auth.js'

export const authRouter = Router()

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

function setSessionCookie(res: Response, staff: { id: string; orgId: string; role: string }) {
  const token = signSession({
    sub: staff.id,
    orgId: staff.orgId,
    role: staff.role,
  })
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
  asyncHandler(async (req, res) => {
    const input = registerSchema.parse(req.body)
    const { staff } = await registerStaff(input)
    setSessionCookie(res, staff)
    res.status(201).json({ staff })
  }),
)

authRouter.post(
  '/login',
  asyncHandler(async (req, res) => {
    const input = loginSchema.parse(req.body)
    const { staff } = await loginStaff(input)
    setSessionCookie(res, staff)
    res.json({ staff })
  }),
)

authRouter.post('/logout', (_req, res) => {
  res.clearCookie(SESSION_COOKIE, { path: '/' })
  res.json({ ok: true })
})

authRouter.get(
  '/me',
  requireSession,
  asyncHandler(async (req, res) => {
    const staff = await getStaffById(req.staff!.sub)
    if (!staff) {
      res.clearCookie(SESSION_COOKIE, { path: '/' })
      res.status(401).json({ error: 'Sesión expirada' })
      return
    }
    res.json({ staff })
  }),
)

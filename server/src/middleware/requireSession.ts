import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db.js'
import { ApiError } from '../lib/errors.js'
import { parseCookies } from '../lib/cookies.js'
import { SESSION_COOKIE, verifySession, type SessionPayload } from '../lib/jwt.js'

// Verifies the signature/expiry AND that the session has not been invalidated
// by a password change/reset (see services/auth.ts -> sessionsInvalidatedAt).
async function verifyLive(token: string): Promise<SessionPayload | null> {
  const payload = verifySession(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.sub },
    select: { sessionsInvalidatedAt: true },
  })
  if (!user) return null

  if (
    payload.iat &&
    user.sessionsInvalidatedAt &&
    payload.iat * 1000 < user.sessionsInvalidatedAt.getTime()
  ) {
    return null
  }

  return payload
}

export async function currentSession(req: Request): Promise<SessionPayload | null> {
  const token = parseCookies(req.header('cookie'))[SESSION_COOKIE]
  if (!token) return null
  return verifyLive(token)
}

export async function requireSession(req: Request, _res: Response, next: NextFunction) {
  const session = await currentSession(req)
  if (!session) {
    next(new ApiError(401, 'Inicia sesión para continuar'))
    return
  }
  req.session = session
  next()
}

export function requireOrgStaff(
  orgIdParam: string,
  opts: { managerOnly?: boolean } = {},
) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    const session = await currentSession(req)
    if (!session) {
      next(new ApiError(401, 'Inicia sesión para continuar'))
      return
    }

    // Revalidate the membership from the database instead of trusting the
    // role/orgId baked into the JWT at login time (tokens live up to 30 days).
    const membership = await prisma.helpOrgStaff.findFirst({
      where: { userId: session.sub, orgId: String(req.params[orgIdParam] ?? '') },
      select: { id: true, role: true, status: true },
    })
    if (!membership || membership.status !== 'active') {
      next(new ApiError(403, 'No perteneces a esta organización'))
      return
    }
    if (opts.managerOnly && membership.role !== 'manager') {
      next(new ApiError(403, 'Solo el manager puede editar la organización'))
      return
    }

    req.session = { ...session, role: membership.role, membershipId: membership.id }
    next()
  }
}

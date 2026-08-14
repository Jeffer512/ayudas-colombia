import type { NextFunction, Request, Response } from 'express'
import { parseCookies } from '../lib/cookies.js'
import { ApiError } from '../lib/errors.js'
import { SESSION_COOKIE, verifySession } from '../lib/jwt.js'

export function currentSession(req: Request) {
  const token = parseCookies(req.header('cookie'))[SESSION_COOKIE]
  if (!token) return null
  return verifySession(token)
}

export function requireSession(req: Request, _res: Response, next: NextFunction) {
  const session = currentSession(req)
  if (!session) {
    next(new ApiError(401, 'Inicia sesión para continuar'))
    return
  }
  req.staff = session
  next()
}

export function requireOrgStaff(orgIdParam: string) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const session = currentSession(req)
    if (!session) {
      next(new ApiError(401, 'Inicia sesión para continuar'))
      return
    }
    if (session.orgId !== String(req.params[orgIdParam] ?? '')) {
      next(new ApiError(403, 'No perteneces a esta organización'))
      return
    }
    req.staff = session
    next()
  }
}

import type { NextFunction, Request, Response } from 'express'
import { ApiError } from '../lib/errors.js'
import { isAdminToken } from '../lib/admin.js'

export function requireAdmin(req: Request, _res: Response, next: NextFunction) {
  const isAdmin = isAdminToken(
    req.header('x-admin-token'),
    process.env.ADMIN_TOKEN ?? '',
  )
  if (!isAdmin) {
    next(new ApiError(403, 'Se requiere un token de administración válido'))
    return
  }
  next()
}
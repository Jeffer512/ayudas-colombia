import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'

export function notFound(_req: Request, res: Response) {
  res.status(404).json({ error: 'No encontrado' })
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof ZodError) {
    res.status(400).json({ error: 'Datos inválidos', details: err.flatten() })
    return
  }
  console.error(err)
  const status = (err as { status?: number }).status ?? 500
  const message =
    status >= 500
      ? 'Error interno del servidor'
      : ((err as { message?: string }).message ?? 'Error')
  res.status(status).json({ error: message })
}
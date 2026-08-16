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
  const status = (err as { status?: number }).status ?? 500
  if (status >= 500) console.error(err)
  const message =
    status >= 500
      ? 'Error interno del servidor'
      : ((err as { message?: string }).message ?? 'Error')
  const body: { error: string; code?: string } = { error: message }
  const code = (err as { code?: string }).code
  if (code) body.code = code
  res.status(status).json(body)
}
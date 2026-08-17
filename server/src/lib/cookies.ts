import type { Response } from 'express'
import { env } from '../config.js'
import { SESSION_COOKIE, signSession } from './jwt.js'

export function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {}
  if (!header) return cookies
  for (const part of header.split(';')) {
    const idx = part.indexOf('=')
    if (idx === -1) continue
    const key = part.slice(0, idx).trim()
    const value = part.slice(idx + 1).trim()
    if (key) cookies[key] = decodeURIComponent(value)
  }
  return cookies
}

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000

export function setSessionCookie(
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

import jwt from 'jsonwebtoken'
import { env } from '../config.js'

export const SESSION_COOKIE = 'snid'

export interface SessionPayload {
  sub: string
  orgId: string
  role: string
  membershipId?: string
}

export function signSession(payload: SessionPayload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: '30d' })
}

export function verifySession(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, env.jwtSecret)
    if (
      typeof decoded === 'object' &&
      decoded !== null &&
      typeof decoded.sub === 'string' &&
      typeof decoded.orgId === 'string' &&
      typeof decoded.role === 'string'
    ) {
      const payload: SessionPayload = {
        sub: decoded.sub,
        orgId: decoded.orgId,
        role: decoded.role,
      }
      if (typeof decoded.membershipId === 'string') {
        payload.membershipId = decoded.membershipId
      }
      return payload
    }
    return null
  } catch {
    return null
  }
}

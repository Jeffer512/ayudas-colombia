import crypto from 'node:crypto'

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function hashVerifyToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
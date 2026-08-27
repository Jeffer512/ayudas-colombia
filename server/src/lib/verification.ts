import crypto from 'node:crypto'

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

export function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateVerifyCode(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export function generateResolveCode(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0')
}

export function hashVerifyToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
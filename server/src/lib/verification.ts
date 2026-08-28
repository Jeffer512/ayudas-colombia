import crypto from 'node:crypto'
import bcrypt from 'bcryptjs'

export const VERIFY_TOKEN_TTL_MS = 24 * 60 * 60 * 1000

const RESOLVE_ROUNDS = 10

export function generateVerifyToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export function generateVerifyCode(): string {
  return crypto.randomInt(100000, 1000000).toString()
}

export function generateResolveCode(): string {
  return crypto.randomInt(0, 10000).toString().padStart(4, '0')
}

export function hashResolveCode(code: string): Promise<string> {
  return bcrypt.hash(code, RESOLVE_ROUNDS)
}

export async function verifyResolveCode(input: string, stored: string): Promise<boolean> {
  if (!stored) return false
  return bcrypt.compare(input, stored)
}

export function hashVerifyToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}
import { createHash, timingSafeEqual } from 'node:crypto'

export function isAdminToken(token: string | undefined, adminToken: string): boolean {
  if (!adminToken || !token) return false
  const a = createHash('sha256').update(token).digest()
  const b = createHash('sha256').update(adminToken).digest()
  return timingSafeEqual(a, b)
}
import type { Request } from 'express'
import { ipKeyGenerator } from 'express-rate-limit'

export function getClientIp(req: Request): string {
  const ip = req.header('cf-connecting-ip') || req.header('true-client-ip')
  if (ip) return ip.trim()
  return req.ip || req.socket.remoteAddress || '127.0.0.1'
}

export function rateLimitKey(req: Request): string {
  return ipKeyGenerator(getClientIp(req))
}

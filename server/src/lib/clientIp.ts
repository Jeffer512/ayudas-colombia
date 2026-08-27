import type { Request } from 'express'

export function getClientIp(req: Request): string {
  const ip = req.header('cf-connecting-ip') || req.header('true-client-ip')
  if (ip) return ip.trim()
  return req.ip || req.socket.remoteAddress || '127.0.0.1'
}

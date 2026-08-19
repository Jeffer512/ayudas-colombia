import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db.js'

const VISITOR_HEADER = 'x-visitor-id'

const seenByDay = new Map<string, Set<string>>()

function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function record(visitorId: string, ip: string | undefined) {
  const day = dayKey(new Date())
  let seen = seenByDay.get(day)
  if (!seen) {
    seen = new Set()
    seenByDay.set(day, seen)
  }
  if (seen.has(visitorId)) return
  seen.add(visitorId)

  prisma.visit
    .create({ data: { visitorId, ip } })
    .catch(() => {})
}

export function trackVisit(req: Request, _res: Response, next: NextFunction) {
  if (req.path.startsWith('/api/health')) {
    next()
    return
  }
  const visitorId = req.header(VISITOR_HEADER)
  if (visitorId) {
    record(visitorId, req.ip)
  }
  next()
}

import type { NextFunction, Request, Response } from 'express'
import { prisma } from '../db.js'
import { colombiaDayKey, colombiaNow } from '../lib/colombiaTime.js'
import { getClientIp } from '../lib/clientIp.js'

const VISITOR_HEADER = 'x-visitor-id'

const seenByDay = new Map<string, Set<string>>()

function record(visitorId: string, ip: string | undefined) {
  const day = colombiaDayKey(colombiaNow())
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
    record(visitorId, getClientIp(req))
  }
  next()
}

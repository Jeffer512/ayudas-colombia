import { Router } from 'express'
import type { IncomingHttpHeaders } from 'http'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { getGeo } from '../services/geo.js'

export const geoRouter = Router()

function clientIp(req: { ip?: string; headers: IncomingHttpHeaders }) {
  const forwarded = req.headers['x-forwarded-for']
  const firstHop = typeof forwarded === 'string' ? forwarded.split(',')[0]?.trim() : undefined
  if (firstHop) return firstHop
  return req.ip
}

geoRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    res.json(await getGeo(clientIp(req)))
  }),
)
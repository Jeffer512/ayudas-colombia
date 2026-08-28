import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { OFFER_STATUSES, REQUEST_STATUSES } from '../constants.js'
import { prisma } from '../db.js'

import { requireAdmin } from '../middleware/requireAdmin.js'
import { setAvisoStatus } from '../services/avisos.js'
import { hideCityMessage } from '../services/cityMessages.js'
import { updateOfferStatus } from '../services/offers.js'
import { listReports, reviewReport } from '../services/reports.js'
import { updateRequestStatus } from '../services/requests.js'
import { colombiaDayKey, colombiaNow } from '../lib/colombiaTime.js'
import { reportFiltersSchema } from '../validators/report.js'

const statusSchema = z.object({
  status: z.enum(REQUEST_STATUSES),
  note: z.string().trim().max(2000).optional(),
  actorName: z.string().trim().max(120).optional(),
})

const offerStatusSchema = z.object({
  status: z.enum(OFFER_STATUSES),
  note: z.string().trim().max(2000).optional(),
  actorName: z.string().trim().max(120).optional(),
})

const avisoStatusSchema = z.object({
  status: z.enum(['open', 'closed']),
})

const adminLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 120,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes de moderación, intenta más tarde' },
})

export const adminRouter = Router()

adminRouter.use(requireAdmin)
adminRouter.use(adminLimiter)

adminRouter.post(
  '/requests/:id/status',
  async (req, res) => {
    const input = statusSchema.parse(req.body)
    const updated = await updateRequestStatus(String(req.params.id), input, true)
    res.json(updated)
  },
)

adminRouter.post(
  '/offers/:id/status',
  async (req, res) => {
    const input = offerStatusSchema.parse(req.body)
    const updated = await updateOfferStatus(String(req.params.id), input, true)
    res.json(updated)
  },
)

adminRouter.post(
  '/avisos/:id/status',
  async (req, res) => {
    const input = avisoStatusSchema.parse(req.body)
    res.json(await setAvisoStatus(String(req.params.id), input.status))
  },
)

adminRouter.get(
  '/reports',
  async (req, res) => {
    const filters = reportFiltersSchema.parse(req.query)
    res.json(await listReports(filters))
  },
)

adminRouter.post(
  '/reports/:id/review',
  async (req, res) => {
    res.json(await reviewReport(String(req.params.id)))
  },
)

adminRouter.delete(
  '/city-messages/:id',
  async (req, res) => {
    res.json(await hideCityMessage(String(req.params.id)))
  },
)

adminRouter.get(
  '/analytics',
  async (_req, res) => {
    const rows = await prisma.$queryRaw<{ day: Date; visitors: bigint }[]>`
      SELECT (created_at AT TIME ZONE 'America/Bogota')::date AS day,
        COUNT(DISTINCT visitor_id) AS visitors
      FROM visits
      WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Bogota') - interval '29 days') AT TIME ZONE 'America/Bogota'
      GROUP BY (created_at AT TIME ZONE 'America/Bogota')::date
      ORDER BY day ASC
    `

    const daily = rows.map((row) => ({
      date: new Date(row.day).toISOString().slice(0, 10),
      visitors: Number(row.visitors),
    }))

    const [ranges] = await prisma.$queryRaw<
      { last7: bigint; last30: bigint }[]
    >`
      SELECT
        COUNT(DISTINCT visitor_id) FILTER (
          WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Bogota') - interval '6 days') AT TIME ZONE 'America/Bogota'
        ) AS last7,
        COUNT(DISTINCT visitor_id) FILTER (
          WHERE created_at >= (date_trunc('day', now() AT TIME ZONE 'America/Bogota') - interval '29 days') AT TIME ZONE 'America/Bogota'
        ) AS last30
      FROM visits
    `

    const todayKey = colombiaDayKey(colombiaNow())

    res.json({
      daily,
      today: daily.at(-1)?.date === todayKey ? daily.at(-1)!.visitors : 0,
      last7: Number(ranges?.last7 ?? 0),
      last30: Number(ranges?.last30 ?? 0),
    })
  },
)
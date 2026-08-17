import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { OFFER_STATUSES, REQUEST_STATUSES } from '../constants.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { requireAdmin } from '../middleware/requireAdmin.js'
import { setAvisoStatus } from '../services/avisos.js'
import { hideCityMessage } from '../services/cityMessages.js'
import { updateOfferStatus } from '../services/offers.js'
import { listReports, reviewReport } from '../services/reports.js'
import { updateRequestStatus } from '../services/requests.js'
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
  asyncHandler(async (req, res) => {
    const input = statusSchema.parse(req.body)
    const updated = await updateRequestStatus(String(req.params.id), input, true)
    res.json(updated)
  }),
)

adminRouter.post(
  '/offers/:id/status',
  asyncHandler(async (req, res) => {
    const input = offerStatusSchema.parse(req.body)
    const updated = await updateOfferStatus(String(req.params.id), input, true)
    res.json(updated)
  }),
)

adminRouter.post(
  '/avisos/:id/status',
  asyncHandler(async (req, res) => {
    const input = avisoStatusSchema.parse(req.body)
    res.json(await setAvisoStatus(String(req.params.id), input.status))
  }),
)

adminRouter.get(
  '/reports',
  asyncHandler(async (req, res) => {
    const filters = reportFiltersSchema.parse(req.query)
    res.json(await listReports(filters))
  }),
)

adminRouter.post(
  '/reports/:id/review',
  asyncHandler(async (req, res) => {
    res.json(await reviewReport(String(req.params.id)))
  }),
)

adminRouter.delete(
  '/city-messages/:id',
  asyncHandler(async (req, res) => {
    res.json(await hideCityMessage(String(req.params.id)))
  }),
)
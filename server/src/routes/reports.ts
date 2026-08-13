import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import {
  createReport,
  getReport,
  listReports,
  updateReportStatus,
} from '../services/reports.js'
import {
  createReportSchema,
  reportFiltersSchema,
  updateStatusSchema,
} from '../validators/report.js'

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados reportes creados, intenta más tarde' },
})

const statusLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados cambios de estado, intenta más tarde' },
})

export const reportsRouter = Router()

reportsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = reportFiltersSchema.parse(req.query)
    res.json(await listReports(filters))
  }),
)

reportsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getReport(String(req.params.id)))
  }),
)

reportsRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createReportSchema.parse(req.body)
    const report = await createReport(input)
    res.status(201).json(report)
  }),
)

reportsRouter.post(
  '/:id/status',
  statusLimiter,
  asyncHandler(async (req, res) => {
    const input = updateStatusSchema.parse(req.body)
    res.json(await updateReportStatus(String(req.params.id), input))
  }),
)
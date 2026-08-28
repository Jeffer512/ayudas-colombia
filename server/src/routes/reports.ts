import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { requireSession } from '../middleware/requireSession.js'
import { createReport } from '../services/reports.js'
import { createReportSchema } from '../validators/report.js'

const reportLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados reportes, intenta más tarde' },
})

export const reportsRouter = Router()

reportsRouter.use(reportLimiter)

reportsRouter.post(
  '/',
  requireSession,
  async (req, res) => {
    const input = createReportSchema.parse(req.body)
    res.status(201).json(await createReport(input, req.session!.sub))
  },
)
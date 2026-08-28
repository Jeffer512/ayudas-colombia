import { Router } from 'express'
import rateLimit from 'express-rate-limit'

import { currentSession } from '../middleware/requireSession.js'
import { viewerFromSession } from '../lib/viewer.js'
import {
  createAviso,
  getAviso,
  listAvisos,
  markAviso,
} from '../services/avisos.js'
import {
  avisoFiltersSchema,
  avisoMarkSchema,
  createAvisoSchema,
} from '../validators/aviso.js'

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados avisos creados, intenta más tarde' },
})

const markLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados cambios en avisos, intenta más tarde' },
})

export const avisosRouter = Router()

avisosRouter.get(
  '/',
  async (req, res) => {
    const filters = avisoFiltersSchema.parse(req.query)
    res.json(await listAvisos(filters, viewerFromSession(await currentSession(req))))
  },
)

avisosRouter.get(
  '/:id',
  async (req, res) => {
    res.json(await getAviso(String(req.params.id), viewerFromSession(await currentSession(req))))
  },
)

avisosRouter.post(
  '/',
  createLimiter,
  async (req, res) => {
    const input = createAvisoSchema.parse(req.body)
    const created = await createAviso(input, viewerFromSession(await currentSession(req)))
    res.status(201).json(created)
  },
)

avisosRouter.post(
  '/:id/mark',
  markLimiter,
  async (req, res) => {
    const { markerId } = avisoMarkSchema.parse(req.body)
    res.json(await markAviso(String(req.params.id), markerId))
  },
)
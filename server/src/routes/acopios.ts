import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { isAdminToken } from '../lib/admin.js'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { createAcopio, getAcopio, listAcopios } from '../services/acopios.js'
import { acopioFiltersSchema, createAcopioSchema } from '../validators/acopio.js'

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados centros creados, intenta más tarde' },
})

export const acopiosRouter = Router()

acopiosRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = acopioFiltersSchema.parse(req.query)
    res.json(await listAcopios(filters))
  }),
)

acopiosRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getAcopio(String(req.params.id)))
  }),
)

acopiosRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createAcopioSchema.parse(req.body)
    const type = isAdminToken(
      req.header('x-admin-token'),
      process.env.ADMIN_TOKEN ?? '',
    )
      ? 'oficial'
      : 'ciudadano'
    const created = await createAcopio(input, type)
    res.status(201).json(created)
  }),
)
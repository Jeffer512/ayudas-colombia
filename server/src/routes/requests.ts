import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { currentSession } from '../middleware/requireSession.js'
import {
  createRequest,
  getRequest,
  helpRequest,
  listRequests,
  updateRequestStatus,
} from '../services/requests.js'
import {
  createRequestSchema,
  helpRequestSchema,
  requestFiltersSchema,
  updateRequestStatusSchema,
} from '../validators/request.js'

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas solicitudes creadas, intenta más tarde' },
})

const statusLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados cambios de estado, intenta más tarde' },
})

export const requestsRouter = Router()

requestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = requestFiltersSchema.parse(req.query)
    res.json(await listRequests(filters))
  }),
)

requestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getRequest(String(req.params.id), currentSession(req)?.sub))
  }),
)

requestsRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createRequestSchema.parse(req.body)
    const created = await createRequest(input, currentSession(req)?.sub)
    res.status(201).json(created)
  }),
)

requestsRouter.post(
  '/:id/status',
  statusLimiter,
  asyncHandler(async (req, res) => {
    const input = updateRequestStatusSchema.parse(req.body)
    res.json(
      await updateRequestStatus(
        String(req.params.id),
        input,
        false,
        currentSession(req)?.sub,
      ),
    )
  }),
)

requestsRouter.post(
  '/:id/help',
  statusLimiter,
  asyncHandler(async (req, res) => {
    const input = helpRequestSchema.parse(req.body)
    res.json(await helpRequest(String(req.params.id), input))
  }),
)
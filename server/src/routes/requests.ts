import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { currentSession } from '../middleware/requireSession.js'
import { viewerFromSession } from '../lib/viewer.js'
import {
  createRequest,
  getRequest,
  helpRequest,
  listRequests,
  updateRequest,
  updateRequestStatus,
  verifyRequestCode,
} from '../services/requests.js'
import {
  createRequestSchema,
  helpRequestSchema,
  requestFiltersSchema,
  updateRequestSchema,
  updateRequestStatusSchema,
  verifyResolveCodeSchema,
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

const editLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas ediciones, intenta más tarde' },
})

const helpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas ofertas de ayuda, intenta más tarde' },
})

export const requestsRouter = Router()

requestsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = requestFiltersSchema.parse(req.query)
    res.json(await listRequests(filters, viewerFromSession(currentSession(req))))
  }),
)

requestsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getRequest(String(req.params.id), viewerFromSession(currentSession(req))))
  }),
)

requestsRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createRequestSchema.parse(req.body)
    const created = await createRequest(input, viewerFromSession(currentSession(req)))
    res.status(201).json(created)
  }),
)

requestsRouter.put(
  '/:id',
  editLimiter,
  asyncHandler(async (req, res) => {
    const input = updateRequestSchema.parse(req.body)
    res.json(
      await updateRequest(
        String(req.params.id),
        input,
        viewerFromSession(currentSession(req)),
      ),
    )
  }),
)

requestsRouter.post(
  '/:id/verify-code',
  editLimiter,
  asyncHandler(async (req, res) => {
    const input = verifyResolveCodeSchema.parse(req.body)
    res.json(
      await verifyRequestCode(
        String(req.params.id),
        input,
        viewerFromSession(currentSession(req)),
      ),
    )
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
        viewerFromSession(currentSession(req)),
      ),
    )
  }),
)

requestsRouter.post(
  '/:id/help',
  helpLimiter,
  asyncHandler(async (req, res) => {
    const input = helpRequestSchema.parse(req.body)
    res.json(
      await helpRequest(
        String(req.params.id),
        input,
        viewerFromSession(currentSession(req)),
      ),
    )
  }),
)
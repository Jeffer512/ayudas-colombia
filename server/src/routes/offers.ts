import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { currentSession, requireSession } from '../middleware/requireSession.js'
import {
  cancelClaim,
  claimOffer,
  createOffer,
  getOffer,
  listOffers,
  updateOfferStatus,
} from '../services/offers.js'
import {
  createOfferSchema,
  offerFiltersSchema,
  updateOfferStatusSchema,
} from '../validators/offer.js'

const createLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas ofertas creadas, intenta más tarde' },
})

const statusLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados cambios de estado, intenta más tarde' },
})

export const offersRouter = Router()

offersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = offerFiltersSchema.parse(req.query)
    res.json(await listOffers(filters, currentSession(req)?.sub))
  }),
)

offersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getOffer(String(req.params.id), currentSession(req)?.sub))
  }),
)

offersRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createOfferSchema.parse(req.body)
    const created = await createOffer(input, currentSession(req)?.sub)
    res.status(201).json(created)
  }),
)

offersRouter.post(
  '/:id/status',
  statusLimiter,
  asyncHandler(async (req, res) => {
    const input = updateOfferStatusSchema.parse(req.body)
    res.json(
      await updateOfferStatus(
        String(req.params.id),
        input,
        false,
        currentSession(req)?.sub,
      ),
    )
  }),
)

offersRouter.post(
  '/:id/claim',
  requireSession,
  asyncHandler(async (req, res) => {
    const offer = await claimOffer(String(req.params.id), req.staff!.sub)
    res.json(offer)
  }),
)

offersRouter.delete(
  '/:id/claim',
  requireSession,
  asyncHandler(async (req, res) => {
    const offer = await cancelClaim(String(req.params.id), req.staff!.sub)
    res.json(offer)
  }),
)
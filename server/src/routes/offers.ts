import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { currentSession, requireSession } from '../middleware/requireSession.js'
import { viewerFromSession } from '../lib/viewer.js'
import {
  cancelClaim,
  claimOffer,
  createOffer,
  getOffer,
  listOffers,
  updateOffer,
  updateOfferStatus,
  verifyOfferCode,
} from '../services/offers.js'
import {
  claimSchema,
  createOfferSchema,
  offerFiltersSchema,
  updateOfferSchema,
  updateOfferStatusSchema,
  verifyResolveCodeSchema,
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

const editLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiadas ediciones, intenta más tarde' },
})

export const offersRouter = Router()

offersRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = offerFiltersSchema.parse(req.query)
    res.json(await listOffers(filters, viewerFromSession(currentSession(req))))
  }),
)

offersRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    res.json(await getOffer(String(req.params.id), viewerFromSession(currentSession(req))))
  }),
)

offersRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createOfferSchema.parse(req.body)
    const created = await createOffer(input, viewerFromSession(currentSession(req)))
    res.status(201).json(created)
  }),
)

offersRouter.put(
  '/:id',
  editLimiter,
  asyncHandler(async (req, res) => {
    const input = updateOfferSchema.parse(req.body)
    res.json(
      await updateOffer(
        String(req.params.id),
        input,
        viewerFromSession(currentSession(req)),
      ),
    )
  }),
)

offersRouter.post(
  '/:id/verify-code',
  editLimiter,
  asyncHandler(async (req, res) => {
    const input = verifyResolveCodeSchema.parse(req.body)
    res.json(
      await verifyOfferCode(
        String(req.params.id),
        input,
        viewerFromSession(currentSession(req)),
      ),
    )
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
        viewerFromSession(currentSession(req)),
      ),
    )
  }),
)

offersRouter.post(
  '/:id/claim',
  requireSession,
  asyncHandler(async (req, res) => {
    const input = claimSchema.parse(req.body ?? {})
    const offer = await claimOffer(
      String(req.params.id),
      viewerFromSession(req.session),
      input,
    )
    res.json(offer)
  }),
)

offersRouter.delete(
  '/:id/claim',
  requireSession,
  asyncHandler(async (req, res) => {
    const offer = await cancelClaim(String(req.params.id), viewerFromSession(req.session))
    res.json(offer)
  }),
)
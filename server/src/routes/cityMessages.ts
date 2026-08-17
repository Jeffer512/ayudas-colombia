import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { asyncHandler } from '../middleware/asyncHandler.js'
import { currentSession } from '../middleware/requireSession.js'
import { viewerFromSession } from '../lib/viewer.js'
import { broadcast, subscribe } from '../lib/streams.js'
import {
  createCityMessage,
  listCityMessages,
} from '../services/cityMessages.js'
import {
  cityMessageFiltersSchema,
  createCityMessageSchema,
} from '../validators/cityMessage.js'

const createLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Demasiados mensajes, espera un momento' },
})

export const cityMessagesRouter = Router()

cityMessagesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const filters = cityMessageFiltersSchema.parse(req.query)
    res.json(await listCityMessages(filters))
  }),
)

cityMessagesRouter.get(
  '/:city/events',
  asyncHandler(async (req, res) => {
    const city = String(req.params.city)
    res.status(200).set({
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'X-Accel-Buffering': 'no',
      Connection: 'keep-alive',
    })
    res.flushHeaders()
    subscribe(city, res)
    res.write(': conectado\n\n')
    const heartbeat = setInterval(() => res.write(': ping\n\n'), 25_000)
    req.on('close', () => clearInterval(heartbeat))
  }),
)

cityMessagesRouter.post(
  '/',
  createLimiter,
  asyncHandler(async (req, res) => {
    const input = createCityMessageSchema.parse(req.body)
    const message = await createCityMessage(
      input,
      viewerFromSession(currentSession(req)),
    )
    broadcast(input.city, { type: 'new', message })
    res.status(201).json(message)
  }),
)

import cors from 'cors'
import express from 'express'
import { notFound, errorHandler } from './middleware/error.js'
import { acopiosRouter } from './routes/acopios.js'
import { avisosRouter } from './routes/avisos.js'
import { citiesRouter } from './routes/cities.js'
import { healthRouter } from './routes/health.js'
import { offersRouter } from './routes/offers.js'
import { requestsRouter } from './routes/requests.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/cities', citiesRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/offers', offersRouter)
  app.use('/api/avisos', avisosRouter)
  app.use('/api/acopios', acopiosRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
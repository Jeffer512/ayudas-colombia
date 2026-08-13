import cors from 'cors'
import express from 'express'
import { notFound, errorHandler } from './middleware/error.js'
import { acopiosRouter } from './routes/acopios.js'
import { citiesRouter } from './routes/cities.js'
import { healthRouter } from './routes/health.js'
import { reportsRouter } from './routes/reports.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/health', healthRouter)
  app.use('/api/cities', citiesRouter)
  app.use('/api/reports', reportsRouter)
  app.use('/api/acopios', acopiosRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
import cors from 'cors'
import express from 'express'
import { notFound, errorHandler } from './middleware/error.js'
import { healthRouter } from './routes/health.js'

export function createApp() {
  const app = express()

  app.use(cors())
  app.use(express.json())

  app.use('/api/health', healthRouter)

  app.use(notFound)
  app.use(errorHandler)

  return app
}
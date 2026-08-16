import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import cors from 'cors'
import express from 'express'
import helmet from 'helmet'
import { env } from './config.js'
import { notFound, errorHandler } from './middleware/error.js'
import { adminRouter } from './routes/admin.js'
import { authRouter } from './routes/auth.js'
import { avisosRouter } from './routes/avisos.js'
import { citiesRouter } from './routes/cities.js'
import { geoRouter } from './routes/geo.js'
import { healthRouter } from './routes/health.js'
import { helpOrgsRouter } from './routes/helpOrgs.js'
import { offersRouter } from './routes/offers.js'
import { reportsRouter } from './routes/reports.js'
import { requestsRouter } from './routes/requests.js'

const moduleDir = path.dirname(fileURLToPath(import.meta.url))
const WEB_DIST = path.resolve(moduleDir, '../../web/dist')

export function createApp() {
  const app = express()

  if (env.trustProxy) {
    app.set('trust proxy', 1)
  }

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          baseUri: ["'self'"],
          fontSrc: ["'self'", 'https:', 'data:'],
          formAction: ["'self'"],
          frameAncestors: ["'self'"],
          imgSrc: [
            "'self'",
            'data:',
            'https://*.tile.openstreetmap.org',
            env.supabaseUrl ? env.supabaseUrl.replace(/^https?:\/\//, 'https://') : '',
          ].filter(Boolean),
          objectSrc: ["'none'"],
          scriptSrc: ["'self'"],
          scriptSrcAttr: ["'none'"],
          styleSrc: ["'self'", 'https:', "'unsafe-inline'"],
          upgradeInsecureRequests: null,
        },
      },
    }),
  )
  app.use(
    cors({
      origin: env.corsOrigin ? env.corsOrigin.split(',') : false,
      credentials: true,
    }),
  )
  app.use(express.json({ limit: '10mb' }))

  const servesWeb = env.production && fs.existsSync(WEB_DIST)
  if (servesWeb) {
    app.use(express.static(WEB_DIST))
  }

  app.use('/api/health', healthRouter)
  app.use('/api/auth', authRouter)
  app.use('/api/cities', citiesRouter)
  app.use('/api/geo', geoRouter)
  app.use('/api/requests', requestsRouter)
  app.use('/api/offers', offersRouter)
  app.use('/api/reports', reportsRouter)
  app.use('/api/avisos', avisosRouter)
  app.use('/api/help-orgs', helpOrgsRouter)
  app.use('/api/admin', adminRouter)

  if (servesWeb) {
    app.use((req, res, next) => {
      if (req.method !== 'GET' || req.path.startsWith('/api/')) {
        next()
        return
      }
      res.sendFile(path.join(WEB_DIST, 'index.html'))
    })
  }

  app.use(notFound)
  app.use(errorHandler)

  return app
}
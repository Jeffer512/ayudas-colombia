import { createApp } from './app.js'
import { env } from './config.js'
import { prisma } from './db.js'
import { closeStaleRequests } from './services/requests.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port}`)
})

const STALE_SWEEP_MS = 6 * 60 * 60 * 1000

closeStaleRequests().catch((err) => {
  console.error('[auto-close] error al iniciar:', err)
})

setInterval(() => {
  closeStaleRequests().catch((err) => {
    console.error('[auto-close] error:', err)
  })
}, STALE_SWEEP_MS).unref()

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
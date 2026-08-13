import { createApp } from './app.js'
import { env } from './config.js'
import { prisma } from './db.js'

const app = createApp()

const server = app.listen(env.port, () => {
  console.log(`API escuchando en http://localhost:${env.port}`)
})

async function shutdown() {
  server.close(async () => {
    await prisma.$disconnect()
    process.exit(0)
  })
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
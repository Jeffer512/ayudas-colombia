import 'dotenv/config'
import { PrismaClient } from '@prisma/client'
import { cities } from './cities.js'

const prisma = new PrismaClient()

async function main() {
  for (const entry of cities) {
    const saved = await prisma.city.upsert({
      where: { code: entry.code },
      update: { name: entry.name, department: entry.department, centerLat: entry.centerLat, centerLng: entry.centerLng },
      create: entry,
    })
    console.log(`Ciudad sembrada: ${saved.name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
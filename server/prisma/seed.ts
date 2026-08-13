import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

const cities = [
  {
    code: 'pereira',
    name: 'Pereira',
    department: 'Risaralda',
    centerLat: 4.8133,
    centerLng: -75.6961,
  },
]

async function main() {
  for (const city of cities) {
    await prisma.city.upsert({
      where: { code: city.code },
      update: {},
      create: city,
    })
    console.log(`Ciudad sembrada: ${city.name}`)
  }
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
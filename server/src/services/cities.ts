import { prisma } from '../db.js'

export async function listCities() {
  return prisma.city.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  })
}
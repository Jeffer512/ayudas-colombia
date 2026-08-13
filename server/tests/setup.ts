import { beforeEach } from 'vitest'
import { prisma } from '../src/db.js'

beforeEach(async () => {
  // report_events must be truncated before reports (FK). CASCADE handles order.
  await prisma.$executeRawUnsafe('TRUNCATE TABLE report_events, reports, reporters, cities CASCADE')
})
import { beforeEach } from 'vitest'
import { prisma } from '../src/db.js'

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE acopio_staff, request_helpers, request_events, requests, offers, avisos_marks, avisos, acopio_centers, reporters, cities CASCADE',
  )
})
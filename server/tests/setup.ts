import { beforeEach } from 'vitest'
import { prisma } from '../src/db.js'

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE users, post_reports, help_org_staff, help_orgs, request_helpers, request_events, requests, offers, offer_claims, avisos_marks, avisos, reporters, cities, visits CASCADE',
  )
})
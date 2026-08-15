import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import {
  AVISO_STATUSES,
  CONTACT_VISIBILITIES,
  HELP_ORG_CATEGORIES,
  HELP_ORG_ITEM_KINDS,
  HELP_ORG_STATUSES,
  HELP_ORG_TYPES,
  OFFER_AUDIENCES,
  OFFER_STATUSES,
  OFFER_TYPES,
  REQUEST_STATUSES,
  REQUEST_TYPES,
  TRANSPORT_OPTIONS,
  URGENCIES,
} from '../src/constants.js'
import { REPORT_KINDS, REPORT_REASONS } from '../src/validators/report.js'

const migrationsDir = fileURLToPath(new URL('../prisma/migrations', import.meta.url))

function migrationFiles(): { name: string; sql: string }[] {
  const folders = readdirSync(migrationsDir)
    .filter((name) => /^\d{14}_/.test(name))
    .sort()
  return folders.map((name) => ({
    name,
    sql: readFileSync(join(migrationsDir, name, 'migration.sql'), 'utf8'),
  }))
}

// Effective constraint per column: the last ADD CONSTRAINT in the chain wins,
// because new migrations redefine checks via DROP + ADD.
function checksByColumn(migrations: { sql: string }[]): Map<string, string[]> {
  const checks = new Map<string, string[]>()
  const pattern =
    /ALTER TABLE "(\w+)"\s+ADD CONSTRAINT "\w+"\s+CHECK \("(\w+)"\s*(?:IS NULL OR\s+"\w+"\s*)?IN \(([^)]*)\)\)/g
  for (const { sql } of migrations) {
    for (const match of sql.matchAll(pattern)) {
      const values = [...match[3].matchAll(/'([^']*)'/g)].map((m) => m[1])
      checks.set(`${match[1]}.${match[2]}`, values)
    }
  }
  return checks
}

// Tabla.columna -> valores permitidos según constants/validators.
const EXPECTED: Record<string, readonly string[]> = {
  'requests.status': REQUEST_STATUSES,
  'requests.type': REQUEST_TYPES,
  'requests.urgency': URGENCIES,
  'requests.transport': TRANSPORT_OPTIONS,
  'requests.contact_visibility': CONTACT_VISIBILITIES,
  'request_events.status': REQUEST_STATUSES,
  'offers.status': OFFER_STATUSES,
  'offers.type': OFFER_TYPES,
  'offers.transport': TRANSPORT_OPTIONS,
  'offers.contact_visibility': CONTACT_VISIBILITIES,
  'offers.audience': OFFER_AUDIENCES,
  'offer_claims.status': ['committed', 'cancelled', 'delivered'],
  'avisos.status': AVISO_STATUSES,
  'avisos.type': ['info'],
  'avisos.urgency': URGENCIES,
  'avisos.contact_visibility': CONTACT_VISIBILITIES,
  'help_orgs.type': HELP_ORG_TYPES,
  'help_orgs.category': HELP_ORG_CATEGORIES,
  'help_orgs.status': HELP_ORG_STATUSES,
  'help_org_items.kind': HELP_ORG_ITEM_KINDS,
  'help_org_staff.role': ['manager', 'member'],
  'help_org_staff.status': ['active', 'pending'],
  'post_reports.kind': REPORT_KINDS,
  'post_reports.reason': REPORT_REASONS,
  'post_reports.status': ['open', 'reviewed'],
}

const actual = checksByColumn(migrationFiles())

describe('domain value checks (migraciones)', () => {
  it('crea una restricción por cada columna del catálogo y nada más', () => {
    expect([...actual.keys()].sort()).toEqual(Object.keys(EXPECTED).sort())
  })

  it('los valores permitidos coinciden con constants y validators', () => {
    for (const [key, expected] of Object.entries(EXPECTED)) {
      expect([...(actual.get(key) ?? [])].sort(), key).toEqual([...expected].sort())
    }
  })
})
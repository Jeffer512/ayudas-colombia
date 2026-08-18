import { execSync } from 'node:child_process'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { Client } from 'pg'
import { env } from '../src/config.js'

const SINGLE_COMMITTED_CLAIM_INDEX = `
CREATE UNIQUE INDEX IF NOT EXISTS "offer_claims_single_committed_idx"
ON "offer_claims" ("offer_id") WHERE "status" = 'committed';
`

const migrationsDir = fileURLToPath(new URL('../prisma/migrations', import.meta.url))

function readMigrationSql(folderHint: string): string | null {
  const folder = readdirSync(migrationsDir).find((name) => name.includes(folderHint))
  if (!folder) return null
  return readFileSync(join(migrationsDir, folder, 'migration.sql'), 'utf8')
}

async function applyCheckConstraints(db: Client) {
  const checkSqls = [
    readMigrationSql('domain_value_checks'),
    readMigrationSql('request_helper_value_checks'),
  ]
  for (const checkSql of checkSqls) {
    if (checkSql) await db.query(checkSql)
  }
}

export default async function globalSetup() {
  const url = new URL(env.databaseUrl)
  const dbName = url.pathname.slice(1)
  const admin = new Client({
    host: url.hostname,
    port: Number(url.port || 5432),
    user: url.username,
    password: url.password,
    database: 'postgres',
  })

  try {
    await admin.connect()
    const { rows } = await admin.query(
      'SELECT 1 FROM pg_database WHERE datname = $1',
      [dbName],
    )
    if (rows.length === 0) {
      await admin.query(
        `CREATE DATABASE "${dbName.replace(/"/g, '""')}"`,
      )
    }
  } finally {
    await admin.end()
  }

  process.env.DATABASE_URL = env.databaseUrl
  execSync('npx prisma db push --skip-generate --accept-data-loss', {
    stdio: 'inherit',
    env: { ...process.env, DATABASE_URL: env.databaseUrl },
  })

  const db = new Client({ connectionString: env.databaseUrl })
  try {
    await db.connect()
    await db.query(SINGLE_COMMITTED_CLAIM_INDEX)
    await applyCheckConstraints(db)
  } finally {
    await db.end()
  }
}
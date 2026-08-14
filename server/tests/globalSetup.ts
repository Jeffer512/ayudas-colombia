import { execSync } from 'node:child_process'
import { Client } from 'pg'
import { env } from '../src/config.js'

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
}
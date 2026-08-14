import 'dotenv/config'

const isTest = process.env.NODE_ENV === 'test'

export const env = {
  port: Number(process.env.PORT ?? 4000),
  production: process.env.NODE_ENV === 'production',
  trustProxy: process.env.TRUST_PROXY === 'true',
  databaseUrl:
    isTest
      ? process.env.DATABASE_URL_TEST ??
        'postgresql://ayudas:ayudas@localhost:5432/ayudas_test'
      : process.env.DATABASE_URL ?? 'postgresql://ayudas:ayudas@localhost:5432/ayudas',
}
import 'dotenv/config'

export const env = {
  port: Number(process.env.PORT ?? 4000),
  databaseUrl:
    process.env.NODE_ENV === 'test'
      ? process.env.DATABASE_URL_TEST ??
        'postgresql://ayudas:ayudas@localhost:5432/ayudas_test'
      : process.env.DATABASE_URL ?? 'postgresql://ayudas:ayudas@localhost:5432/ayudas',
}
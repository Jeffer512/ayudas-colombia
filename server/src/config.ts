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
  jwtSecret: process.env.JWT_SECRET ?? 'dev-secret-no-usar-en-produccion',
  smtpUrl: process.env.SMTP_URL ?? '',
  mailFrom:
    process.env.MAIL_FROM ?? 'Red de ayudas <no-responder@ayudas.local>',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseBucket: process.env.SUPABASE_BUCKET ?? 'fotos',
}
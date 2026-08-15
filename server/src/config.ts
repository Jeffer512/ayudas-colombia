import 'dotenv/config'

const isTest = process.env.NODE_ENV === 'test'
const isProduction = process.env.NODE_ENV === 'production'

function requireSecret(
  name: string,
  value: string | undefined,
  disallowed: string[],
): string {
  if (!value || disallowed.includes(value)) {
    if (isProduction) {
      throw new Error(
        `${name} es obligatorio en producción. Genera uno con: openssl rand -hex 32`,
      )
    }
    return disallowed[0] ?? value ?? ''
  }
  return value
}

export const env = {
  port: Number(process.env.PORT ?? 4000),
  production: isProduction,
  trustProxy: process.env.TRUST_PROXY === 'true',
  databaseUrl:
    isTest
      ? process.env.DATABASE_URL_TEST ??
        'postgresql://ayudas:ayudas@localhost:5432/ayudas_test'
      : requireSecret(
          'DATABASE_URL',
          process.env.DATABASE_URL,
          ['postgresql://ayudas:ayudas@localhost:5432/ayudas'],
        ),
  jwtSecret: requireSecret(
    'JWT_SECRET',
    process.env.JWT_SECRET,
    ['cambia-este-secreto', 'dev-secret-no-usar-en-produccion'],
  ),
  adminToken: requireSecret(
    'ADMIN_TOKEN',
    process.env.ADMIN_TOKEN,
    ['cambia-este-token'],
  ),
  corsOrigin: process.env.CORS_ORIGIN ?? '',
  smtpUrl: process.env.SMTP_URL ?? '',
  mailFrom:
    process.env.MAIL_FROM ?? 'Red de ayudas <no-responder@ayudas.local>',
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
  supabaseUrl: process.env.SUPABASE_URL ?? '',
  supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  supabaseBucket: process.env.SUPABASE_BUCKET ?? 'fotos',
}
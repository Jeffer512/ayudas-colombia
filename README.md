# Proyecto Ayudas

App web para coordinar ayuda tras el terremoto. Las personas reportan necesidades
(personas/mascotas desaparecidas, suministros, voluntarios, refugios, salud,
transporte) y quienes pueden ayudar se comprometen a atenderlas; también hay
ofrecimientos de ayuda, avisos por zona y organizaciones que publican qué necesitan
y qué tienen disponible. Un reporte queda cerrado cuando se resuelve (o lo marca
moderación), para que los demás dirijan sus esfuerzos a otras zonas.

## Stack

- **Backend:** Node.js + Express + TypeScript, Prisma ORM, PostgreSQL
- **Frontend:** React + Vite + TypeScript, Tailwind CSS, TanStack Query, react-leaflet
- **Tests:** Vitest (backend con Supertest, frontend con React Testing Library)

## Estructura

```
server/   API Express (src/routes → services → Prisma)
web/      Frontend React (Vite)
```

## Requisitos

- Node.js 25 (ver `.nvmrc`; `engines` lo fija en `>=25 <26`)
- Docker (para PostgreSQL local)

## Puesta en marcha

```bash
npm install
docker compose up -d          # levanta PostgreSQL
cp server/.env.example server/.env
npm run db:migrate -w server     # aplica migraciones
npm run db:seed:dev -w server    # 9 ciudades + datos de ejemplo (solo desarrollo)
npm run dev                      # API en :4000, web en :5173
```

## Tests

```bash
npm run test                  # backend + frontend (requiere PostgreSQL arriba)
```

Los tests de backend usan una base `ayudas_test` separada (creada y sincronizada
automáticamente por el setup de Vitest).

## Producción

El despliegue usa la imagen Docker multietapa (`Dockerfile`) y el blueprint de
Render (`render.yaml`). El servidor compila la API y sirve el frontend desde
`web/dist` cuando `NODE_ENV=production`.

### Variables de entorno

Además de las de `server/.env.example`, en producción **son obligatorias**:

| Variable | Descripción |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL de producción (no la local de Docker) |
| `JWT_SECRET` | Secreto para firmar las sesiones; obligatorio en producción |
| `ADMIN_TOKEN` | Token para las rutas de moderación; obligatorio en producción |
| `SMTP_URL` | SMTP para verificar correo y restablecer contraseña (p. ej. Brevo) |
| `MAIL_FROM` | Remitente de los correos (debe ser una dirección verificada) |

Opcionales: `SUPABASE_URL`, `SUPABASE_SECRET_KEY` y `SUPABASE_BUCKET` para
guardar en Supabase Storage las fotos de personas y mascotas desaparecidas
(sin ellas la foto se guarda como base64 en la base de datos),
`FRONTEND_URL` (URL pública del frontend, usada en los enlaces de los correos;
si no está, se usa `RENDER_EXTERNAL_URL`) y `CORS_ORIGIN` (origins permitidos,
separados por coma; vacío = sin CORS, sirviendo todo en mismo origen).

El servidor **revienta al arrancar** si `JWT_SECRET` o `ADMIN_TOKEN` faltan o
usan el valor de ejemplo (para evitar sesiones fraguables en producción).

### Despliegue rápido (Render + Supabase)

1. Sube el repo; Render construye la imagen del `Dockerfile` a partir del
   blueprint `render.yaml` (o crea el servicio manualmente apuntando al repo).
2. Crea el Postgres de producción (p. ej. Supabase) y aplica las migraciones
   contra su URL directa (puerto 5432): `npm run db:deploy -w server` y luego
   `npm run db:seed:prod -w server`, que siembra únicamente las 9 ciudades.
   **Nunca** uses `npm run db:seed:dev` contra producción: borra todos los datos
   y crea datos de ejemplo (es un script exclusivo de desarrollo).
3. En la consola de Render completa antes de que termine el primer deploy los
   secretos con `sync: false` en `render.yaml`: `DATABASE_URL` (con el pooler,
   puerto 6543), `JWT_SECRET`, `ADMIN_TOKEN`, `SMTP_URL`, `MAIL_FROM` (dirección
   verificada), `SUPABASE_URL` y `SUPABASE_SECRET_KEY`; el `SUPABASE_BUCKET` ya lo
   fija el blueprint en `fotos` (el bucket debe ser público) y `FRONTEND_URL`
   puede quedar vacío (usa `RENDER_EXTERNAL_URL`). `TRUST_PROXY` lo activa el
   blueprint (el límite de tasa lee `X-Forwarded-For`).


## Flujo de trabajo

Cada commit deja la app funcionando con tests en verde. Las migraciones de Prisma se
versionan en `server/prisma/migrations/`.

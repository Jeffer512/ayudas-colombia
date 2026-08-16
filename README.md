# Proyecto Ayudas

App web para centralizar ayuda tras el terremoto. Las personas reportan necesidades
(personas/mascotas desaparecidas, suministros, voluntarios, refugios) y quién está
ayudando puede marcar los reportes como "siendo atendido" para que los demás dirijan
sus esfuerzos a otras zonas.

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

- Node.js 20+
- Docker (para PostgreSQL local)

## Puesta en marcha

```bash
npm install
docker compose up -d          # levanta PostgreSQL
cp server/.env.example server/.env
npm run db:migrate -w server  # aplica migraciones
npm run db:seed -w server     # siembra la ciudad de Pereira
npm run dev                   # API en :4000, web en :5173
```

## Tests

```bash
npm run test                  # backend + frontend (requiere PostgreSQL arriba)
```

Los tests de backend usan una base `ayudas_test` separada (creada y sincronizada
automáticamente por el setup de Vitest).

## Producción

El servidor compila la API y sirve el frontend desde `web/dist` cuando
`NODE_ENV=production`. Despliegue: construir el web, aplicar migraciones y arrancar
el servidor.

```bash
npm install
npm run build                   # compila server/ y web/
npm run db:deploy -w server     # aplica migraciones (no requerido si PostgreSQL es nuevo)
npm start -w server             # sirve API y frontend en :4000
```

### Variables de entorno

Además de las de `server/.env.example`, en producción **son obligatorias**:

| Variable | Descripción |
| --- | --- |
| `NODE_ENV` | `production` |
| `DATABASE_URL` | PostgreSQL de producción (no la local de Docker) |
| `JWT_SECRET` | Genera con `openssl rand -hex 32`; el secreto es obligatorio en producción |
| `ADMIN_TOKEN` | Token para las rutas de moderación; obligatorio en producción |
| `SMTP_URL` | SMTP para verificar correo y restablecer contraseña (p. ej. Brevo) |
| `MAIL_FROM` | Remitente de los correos |
| `FRONTEND_URL` | URL pública del frontend (usada en los enlaces de verificación) |
| `TRUST_PROXY` | `true` cuando hay un proxy reverso (nginx/caddy o el de Render/Railway) |

Opcionales: `SUPABASE_URL`/`SUPABASE_SECRET_KEY` para fotos en Supabase
(sin ellas, las fotos se guardan como base64 en la base de datos) y `CORS_ORIGIN`
(origins permitidos, separados por coma; vacío = sin CORS, sirviendo todo en
mismo origen).

El servidor **revienta al arrancar** si `JWT_SECRET` o `ADMIN_TOKEN` faltan o
usan el valor de ejemplo (para evitar sesiones fraguables en producción).

### Despliegue rápido (Render/Railway)

1. Servidor de Postgres (Render Postgres, Railway Postgres, etc.) y usa su `DATABASE_URL`.
2. Define todas las variables obligatorias de la tabla anterior.
3. Build: `npm run build`.
4. Arranque: `npm run db:deploy -w server && npm start -w server`.
5. Antes de abrir: registra una cuenta (debe llegar el correo de verificación con
   el enlace correcto) y restablece una contraseña; crea una solicitud, oferta y aviso.

## Flujo de trabajo

Cada commit deja la app funcionando con tests en verde. Las migraciones de Prisma se
versionan en `server/prisma/migrations/`.

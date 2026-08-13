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

## Flujo de trabajo

Cada commit deja la app funcionando con tests en verde. Las migraciones de Prisma se
versionan en `server/prisma/migrations/`.

# syntax=docker/dockerfile:1

FROM node:25-alpine AS builder
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci

COPY server/prisma /app/prisma
RUN npx prisma generate --schema /app/prisma/schema.prisma && test -f node_modules/.prisma/client/index.js

COPY . .
RUN npm run build

FROM node:25-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json
RUN npm ci --omit=dev --ignore-scripts --workspace=server

COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma

COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/web/dist ./web/dist

EXPOSE 10000

USER node
CMD ["node", "server/dist/index.js"]
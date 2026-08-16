# syntax=docker/dockerfile:1

# --- Stage 1: Builder ---
FROM node:24-alpine AS builder
RUN apk update && apk add --no-cache openssl
WORKDIR /app

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN PRISMA_SKIP_POSTINSTALL_GENERATE=true npm ci

COPY server/prisma server/prisma

RUN npm --workspace=server exec -- prisma generate --schema prisma/schema.prisma

# Copy source and build
COPY . .
RUN npm run build


# --- Stage 2: Runner ---
FROM node:24-alpine AS runner
RUN apk update && apk add --no-cache openssl
WORKDIR /app
ENV NODE_ENV=production

COPY package.json package-lock.json ./
COPY server/package.json server/package.json
COPY web/package.json web/package.json

RUN npm ci --omit=dev --ignore-scripts --workspace=server

COPY --from=builder /app/server/node_modules/.prisma ./server/node_modules/.prisma
COPY --from=builder /app/server/dist ./server/dist
COPY --from=builder /app/server/prisma ./server/prisma
COPY --from=builder /app/web/dist ./web/dist

EXPOSE 10000

USER node
CMD ["node", "server/dist/index.js"]
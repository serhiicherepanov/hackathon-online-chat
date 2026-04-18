#syntax=docker/dockerfile:1.7

FROM node:20-alpine AS base
RUN apk add --no-cache libc6-compat openssl python3 make g++ && corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

# -----------------------------------------------------------------------------
# development target: next dev + source bind-mount from compose.
# NEXT_PUBLIC_* are read at request time in dev, so no build ARGs are needed.
# -----------------------------------------------------------------------------
FROM base AS development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm exec prisma generate
ENV NODE_ENV=development
ENV HOSTNAME=0.0.0.0
ENV PORT=3080
EXPOSE 3080
CMD ["sh", "docker/app-entrypoint.sh"]

# -----------------------------------------------------------------------------
# production target: real `next build` + `next start`. NEXT_PUBLIC_* must be
# passed as build ARGs so they get inlined into the client bundle.
# -----------------------------------------------------------------------------
FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Next.js expects a `public/` dir; create it if the repo doesn't ship one so
# the later COPY --from=builder /app/public in the production stage works.
RUN mkdir -p public
RUN pnpm exec prisma generate

ARG NEXT_PUBLIC_CENTRIFUGO_WS_URL
ENV NEXT_PUBLIC_CENTRIFUGO_WS_URL=${NEXT_PUBLIC_CENTRIFUGO_WS_URL}
ENV NODE_ENV=production
RUN pnpm build

FROM base AS production
ENV NODE_ENV=production
ENV HOSTNAME=0.0.0.0
ENV PORT=3080
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/package.json /app/pnpm-lock.yaml* ./
COPY --from=builder /app/docker ./docker
EXPOSE 3080
CMD ["sh", "docker/app-entrypoint.sh"]

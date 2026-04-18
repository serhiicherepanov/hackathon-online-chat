FROM node:20-alpine

RUN apk add --no-cache libc6-compat openssl python3 make g++ && corepack enable

WORKDIR /app

COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

COPY . .

RUN pnpm exec prisma generate

ENV NODE_ENV=development
ENV HOSTNAME=0.0.0.0
ENV PORT=3080

EXPOSE 3080

CMD ["sh", "docker/app-entrypoint.sh"]

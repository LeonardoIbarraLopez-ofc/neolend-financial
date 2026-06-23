# Dockerfile multi-stage para servicio NestJS dentro del workspace pnpm.
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

# Copia manifiestos del workspace para aprovechar caché de capas
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY libs ./libs
COPY services/gateway-origination-svc ./services/gateway-origination-svc

RUN pnpm install --frozen-lockfile || pnpm install
RUN pnpm --filter @neolend/ts-common --filter @neolend/ts-events build
RUN pnpm --filter @neolend/gateway-origination-svc build

EXPOSE 8080 8101
CMD ["node", "services/gateway-origination-svc/dist/main.js"]

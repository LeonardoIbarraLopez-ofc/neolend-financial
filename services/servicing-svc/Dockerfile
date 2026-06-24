FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY libs ./libs
COPY services/servicing-svc ./services/servicing-svc

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @neolend/servicing-svc... build

EXPOSE 8104
CMD ["node", "services/servicing-svc/dist/main.js"]

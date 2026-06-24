FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY libs ./libs
COPY services/investor-svc ./services/investor-svc

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @neolend/investor-svc... build

EXPOSE 8105
CMD ["node", "services/investor-svc/dist/main.js"]

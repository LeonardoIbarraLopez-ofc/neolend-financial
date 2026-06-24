FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY libs ./libs
COPY services/compliance-svc ./services/compliance-svc

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @neolend/compliance-svc... build

EXPOSE 8106
CMD ["node", "services/compliance-svc/dist/main.js"]

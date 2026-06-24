# Frontend en modo desarrollo (Vite dev server) para el entorno local.
# Para producción se haría build estático + nginx; aquí priorizamos rapidez/DX.
FROM node:20-alpine
RUN corepack enable
WORKDIR /app

# Copia selectiva para aprovechar el cacheo de capas de Docker
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml* ./
COPY tsconfig.base.json ./
COPY libs ./libs
COPY clients/web-portal ./clients/web-portal

RUN pnpm install --frozen-lockfile
EXPOSE 5173
CMD ["pnpm", "--filter", "@neolend/web-portal", "run", "dev", "--", "--host", "0.0.0.0"]

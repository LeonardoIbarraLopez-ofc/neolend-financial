# Frontend en modo desarrollo (Vite dev server) para el entorno local.
# Para producción se haría build estático + nginx; aquí priorizamos rapidez/DX.
FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]

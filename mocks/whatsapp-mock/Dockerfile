FROM node:20-alpine
WORKDIR /app
COPY mocks/whatsapp-mock/server.js mocks/whatsapp-mock/package.json ./
RUN npm install
EXPOSE 9103
CMD ["node", "server.js"]

FROM node:20-alpine
WORKDIR /app
COPY mocks/wallet-mock/server.js mocks/wallet-mock/package.json ./
RUN npm install
EXPOSE 9102
CMD ["node", "server.js"]

FROM node:20-alpine
WORKDIR /app
COPY mocks/bureau-soap-mock/server.js mocks/bureau-soap-mock/package.json ./
RUN npm install
EXPOSE 9101
CMD ["node", "server.js"]

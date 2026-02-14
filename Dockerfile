FROM node:20-alpine

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
RUN mkdir -p public
COPY dashboard.html public/index.html

EXPOSE 3000

ENV VAULT_PATH=/vault
ENV NODE_ENV=production

CMD ["node", "server.js"]

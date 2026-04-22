FROM node:20-alpine

RUN apk add --no-cache su-exec

WORKDIR /app

COPY package.json ./
RUN npm install --production

COPY server.js ./
RUN mkdir -p public
COPY dashboard.html public/index.html

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000

ENV VAULT_PATH=/vault
ENV NODE_ENV=production

ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "server.js"]

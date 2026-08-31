FROM docker.io/library/node:24-alpine
WORKDIR /app
COPY server.mjs config.json ./
EXPOSE 8081
CMD ["node", "server.mjs"]

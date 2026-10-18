FROM docker.io/library/node:22-bookworm-slim AS build
WORKDIR /app
ARG SITE_URL=https://medmatepharmacy.com
ARG NEXT_PUBLIC_API_BASE_URL=https://api.nammamedmate.com
ENV SITE_URL=$SITE_URL
ENV NEXT_PUBLIC_API_BASE_URL=$NEXT_PUBLIC_API_BASE_URL
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_OPTIONS="--max-old-space-size=768"
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund
COPY . .
RUN npm run build

FROM docker.io/library/node:22-alpine
WORKDIR /app
RUN npm install -g serve@14.2.4 && apk add --no-cache curl
COPY --from=build /app/out ./out
USER node
EXPOSE 3000
CMD ["serve", "out", "-l", "tcp://0.0.0.0:3000"]

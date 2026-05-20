FROM node:20-alpine AS base
WORKDIR /app
RUN apk add --no-cache dumb-init

FROM base AS deps
COPY package*.json ./
RUN npm ci --omit=dev

FROM base AS builder
COPY package*.json ./
RUN npm install

COPY src ./src

FROM base AS production
COPY --from=deps /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY package.json ./

ENV NODE_ENV=production

EXPOSE 6929
USER node

CMD ["dumb-init", "node", "src/server.js"]
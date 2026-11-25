# Multi-stage build for the EMDO API. Prototype state; no clinical use.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --no-audit --no-fund
COPY packages/shared ./packages/shared
COPY apps/api ./apps/api
RUN npm run build:shared && npm run build -w @emdo/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY packages/shared ./packages/shared
COPY apps/api/dist ./apps/api/dist
RUN addgroup -S emdo && adduser -S -G emdo emdo && chown -R emdo:emdo /app
USER emdo
EXPOSE 3000
CMD ["node", "apps/api/dist/main.js"]

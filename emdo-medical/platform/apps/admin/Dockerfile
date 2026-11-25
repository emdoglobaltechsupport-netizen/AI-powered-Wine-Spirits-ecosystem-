# Multi-stage build for the D-026 Super Admin prototype. Not a hosted deployment.
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json tsconfig.base.json ./
COPY packages/shared/package.json packages/shared/package.json
COPY apps/admin/package.json apps/admin/package.json
RUN npm install --no-audit --no-fund
COPY packages/shared ./packages/shared
COPY apps/admin ./apps/admin
RUN npm run build:shared && npm run build -w @emdo/admin

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
COPY apps/admin/package.json apps/admin/package.json
COPY packages/shared/package.json packages/shared/package.json
RUN npm install --omit=dev --no-audit --no-fund
COPY packages/shared/package.json ./packages/shared/package.json
COPY --from=build /app/packages/shared/dist ./packages/shared/dist
COPY --from=build /app/apps/admin/.next ./apps/admin/.next
COPY apps/admin/next.config.mjs ./apps/admin/next.config.mjs
RUN addgroup -S emdo && adduser -S -G emdo emdo && chown -R emdo:emdo /app
USER emdo
EXPOSE 3001
CMD ["npm", "start", "-w", "@emdo/admin"]

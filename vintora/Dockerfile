# Platform-neutral runtime for the API and the zero-build prototype.
# Base image is digest-pinned; refresh via config/artifact-policy.json and
# `npm run artifacts:check` when Dependabot opens an image update PR.
FROM node:20-bookworm-slim@sha256:2cf067cfed83d5ea958367df9f966191a942351a2df77d6f0193e162b5febfc0

WORKDIR /app

COPY --chown=node:node package.json package-lock.json ./
COPY --chown=node:node tsconfig.base.json turbo.json pnpm-workspace.yaml ./
COPY --chown=node:node apps ./apps
COPY --chown=node:node packages ./packages
COPY --chown=node:node services ./services
COPY --chown=node:node scripts ./scripts
COPY --chown=node:node config ./config

# npm is the verified package manager. The legacy-peer-deps flag is required by
# the non-production web/mobile shells; no secrets are present in the image.
RUN npm ci --legacy-peer-deps --no-audit --no-fund \
    && npm cache clean --force

USER node
ENV NODE_ENV=development
EXPOSE 4000 8123

CMD ["npm", "run", "start", "--workspace", "@vintora/api"]

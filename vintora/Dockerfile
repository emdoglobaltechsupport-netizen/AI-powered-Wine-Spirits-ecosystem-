# Platform-neutral runtime for the API and the zero-build prototype.
# Base image is digest-pinned; refresh via config/artifact-policy.json and
# `npm run artifacts:check` when Dependabot opens an image update PR.
FROM node:24-trixie-slim@sha256:4d00acb4bcc42c454c4eb801526f7ad7f772ea3bd4fd168c5cc2e384abcbb9d4

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
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 CMD node -e "fetch('http://127.0.0.1:4000/health').then(function (r) { process.exit(r.ok ? 0 : 1); }).catch(function () { process.exit(1); })"

CMD ["npm", "run", "start", "--workspace", "@vintora/api"]

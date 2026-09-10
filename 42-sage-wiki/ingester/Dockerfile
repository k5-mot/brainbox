FROM ghcr.io/xoai/sage-wiki:v0.2.10 AS sage-wiki

FROM docker.io/library/node:24.20.0-bookworm-slim AS builder

WORKDIR /app

RUN npm install -g pnpm@11.18.0 --ignore-scripts --no-audit --no-fund

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY tsconfig.json ./
COPY src ./src
RUN pnpm build \
    && pnpm prune --prod

FROM docker.io/library/node:24.20.0-bookworm-slim

ENV NODE_ENV=production \
    CONFIG_PATH=/app/config.yaml

WORKDIR /app

COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY --from=sage-wiki /usr/local/bin/sage-wiki /usr/local/bin/sage-wiki

RUN mkdir -p /wiki/sources /wiki/wiki /wiki/.sage-ingester \
    && chown -R node:node /wiki

USER node

CMD ["node", "dist/main.js"]

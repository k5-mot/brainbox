FROM docker.io/library/node:22.19.0-bookworm-slim AS builder

ARG AION_VERSION=2.2.1
ARG AION_COMMIT=dc47f4a0173ff506b08f13c97b10944d61e422d5
ARG AION_SOURCE_SHA256=3513df525974fa6b4fb94d1f13f411f9dfd19f46b5d968f37b4bd8c034e0eb54
ARG BUN_VERSION=1.4.0
ARG TARGETARCH

RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        gzip \
        tar \
    && npm install --global "bun@${BUN_VERSION}" \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/*

# upstream sourceをcommitとchecksumの両方で固定し、tag移動の影響を防ぐ。
RUN curl -fsSL \
        "https://github.com/iOfficeAI/AionUi/archive/${AION_COMMIT}.tar.gz" \
        -o /tmp/aionui.tar.gz \
    && printf '%s  %s\n' "${AION_SOURCE_SHA256}" /tmp/aionui.tar.gz | sha256sum -c - \
    && mkdir -p /src \
    && tar -xzf /tmp/aionui.tar.gz --strip-components=1 -C /src \
    && test "$(node -p "require('/src/package.json').version")" = "${AION_VERSION}" \
    && rm /tmp/aionui.tar.gz

WORKDIR /src

# 公式release workflowと同じ手順でrendererとstandalone Web CLIを生成する。
RUN bun install --frozen-lockfile \
    && NODE_OPTIONS=--max-old-space-size=8192 \
        bunx electron-vite build --config packages/desktop/electron.vite.config.ts \
    && case "${TARGETARCH}" in \
        amd64) aion_arch=x64 ;; \
        arm64) aion_arch=arm64 ;; \
        *) \
            echo "未対応architecture: ${TARGETARCH}" >&2; \
            exit 1 \
            ;; \
    esac \
    && PACK_PLATFORM=linux PACK_ARCH="${aion_arch}" node scripts/pack-web-cli.js \
    && mkdir -p /opt/aionui \
    && tar -xzf "dist-web-cli/aionui-web-${AION_VERSION}-linux-"*.tar.gz \
        --strip-components=1 -C /opt/aionui

FROM docker.io/library/debian:12.12-slim

# Web hostの通信確認とOffice preview runtimeに必要な最小限のsystem packageを配置する。
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        ca-certificates \
        curl \
        git \
        jq \
        libicu72 \
        tzdata \
    && groupadd --gid 1000 aion \
    && useradd --uid 1000 --gid aion --create-home --shell /bin/bash aion \
    && mkdir -p /data/workspace \
    && chown -R aion:aion /data \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder --chown=aion:aion /opt/aionui /opt/aionui
COPY --chmod=0755 entrypoint.sh /usr/local/bin/aion-entrypoint

ENV AIONUI_PORT=3000 \
    AIONUI_ALLOW_REMOTE=true \
    AIONUI_DATA_DIR=/data \
    AIONUI_LOG_DIR=/data/logs \
    HOME=/home/aion \
    TZ=Asia/Tokyo

USER aion
WORKDIR /data/workspace

EXPOSE 3000
VOLUME ["/data", "/data/workspace"]

ENTRYPOINT ["/usr/local/bin/aion-entrypoint"]
CMD ["start", "--port", "3000", "--remote", "--data-dir", "/data", "--log-dir", "/data/logs", "--no-open"]

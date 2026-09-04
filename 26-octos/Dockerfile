FROM docker.io/library/debian:13.1-slim

ARG OCTOS_VERSION=v2.0.2
ARG TARGETARCH
ARG OCTOS_SHA256_AMD64=359cf1fdc1b88bd371f03252aaca844d62f15383db281fec442fe28388a199f1
ARG OCTOS_SHA256_ARM64=afb64c73fe8ea2059d17da7e05dde39f57d44a0f3a373760e02491a9cec03723

# 公式installerが推奨するskill実行環境と、Office成果物の変換環境を揃える。
RUN apt-get update \
    && DEBIAN_FRONTEND=noninteractive apt-get install -y --no-install-recommends \
        bash \
        ca-certificates \
        chromium \
        curl \
        ffmpeg \
        gcc \
        git \
        jq \
        libc6-dev \
        libreoffice \
        nodejs \
        npm \
        poppler-utils \
        python3 \
        tzdata \
    && npm install --global pptxgenjs react-icons react react-dom sharp \
    && npm cache clean --force \
    && rm -rf /var/lib/apt/lists/*

# architecture別の公式release bundleをchecksum検証して配置する。
RUN case "${TARGETARCH}" in \
        amd64) \
            octos_target="x86_64-unknown-linux-gnu"; \
            octos_sha256="${OCTOS_SHA256_AMD64}" \
            ;; \
        arm64) \
            octos_target="aarch64-unknown-linux-gnu"; \
            octos_sha256="${OCTOS_SHA256_ARM64}" \
            ;; \
        *) \
            echo "未対応architecture: ${TARGETARCH}" >&2; \
            exit 1 \
            ;; \
    esac \
    && curl -fsSL \
        "https://github.com/octos-org/octos/releases/download/${OCTOS_VERSION}/octos-bundle-${octos_target}.tar.gz" \
        -o /tmp/octos.tar.gz \
    && printf '%s  %s\n' "${octos_sha256}" /tmp/octos.tar.gz | sha256sum -c - \
    && mkdir -p /opt/octos \
    && tar -xzf /tmp/octos.tar.gz -C /opt/octos \
    && chmod 0755 /opt/octos/* \
    && rm /tmp/octos.tar.gz

RUN groupadd --gid 1000 octos \
    && useradd --uid 1000 --gid octos --create-home --shell /bin/bash octos \
    && mkdir -p /var/lib/octos/config /workspace \
    && chown -R octos:octos /var/lib/octos /workspace

COPY --chmod=0755 entrypoint.sh /usr/local/bin/octos-entrypoint
COPY --chmod=0644 config.seed.json /opt/octos/config.seed.json

ENV HOME=/home/octos \
    OCTOS_HOME=/var/lib/octos \
    OCTOS_CONFIG_DIR=/var/lib/octos/config \
    PATH=/opt/octos:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin

USER octos
WORKDIR /workspace

ENTRYPOINT ["/usr/local/bin/octos-entrypoint"]
CMD ["serve", "--host", "0.0.0.0", "--port", "50080", "--cwd", "/workspace", "--data-dir", "/var/lib/octos"]

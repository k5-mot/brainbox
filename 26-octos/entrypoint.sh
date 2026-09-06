#!/usr/bin/env bash
set -euo pipefail

octos_config_dir="${OCTOS_CONFIG_DIR:-/var/lib/octos/config}"
octos_config_path="${octos_config_dir}/config.json"

mkdir -p "${octos_config_dir}"

# 管理tokenをsourceやlogへ残さず、初回だけ永続configへ安全に保存する。
if [[ ! -f "${octos_config_path}" ]]; then
    octos_bootstrap_token="${OCTOS_BOOTSTRAP_AUTH_TOKEN:-}"
    if [[ -z "${octos_bootstrap_token}" ]]; then
        octos_bootstrap_token="$(od -An -N32 -tx1 /dev/urandom | tr -d ' \n')"
    fi

    umask 077
    jq --arg auth_token "${octos_bootstrap_token}" \
        '.auth_token = $auth_token' \
        /opt/octos/config.seed.json > "${octos_config_path}.tmp"
    mv "${octos_config_path}.tmp" "${octos_config_path}"
fi

unset OCTOS_BOOTSTRAP_AUTH_TOKEN octos_bootstrap_token

if [[ "${1:-}" == "serve" ]]; then
    exec /opt/octos/octos "$@" --config "${octos_config_path}"
fi

exec /opt/octos/octos "$@"

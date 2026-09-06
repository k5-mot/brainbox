#!/usr/bin/env bash
set -euo pipefail

# password resetやversion確認ではWeb server用bootstrapを実行しない。
if [[ "${1:-start}" != start ]]; then
  exec /opt/aionui/aionui-web "$@"
fi

: "${AIONUI_LITELLM_API_KEY:?AIONUI_LITELLM_API_KEY is required}"
: "${AIONUI_LITELLM_BASE_URL:=http://litellm:4000/v1}"
: "${AIONUI_LITELLM_MODEL:=google/gemma4:31b}"

umask 077
payload_file="$(mktemp)"

# credentialをprocess argumentやlogへ出さず、AionUiの暗号化provider storageへ渡す。
jq -n \
  --arg id inferlab-litellm \
  --arg base_url "${AIONUI_LITELLM_BASE_URL}" \
  --arg api_key "${AIONUI_LITELLM_API_KEY}" \
  --arg model "${AIONUI_LITELLM_MODEL}" \
  '{
    id: $id,
    platform: "new-api",
    name: "LiteLLM",
    base_url: $base_url,
    api_key: $api_key,
    models: [$model],
    enabled: true,
    model_protocols: {($model): "openai"},
    model_enabled: {($model): true}
  }' >"${payload_file}"

/opt/aionui/aionui-web "$@" &
aion_pid=$!
trap 'kill -TERM "${aion_pid}" 2>/dev/null || true' TERM INT

bootstrap_complete=false
for _ in $(seq 1 120); do
  if ! kill -0 "${aion_pid}" 2>/dev/null; then
    break
  fi

  if curl -fsS http://127.0.0.1:3000/api/providers \
    | jq -e '.success == true' >/dev/null 2>&1; then
    if curl -fsS http://127.0.0.1:3000/api/providers \
      | jq -e '.data[] | select(.id == "inferlab-litellm")' >/dev/null 2>&1; then
      jq 'del(.id)' "${payload_file}" >"${payload_file}.update"
      mv "${payload_file}.update" "${payload_file}"
      provider_method=PUT
      provider_url=http://127.0.0.1:3000/api/providers/inferlab-litellm
    else
      provider_method=POST
      provider_url=http://127.0.0.1:3000/api/providers
    fi

    if curl -fsS -X "${provider_method}" \
      -H 'Content-Type: application/json' \
      --data-binary "@${payload_file}" \
      "${provider_url}" >/dev/null; then
      bootstrap_complete=true
      break
    fi
  fi

  sleep 1
done

rm -f "${payload_file}" "${payload_file}.update"

if [[ "${bootstrap_complete}" != true ]]; then
  echo 'LiteLLM providerの初期化に失敗しました。' >&2
  kill -TERM "${aion_pid}" 2>/dev/null || true
  wait "${aion_pid}" || true
  exit 1
fi

wait "${aion_pid}"

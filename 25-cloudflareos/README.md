# 25-cloudflareos

Cloudflare OSを公式sourceから固定revisionでbuildし、Wranglerとworkerdによるlocal runtimeをComposeでhostする。

## 構成

- `cloudflare-os`は`http://${PUBLIC_HOST}:32500`で公開する。
- build時に公式repositoryの`df04e239ed85376643c586a7329d3b8604df489e`を取得する。
- 全userへ`CLOUDFLARE_OS_MODEL`を既定modelとして公開し、推論requestを`http://litellm:4000/v1`へ送る。
- LiteLLM API keyはmode `0600`の`.dev.vars`からWrangler secretとして読み込み、生成設定と起動ログには出力しない。
- LiteLLMの`langfuse_otel` callbackが成功requestと失敗requestをLangfuseへ送る。
- workspaceとaccount dataは`cloudflare-os-wrangler` volumeへ保存する。

Cloudflare OS v2はearly accessであり、公式のself-hosted production用workerd手順は未公開である。この構成は公式の`pnpm run-local`経路をcontainer内で実行するため、production用途には使用すべきではない（SHOULD NOT）。

## 起動

```bash
# 既存LiteLLMとCloudflare OSをbuildして起動する。
sudo docker compose --env-file .env --profile inference --profile cloudflareos \
  up -d --build litellm cloudflare-os
```

期待結果:

- `litellm`と`cloudflare-os`が起動する。
- `cloudflare-os`がhealthyになる。
- `http://${PUBLIC_HOST}:32500`にlogin画面が表示される。
- 初回account作成後のmodel選択に`LiteLLM · Gemma 4 31B`が表示される。

失敗条件:

- 固定revisionを取得できない、またはupstream patchを適用できないためimage buildが失敗する。
- LiteLLMへ到達できず、Cloudflare OSのhealthcheckが失敗する。
- Wranglerの起動前buildがmemory不足またはprocess上限で失敗する。

## 検証

```bash
# Cloudflare OSのhealthcheckと公開portを確認する。
sudo docker compose --env-file .env --profile cloudflareos ps cloudflare-os

# Cloudflare OSの公開URLが応答することを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:32500" >/dev/null

# containerから既存LiteLLMのmodel一覧へ到達できることを確認する。
sudo docker compose --env-file .env --profile cloudflareos exec -T cloudflare-os \
  node -e "fetch('http://litellm:4000/v1/models',{headers:{Authorization:'Bearer '+process.env.LITELLM_API_KEY}}).then(async r=>{if(!r.ok)throw new Error(await r.text());console.log(await r.text())})"

# LiteLLMとLangfuseのhealth endpointを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:31000/health/readiness" >/dev/null

# Langfuseのpublic health endpointを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:35100/api/public/health" >/dev/null
```

期待結果:

- `cloudflare-os`が`healthy`と表示される。
- 公開URLがHTTP 200を返す。
- model一覧に`CLOUDFLARE_OS_MODEL`の値が含まれる。
- Cloudflare OSからchatを送信すると、LiteLLMを経由したgenerationがLangfuseの初期projectへ記録される。

失敗条件:

- container内で`litellm`を名前解決できない。
- LiteLLMがAPI keyを拒否する。
- Langfuseのproject keyとLiteLLMへ渡したkeyが一致せずtrace送信に失敗する。

## 設定

| 環境変数 | 既定値 | 用途 |
| --- | --- | --- |
| `CLOUDFLARE_OS_REF` | `df04e239ed85376643c586a7329d3b8604df489e` | buildする公式revision |
| `CLOUDFLARE_OS_MODEL` | `google/gemma4:31b` | LiteLLMで公開済みのmodel ID |
| `CLOUDFLARE_OS_MODEL_NAME` | `LiteLLM · Gemma 4 31B` | UI上の表示名 |
| `LITELLM_MASTER_KEY` | stack共通既定値 | LiteLLM認証key |

## 停止と再初期化

```bash
# Cloudflare OS containerを停止する。
sudo docker compose --env-file .env --profile cloudflareos stop cloudflare-os

# Cloudflare OS containerを削除する。workspace dataはvolumeへ残る。
sudo docker compose --env-file .env --profile cloudflareos rm -f cloudflare-os
```

完全な再初期化では`cloudflare-os-wrangler` volumeを削除するため、account、workspace、Gadgetを復元できなくなる。

```bash
# data消失を理解した場合に限り、Cloudflare OSの永続volumeを削除する。
sudo docker volume rm "${STACK_NAME}_cloudflare-os-wrangler"
```

## References

- [Cloudflare OS](https://github.com/cloudflare/cloudflare-os)
- [Cloudflare OS README](https://github.com/cloudflare/cloudflare-os/blob/df04e239ed85376643c586a7329d3b8604df489e/README.md)
- [Cloudflare Workers: Secrets](https://developers.cloudflare.com/workers/configuration/secrets/)
- [LiteLLM Proxy](https://docs.litellm.ai/docs/simple_proxy)
- [LiteLLM Langfuse integration](https://docs.litellm.ai/docs/observability/langfuse_integration)

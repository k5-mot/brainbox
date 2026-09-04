# 26-octos

Octos v2.0.2の公式release bundleを使い、内蔵されているOctos WebをComposeでhostする。

## 構成

- Octos Webは`http://${PUBLIC_HOST}:32600/app/`で公開する。
- 管理dashboardは`http://${PUBLIC_HOST}:32600/admin/`で公開する。
- `octos`、`octos-sandbox`、同梱app skillを公式bundleからchecksum検証して配置する。
- browser、deep-crawl、音声処理、Office変換用のruntime dependencyをimageへ含める。
- primary modelはOpenAI互換APIとして`http://litellm:4000/v1`だけを使用する。
- LiteLLMの`langfuse_otel` callbackにより、Octosの推論traceを既存Langfuseへ送る。
- config、profile、session、memoryは`octos-data`へ、agentの成果物は`octos-workspace`へ保存する。

LANで公開するため、loopback接続に限定されるpasswordなしの`--solo`は使用しない。Octos Webの`Login with admin token`を使用する。

## 起動

repository rootで実行する。

```bash
# 既存LiteLLMとOctosをbuildして起動する。
sudo docker compose --env-file .env --profile inference --profile octos \
  up -d --build litellm octos
```

期待結果:

- `litellm`と`octos`がhealthyになる。
- `http://${PUBLIC_HOST}:32600/app/`にOctos Webのlogin画面が表示される。
- Octosが`google/gemma4:31b`をLiteLLM経由で使用する。

失敗条件:

- hostの`32600`が他processと競合している。
- `LITELLM_MASTER_KEY`が未設定、またはLiteLLMがAPI keyを拒否する。
- hostのmemoryまたはdiskが不足し、image buildかOctos起動に失敗する。

## 初回login

管理tokenは、初回起動時に暗号学的乱数から生成してmode `0600`の永続configへ保存する。`.env`の`OCTOS_AUTH_TOKEN`を設定した場合は、その値を初回tokenとして使用する。既存configがある場合、環境変数では上書きしない。

```bash
# 現在有効な管理tokenをterminalだけへ表示する。出力をlogや共有資料へ貼り付けてはならない。
sudo docker compose --env-file .env --profile inference --profile octos exec -T octos \
  jq -r '.auth_token' /var/lib/octos/config/config.json
```

表示されたtokenを`http://${PUBLIC_HOST}:32600/app/`の`Login with admin token`へ入力する。同じtokenで`/admin/`にもloginできる。

## Model設定

| 環境変数 | 既定値 | 用途 |
| --- | --- | --- |
| `OCTOS_MODEL` | `google/gemma4:31b` | LiteLLMで公開済みのmodel ID |
| `OCTOS_AUTH_TOKEN` | 初回起動時に自動生成 | 初回だけ永続configへ保存する管理token |
| `LITELLM_MASTER_KEY` | なし | LiteLLM認証key |

provider、API URL、API key参照先は起動構成でLiteLLMへ固定する。modelを変更する場合は、LiteLLMの`/v1/models`に存在するIDを`OCTOS_MODEL`へ設定してOctosを再作成する。

## 検証

```bash
# OctosとLiteLLMの統合healthcheckを確認する。
sudo docker compose --env-file .env --profile inference --profile octos ps octos

# 公開health endpointを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:32600/health"

# Octos Webと管理dashboardのHTMLが配信されることを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:32600/app/" >/dev/null
curl -fsS "http://${PUBLIC_HOST:-localhost}:32600/admin/" >/dev/null

# Octos containerからLiteLLMのmodel一覧を取得する。
sudo docker compose --env-file .env --profile inference --profile octos exec -T octos \
  bash -lc 'curl -fsS -H "Authorization: Bearer ${OPENAI_API_KEY}" http://litellm:4000/v1/models'

# Octos CLIから短い推論を実行し、Web UIと同じprovider経路を確認する。
sudo docker compose --env-file .env --profile inference --profile octos exec -T octos \
  octos chat --config /var/lib/octos/config/config.json \
  --data-dir /var/lib/octos --no-session-persistence --json \
  -m 'Reply with exactly: OCTOS_OK'

# Langfuseのpublic health endpointを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:35100/api/public/health"
```

期待結果:

- `octos`が`healthy`と表示される。
- `/health`が`status: healthy`を返し、`/app/`と`/admin/`がHTTP 200を返す。
- LiteLLMのmodel一覧に`OCTOS_MODEL`の値が含まれる。
- CLI推論が`OCTOS_OK`を返す。
- 推論後、Langfuseの初期projectへLiteLLMのgenerationが記録される。

失敗条件:

- Octos containerから`litellm`を名前解決できない。
- LiteLLMで`OCTOS_MODEL`が未登録、またはmodel backendへ到達できない。
- Langfuseのproject keyとLiteLLMへ渡したkeyが一致せず、trace送信に失敗する。

## 停止と再初期化

```bash
# Octos containerを停止する。永続dataはvolumeへ残る。
sudo docker compose --env-file .env --profile inference --profile octos stop octos

# Octos containerを削除する。永続dataはvolumeへ残る。
sudo docker compose --env-file .env --profile inference --profile octos rm -f octos
```

完全な再初期化では、管理token、profile、session、memory、workspace成果物を復元できなくなる。必要なdataをbackupしてから実行しなければならない（MUST）。

```bash
# data消失を理解した場合に限り、Octosの永続volumeを削除する。
sudo docker volume rm "${STACK_NAME}_octos-data" "${STACK_NAME}_octos-workspace"
```

期待結果:

- 次回起動時に空のconfigとworkspaceが作成され、新しい管理tokenが生成される。

失敗条件:

- Octos containerが残っているためvolumeを削除できない。
- backupなしで削除し、以前のprofile、session、成果物を復元できない。

rollbackする場合は、停止中に取得した`octos-data`と`octos-workspace`のbackupを同じ時点へ復元する。

## References

- [Octos Web self-hosting](https://github.com/octos-org/octos-web/tree/1e985386a4dff3dddcee409157f6d36fe2a462c8#self-hosting--deployment)
- [Octos v2.0.2](https://github.com/octos-org/octos/releases/tag/v2.0.2)
- [Octos install script](https://github.com/octos-org/octos/blob/v2.0.2/scripts/install.sh)
- [Octos configuration example](https://github.com/octos-org/octos/blob/v2.0.2/config.example.json)
- [LiteLLM Proxy](https://docs.litellm.ai/docs/simple_proxy)
- [LiteLLM Langfuse integration](https://docs.litellm.ai/docs/observability/langfuse_integration)

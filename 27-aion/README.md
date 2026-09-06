# 27-aion

AionUi v2.2.1のstandalone WebUIを、公式release workflowと同じbuild手順でcontainer化してhostする。

## 構成

- WebUIは`http://${PUBLIC_HOST}:32700/`で公開する。
- upstream sourceはv2.2.1のcommitとSHA-256 checksumで固定する。
- Electronを起動せず、公式の`aionui-web`と同梱AionCoreを使用する。
- SQLite database、設定、会話、logは`aion-data`へ保存する。
- agentの作業場所`/data/workspace`は`aion-workspace`へ保存する。
- 起動時に`LiteLLM` providerをAionUiへ作成または同期し、既存LiteLLMのOpenAI互換APIへ接続する。
- LiteLLMの`langfuse_otel` callbackにより、LiteLLM経由の推論traceを既存Langfuseへ送る。

AionUiは初回起動時に管理者`admin`のrandom passwordを生成する。LAN公開ではpassword認証を無効化してはならない（MUST NOT）。

> AionUi v2.2.1のstandalone modeでは、login前にも一部のread-only APIが応答する。信頼できるLANだけで公開し、Internetへ直接公開してはならない（MUST NOT）。Internet公開では認証proxyまたはVPNを前段に配置する。

## 起動

repository rootで実行する。初回buildではrendererとstandalone CLIを生成するため時間がかかる。

```bash
# 既存LiteLLMとAionUiをbuildして起動する。
sudo docker compose --env-file .env --profile inference --profile aion \
  up -d --build litellm aion
```

期待結果:

- `litellm`と`aion`がhealthyになる。
- `http://${PUBLIC_HOST}:32700/`にAionUiのlogin画面が表示される。
- 初回だけ管理者passwordがcontainer logへ出力される。

失敗条件:

- hostの`32700`が他processと競合している。
- `LITELLM_MASTER_KEY`が未設定、またはLiteLLMがAPI keyを拒否する。
- build時のmemoryまたはdiskが不足する。AionUi upstreamはbuild時に8 GiBまでのNode.js heapを許可している。

## 初回login

```bash
# 初回だけ生成された管理者passwordをterminalへ表示する。出力をlogや共有資料へ貼り付けてはならない。
sudo docker compose --env-file .env --profile inference --profile aion logs aion \
  | rg 'Generated initial admin password'
```

username `admin`と表示されたpasswordでloginし、ログイン後すぐにpasswordを変更する。

passwordを紛失した場合は、稼働中のdatabaseを同時に開かないようAionUiを停止してから公式`resetpass` commandを実行する。

```bash
# databaseを安全に開くため、AionUiを停止する。
sudo docker compose --env-file .env --profile inference --profile aion stop aion

# passwordを再生成する。既存sessionは無効になる。
sudo docker compose --env-file .env --profile inference --profile aion run --rm --no-deps aion \
  resetpass --data-dir /data

# password再設定後にAionUiを再開する。
sudo docker compose --env-file .env --profile inference --profile aion start aion
```

期待結果:

- `resetpass`が新しいpasswordをterminalへ1回表示する。
- 再起動後は新しいpasswordでloginでき、既存sessionは無効になる。

失敗条件:

- `aion`を停止せず、同じSQLite databaseを複数processから変更する。
- 新しいpasswordを保存する前にterminalを閉じる。

## LiteLLM設定

AionUiは次のproviderを起動時に自動設定する。API keyはAionUiのstorage encryptionを使ってSQLiteへ保存され、起動logには出力しない。

| 項目 | 値 |
| --- | --- |
| Name | `LiteLLM` |
| Base URL | `http://litellm:4000/v1` |
| API key | `.env`の`LITELLM_MASTER_KEY` |
| Model ID | `AION_MODEL`。既定値は`google/gemma4:31b` |

`http://litellm:4000/v1`はDocker network内のURLであり、host browserから直接開くURLではない。`inferlab-litellm` IDのproviderは起動時に管理されるため、変更は`.env`の`LITELLM_MASTER_KEY`または`AION_MODEL`へ反映してcontainerを再作成する。共有画面やscreenshotへAPI keyを含めてはならない（MUST NOT）。

## 検証

```bash
# AionUiとLiteLLMの統合healthcheckを確認する。
sudo docker compose --env-file .env --profile inference --profile aion ps aion

# 公開WebUIがHTMLを返すことを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:32700/" >/dev/null

# AionUi containerからLiteLLMのmodel一覧を取得する。
sudo docker compose --env-file .env --profile inference --profile aion exec -T aion \
  sh -lc 'curl -fsS -H "Authorization: Bearer ${AIONUI_LITELLM_API_KEY}" http://litellm:4000/v1/models'

# AionUi自身のprovider health checkでLiteLLM推論を確認する。
curl -fsS -X POST -H 'Content-Type: application/json' \
  --data '{"provider_id":"inferlab-litellm","model":"google/gemma4:31b"}' \
  "http://${PUBLIC_HOST:-localhost}:32700/api/agents/provider-health-check"

# AionUiのversionを確認する。
sudo docker compose --env-file .env --profile inference --profile aion exec -T aion \
  /opt/aionui/aionui-web version

# Langfuseのpublic health endpointを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:35100/api/public/health"
```

期待結果:

- `aion`が`healthy`と表示される。
- WebUIがHTTP 200を返す。
- LiteLLMのmodel一覧に`google/gemma4:31b`が含まれる。
- provider health checkが`status: healthy`を返す。
- version commandが`2.2.1`を返す。
- AionUiで会話した後、Langfuseの初期projectへLiteLLMのgenerationが記録される。

失敗条件:

- AionUi containerから`litellm`を名前解決できない。
- AionUiのproviderにhost側URLを設定し、containerから到達できない。
- LiteLLMまたはmodel backendがunhealthyで推論できない。

## 停止と再初期化

```bash
# AionUi containerを停止する。永続dataはvolumeへ残る。
sudo docker compose --env-file .env --profile inference --profile aion stop aion

# AionUi containerを削除する。永続dataはvolumeへ残る。
sudo docker compose --env-file .env --profile inference --profile aion rm -f aion
```

完全な再初期化では、provider credential、会話、設定、workspace成果物を復元できなくなる。必要なdataをbackupしてから実行しなければならない（MUST）。

```bash
# data消失を理解した場合に限り、AionUiの永続volumeを削除する。
sudo docker volume rm "${STACK_NAME}_aion-data" "${STACK_NAME}_aion-workspace"
```

期待結果:

- 次回起動時に空のdatabaseとworkspaceが作成され、新しい管理者passwordが生成される。

失敗条件:

- AionUi containerが残っているためvolumeを削除できない。
- backupなしで削除し、以前の設定、会話、成果物を復元できない。

rollbackする場合は、停止中に取得した`aion-data`と`aion-workspace`のbackupを同じ時点へ復元する。

## References

- [AionUi v2.2.1](https://github.com/iOfficeAI/AionUi/releases/tag/v2.2.1)
- [AionUi WebUI configuration guide](https://github.com/iOfficeAI/AionUi/wiki/WebUI-Configuration-Guide)
- [AionUi Web CLI release workflow](https://github.com/iOfficeAI/AionUi/blob/dc47f4a0173ff506b08f13c97b10944d61e422d5/.github/workflows/pack-web-cli.yml)
- [AionUi Web CLI pack script](https://github.com/iOfficeAI/AionUi/blob/dc47f4a0173ff506b08f13c97b10944d61e422d5/scripts/pack-web-cli.js)
- [AionUi LLM configuration guide](https://github.com/iOfficeAI/AionUi/wiki/LLM-Configuration)
- [LiteLLM Proxy](https://docs.litellm.ai/docs/simple_proxy)
- [LiteLLM Langfuse integration](https://docs.litellm.ai/docs/observability/langfuse_integration)

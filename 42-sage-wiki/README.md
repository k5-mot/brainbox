# Sage Wiki

Sage Wiki `v0.2.10`を、LLMによる知識コンパイル、検索、知識graph、Web UI、REST APIおよびMCP serverに使用する。`sage-wiki-ingester`が設定されたsourceを起動時とcronで同期し、状態確認用Web UIを公開する。`sage-wiki`の内蔵workerはsource変更を検知してcompileし、生成結果のWeb UI、APIおよびMCPを公開する。両serviceは`sage-wiki-project` named volumeを共有する。

LLM処理は既存のLiteLLMへOpenAI互換APIで接続する。生成modelには`openai/gpt-oss:20b`、embedding modelには`Qwen/Qwen3-Embedding:0.6B`を使用する。credentialの値はrepositoryへ保存せず、`LITELLM_MASTER_KEY`環境変数から取得する。

この文書の`docker compose` commandは、`42-sage-wiki/`ではなくrepository rootで実行しなければならない（MUST）。Sage WikiはrootのComposeがincludeするCouchDB、LiteLLMおよびembedding serviceへ依存する。

## 設定

Sage Wikiの運用設定は[config.yaml](https://github.com/k5-mot/inferlab/blob/main/42-sage-wiki/config.yaml)、source adapterとscheduleの設定は[ingester-config.yaml](https://github.com/k5-mot/inferlab/blob/main/42-sage-wiki/ingester-config.yaml)に置く。sourceごとに`adapter`、`run_on_start`および`schedule`を設定できる。設定を変更した場合はcontainerを再作成する。Web UIのBearer tokenは`.env`の`SAGE_WIKI_TOKEN`、DNS rebinding対策の許可hostは共通の`PUBLIC_HOST`から注入する。`gpt-oss:20b`の要約では推論だけで出力上限を消費しないよう、`api.extra_params.reasoning_effort: low`を指定する。

Ingesterのsource、Dockerfile、dependencyおよびtestは`42-sage-wiki/ingester/`に置く。他profileのbuild contextやruntime資材は参照しない。Composeはこのdirectoryからimageをlocal buildし、`ghcr.io/xoai/sage-wiki-ingester:v0.2.10`としてtag付けする。

```bash
# Sage Wiki用tokenを生成する。
openssl rand -hex 32
```

生成値を`.env`の`SAGE_WIKI_TOKEN`へ設定する。

期待結果:

- repositoryにcredentialの実値を追加せず、containerへ実行時にtokenが渡される。
- `PUBLIC_HOST`でWeb UIへアクセスした要求だけが許可される。

失敗基準:

- tokenが空、または`PUBLIC_HOST`が閲覧時のhost名やIPと一致しない場合は起動またはHTTP要求に失敗する。

## Ingester image

```bash
# Sage Wiki専用Ingesterの型検査とunit testを実行する。
pnpm --dir 42-sage-wiki/ingester typecheck && pnpm --dir 42-sage-wiki/ingester test

# Sage Wiki専用Ingester imageをbuildする。
docker compose --profile sage-wiki build sage-wiki-ingester
```

Offline buildは専用の`Dockerfile.offline`とnpm package archiveを使用する。

```bash
# Offline overrideを使用して外部networkなしでIngester imageをbuildする。
SAGE_WIKI_NPM_PACKAGES_DIR=/srv/npm docker compose -f docker-compose.yml -f 42-sage-wiki/docker-compose.offline.yml --profile sage-wiki build sage-wiki-ingester
```

期待結果:

- Online版とOffline版が同じapplication codeからimageを生成する。
- Offline版のbuild networkが`none`になる。

失敗基準:

- `42-sage-wiki/ingester/`外のapplication資材をbuild contextとして要求する。
- 型検査、unit testまたはimage buildに失敗する。

## CouchDB ingest

`40-obsidian`のCouchDB `obsidian` databaseを取り込み元とする。LiveSyncの非削除Markdown親documentを対象に、分割された本文を`children`順に復元し、`sources/`へMarkdown snapshotを生成する。hidden path、Markdown以外、空本文および`ix:`で始まるpathは取り込まない。

`run_on_start: true`により、常駐する`sage-wiki-ingester`が起動時に1回同期してからcronを登録する。手動同期は常駐processのHTTP APIへ要求し、cronと同じ直列queueおよびruntime statusを使用する。

```bash
# `.env`の設定値を現在のshellへexportする。
set -a
source .env
set +a

# 常駐IngesterへCouchDBの即時同期を要求する。
curl --fail-with-body --request POST \
  --header "Authorization: Bearer ${SAGE_WIKI_TOKEN}" \
  "http://${PUBLIC_HOST}:34201/api/sources/obsidian-couchdb/ingest"
```

`.env`の値はComposeがcontainerへ渡すが、shell変数としては自動exportされない。上記commandを実行するshellでは`PUBLIC_HOST`と`SAGE_WIKI_TOKEN`を事前にexportしなければならない（MUST）。正常に受け付けた場合はHTTP `202 Accepted`と`{"source":"obsidian-couchdb","state":"queued"}`を返す。

`docker compose run`は一時container、`docker compose exec ... node dist/main.js ingest ...`は別Node.js processを起動する。どちらも常駐processのqueueとWeb UI statusを経由しないため、運用上のmanual triggerに使用してはならない（MUST NOT）。serviceの再起動は`run_on_start`を再実行するが、manual triggerの代替として常用すべきではない（SHOULD NOT）。

期待結果:

- CouchDB由来のMarkdownが`sage-wiki-project` volumeの`sources/`へ保存される。
- Ingester statusが`queued`、`running`、`success`の順に遷移する。
- `sage-wiki`の内蔵workerが変更を検知し、生成Wikiとindexを更新する。

失敗基準:

- HTTP statusが`202`以外、またはCouchDBへの接続、credential、LiveSync documentの復元もしくはvolumeへの書込に失敗する。

## Ingester status

`http://${PUBLIC_HOST}:34201/`でIngesterの稼働状態、sourceごとのschedule、manual triggerを含む実行中または最終同期の結果とerrorを確認できる。各sourceの`Run now`を押すと、常駐processのqueueを使って即時同期する。初回は`SAGE_WIKI_TOKEN`を入力し、tokenは同じbrowser tabを閉じるまで保持される。画面は10秒ごとに自動更新する。機械可読な同じ状態は`/api/status`で公開する。

```bash
# Ingester status APIを確認する。
curl --fail "http://${PUBLIC_HOST}:34201/api/status"
```

期待結果:

- Ingesterと各sourceの状態がJSONで返る。
- CouchDB同期後は`documents`、`created`、`updated`、`unchanged`および`removed`件数が表示される。

失敗基準:

- HTTP statusが200以外、またはsourceの最終同期状態が`error`になる。

## 起動

```bash
# 専用Ingester imageをbuildし、CouchDB ingestを含むSage Wiki一式を起動する。
docker compose --profile sage-wiki up -d --build sage-wiki

# IngesterとSage Wikiの状態を確認する。
docker compose --profile sage-wiki ps sage-wiki-ingester sage-wiki
```

期待結果:

- `sage-wiki-ingester`と`sage-wiki`がhealthyになる。
- Ingesterのlogに起動時同期の完了が記録される。
- `http://${PUBLIC_HOST}:34201/`でIngester statusを表示できる。
- `http://${PUBLIC_HOST}:34200/?token=${SAGE_WIKI_TOKEN}`でWeb UIを表示できる。

失敗基準:

- 設定読込、source同期、named volumeへの書込またはHTTP healthcheckが失敗する。

## Sourceの追加とcompile

```bash
# Markdown sourceを共有volumeのsources directoryへ追加する。
docker compose cp ./example.md sage-wiki:/wiki/sources/example.md

# Wikiの状態を確認する。
docker compose exec sage-wiki sage-wiki status
```

内蔵compile workerは`sources/`の変更を監視して自動的に処理する。

期待結果:

- sourceが`sources/`へ保存される。
- compile後に`wiki/`と`.sage/wiki.db`が更新される。
- Web UIから記事、検索結果および知識graphを表示できる。

失敗基準:

- LiteLLMへ接続できない、model名が解決できない、またはsourceの解析に失敗する。

## Web UIでの閲覧

Sage WikiのWeb UIとAPIはBearer tokenで保護される。初回表示、新しいtabおよびpage再読込では、tokenをquery parameterへ付けたURLを使用しなければならない（MUST）。tokenなしの`http://${PUBLIC_HOST}:34200/`はHTML shellだけを返すが、Web UIが呼び出す`/api/tree`はHTTP `401 Unauthorized`となるため、sidebarとgraphが空に見える。

```text
http://${PUBLIC_HOST}:34200/?token=${SAGE_WIKI_TOKEN}
```

```bash
# Web UIが使用する認証済み記事treeを確認する。
curl --fail \
  --header "Authorization: Bearer ${SAGE_WIKI_TOKEN}" \
  "http://${PUBLIC_HOST}:34200/api/tree"
```

期待結果:

- sidebarへ`concepts`と`summaries`が表示される。
- graphへconcept nodeが表示され、記事を選択して本文を閲覧できる。
- `/api/tree`の`stats.concepts`と`stats.summaries`がともに1以上になる。

失敗基準:

- `/api/tree`がHTTP `401`を返す場合は、URLまたはAuthorization headerへtokenが指定されていない。
- `/api/tree`がHTTP `200`でも件数が0の場合は、`docker compose --profile sage-wiki logs sage-wiki`で知識コンパイルとLiteLLMのerrorを確認する。

## MCP

Sage WikiのMCPは常駐Web UIのSSE endpoint、またはcontainer内で起動するstdio transportを利用できる。stdio clientの設定例は次のとおり。

```json
{
  "mcpServers": {
    "sage-wiki": {
      "command": "docker",
      "args": [
        "exec",
        "-i",
        "inferlab-sage-wiki",
        "sage-wiki",
        "serve",
        "--transport",
        "stdio",
        "--project",
        "/wiki"
      ]
    }
  }
}
```

`inferlab`以外の`STACK_NAME`を使用する場合はcontainer名を`${STACK_NAME}-sage-wiki`へ読み替える。

## Rollback

```bash
# 永続dataを保持したままSage Wikiの常駐serviceを停止する。
docker compose --profile sage-wiki stop sage-wiki sage-wiki-ingester
```

停止後も`sage-wiki-project` volume内のsource、生成Wiki、indexおよび監査eventは保持される。

```bash
# Sage Wikiだけを初期化する場合に、停止済みproject volumeを削除する。
docker volume rm "${STACK_NAME}_sage-wiki-project"
```

volumeを削除するとsourceと生成済みWikiを復旧できない。削除前に必要なdataをbackupしなければならない（MUST）。

## References

- [Sage Wiki](https://github.com/xoai/sage-wiki)
- [Self-Hosted Server](https://github.com/xoai/sage-wiki/blob/v0.2.10/docs/guides/self-hosted-server.md)
- [Configuration](https://github.com/xoai/sage-wiki/blob/v0.2.10/docs/guides/configuration.md)

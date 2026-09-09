# Sage Wiki

Sage Wiki `v0.2.10`を、LLMによる知識コンパイル、検索、知識graph、Web UI、REST APIおよびMCP serverに使用する。`sage-wiki-ingester`が設定されたsourceを起動時とcronで同期し、状態確認用Web UIを公開する。`sage-wiki`の内蔵workerはsource変更を検知してcompileし、生成結果のWeb UI、APIおよびMCPを公開する。両serviceは`sage-wiki-project` named volumeを共有する。

LLM処理は既存のLiteLLMへOpenAI互換APIで接続する。生成modelには`openai/gpt-oss:20b`、embedding modelには`Qwen/Qwen3-Embedding:0.6B`を使用する。credentialの値はrepositoryへ保存せず、`LITELLM_MASTER_KEY`環境変数から取得する。

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

`run_on_start: true`により、常駐する`sage-wiki-ingester`が起動時に1回同期してからcronを登録する。手動で即時再同期する場合も同じserviceと設定を使用する。

```bash
# CouchDBから最新snapshotを再取得する。
docker compose --profile sage-wiki run --rm --no-deps sage-wiki-ingester node dist/main.js ingest obsidian-couchdb
```

期待結果:

- CouchDB由来のMarkdownが`sage-wiki-project` volumeの`sources/`へ保存される。
- `sage-wiki`の内蔵workerが変更を検知し、生成Wikiとindexを更新する。

失敗基準:

- CouchDBへの接続、credential、LiveSync documentの復元またはvolumeへの書込に失敗する。

## Ingester status

`http://${PUBLIC_HOST}:34201/`でIngesterの稼働状態、sourceごとのschedule、実行中または最終同期の結果とerrorを確認できる。画面は10秒ごとに自動更新する。機械可読な同じ状態は`/api/status`で公開する。

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

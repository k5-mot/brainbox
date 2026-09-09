# Sage Wiki

Sage Wiki `v0.2.10`を、LLMによる知識コンパイル、検索、知識graph、Web UI、REST APIおよびMCP serverに使用する。公式container imageを使用し、初回だけprojectを初期化する`sage-wiki-init`と、Web UIおよびcompile workerを提供する`sage-wiki`で構成する。両serviceは`sage-wiki-project` named volumeを共有する。

LLM処理は既存のLiteLLMへOpenAI互換APIで接続する。生成modelには`openai/gpt-oss:20b`、embedding modelには`Qwen/Qwen3-Embedding:0.6B`を使用する。credentialの値はrepositoryへ保存せず、`LITELLM_MASTER_KEY`環境変数から取得する。

## 設定

運用設定は[config.yaml](https://github.com/k5-mot/inferlab/blob/main/42-sage-wiki/config.yaml)に置く。設定を変更した場合はcontainerを再作成する。Web UIのBearer tokenは`.env`の`SAGE_WIKI_TOKEN`、DNS rebinding対策の許可hostは共通の`PUBLIC_HOST`から注入する。

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

## 起動

```bash
# 初期化serviceを完了させ、Sage Wikiを起動する。
docker compose --profile sage-wiki up -d sage-wiki

# 初期化結果と常駐serviceの状態を確認する。
docker compose --profile sage-wiki ps -a sage-wiki-init sage-wiki
```

期待結果:

- `sage-wiki-init`が終了code 0で完了する。
- `sage-wiki`がhealthyになる。
- `http://${PUBLIC_HOST}:34200/?token=${SAGE_WIKI_TOKEN}`でWeb UIを表示できる。

失敗基準:

- project初期化、設定読込、named volumeへの書込またはHTTP healthcheckが失敗する。

## Sourceの追加とcompile

```bash
# Markdown sourceを実行中containerのraw directoryへ追加する。
docker compose cp ./example.md sage-wiki:/wiki/raw/example.md

# 追加したsourceを明示的にcompileする。
docker compose exec sage-wiki sage-wiki compile

# Wikiの状態を確認する。
docker compose exec sage-wiki sage-wiki status
```

常駐するcompile workerはWeb UIまたはAPIから投入したcompile jobを処理する。手動compileは即時反映を確認するときに使用する。

期待結果:

- sourceが`raw/`へ保存される。
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
# 永続dataを保持したままSage Wikiを停止する。
docker compose --profile sage-wiki stop sage-wiki
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

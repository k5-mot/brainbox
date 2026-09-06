# 13-translate

LibreTranslate 1.9.6をセルフホストし、HTTP APIをhostのTCP port `31300`へ公開する。英語・日本語の翻訳modelはオンライン端末で事前取得し、air-gap serverの`/srv/libretranslate`からread-onlyでbind mountする。container起動後のmodel downloadは無効化している。

## Quick Start

```bash
# オンライン端末で英語・日本語の翻訳modelを取得する。
pwsh -NoProfile -File ./scripts/Download-LibreTranslate.ps1 -OutputDir /srv

# 取得済みmodelのchecksumを検証する。
cd /srv/libretranslate && sha256sum --check SHA256SUMS

# LibreTranslate APIを起動し、healthcheckの完了を待つ。
sudo docker compose --env-file .env --profile translate up -d --wait libretranslate

# APIのhealthを確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:31300/health"

# 利用可能な言語を確認する。
curl -fsS "http://${PUBLIC_HOST:-localhost}:31300/languages"

# 英語を日本語へ翻訳する。
curl -fsS -X POST "http://${PUBLIC_HOST:-localhost}:31300/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "Hello, world!",
    "source": "en",
    "target": "ja",
    "format": "text"
  }'

# 言語を自動判定して英語へ翻訳する。
curl -fsS -X POST "http://${PUBLIC_HOST:-localhost}:31300/translate" \
  -H "Content-Type: application/json" \
  -d '{
    "q": "こんにちは、世界！",
    "source": "auto",
    "target": "en",
    "format": "text"
  }'
```

期待結果:

- `/health`が`{"status":"ok"}`を返す。
- `/languages`が英語と日本語を含む配列を返す。
- `/translate`が`translatedText`を含むJSONを返す。

失敗条件:

- `/srv/libretranslate`に英語・日本語modelがなく、起動前検証でcontainerが停止する。
- 英語・日本語以外の言語を指定し、翻訳要求がerrorになる。
- hostのTCP port `31300`が別processに使用されている。

## Air-gap配置と検証

`Download-LibreTranslate.ps1`はDocker commandやuser profileのcacheを使用せず、HTTPで取得したmodelを`<OutputDir>/libretranslate`へ展開する。オンライン端末で取得したdirectoryを、閉域側の固定pathへ転送する。

```bash
# オンライン端末の取得済みmodelをair-gap serverへ転送する。
scp -r /srv/libretranslate <AIRGAP_USER>@<AIRGAP_HOST>:/srv/

# air-gap serverで取得済みmodelのchecksumを検証する。
cd /srv/libretranslate && sha256sum --check SHA256SUMS

# localにload済みの公式imageだけを使用し、buildとpullを行わずに起動する。
sudo docker compose --env-file .env --profile translate up -d --wait --no-build --pull never libretranslate

# 起動logにmodel取得処理が出ていないことを検証する。
! sudo docker compose --env-file .env --profile translate logs libretranslate \
  | grep -E "Updating language models|Downloading .+model|Downloading MiniSBD"

# 閉域起動後も翻訳APIが応答することを検証する。
curl -fsS -X POST "http://${PUBLIC_HOST:-localhost}:31300/translate" \
  -H "Content-Type: application/json" \
  -d '{"q":"Hello","source":"en","target":"ja","format":"text"}'
```

期待結果:

- checksum検証が成功する。
- `--pull never`かつ外部networkを遮断した状態でもcontainerがhealthyになる。
- 起動logにmodel更新またはdownloadがなく、翻訳結果が`translatedText`を含む。

失敗条件:

- model archiveまたはMiniSBD modelのchecksumが一致しない。
- bind mountした4つの必須model fileが不足し、containerが起動しない。
- 起動後にmodel配布元への接続を試行する。

## Open WebUI連携

`owui` profileでもLibreTranslateが起動する。Open WebUIはLibreTranslateの`/translate`をOpenAPI toolとして登録し、chatから翻訳APIを呼び出せる。LibreTranslateが公開するSwagger 2.0仕様ではOpen WebUIがrequest bodyを構築できないため、互換性のある最小OpenAPI 3仕様を`TOOL_SERVER_CONNECTIONS`へ設定している。

```bash
# Open WebUIとLibreTranslateを起動し、両serviceがhealthyになるまで待つ。
sudo docker compose --env-file .env --profile owui up -d --wait open-webui libretranslate

# Open WebUI containerからLibreTranslateのAPIへ接続できることを確認する。
sudo docker compose --env-file .env --profile owui exec open-webui \
  python -c "import urllib.request; urllib.request.urlopen('http://libretranslate:5000/health').read()"
```

期待結果:

- Open WebUIのtool一覧に`LibreTranslate`が表示される。
- Open WebUI containerから`http://libretranslate:5000/health`へ接続できる。

失敗条件:

- LibreTranslateがhealthyにならず、Open WebUIが起動待ちになる。
- Open WebUIの永続設定が環境変数より優先され、tool一覧へ反映されない。

## 停止とmodel更新

```bash
# LibreTranslateを停止する。
sudo docker compose --env-file .env --profile translate stop libretranslate

# modelを更新する場合は、オンライン端末で取得scriptを再実行する。
pwsh -NoProfile -File ./scripts/Download-LibreTranslate.ps1 -OutputDir /srv
```

閉域側の`/srv/libretranslate`を稼働中に直接更新してはならない（MUST NOT）。別directoryでchecksumを検証し、LibreTranslate停止後にdirectory単位で切り替える。

## References

- [LibreTranslate Documentation](https://docs.libretranslate.com/)
- [LibreTranslate API: Translate Text](https://docs.libretranslate.com/api/operations/translate/)
- [LibreTranslate Dockerfile](https://github.com/LibreTranslate/LibreTranslate/blob/v1.9.6/docker/Dockerfile)
- [Argos Translate Package Index](https://github.com/argosopentech/argospm-index)
- [MiniSBD v0.0.1](https://github.com/LibreTranslate/MiniSBD/releases/tag/v0.0.1)
- [Open WebUI: LibreTranslate Integration](https://docs.openwebui.com/tutorials/integrations/libre-translate/)

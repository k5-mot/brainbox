# 13-translate

LibreTranslate 1.9.6をセルフホストし、HTTP APIをhostのTCP port `31300`へ公開する。既定では英語と日本語のmodelだけを取得し、named volumeへ保存する。対象言語は`LIBRETRANSLATE_LOAD_ONLY`で変更できる。

## Quick Start

```bash
# LibreTranslate APIを起動し、初回model取得とhealthcheckの完了を待つ。
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

- 初回起動時にmodel配布元へ接続できず、containerがhealthyにならない。
- `LIBRETRANSLATE_LOAD_ONLY`にない言語を指定し、翻訳要求がerrorになる。
- hostのTCP port `31300`が別processに使用されている。

## Open WebUI連携

`owui` profileでもLibreTranslateが起動する。Open WebUIはLibreTranslateの`/spec`をOpenAPI toolとして読み込み、chatから翻訳APIを呼び出せる。

```bash
# Open WebUIとLibreTranslateを起動し、両serviceがhealthyになるまで待つ。
sudo docker compose --env-file .env --profile owui up -d --wait open-webui libretranslate

# Open WebUI containerからLibreTranslateのAPI仕様を取得できることを確認する。
sudo docker compose --env-file .env --profile owui exec open-webui \
  python -c "import urllib.request; urllib.request.urlopen('http://libretranslate:5000/spec').read()"
```

期待結果:

- Open WebUIのtool一覧に`LibreTranslate`が表示される。
- Open WebUI containerから`http://libretranslate:5000/spec`へ接続できる。

失敗条件:

- LibreTranslateがhealthyにならず、Open WebUIが起動待ちになる。
- Open WebUIの永続設定が環境変数より優先され、tool一覧へ反映されない。

## 停止とmodel再取得

```bash
# LibreTranslateを停止する。
sudo docker compose --env-file .env --profile translate stop libretranslate

# modelを再取得する場合だけ、停止後にmodel volumeを削除する。
sudo docker volume rm "${STACK_NAME}_libretranslate-models"
```

model volumeを削除すると、次回起動時にmodelを再取得する。閉域環境では事前取得済みvolumeを削除してはならない（MUST NOT）。

## References

- [LibreTranslate Documentation](https://docs.libretranslate.com/)
- [LibreTranslate API: Translate Text](https://docs.libretranslate.com/api/operations/translate/)
- [Open WebUI: LibreTranslate Integration](https://docs.openwebui.com/tutorials/integrations/libre-translate/)

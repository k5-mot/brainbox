# OIKB保守CLI

`oikb_sync.py`は、OIKB sourceの逐次同期とOpen WebUI Knowledge Base（KB）の停止file削除を行う。repository rootから実行する。

## 環境変数

CLIはrepository rootの`.env`を起動時に読み込む。processへ設定済みの環境変数は`.env`より優先される。API URLとcredentialはcommand line引数では受け取らず、次の環境変数から取得する。

```dotenv
OPEN_WEBUI_API_URL=http://localhost:32000
OPEN_WEBUI_API_KEY=<Open WebUI API key>
OIKB_API_URL=http://localhost:32001
OIKB_API_KEY=<OIKB API key>
OIKB_SOURCE_ORDER=nextcloud-documents,rustfs-documents
```

`OPEN_WEBUI_API_URL`と`OIKB_API_URL`を省略した場合は、上記のlocalhost URLを使用する。

## helpの表示

```bash
# 利用可能なsubcommandを表示する。
python3 scripts/oikb/oikb_sync.py --help

# triggerのoptionを表示する。
python3 scripts/oikb/oikb_sync.py trigger --help

# deleteのoptionを表示する。
python3 scripts/oikb/oikb_sync.py delete --help
```

期待結果:

- `trigger`と`delete`がsubcommandとして表示される。
- 両subcommandに`--dry-run`が表示される。

失敗条件:

- Python dependencyを読み込めず、helpを表示する前に終了する。

## 未同期fileの確認

`trigger --dry-run`は、`OIKB_SOURCE_ORDER`の各sourceについてOIKBの差分計算だけを実行する。追加または更新が必要なfileを`Unsynced OIKB file`としてlogへ記録し、Open WebUIは変更しない。

```bash
# 全sourceの未同期fileを変更せずに確認する。
python3 scripts/oikb/oikb_sync.py trigger --dry-run
```

期待結果:

- 未同期fileごとにsource名、`added`または`modified`、source内pathが表示される。
- OIKB healthのsource状態が`idle`へ戻る。
- Open WebUIのfileとKBは変更されない。

失敗条件:

- OIKB2 imageが古く、dry-run responseにfile詳細がない。
- OIKBがsource manifestまたはOpen WebUIとの差分を取得できない。

## KBの逐次同期

`trigger`は、`OIKB_SOURCE_ORDER`または繰り返し指定した`--source`の順でKBを1つずつ処理する。1 KBについて次をすべて確認してから、次のKBをtriggerする。

1. OIKBの同期が`success`で終了する。
2. OIKBのhistoryに今回の同期結果が保存される。
3. KB内の全fileが`completed`になる。
4. 今回のfileがKBへlinkされ、pending fileが0件になる。

```bash
# OIKB_SOURCE_ORDERの全KBを1回だけ逐次同期する。
python3 scripts/oikb/oikb_sync.py trigger
```

期待結果:

- 1 KBの全fileが`completed`になるまで次のKBはtriggerされない。
- OIKB Docker logに`OIKB2 processing file`と`OIKB2 registered file`がfileごとに同じ順で表示される。
- 全KBの完了後、CLIが終了code 0で終了する。

失敗条件:

- API key、source名、またはKnowledge IDが不正である。
- OIKB同期、Open WebUI file処理、KBへのlink、またはpending解消が失敗する。
- 対象KBのfileが`failed`になり、同じKBの次fileと後続KBを開始せず終了する。

継続実行が必要な場合だけ`--watch`を使用する。

```bash
# 全KBの完了後もOIKB_TRIGGER_INTERVAL_SECONDS間隔で同期を繰り返す。
python3 scripts/oikb/oikb_sync.py trigger --watch
```

## 停止fileの確認と削除

`delete`は全KBのfileを調査し、statusが`pending`または`failed`のfileだけを対象にする。`processing`と`completed`は削除しない。最初に`--dry-run`で対象を確認する。

```bash
# 全KBの削除候補を変更せずにlogへ記録する。
python3 scripts/oikb/oikb_sync.py delete --dry-run
```

期待結果:

- 対象fileごとにKnowledge ID、file ID、status、file名が表示される。
- `processing`と`completed`は表示されず、Open WebUIは変更されない。

失敗条件:

- Open WebUIまたはOIKBへ接続できない。
- API keyの権限不足により全fileまたはKnowledge IDを取得できない。

確認した対象を削除する。

```bash
# 全KBのpendingとfailed fileを削除する。
python3 scripts/oikb/oikb_sync.py delete
```

期待結果:

- dry-runと同じ選択条件のfileだけが削除される。
- file本体、Knowledge関連、関連vectorの削除完了がlogへ表示される。

失敗条件:

- dry-run後に対象のstatusが変化した。
- Open WebUIのfileまたはvector削除APIがerrorを返した。

削除したfileは復元できない。復旧が必要な場合は元sourceを保持した状態で`trigger`を再実行する。

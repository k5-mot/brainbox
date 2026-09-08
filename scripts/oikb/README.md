# OIKB保守スクリプト

このdirectoryには、Open WebUI Knowledge Baseのpending file確認、停止file削除、OIKB同期triggerを行うscriptを配置する。すべてrepository rootから実行する。

## 共通設定

各scriptはrepository rootの`.env`を起動時に読み込む。processへ設定済みの環境変数とcommand line optionは`.env`より優先される。

log messageは英語で出力する。terminal実行時はlog level名を色付きで表示し、`NO_COLOR`環境変数が設定されている場合はANSI colorを使用しない。

## pending file一覧の確認

`check_owui_pending.py`は、現在`pending`または`processing`のfileを一覧表示する。既定では更新から1時間以上経過したfileを`stuck`、それ以外を`pending`として分類する。`--stuck-after-seconds`で境界時間を変更でき、`--knowledge-id`を繰り返すと対象Knowledge Baseを限定できる。

```bash
# 全Knowledge Baseのpending fileをTSV形式で表示する。
python3 scripts/oikb/check_owui_pending.py
```

期待結果:

- `state`、`status`、経過秒数、Knowledge ID、file ID、file名が標準出力へ表示される。
- Open WebUIのfile、Knowledge関連、vectorは変更されない。

失敗条件:

- API keyが未設定でscriptが終了code 2を返す。
- Open WebUIまたはOIKBへ接続できず、scriptが終了code 1を返す。

## 処理停止fileの削除

`remove_owui_pending.py`は、Open WebUIで`pending`または`processing`のまま一定時間更新されていないfileを検出する。既定の判定時間は1時間で、`--min-age-seconds`で変更できる。Knowledge IDは`--knowledge-id`で明示でき、未指定時はOIKBのhealthと同期履歴から取得する。

既定ではdry-runになり、fileを削除しない。

```bash
# 1時間以上更新されていない処理停止fileを表示する。
python3 scripts/oikb/remove_owui_pending.py
```

期待結果:

- 処理停止fileのKnowledge ID、file ID、statusがwarning logへ出力される。
- Open WebUIのfile、Knowledge関連、vectorは変更されない。

失敗条件:

- API keyが未設定でscriptが終了code 2を返す。
- Open WebUIまたはOIKBへ接続できず、scriptが終了code 1を返す。

dry-run結果を確認した後、`--delete`を指定すると対象fileを削除する。

```bash
# dry-runで確認した処理停止fileと関連vectorを削除する。
python3 scripts/oikb/remove_owui_pending.py --delete
```

期待結果:

- 対象fileごとに削除完了logが出力される。
- Open WebUI APIがfile本体、Knowledge関連、関連vectorを削除する。

失敗条件:

- 削除権限がなくOpen WebUI APIがerrorを返す。
- 削除対象のstorageまたはvector cleanupに失敗する。

削除したfileは復元できない。rollbackが必要な場合は、元sourceを保持した状態でOIKB同期を再実行する。

## OIKB同期の定期trigger

`trigger_oikb_sync.py`は、`.env`の`OIKB_SOURCE_ORDER`または繰り返し指定した`--source`の順でsourceを1つずつ同期する。各sourceで次をすべて確認してから、次のsourceをtriggerする。

1. OIKBの今回の同期が`success`で終了する。
2. OIKBのhistoryに今回の同期結果が保存される。
3. 今回のOpen WebUI fileがすべて`completed`になる。
4. fileがKnowledge Baseへlinkされ、pending fileが0件になる。

OIKB内蔵schedulerが各sourceを並列起動しないよう、custom imageで内蔵schedulerを無効化している。OIKBのfile uploadはOpen WebUIのbackground処理を無効にし、1 fileのDocling解析、vector登録、Knowledge Baseへのlinkが完了してから次のfileを送信する。

```bash
# 外部scheduler専用のOIKB imageをbuildし、OIKBだけ再作成する。
sudo docker compose --env-file .env --profile owui up -d --build --no-deps oikb
```

期待結果:

- OIKBの`GET /health`が各sourceに`kb_id`と`idle`状態を返す。
- OIKBを再起動しても、scriptがtriggerするまでsource同期は始まらない。

失敗条件:

- OIKBのhealth responseに`kb_id`がなく、scriptがimageの再buildを求めて終了する。

実行間隔は`OIKB_TRIGGER_INTERVAL_SECONDS`または`--interval-seconds`で変更できる。

```bash
# OIKB_SOURCE_ORDERの順に同期し、全source完了後に1時間待つ。
python3 scripts/oikb/trigger_oikb_sync.py
```

期待結果:

- sourceごとにOIKB trigger、Open WebUI登録完了のlogが指定順で出力される。
- OIKB同期待機中は、現在処理中のfile名が最大60秒間隔でlogへ出力される。
- 全sourceの完了後から3600秒後に次の周期が始まる。

失敗条件:

- OIKB API keyまたはOpen WebUI API keyが未設定でscriptが終了code 2を返す。
- OIKB同期、Open WebUI file処理、link、またはpending解消が失敗すると、後続sourceをtriggerせず次周期まで待つ。
- 同期前から対象Knowledge Baseにpending fileがある場合は、前回処理と混同しないよう失敗する。

動作確認では`--once`を指定し、1周期だけ実行できる。

```bash
# OIKB_SOURCE_ORDERの全sourceを1回だけ逐次同期する。
python3 scripts/oikb/trigger_oikb_sync.py --once
```

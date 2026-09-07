# Inferlab

Inferlabは、社内向けLLM基盤と周辺サービスを組み合わせて、知識管理、推論、開発支援の運用環境を構成するための文脈である。

## Language

**設定源**:
システムの動作設定を宣言的に管理する単一の入口。credential本体は含めず、secret storeまたは環境変数への参照だけを持つ。
_Avoid_: 設定ファイル, config, 環境変数設定

**現行仕様**:
すべてのprofileについて、利用者または運用者から観測可能な能力と期待結果を定めるOpenSpecのmain specs。内部実装の詳細は含めない。
_Avoid_: OpenSpec Document, 実装仕様, 変更提案

**仕様サイト**:
現行仕様と変更履歴を表示する`OpenSpec`と、運用manual、troubleshooting、project rule、READMEを表示する`Docs`を分離した公開物。
_Avoid_: OpenSpec HTML, ドキュメントサイト, Docusaurus

**profile仕様**:
1つのDocker Compose profileの起動条件、提供能力、依存関係、公開endpoint、health判定を定める現行仕様。
_Avoid_: service仕様, stack仕様

**共有platform**:
すべてのprofileに適用するnetwork、命名、secret参照、resource制限、profile間連携の横断要件。個別profileの能力は含めない。
_Avoid_: common profile, 共通service, 共通設定

**知識コンパイル**:
llm-wiki-compilerが`sources/`の変更をもとに、引用追跡可能なpage、link、metadataを`wiki/`へ増分生成する処理。取り込みとは独立した周期で実行できる。
_Avoid_: compile, 再生成, Wiki生成

**取り込み**:
URLまたはfileをllm-wiki-compilerの`sources/` Input Contractへ変換し、`sources/`へ保存するまでの処理。知識コンパイルとviewer更新は含めない。Source System固有の処理は独立producerが所有する。
_Avoid_: ingest, クロール, 同期

**閲覧**:
llm-wiki-compilerが生成した`wiki/`を内蔵read-only viewerで検索、参照、graph表示する処理。Wiki内容の編集、外部Wikiへの転記、Source Systemへの書き戻しは含めない。
_Avoid_: viewer, publish, 公開

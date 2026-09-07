# Docling資材外部配置の設計

## Context

Docling ServeはHugging Face model、layout/OCR artifactおよびTesseract dataを必要とします。Container内cacheへ保存すると再作成時に失われ、user profile側cacheへ保存すると容量制限の影響を受けます。

## Goals / Non-Goals

- 閉域搬入前に必要資材を確定し、実行時downloadを発生させません。
- imageとmodel資材の更新cycleを分離します。
- 任意のOCR engineやVLMを既定で全て同梱することは目的にしません。

## Decisions

- Docling modelはhostの`/srv/docling`、Tesseract dataはその配下の専用directoryへ事前配置します。
- Containerには資材をread-onlyでmountし、Hugging FaceとTransformersをoffline modeにします。
- 起動時にmodelをloadして、不足または非互換な資材をhealth判定前に検出します。
- 日本語文書向けに英語、日本語、日本語縦書き、orientation/script detectionのtraineddataを固定revisionから取得します。

## Risks / Trade-offs

read-only mountは実行時の自己修復downloadを許さないため、資材不足が即座に起動失敗として現れます。一方、閉域運用で暗黙のnetwork依存を残しません。

## References

- [Docling bind mount調査](research.md)

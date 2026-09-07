# Dify plugin閉域実行の設計

## Context

Dify plugin daemonはplugin本体に加えてPython packageを動的に解決します。外部endpointの無効化だけでは、package registryへのegressや利用者が指定する任意URLを制限できません。

## Goals / Non-Goals

- 固定したpluginと依存packageだけで閉域起動できる状態を作ります。
- packageの真正性と再現性を検証可能にします。
- Compose単体で任意のInternet宛先を完全に遮断することは目的にしません。

## Decisions

- 署名付きのOpenAI-compatible pluginを固定し、packageとrequirementsのchecksumをlock fileで検証します。
- Python依存packageは事前取得し、plugin daemonから内部`pypiserver`だけを参照します。
- Marketplace、telemetry、remote templateなどの外部endpointを無効化し、network境界でもInternet egressを拒否します。
- LiteLLMは内部OpenAI-compatible endpointとして接続します。

## Risks / Trade-offs

plugin更新時はpackage、requirements、checksumをまとめて更新する必要があります。内部package indexは再現性を高めますが、workflowが指定する接続先の安全性は別途network policyで担保します。

## References

- [Dify Air-gap Plugin調査](research.md)

# 仕様サイトのlocal確認

OpenSpecを正規本文とし、ADR、運用文書、調査記録、rule、READMEをDocusaurusでHTML化します。

## Quick Start

```bash
# repositoryで固定したdependencyを導入する。
pnpm install --frozen-lockfile

# OpenSpecのstrict validationとproduction buildを実行する。
pnpm docs:validate

# local preview serverを起動する。
pnpm docs:start
```

期待結果:

- `pnpm docs:validate`が`docs-site/build`へ静的siteを生成します。
- `pnpm docs:start`の表示URLから現行仕様と補足文書を参照できます。

失敗条件:

- OpenSpec構造、MDX構文またはsidebarの参照先が不正な場合、buildは非zeroで終了します。

## 公開先の確認

```bash
# GitHub project Pages相当のpathでproduction buildする。
DOCUSAURUS_SITE_URL="https://example.github.io/inferlab/" pnpm docs:build
```

期待結果:

- assetとnavigationのURLが`/inferlab/`配下になります。

rollback:

- Pages workflowを無効化し、最後に成功したPages deploymentを再実行します。正規本文はrepositoryに残るため、HTML artifactを削除しても失われません。

## References

- [Docusaurus: Deployment](https://docusaurus.io/docs/deployment)

# 仕様サイトの公開

## Why

Repository内のOpenSpecをprofile横断で閲覧でき、GitHubとGitLabの双方から公開できるHTML入口が必要でした。

## What Changed

- Docusaurusで正規Markdownから静的siteを生成しました。
- Pull RequestとMerge Requestでvalidationとbuildを実行するCIを追加しました。
- `main`からGitHub PagesおよびGitLab Pagesへ公開するpipelineを追加しました。

## Current Contract

現行契約は[仕様サイト仕様](../../../specs/specification-site/spec.md)、local確認手順はrepositoryの`docs-site/README.md`を参照してください。

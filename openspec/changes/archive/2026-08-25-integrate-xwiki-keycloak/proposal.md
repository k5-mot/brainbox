# XWikiとKeycloakのOIDC連携

## Why

XWikiのlocal管理者による初期化と復旧経路を維持しながら、利用者認証を既存Keycloak `prod` realmへ統合する必要がありました。

## What Changed

- XWiki OIDC Authenticatorを利用する認証経路を定義しました。
- 公開URL基準のissuer、callback、logout設定を追加しました。
- OIDC障害時にlocal認証へ戻せるrollback経路を残しました。

## Current Contract

現行契約は[profile-xwiki仕様](../../../specs/profile-xwiki/spec.md)、導入手順は[31-xwiki README](/docs/xwiki/)を参照してください。extensionとclaimの検討内容は[調査記録](research.md)に保存します。

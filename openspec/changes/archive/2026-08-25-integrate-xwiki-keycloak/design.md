# XWiki Keycloak OIDC連携の設計

## Context

XWikiのOIDC Authenticatorは初期distributionへ含まれず、Web installer完了後にextensionを導入する必要があります。OIDC endpointはbrowserとcontainerの双方から到達でき、tokenのissuerと完全一致する公開URLでなければなりません。

## Goals / Non-Goals

- Keycloak `prod` realmをXWikiの認証元として利用します。
- 初期化と障害復旧用のlocal管理者経路を保持します。
- XWikiの初回Web installerをOIDCで置き換えることは目的にしません。

## Decisions

- XWikiをlocal管理者で初期化した後にOIDC Authenticator extensionを導入します。
- Confidential clientのAuthorization Code Flowを使用し、callback URLを厳密に登録します。
- issuer、authorization、token、userinfo、logoutにはbrowserとcontainerから到達可能なKeycloak公開URLを使用します。
- client secretは環境から注入し、local認証をrollback経路として維持します。

## Risks / Trade-offs

公開host名の名前解決がcontainer内外で異なるとissuer検証に失敗します。OIDCを先に強制すると初期化不能になるため、extension導入とlogin検証を段階的に行います。

## References

- [XWiki Keycloak OIDC調査](research.md)

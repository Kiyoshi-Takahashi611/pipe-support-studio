# 独自ドメインと運営管理連携

- 本番：`https://pipe-support.mebiteq.jp/`
- 運営管理：`https://portal.mebiteq.jp/apps/pipesupport`
- AWSリージョン：`ap-northeast-1`、スタック：`pipe-support-studio`
- 認証プール：`ap-northeast-1_grpoFjd7d`（専用、スタック所有）
- 運営ポータル：`PipesupportUserPoolId` / `PIPESUPPORT_USER_POOL_ID` を専用プールに一致させる。
- `USER#<email>/APP#pipesupport` の有効な所属を必要とする。未確認メール・別クライアント・別アプリの所属を採用しない。
- 会社 "1" の扱い、会社・契約停止の規則はポータルの共通 `membership.py` に従う。
- APIのIAMは `mebiteq-portal-data` のGetItemだけを許可。案件・利用者の作成は行わない。

## DNSと証明書

DNSはMicrosoft 365管理センターの `mebiteq.jp` で管理する。

| 種別 | ホスト名（mebiteq.jp内） | 値 |
| --- | --- | --- |
| CNAME | `pipe-support` | スタック出力 `CloudFrontDomain` |
| CNAME | `_cb05807cda3a234fab46e8b122df04ee.pipe-support` | `_a6a4ca91e4af05d2421c2d63b3e69e5c.wzccmgtwzk.acm-validations.aws` |

証明書はus-east-1の `arn:aws:acm:us-east-1:150103291047:certificate/3cb973d3-e023-4b64-a47f-efd3692b873d`。確認用CNAMEは自動更新にも使うので残す。既存の会社サイト・メール用レコードは変更しない。

スタックを更新するときは、現在の `CustomDomainName` と `AcmCertificateArn` を保持する。新規作成時の空の既定値へ戻さない。

旧Sitesは本人限定の移行確認用。公開先の主系はAWS。本番URLのログインを迂回するためにSites側の公開範囲を広げない。旧サイトを変更する場合だけSitesスキルの手順を使用する。

## 確認事項

1. DNSのCNAME、証明書のISSUED、CloudFrontのDeployedを確認する。
2. APIはトークンなし・偽トークンで401、有効トークンでも未登録・停止時は403を返す。
3. 新規利用者の招待、初回パスワード設定、所属照会、計算画面を確認する。
4. 30秒周期の照会と、タブに戻ったときの照会で停止・権限変更を確認する。
5. `version.json` のcommitがGitHubの反映対象と一致することを確認する。

不具合時は前のGitコミットからAWS版を再ビルドして配信する。所属チェックを外す切戻しは行わない。

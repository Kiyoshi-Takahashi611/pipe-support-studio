# 配管サポート構造計算 / SUPPORT STUDIO

運営管理と連携する本番URL：<https://pipe-support.mebiteq.jp/>

会社・利用者・席数・利用停止は [運営管理ポータル](https://portal.mebiteq.jp/apps/pipesupport) の「配管サポート構造計算アプリ」で設定します。アプリIDは `pipesupport`。専用のログインなので、ほかのMTQアプリとはパスワードが別です。

計算はブラウザー内で実行します。新しいログインは運営が招待し、初回に本人がパスワードを設定します。自己登録はありません。利用者・会社・契約の停止をAPIで確認し、開いている画面は通常30秒ごとの照会で停止を反映します。通信失敗時も利用を保留します。

案件は会社・利用者別のブラウザー保存とJSONファイルです。サーバーへの案件保存・会社内共有は行いません。ブラウザーを閉じる前に「データ保存」でJSONを保存してください。旧ChatGPT側URLの保存データはドメイン間で自動移行しません。旧画面でJSONを保存して新画面で「読込」を使います。

計算コードは公開GitHubにあり、ブラウザーで計算するため、利用停止は配信済みコードやダウンロード済みの計算書を回収する仕組みではありません。

## 開発と反映

- `dist/`：既存の計算アプリ。Sitesでの本人限定版もこのソースを使用。
- `web/`：AWS版のログイン・所属照会・アカウント表示。
- `server/`：`GET /me`。Cognitoの本人確認とポータル所属照会。
- `infrastructure/template.json`：AWS専用プール・API・S3・CloudFront・GitHub更新ロール。
- `skills/pipe-support-maintenance/`：保守スキル。

```sh
node --test test-*.mjs
python -m pytest -q server/test_access.py
node scripts/build-aws.mjs
```

Pythonテストはpytest・boto3・moto[dynamodb]が必要です。モックを使用し、本番の所属情報を書き換えません。`build-aws.mjs --test` は表示確認用の接続先で作成するため、本番へアップロードしないでください。

本番スタックは東京リージョンの `pipe-support-studio`。GitHubの `main` に計算・画面の変更をpushすると、`deploy-aws.yml` が検証・ビルド・配信と先頭コミットの照合を行います。リポジトリ変数 `AWS_DEPLOY_ROLE_ARN` にはスタックの同名出力を設定します。長期アクセスキーは登録しません。

API変更時は `python scripts/package-api.py` で作成した `build/access.zip` をスタック出力 `AccessFunctionName` にアップロードし、関数更新完了と401/403を検証します。フロント用GitHubロールにはAPI・IAMの更新権限はありません。

DNS・接続構成は [運用メモ](docs/production.md) を参照してください。

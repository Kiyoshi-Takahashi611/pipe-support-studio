# このプロジェクトの作業ルール

- アプリを修正したら、必要な検証とサイトへの反映を行い、変更をコミットして GitHub にもプッシュする。ユーザーからその作業について別の指示がある場合は、その指示を優先する。
- GitHub の保存先は `https://github.com/Kiyoshi-Takahashi611/pipe-support-studio`。通常の反映先は `main`、リモート名は `github`。
- 本番は `https://pipe-support.mebiteq.jp/` のAWS版。`dist/` の計算ソースと `web/` のログインを `scripts/build-aws.mjs` で組み合わせる。GitHubのmainへの画面・計算変更のpushは `deploy-aws.yml` で本番へ反映する。実行結果と本番 `version.json` を確認する。API変更は別途Lambdaコードを更新する（README参照）。
- 既存Sitesは本人限定の移行確認用。Sites側も変更する依頼の場合は既存のSitesワークフローを使い、そのワークフローが確定したソースのコミットをGitHubにも反映する。本番の運営ポータル認証を迂回するためにSitesの公開範囲を広げない。
- プッシュ後は GitHub のブランチ先頭が反映対象のコミットと一致することを確認する。失敗した場合は未反映であることを報告する。強制プッシュで他の変更を上書きしない。
- GitHub リポジトリはユーザーの指定により公開とする。認証情報や実案件の保存データをコミットしない。Webアプリの共有範囲は別の設定なので、リポジトリ公開を理由に変更しない。

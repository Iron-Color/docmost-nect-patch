# Docmost Nect Patch

Docmost Community Editionへ、複数のユーザー所有スペースと共有機能を
追加した非公式コミュニティ派生版です。

> [!IMPORTANT]
> このプロジェクトはDocmost公式製品ではなく、Docmost, Inc.による
> サポートや承認を受けたものではありません。
> 元プロジェクトは[docmost/docmost](https://github.com/docmost/docmost)です。

[最新リリース](https://github.com/Iron-Color/docmost-nect-patch/releases/latest) |
[Dockerイメージ](https://github.com/users/Iron-Color/packages/container/package/docmost-nect-patch) |
[変更内容](NOTICE.md) |
[ライセンス](LICENSE)

## この派生版で追加した機能

| 機能                       | 内容                                                                                 |
| -------------------------- | ------------------------------------------------------------------------------------ |
| 複数のユーザー所有スペース | 管理者以外のワークスペースメンバーも複数作成できます                                 |
| メンバー共有               | 既存のスペース権限を使って、ほかのメンバーやグループを招待できます                   |
| 所有者の保護               | 作成者をスペースから削除したり、管理権限を外したりできません                         |
| ソースコード表示           | ログイン画面や公開共有ページを含む全画面から、稼働中バージョンのソースへ移動できます |
| 再現可能なリリース         | Dockerイメージ、Gitタグ、ソースコミットを同じSHAへ固定します                         |
| 秘密情報検査               | プッシュとPull RequestのたびにGitleaksを実行します                                   |
| Discord限定登録            | サーバーと複数ロールのOR/AND条件をOAuthで確認してアカウントを作成できます            |

リアルタイム共同編集、Draw.io、Excalidraw、Mermaid、通常スペース、
検索、履歴、コメントなど、Docmost Community Edition本来の機能も利用できます。

## 現在のリリース

- バージョン: [v0.95.0-nect.3](https://github.com/Iron-Color/docmost-nect-patch/releases/tag/v0.95.0-nect.3)
- Dockerイメージ: ghcr.io/iron-color/docmost-nect-patch:v0.95.0-nect.3
- 対応CPU: linux/amd64、linux/arm64
- ベースにした公式コミット: [5b854645](https://github.com/docmost/docmost/commit/5b854645615026d642c5e1735a3eafc59a3211f2)

本番環境では、タグよりも次の固定ダイジェストを推奨します。

    ghcr.io/iron-color/docmost-nect-patch@sha256:01f59b46eec640a9ed9a996f685026f2882085a82c1680477a460fe50f83f7cf

## 既存環境への導入

既存のデータベースと添付ファイル用Volumeを維持し、docmostサービスの
イメージだけを上記イメージへ変更します。データベース変更は起動時に
自動適用されます。

バックアップを含む手順は[既存環境への導入ガイド](docs/DEPLOYMENT.md)を
参照してください。

Discord限定登録の設定は[Discord OAuth登録ガイド](docs/DISCORD_REGISTRATION.md)を
参照してください。Discord Botは不要です。

## 公式Docmostの更新について

公式更新は、公開された瞬間に本番環境へ自動適用されるわけではありません。
このリポジトリでは毎日公式のmainブランチを確認し、更新がある場合は
同期用Pull Requestを自動作成します。

Pull Requestに対して競合解消、ビルド、テストを行い、安全を確認してから
mainへ反映して新しいDockerイメージをリリースします。この方式なら公式更新を
早く取り込める一方、独自機能が壊れた状態で自動配布されることを防げます。

詳しくは[公式更新の取り込み手順](docs/UPSTREAM_SYNC.md)を参照してください。

## 開発

ローカルリポジトリでは次のリモート構成を使用します。

    origin    https://github.com/Iron-Color/docmost-nect-patch.git
    upstream  https://github.com/docmost/docmost.git

基本的なビルドおよびテスト:

    corepack pnpm install
    corepack pnpm --filter @docmost/editor-ext run build
    corepack pnpm --filter ./apps/server run build
    corepack pnpm --filter ./apps/client run build
    corepack pnpm --filter ./apps/server run test --runInBand

## ライセンス

Docmost coreと、この派生版で追加したコードはGNU Affero General Public
License v3の対象です。元のLICENSEは変更せず維持しています。

apps/server/src/ee、apps/client/src/ee、packages/eeにある公式Enterprise
Editionのファイルには、それぞれのDocmost Enterprise Licenseが適用されます。
詳細は[NOTICE.md](NOTICE.md)と各ディレクトリのライセンスを確認してください。

## 免責

これは初期リリースです。本番更新前にPostgreSQLと添付ファイルを
必ずバックアップしてください。不具合報告は
[このリポジトリのIssues](https://github.com/Iron-Color/docmost-nect-patch/issues)
へお願いします。

# 既存Docmost環境への導入

この手順は、Docker Composeで稼働しているDocmost Community Editionを
Docmost Nect Patchへ更新する場合を対象にしています。

対象リリースは[v0.96.0-nect.2](https://github.com/Iron-Color/docmost-nect-patch/releases/tag/v0.96.0-nect.2)です。
公式Docmost v0.96.0と、ページ内のOpenAPIドキュメント表示を含みます。
v0.96.0-nect.1で発生したDB移行順序エラーを修正しています。

## 1. バックアップ

既存のdocker-compose.ymlがあるフォルダで実行します。

    docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > docmost-before-update.sql
    docker compose cp docmost:/app/data/storage ./docmost-storage-backup

## 2. イメージの変更

docmostサービスのimageを次の固定ダイジェストへ変更します。

    services:
      docmost:
        image: ghcr.io/iron-color/docmost-nect-patch@sha256:4044abc67a637e4bbc049003863859e18ffce0d574fe510675f63164421a9b69

db、redis、volumes、APP_SECRET、データベースのパスワードは変更しません。
docmostサービスにbuild設定がある場合は削除します。

## 3. 更新

    docker compose pull docmost
    docker compose up -d --no-deps docmost
    docker compose ps
    docker compose logs --tail=100 docmost

起動時に未適用のデータベース変更が自動適用されます。v0.95.0-nect.3からの
更新では、公式v0.96.0の公開スペース用テーブルとSIEM用テーブル・列が追加されます。
初めてこの派生版を導入する場合は、is_user_owned列、Discord登録用テーブルと
索引も追加されます。
既存のスペースの種類、ページ、ユーザー、権限、添付ファイルは維持されます。
適用済みの移行履歴は保持したまま、未適用の更新だけを実行します。
移行ファイルの名前変更や、DBの移行履歴の削除は不要です。

更新後、一般ユーザーでログインし、Spaces画面にCreate personal spaceが
表示されることを確認してください。
ページ内で`/openapi`を選択し、JSON／YAMLの仕様を保存して表示できることも
確認してください。詳しくは[OpenAPIドキュメントガイド](OPENAPI.md)を参照してください。

## ロールバック

旧版はOpenAPIブロックに対応していないため、新しいブロックを含むページを
旧版で編集しないでください。旧イメージへの切り替えだけで元に戻ることは保証されません。
復旧が必要な場合は書き込みを停止し、更新前のデータベースと添付ファイルの
バックアップを以前のイメージと組み合わせて復元します。更新後の変更は
バックアップに含まれないため、必要なデータを別途保存してから復元してください。

データ用Volumeを削除するため、docker compose down -vは実行しないでください。

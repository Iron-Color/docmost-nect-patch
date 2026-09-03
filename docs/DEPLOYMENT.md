# 既存Docmost環境への導入

この手順は、Docker Composeで稼働しているDocmost Community Editionを
Docmost Nect Patchへ更新する場合を対象にしています。

## 1. バックアップ

既存のdocker-compose.ymlがあるフォルダで実行します。

    docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB"' > docmost-before-update.sql
    docker compose cp docmost:/app/data/storage ./docmost-storage-backup

## 2. イメージの変更

docmostサービスのimageを次の固定ダイジェストへ変更します。

    services:
      docmost:
        image: ghcr.io/iron-color/docmost-nect-patch@sha256:ef8c82b0371814fd769fa2517d9d85024301a22b2537ece678fd9ecf134995a0

db、redis、volumes、APP_SECRET、データベースのパスワードは変更しません。
docmostサービスにbuild設定がある場合は削除します。

## 3. 更新

    docker compose pull docmost
    docker compose up -d
    docker compose ps
    docker compose logs --tail=100 docmost

起動時にis_user_owned列と索引が自動追加されます。既存のスペースは通常スペースの
ままで、ページ、ユーザー、権限、添付ファイルは維持されます。

更新後、一般ユーザーでログインし、Spaces画面にCreate personal spaceが
表示されることを確認してください。

## ロールバック

問題が発生した場合はimageを以前使用していたDocmostイメージへ戻し、
再度docker compose up -dを実行します。追加されたデータベース列は旧版から
参照されないため、そのまま残して構いません。

データ用Volumeを削除するため、docker compose down -vは実行しないでください。


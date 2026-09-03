# 公式Docmost更新の取り込み

この派生版は公式リポジトリの履歴を維持しているため、公式mainブランチの更新を
通常のGitマージとして取り込めます。

## 自動確認

Sync upstream Workflowが毎日公式mainを確認します。

- 更新がない場合は何もしません。
- 競合せず取り込める場合はautomation/sync-upstreamブランチを更新し、
  main向けのPull Requestを作成します。
- 競合した場合はWorkflowが失敗し、自動でmainを書き換えません。
- Pull Requestを自動マージしたり、Dockerイメージを自動リリースしたりはしません。

GitHubのSettings、Actions、GeneralでAllow GitHub Actions to create and
approve pull requestsを有効にしてください。

## 手動で取り込む場合

    git switch main
    git pull --ff-only origin main
    git fetch upstream
    git switch -c chore/sync-upstream-YYYYMMDD
    git merge upstream/main

競合が発生した場合は、特に次の領域を確認してください。

- apps/server/src/core/space
- apps/client/src/features/space
- apps/client/src/pages/spaces
- apps/client/src/components/layouts/global
- apps/server/src/database/migrations
- Dockerfileと.github/workflows

## 検証

    corepack pnpm install
    corepack pnpm --filter @docmost/editor-ext run build
    corepack pnpm --filter ./apps/server run build
    corepack pnpm --filter ./apps/client run build
    corepack pnpm --filter ./apps/server run test --runInBand

検証後、同期ブランチをoriginへプッシュしてPull Requestを作成します。
mainへマージしただけでは既存サーバーは更新されません。新しいリリースタグから
Dockerイメージを作成し、導入先のcompose設定を新しいダイジェストへ更新します。

## なぜ即時自動反映しないのか

公式更新がスペース、権限、データベース構造を変更した場合、この派生版の
ユーザー所有スペースと競合する可能性があります。Pull Requestで差分とテストを
確認してから反映することで、データを守りながら更新速度を維持します。


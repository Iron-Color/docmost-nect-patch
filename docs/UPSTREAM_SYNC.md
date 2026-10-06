# 公式Docmost更新の取り込み

この派生版は公式リポジトリの履歴を維持しているため、公式リリースの更新を
通常のGitマージとして取り込めます。自動同期の対象は最新の正式リリースです。

## 自動確認

Sync upstream Workflowが毎日公式の最新正式リリースを確認します。
開発中のmainブランチやプレリリースは自動同期しません。

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
    git fetch upstream tag v0.96.0
    git switch -c chore/sync-upstream-YYYYMMDD
    git merge v0.96.0

`v0.96.0`は取り込む正式リリースのタグへ置き換えます。

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

### データベース移行の互換性

公式版と派生版では移行ファイルの追加順が異なるため、起動時と移行CLIは
未適用の移行だけをファイル名順に実行します。適用済みの移行名と履歴は保持し、
名前の変更や履歴の削除で順序を合わせないでください。適用済みファイルが
欠けている場合は引き続きエラーになります。

CIでは使い捨てのPostgreSQL 18上で、公式v0.96.0、v0.95派生版、空のDBから
現在の移行一式を実行し、既存のページ・所有者属性・履歴が維持されることと、
再起動時に重複実行されないことを確認します。新しい移行を追加するときも、
これらの導入経路で依存関係に問題がないか確認してください。

## なぜ即時自動反映しないのか

公式更新がスペース、権限、データベース構造を変更した場合、この派生版の
ユーザー所有スペースと競合する可能性があります。Pull Requestで差分とテストを
確認してから反映することで、データを守りながら更新速度を維持します。


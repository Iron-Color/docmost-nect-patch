# Discord OAuth限定アカウント登録

Discord Botを使わず、Discord OAuthでサーバー所属とロールを確認してから
Docmostアカウントを作成できます。管理者は複数の「DiscordサーバーID＋ロールID」
を登録でき、いずれかの条件に一致した人だけが登録できます。

## 1. Discord Applicationを作成

1. [Discord Developer Portal](https://discord.com/developers/applications)で
   New Applicationを選びます。
2. OAuth2画面でClient IDとClient Secretを確認します。
3. Redirectsへ、Docmostの管理画面に表示される「Discord OAuthコールバックURL」を
   文字列が完全に一致するよう登録します。

通常は次の形式です。

    https://docmost.example.com/api/auth/discord-registration/callback

Botの作成やサーバーへのBot追加は必要ありません。

## 2. Docmostへ認証情報を設定

Docmostコンテナの環境変数へ次を追加します。

    DISCORD_OAUTH_CLIENT_ID=DiscordのClient ID
    DISCORD_OAUTH_CLIENT_SECRET=DiscordのClient Secret

`APP_URL`は、利用者がブラウザで開くHTTPSのDocmost URLにしてください。変更後は
Docmostコンテナを再作成します。

    docker compose up -d --force-recreate docmost

Client SecretはGitへコミットせず、サーバーの`.env`やシークレット管理機能にだけ
保存してください。

## 3. 許可条件を登録

Docmostへ管理者またはオーナーでログインし、設定の「Discord登録」を開きます。
表示名、DiscordサーバーID、DiscordロールIDを入力して許可設定を追加します。

DiscordのIDは、Discordのユーザー設定で開発者モードを有効にした後、対象の
サーバーまたはロールを右クリックして「IDをコピー」で取得できます。

- 同じサーバーの複数ロールを許可する場合は、ロールごとに設定を追加します。
- 複数サーバーを許可する場合も、サーバーとロールの組を追加します。
- 登録条件はORです。どれか1つに一致すれば登録できます。
- 許可設定をすべて削除すると、Discordからの新規登録は停止します。

## 4. 登録を確認

ログイン画面に「Discordでアカウントを作成」が表示されます。利用者がDiscordで
認証すると、`identify`、`email`、`guilds.members.read`の権限を使い、サーバー所属と
ロールを確認します。

条件を満たす場合だけ名前とパスワードの設定画面へ進みます。メールアドレスは
Discordで確認済みのアドレスを使用し、作成されるDocmostユーザーは通常メンバーに
固定されます。

## セキュリティ仕様

- OAuthのstateと登録トークンは暗号学的乱数で生成します。
- データベースにはトークン本体ではなくSHA-256ハッシュだけを保存します。
- 登録手続きは10分で失効し、1回だけ使用できます。
- 1つのDiscordアカウントから作成できるDocmostアカウントは、ワークスペースごとに
  1つです。
- Discord側で確認済みのメールアドレスが必要です。
- OAuth開始、確認、登録APIには試行回数制限があります。

この機能は登録時点の所属を確認します。Discordから脱退した人やロールを失った人の
既存Docmostアカウントを自動停止する機能は含まれていません。

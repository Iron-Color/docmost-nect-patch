# ページ内にOpenAPIのドキュメントを表示する

ページにAPI仕様を貼り付け、エンドポイント、引数、リクエスト本文、レスポンス例、
スキーマをSwagger UIで閲覧できます。

## 使い方

1. 編集可能なページで `/openapi` を入力し、**OpenAPI**を選択します。
2. ブロックの**仕様を追加**をクリックします。
3. OpenAPIのJSONまたはYAMLを貼り付け、**保存**をクリックします。
4. APIの行を開くと、引数やレスポンスの説明を確認できます。

更新時は**仕様を編集**を使います。キャンセルすると保存前の内容を維持します。
編集中に他の人が同じ仕様を更新した場合は上書きを止めるため、編集画面を
開き直して最新の内容を確認してください。

## 対応範囲

- OpenAPI 3.0 / 3.1 / 3.2、Swagger 2.0
- JSON / YAML、1ブロック512 KBまで
- `#/components/schemas/...` など同じ仕様内の参照
- 元の仕様をページ本文へ保存し、既存のページ権限・共同編集・履歴に従って管理
- 閲覧専用ページや共有ページでは編集ボタンを表示しない
- JSON / HTML / Markdownのエクスポートで仕様を保持

この機能は仕様の閲覧用です。APIへのリクエスト送信（Try it out）、外部の仕様の
取得、Swaggerのオンライン検証は無効です。複数ファイルに分かれた仕様は、外部の
`$ref`を解決して1ファイルにまとめてから貼り付けてください。

HTMLエクスポートでは元の仕様をコードとして出力します。Markdownでは
`openapi`のコードフェンスとして出力し、Docmostへ戻すとOpenAPIブロックになります。
エクスポートした単体ファイルにはSwagger UIの画面は含まれません。

仕様全体がページ閲覧者へ公開されるため、例示データにも本物のAPIキーや
パスワードを含めないでください。

## 試せる仕様

```yaml
openapi: 3.1.0
info:
  title: Example API
  version: 1.0.0
paths:
  /items:
    get:
      summary: 一覧を取得
      responses:
        '200':
          description: 正常終了
          content:
            application/json:
              schema:
                type: array
                items:
                  type: string
```

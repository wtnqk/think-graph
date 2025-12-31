# AGENTS

- Premature Optimization is the Root of All Evil
- 一切忖度しないこと
- 常に日本語を利用すること
- 全角と半角の間には半角スペースを入れること
- 絵文字を使わないこと

## レビューについて

- レビューはかなり厳しくすること
- レビューの表現は、シンプルにすること
- レビューの表現は、日本語で行うこと
- レビューの表現は、指摘内容を明確にすること
- レビューの表現は、指摘内容を具体的にすること
- レビューの表現は、指摘内容に優先順位をつけること
- レビューの表現は、指摘内容を優先順位をつけて、重要なものから順に記載すること
- ドキュメントは別に書いているので、ドキュメントについては考慮しないこと
- 変更点とリリースノートの整合性を確認すること

## コミットについて

- 勝手にコミットしないこと
- コミットメッセージは確認すること
- コミットメッセージは日本語で書くこと
- コミットメッセージは命令形で書くこと
- コミットメッセージは 〜する という形で書くこと

## TypeScript 共通ルール

- Node.js LTS 版以上を前提とすること
- 厳密な型安全性を徹底すること
- `any` 型を使わないこと
- `unknown` 型を使う場合は必ず型ガードを実装すること
- Optional chaining `?.` と Nullish coalescing `??` を活用すること

### 型アノテーションについて

- 常に明示的に型アノテーションを記述すること
- `undefined` と `null` を区別して扱うこと
- Union 型 `|` を活用し、Optional 型 `?` は避けること
- Generic 型は型制約 `extends` を明確にすること

### フォーマッターとリンターについて

TypeScript コードを編集したらフォーマッターとリンターを実行すること。

```bash
bun run format
bun run lint
```

### テストについて

- モックやスタブを最小限に留めること
- `bun test` を利用すること
- テストファイルは `*.test.ts` または `*.spec.ts` の命名規則を守ること
- 各テストは `describe` と `test` を使用すること
- テストは実際の動作を確認すること

```bash
bun test
```

---

## バックエンド（Hono on Cloudflare Workers）

### 技術スタック

- Hono
- Cloudflare Workers
- Wrangler
- TypeScript
- WebSocket

### ファイル構成

```
packages/core/
├── src/
│   ├── routes/
│   │   ├── websocket.ts
│   │   ├── api.ts
│   │   └── auth.ts
│   ├── middleware/
│   │   ├── auth.ts
│   │   └── error.ts
│   ├── types/
│   │   └── index.ts
│   ├── utils/
│   │   └── validators.ts
│   └── index.ts
├── wrangler.toml
├── tsconfig.json
├── vitest.config.ts
└── package.json
```

### ルーティング設計

- 各ルートは責任を分離して実装すること
- ルートハンドラは薄く保ち、ロジックは utility 関数に切り出すこと
- エラーハンドリングは middleware で統一的に行うこと

### WebSocket サーバー実装

- WebSocket メッセージ型は必ず定義すること
- メッセージの検証は必ず行うこと
- コネクション管理（接続/切断）のログを出力すること
- メモリリーク対策として接続リソースを適切にクリーンアップすること

```typescript
app.get("/ws", (c) => {
  return c.upgradeWebSocket((ws) => {
    ws.onmessage = async (event) => {
      // メッセージ型検証を実装
      // ビジネスロジック処理
    };
    ws.onclose = () => {
      // リソースクリーンアップ
    };
  });
});
```

### 認証実装

- Google OAuth の認可コード検証は Workers 環境で行うこと
- トークン生成は JWT を使用すること
- 認証ミドルウェアで全ルートを保護すること
- 環境変数（`wrangler.toml` の `[env]`）から秘密鍵を読み込むこと

### API レスポンス設計

- すべてのレスポンスは統一された構造を保つこと
- エラーレスポンスは HTTP ステータスコードを適切に設定すること
- メタデータ（タイムスタンプなど）は一貫して含めること

```typescript
// 成功時
{
  status: 'success',
  data: { /* ... */ },
  timestamp: string
}

// エラー時
{
  status: 'error',
  message: string,
  code: string,
  timestamp: string
}
```

### フォーマッターとリンター設定

```bash
bun run dev
bun run build
bun run deploy
bun run lint
bun run format
```

### テスト実装

- Unit テストは utility 関数の入出力を検証すること
- 実装用 WebSocket テストサーバーは別途用意すること
- Workers 環境特有の制限（メモリ、CPU 時間）を考慮したテストを書くこと

```bash
bun test
```

### Wrangler 設定

- `wrangler.toml` で環境変数を定義すること
- 開発環境（`dev`）と本番環境（`main`）を分離すること
- バインディング（KV, D1 等）は必要に応じて設定すること

```toml
[env.development]
vars = { ENVIRONMENT = "development" }

[env.production]
vars = { ENVIRONMENT = "production" }
```

### 注意事項

- Workers の実行時間制限（30 秒）を超える処理は避けること
- グローバル変数での状態管理は避けること（リクエスト単位で隔離）
- 環境変数は `.dev.vars` ファイルに記述しないこと（`.gitignore` に追加）
- CORS ヘッダーは明示的に設定すること

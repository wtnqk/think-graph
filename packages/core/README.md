# Core Package (Hono API)

Cloudflare Workers上で動作するHono APIサーバー。

## 開発

```bash
bun install
bun run dev
```

## デプロイ

```bash
bun run deploy
```

## コード品質

```bash
# リント実行
bun run lint

# リント自動修正
bun run lint:fix

# フォーマット
bun run format
```

## Cloudflare設定

[For generating/synchronizing types based on your Worker configuration run](https://developers.cloudflare.com/workers/wrangler/commands/#types):

```bash
bun run cf-typegen
```

Pass the `CloudflareBindings` as generics when instantiation `Hono`:

```ts
// src/index.ts
const app = new Hono<{ Bindings: CloudflareBindings }>();
```

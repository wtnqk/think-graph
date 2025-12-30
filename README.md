# think-graph

モノレポ構成のWebアプリケーションプロジェクト。

## 構成

```
packages/
├── ui/      # フロントエンド (SvelteKit + Tailwind CSS)
└── core/    # バックエンドAPI (Hono + Cloudflare Workers)
```

## 技術スタック

### UI (packages/ui)
- SvelteKit
- Tailwind CSS
- Vite
- TypeScript
- テスト: Vitest + Playwright

### Core (packages/core)
- Hono
- Cloudflare Workers
- Vite

## セットアップ

```bash
# 依存関係のインストール
bun install
```

## 開発

```bash
# UIの開発サーバー起動
cd packages/ui && bun run dev

# Coreの開発サーバー起動
cd packages/core && bun run dev
```

## テスト

```bash
# UIのテスト実行
cd packages/ui && bun run test
```

## ビルド・デプロイ

### UI (Cloudflare Pages)
```bash
cd packages/ui && bun run build
```
- ビルド出力: `.svelte-kit/cloudflare`
- GitHub連携で自動デプロイ推奨

### Core (Cloudflare Workers)
```bash
cd packages/core && bun run deploy
```

## ライセンス

MIT

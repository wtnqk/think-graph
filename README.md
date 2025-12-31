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
- DaisyUI + Tailwind CSS
- Iconify (アイコンライブラリ)
- SvelteFlow (グラフエディタ)
- ESLint + Prettier (リンター・フォーマッター)
- Vite
- TypeScript

### Core (packages/core)
- Hono (Webフレームワーク)
- Cloudflare Workers (ランタイム)
- Bearer Token認証
- ESLint + Prettier (リンター・フォーマッター)
- ArkType (バリデーション)
- Vite

### 開発ツール
- Turbo (モノレポオーケストレーション)
- Bun (パッケージマネージャー)

## セットアップ

```bash
# 依存関係のインストール
bun install
```

## 開発

```bash
# 全packageの開発サーバー起動 (推奨)
bun run dev

# または個別起動
cd packages/ui && bun run dev    # フロントエンド
cd packages/core && bun run dev  # バックエンドAPI
```

## コード品質

```bash
# 全packageのリント実行
bun run lint

# リント問題の自動修正
bun run lint:fix

# コードフォーマット
bun run format
```

## テスト

```bash
# 全packageのテスト実行
bun run test

# 個別テスト
cd packages/ui && bun run test    # UIテスト
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

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
- Vitest (テストフレームワーク)
- ESLint + Prettier (リンター・フォーマッター)
- Vite
- TypeScript

### Core (packages/core)
- Hono (Webフレームワーク)
- Cloudflare Workers (ランタイム)
- Cloudflare D1 (SQLiteデータベース)
- Kysely (クエリビルダー)
- Atlas (スキーママイグレーション)
- Google OAuth + JWT認証
- ArkType (バリデーション + ブランド型)
- ULID (ID生成)
- Vitest + @cloudflare/vitest-pool-workers (テスト)
- ESLint + Prettier (リンター・フォーマッター)
- TypeScript

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

## データベース

### マイグレーション (Atlas)

```bash
cd packages/core

# スキーマ変更を検出してマイグレーションファイル生成
atlas migrate diff <name> --env local

# マイグレーション適用
atlas migrate apply --env local
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
cd packages/core && bun run test  # Coreテスト
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

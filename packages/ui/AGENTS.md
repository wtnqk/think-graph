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

## フロントエンド（SvelteKit）

### 技術スタック

- Svelte 5 以降
- SvelteKit
- Vite
- TypeScript
- Tailwind CSS
- Playwright（E2E テスト）

### ファイル構成

```
packages/ui/
├── src/
│   ├── lib/
│   │   ├── components/
│   │   │   └── custom-nodes/
│   │   ├── stores/
│   │   ├── websocket/
│   │   └── types/
│   ├── routes/
│   └── app.html
├── svelte.config.js
├── vite.config.ts
├── tsconfig.json
└── package.json
```

### コンポーネント設計

- 各コンポーネントは単一責任の原則を守ること
- Props は必ず型定義すること（`$$Props` を使用）
- 複雑な状態管理は Svelte Store で実装すること
- Svelte Flow のカスタムノードは `src/lib/components/custom-nodes/` に配置すること

### リアクティビティ

- Svelte 5 の Runes（`$state`, `$derived`, `$effect`）を活用すること
- `writable` Store の代わりに `$state.raw` を使用すること
- 状態の変更は immutable に扱うこと

### WebSocket 連携

- WebSocket クライアント実装は `src/lib/websocket/` に配置すること
- 受信データは必ず型検証すること
- 接続状態は Svelte Store で管理すること
- エラーハンドリングとリトライロジックを実装すること

### フォーマッターとリンター設定

```bash
bun run dev
bun run build
bun run preview
bun run lint
bun run format
```

### E2E テスト

- Playwright を使用すること
- テストファイルは `tests/` ディレクトリに配置すること
- ユーザーフローを中心にテストすること

```bash
bun run test:e2e
```

### 注意事項

- localStorage および sessionStorage を使用しないこと（メモリ内状態管理を使用）
- Server-side rendering（SSR）は不要（SPA として構成）
- API 呼び出しは常にエラーハンドリングを実装すること

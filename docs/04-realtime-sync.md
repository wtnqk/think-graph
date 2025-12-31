# Realtime Sync

## Data Flow

```mermaid
sequenceDiagram
    participant C1 as Client A
    participant C2 as Client B
    participant W as Worker
    participant DO as Durable Object
    participant DB as D1

    C1->>W: WebSocket Connect (graph-123)
    W->>DO: Route to GraphRoom
    DO->>DB: Load Yjs State
    DO-->>C1: Initial State (Y.Doc)

    C2->>W: WebSocket Connect (graph-123)
    W->>DO: Route to GraphRoom
    DO-->>C2: Initial State (Y.Doc)

    Note over C1,C2: Both clients connected to same room

    C1->>DO: Update (move node)
    DO->>DO: Apply to Y.Doc
    DO-->>C1: Ack
    DO-->>C2: Broadcast update

    C2->>DO: Update (add edge)
    DO->>DO: Apply to Y.Doc
    DO-->>C2: Ack
    DO-->>C1: Broadcast update

    DO->>DB: Persist (debounced)
```

## Failure Handling

```mermaid
graph TB
    subgraph "Reconnection Flow"
        DC[Disconnect]
        RC[Reconnect]
        SYNC[Request missing updates]
        MERGE[Merge with local state]
    end

    DC --> RC
    RC --> SYNC
    SYNC --> MERGE
```

- **切断時**: ローカルY.Docで継続編集可能
- **再接続時**: 差分同期でマージ
- **コンフリクト**: CRDTが自動解決

## Data Transfer Optimization

### 配信データ量

| タイミング | 配信内容 | サイズ |
|-----------|---------|--------|
| **更新時** | 変更差分のみ (Yjs update) | 数十バイト〜数KB |
| **初期接続** | 全状態 (Y.Doc snapshot) | ノード数に比例 |

### 最適化戦略

```mermaid
graph LR
    subgraph "Phase 1 (MVP)"
        A1[全状態送信]
        A2[gzip圧縮]
        A3[履歴GC]
    end

    subgraph "Phase 2 (スケール時)"
        B1[Viewport分割読み込み]
        B2[遅延読み込み]
    end

    A1 --> A2 --> A3
    A3 -.->|必要に応じて| B1
    B1 --> B2
```

**Phase 1 (MVP):**
- 初期接続時は全状態をgzip圧縮して送信
- Y.Docの履歴をGCしてサイズ削減
- 更新時はYjsの差分配信（自動）

**Phase 2 (大規模グラフ対応):**
- Viewport内のノードのみ先に送信
- 残りは遅延読み込み
- サブドキュメント分割を検討

## LIKE情報の取得フロー

クライアント側でLike情報をメモリ保持せず、フォーカス時にオンデマンド取得。

```mermaid
sequenceDiagram
    participant C as Client
    participant API as REST API
    participant DB as D1

    Note over C: ノードをフォーカス
    C->>API: GET /nodes/:id/likes
    API->>DB: SELECT * FROM node_likes
    DB-->>API: likes data
    API-->>C: { likes: [...], count: N }

    Note over C: Like操作
    C->>API: POST /nodes/:id/likes
    API->>DB: INSERT INTO node_likes
    API-->>C: OK
    API-->>C: WebSocket通知 (broadcast)
```

**メリット:**
- 不要なデータをメモリ保持しない
- 大量ノードでもクライアント軽量
- Like詳細は必要なときだけ取得

## コンテンツ更新フロー

```mermaid
sequenceDiagram
    participant A as 編集者 (owner)
    participant API as REST API
    participant DO as Durable Object
    participant DB as D1
    participant B as 他ユーザー

    A->>API: PUT /nodes/:id/content
    API->>API: owner_id チェック
    API->>DB: UPDATE content, status
    API->>DO: Yjs updated_at 更新
    DO-->>B: Yjs同期 (updated_at変更)

    Note over B: updated_at変更を検知
    B->>API: GET /nodes/:id
    API->>DB: SELECT
    API-->>B: { owner_id, status, content }
    Note over B: Yjs(position) + D1(content)を合成してUI表示
```

**ポイント:**
- Yjsのデータ → Yjsから取得 (REST APIで返さない)
- D1のデータ → REST APIで取得 (Yjsに含めない)
- クライアント側で合成して表示

## ノード作成フロー

ノード作成はREST API経由で行い、D1とYjsの整合性を保証する。

```mermaid
sequenceDiagram
    participant C as Client (Yjs)
    participant API as REST API
    participant DO as Durable Object (Yjs)
    participant DB as D1

    Note over C,DO: WebSocket接続済み

    C->>API: POST /nodes { content, position }
    API->>DB: INSERT (node_id, owner_id, status, content)
    API->>DO: addNode(node_id, position)
    DO->>DO: ydoc.getMap('nodes').set(id, {position, updated_at})
    DO->>DB: Yjs即時永続化 (flush)
    API-->>C: { node_id }
    DO-->>C: Yjs update (WebSocket自動配信)
    Note over C: ローカルY.Docに反映
```

**整合性保証:**
- D1とYjsをサーバー側で同時に更新
- ノード作成時はデバウンスせず即時永続化
- クライアントはWebSocket経由でYjs更新を自動受信

## クライアント側の操作範囲

| 操作 | 方法 | 理由 |
|------|------|------|
| ノード作成 | REST API | D1/Yjs整合性のため |
| ノード削除 | REST API | 同上 |
| 位置変更 | Yjs直接 | リアルタイム性重視 |
| コンテンツ編集 | REST API | D1管理のため |

位置変更のみクライアントがYjsを直接操作。それ以外はREST API経由でサーバーが両方を更新する。

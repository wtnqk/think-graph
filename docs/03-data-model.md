# Data Model

## Storage Strategy

2つのデータ層で役割を分離する。

```mermaid
graph TB
    subgraph "Runtime (メモリ)"
        YD[Y.Doc<br/>リアルタイム編集]
    end

    subgraph "Persistence (D1)"
        GS[graph_snapshots<br/>Y.Docのバイナリ]
        GM[graphs<br/>メタ情報]
    end

    YD -->|定期的にシリアライズ| GS
    GS -->|接続時に復元| YD
```

| 層 | 用途 | データ |
|---|------|--------|
| **Y.Doc** | リアルタイム編集・同期 | ノード、エッジ、カーソル |
| **D1** | 永続化・メタ管理 | Y.Docスナップショット (blob) |

ノード・エッジはD1のカラムに分解せず、Y.Docを丸ごとblobで保存。
検索が必要になったPhaseで正規化テーブルを追加検討。

## D1 Schema

```mermaid
erDiagram
    users ||--o{ graphs : owns
    graphs ||--o{ graph_snapshots : has

    users {
        text id PK "UUID"
        text google_id UK "Google OAuth sub"
        text email
        text name
        text created_at
        text updated_at
    }

    graphs {
        text id PK
        text user_id FK
        text title
        text created_at
        text updated_at
    }

    graph_snapshots {
        text id PK
        text graph_id FK
        blob yjs_state "Y.Docのバイナリ状態"
        text created_at
    }
```

## CRDT Structure (Y.Doc)

リアルタイムで同期されるインメモリ構造。

```mermaid
graph TB
    subgraph "Y.Doc (Durable Object内)"
        subgraph "Y.Map: nodes"
            N1["node-1: {type, position, data}"]
            N2["node-2: {type, position, data}"]
        end

        subgraph "Y.Map: edges"
            E1["edge-1: {source, target}"]
        end

        subgraph "Y.Map: meta"
            M1["viewport: {x, y, zoom}"]
            M2["cursors: {...}"]
        end
    end
```

```typescript
// コード例
const ydoc = new Y.Doc()
const nodes = ydoc.getMap('nodes')
const edges = ydoc.getMap('edges')

// ノード追加
nodes.set('node-1', { type: 'default', position: { x: 100, y: 200 }, data: {} })

// この変更が自動的に他クライアントに差分配信される
```

## Data Separation

リアルタイム同期が必要なデータとそうでないデータを分離する。

```mermaid
graph TB
    subgraph "Yjs管理 (リアルタイム同期)"
        N[ノード position, data]
        E[エッジ]
        S[Status]
    end

    subgraph "D1管理 (REST API)"
        L[LIKE情報]
        GM[グラフメタ]
        SS[Y.Doc snapshot]
    end

    subgraph "WebSocket通知 (軽量)"
        LN[Like通知]
    end
```

### ノードデータの所有権分離

YjsとD1で管理するデータを明確に分離し、共通のnode_id (KSUID) で紐づける。

```mermaid
graph LR
    subgraph "Yjs (リアルタイム同期)"
        YN[node_id]
        YP[position]
        YU[updated_at]
    end

    subgraph "D1 (永続化)"
        DN[node_id]
        DO[owner_id]
        DS[status]
        DC[content]
    end

    YN ---|KSUID| DN
```

| フィールド | 管理元 | 理由 |
|-----------|--------|------|
| `node_id` | 共通 (KSUID) | YjsとD1の紐付け、時系列ソート可能 |
| `position` | **Yjs** | ドラッグ等リアルタイム同期必須 |
| `updated_at` | **Yjs** | コンテンツ更新の通知トリガー |
| `owner_id` | **D1** | 不変、リアルタイム同期不要 |
| `status` | **D1** | 更新頻度低、フェッチで十分 |
| `content` | **D1** | サイズ大、同時編集不要 |

### ID設計

```typescript
import ksuid from 'ksuid'
const nodeId = ksuid.randomSync().string
// "2K5hM8H3xNlPQzY1L9WvRt0Jq4a" (27文字)
```

**KSUIDを採用する理由:**
- 時系列ソート可能 → D1のB-treeインデックス効率◎
- クライアント側で生成可能 → オフライン対応
- UUIDより短い (27文字)

**ユーザーIDのみUUID:**
- `google_id` で検索するためKSUIDの時系列ソート不要
- `crypto.randomUUID()` (Workers標準API) で追加依存なし

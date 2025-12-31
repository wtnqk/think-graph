# Overview

SvelteFlowベースのNode-Edgeモデルをリアルタイムコラボレーションで操作するシステム。
CRDTを採用し、Cloudflare Durable Objectsで状態管理を行う。

## System Architecture

```mermaid
graph TB
    subgraph Clients
        C1[Client A<br/>SvelteKit + SvelteFlow]
        C2[Client B<br/>SvelteKit + SvelteFlow]
        C3[Client N<br/>SvelteKit + SvelteFlow]
    end

    subgraph "Cloudflare Edge"
        W[Worker<br/>Hono API]

        subgraph "Durable Objects"
            DO1[GraphRoom DO<br/>graph-123]
            DO2[GraphRoom DO<br/>graph-456]
        end
    end

    subgraph Storage
        D1[(D1<br/>SQLite)]
    end

    C1 <-->|WebSocket| W
    C2 <-->|WebSocket| W
    C3 <-->|WebSocket| W

    W <-->|Route by Graph ID| DO1
    W <-->|Route by Graph ID| DO2

    DO1 -->|Persist| D1
    DO2 -->|Persist| D1
```

## Component Details

### Client (packages/ui)

```mermaid
graph LR
    subgraph SvelteKit
        SF[SvelteFlow]
        YP[Yjs Provider]
        WS[WebSocket Client]
    end

    SF <-->|bind| YP
    YP <-->|sync| WS
    WS <-->|messages| Server
```

- **SvelteFlow**: Node-Edge UIコンポーネント
- **Yjs Provider**: ローカルY.Docを管理
- **WebSocket Client**: サーバーとの同期

### Worker (packages/core)

```mermaid
graph LR
    subgraph Hono
        API[REST API]
        WSH[WebSocket Handler]
        AUTH[Auth Middleware]
    end

    API --> DO
    WSH --> DO
    AUTH --> API
    AUTH --> WSH
```

- **REST API**: グラフ一覧、作成、削除
- **WebSocket Handler**: リアルタイム接続の確立
- **Auth Middleware**: 認証・認可

### Durable Object (GraphRoom)

```mermaid
graph TB
    subgraph GraphRoom
        YD[Y.Doc]
        CONN[Connections Map]
        PS[Persistence Service]
    end

    WS1[Client WS] --> CONN
    WS2[Client WS] --> CONN

    CONN <--> YD
    YD --> PS
    PS --> D1[(D1)]
```

- **Y.Doc**: CRDTドキュメント（ノード、エッジ、メタデータ）
- **Connections Map**: 接続中クライアントの管理
- **Persistence Service**: D1への永続化（デバウンス付き）

## Key Design Decisions

| 項目 | 選択 | 理由 |
|------|------|------|
| 整合性モデル | CRDT (Yjs) | コンフリクト自動解決、オフライン対応 |
| 通信 | WebSocket | 双方向リアルタイム、Cloudflare対応 |
| 状態管理 | Durable Objects | グラフ単位の分離、WebSocket管理 |
| 永続化 | D1 + Yjs snapshot | SQLiteベース、Yjs状態をblobで保存 |
| 配信範囲 | 変更差分のみ | Yjsのupdate encodingで自動最適化 |

import { ulid } from "ulid";
import type { DB } from "../lib/db.js";
import { type EdgeId, type NodeId, ID } from "../domain/ids.js";

export interface EdgeData {
  id: EdgeId;
  source_id: NodeId;
  target_id: NodeId;
  created_at: string;
}

export interface CreateEdgeInput {
  source_id: NodeId;
  target_id: NodeId;
}

export class EdgeService {
  constructor(private db: DB) {}

  async getEdges(filters?: { sourceId?: NodeId; targetId?: NodeId }): Promise<EdgeData[]> {
    let query = this.db.selectFrom("edges").selectAll();

    if (filters?.sourceId) {
      query = query.where("source_id", "=", filters.sourceId);
    }
    if (filters?.targetId) {
      query = query.where("target_id", "=", filters.targetId);
    }

    return await query.execute();
  }

  async createEdge(data: CreateEdgeInput): Promise<EdgeData> {
    // ソース・ターゲットノードの存在確認
    const [sourceNode, targetNode] = await Promise.all([
      this.db.selectFrom("nodes").select("id").where("id", "=", data.source_id).executeTakeFirst(),
      this.db.selectFrom("nodes").select("id").where("id", "=", data.target_id).executeTakeFirst(),
    ]);

    if (!sourceNode || !targetNode) {
      throw new EdgeCreationError("Source or target node not found");
    }

    const edge: EdgeData = {
      id: ID.EdgeId(ulid()),
      source_id: data.source_id,
      target_id: data.target_id,
      created_at: new Date().toISOString(),
    };

    await this.db.insertInto("edges").values(edge).execute();

    return edge;
  }

  async deleteEdge(id: EdgeId): Promise<void> {
    const edge = await this.db
      .selectFrom("edges")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    if (!edge) {
      throw new EdgeNotFoundError(id);
    }

    await this.db.deleteFrom("edges").where("id", "=", id).execute();
  }
}

// エラークラス
export class EdgeError extends Error {
  constructor(message: string, public readonly code: string) {
    super(message);
    this.name = "EdgeError";
  }
}

export class EdgeNotFoundError extends EdgeError {
  constructor(id: EdgeId) {
    super(`Edge with id ${id} not found`, "EDGE_NOT_FOUND");
  }
}

export class EdgeCreationError extends EdgeError {
  constructor(reason: string) {
    super(`Failed to create edge: ${reason}`, "EDGE_CREATION_FAILED");
  }
}

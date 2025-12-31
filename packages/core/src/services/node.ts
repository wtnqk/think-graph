import type { DB } from "../lib/db.js";
import {
  Node,
  type CreateNodeInput,
  type UpdateNodeInput,
  NodeNotFoundError,
} from "../domain/node.js";
import { User, type UserName } from "../domain/user.js";
import type { NodeId, UserId } from "../domain/ids.js";

export class NodeService {
  constructor(private db: DB) {}

  async getNodes(parentId?: NodeId): Promise<Node[]> {
    let query = this.db.selectFrom("nodes").selectAll();

    if (parentId) {
      query = query.where("parent_id", "=", parentId);
    } else {
      query = query.where("parent_id", "is", null);
    }

    const nodeData = await query.execute();
    return nodeData.map((data) => Node.fromData(data));
  }

  async getNodeById(id: NodeId): Promise<Node | null> {
    const nodeData = await this.db
      .selectFrom("nodes")
      .selectAll()
      .where("id", "=", id)
      .executeTakeFirst();

    return nodeData ? Node.fromData(nodeData) : null;
  }

  async createNode(data: CreateNodeInput, owner: User): Promise<Node> {
    // ドメインオブジェクトがバリデーションとビジネスルールを処理
    const node = Node.create(data, owner.id);

    // データベースに保存
    await this.db.insertInto("nodes").values(node.toData()).execute();

    return node;
  }

  async updateNode(id: NodeId, data: UpdateNodeInput, user: User): Promise<Node> {
    const existingNode = await this.getNodeById(id);

    if (!existingNode) {
      throw new NodeNotFoundError(id);
    }

    // ドメインオブジェクトがビジネスルールを処理（所有権チェック、バリデーション）
    existingNode.update(data, user.id);

    // データベースに反映
    await this.db.updateTable("nodes").set(existingNode.toData()).where("id", "=", id).execute();

    return existingNode;
  }

  async deleteNode(id: NodeId, user: User): Promise<void> {
    const node = await this.getNodeById(id);

    if (!node) {
      throw new NodeNotFoundError(id);
    }

    // ドメインオブジェクトがビジネスルールを処理（所有権チェック）
    node.delete(user.id);

    await this.db.deleteFrom("nodes").where("id", "=", id).execute();
  }

  async likeNode(nodeId: NodeId, user: User): Promise<void> {
    const node = await this.getNodeById(nodeId);

    if (!node) {
      throw new NodeNotFoundError(nodeId);
    }

    try {
      await this.db
        .insertInto("node_likes")
        .values({
          node_id: nodeId,
          user_id: user.id,
          created_at: new Date().toISOString(),
        })
        .execute();
    } catch {
      // Already liked - ignore duplicate
    }
  }

  async unlikeNode(nodeId: NodeId, user: User): Promise<void> {
    await this.db
      .deleteFrom("node_likes")
      .where("node_id", "=", nodeId)
      .where("user_id", "=", user.id)
      .execute();
  }

  async getNodeLikes(
    nodeId: NodeId,
  ): Promise<{ likes: Array<{ id: UserId; name: UserName; created_at: string }>; count: number }> {
    const likes = await this.db
      .selectFrom("node_likes")
      .innerJoin("users", "users.id", "node_likes.user_id")
      .select(["users.id", "users.name", "node_likes.created_at"])
      .where("node_id", "=", nodeId)
      .execute();

    return { likes, count: likes.length };
  }
}


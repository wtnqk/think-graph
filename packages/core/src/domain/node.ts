import { ulid } from "ulid";
import type { NodeId, UserId } from "./ids.js";
import { ID } from "./ids.js";

export type NodeType = "issue" | "idea" | "output" | "comment";

export interface NodeData {
  id: NodeId;
  type: NodeType;
  title: string;
  content: string | null;
  parent_id: NodeId | null;
  owner_id: UserId;
  created_at: string;
  updated_at: string;
}

export interface CreateNodeInput {
  type: NodeType;
  title: string;
  content?: string | null;
  parent_id?: NodeId | null;
}

export interface UpdateNodeInput {
  title?: string;
  content?: string | null;
}

export class Node {
  private constructor(private data: NodeData) {}

  static create(input: CreateNodeInput, ownerId: UserId): Node {
    Node.validateTitle(input.title);
    Node.validateType(input.type);

    const now = new Date().toISOString();
    const data: NodeData = {
      id: ID.NodeId(ulid()),
      type: input.type,
      title: input.title.trim(),
      content: input.content?.trim() || null,
      parent_id: input.parent_id || null,
      owner_id: ownerId,
      created_at: now,
      updated_at: now,
    };

    return new Node(data);
  }

  static fromData(data: NodeData): Node {
    return new Node(data);
  }

  update(input: UpdateNodeInput, userId: UserId): void {
    if (!this.isOwner(userId)) {
      throw new Error("Only the owner can update this node");
    }

    if (input.title !== undefined) {
      Node.validateTitle(input.title);
      this.data.title = input.title.trim();
    }

    if (input.content !== undefined) {
      this.data.content = input.content?.trim() || null;
    }

    this.data.updated_at = new Date().toISOString();
  }

  delete(userId: UserId): void {
    if (!this.isOwner(userId)) {
      throw new Error("Only the owner can delete this node");
    }
  }

  isOwner(userId: UserId): boolean {
    return this.data.owner_id === userId;
  }

  canBeViewedBy(_userId: UserId): boolean {
    // すべてのノードは公開（将来的にプライベートノード機能追加可能）
    return true;
  }

  hasParent(): boolean {
    return this.data.parent_id !== null;
  }

  isType(type: NodeType): boolean {
    return this.data.type === type;
  }

  // Getters
  get id(): string {
    return this.data.id;
  }

  get type(): NodeType {
    return this.data.type;
  }

  get title(): string {
    return this.data.title;
  }

  get content(): string | null {
    return this.data.content;
  }

  get parentId(): string | null {
    return this.data.parent_id;
  }

  get ownerId(): string {
    return this.data.owner_id;
  }

  get createdAt(): string {
    return this.data.created_at;
  }

  get updatedAt(): string {
    return this.data.updated_at;
  }

  toData(): NodeData {
    return { ...this.data };
  }

  toJSON(): NodeData {
    return this.toData();
  }

  // Private validation methods
  private static validateTitle(title: string): void {
    if (!title || title.trim().length === 0) {
      throw new Error("Title is required");
    }

    if (title.trim().length > 255) {
      throw new Error("Title must be 255 characters or less");
    }
  }

  private static validateType(type: NodeType): void {
    const validTypes: NodeType[] = ["issue", "idea", "output", "comment"];
    if (!validTypes.includes(type)) {
      throw new Error(`Invalid node type: ${type}`);
    }
  }
}

// ドメインエラークラス
export class NodeError extends Error {
  constructor(
    message: string,
    public readonly code: string,
  ) {
    super(message);
    this.name = "NodeError";
  }
}

export class NodeNotFoundError extends NodeError {
  constructor(id: string) {
    super(`Node with id ${id} not found`, "NODE_NOT_FOUND");
  }
}

export class NodeAccessDeniedError extends NodeError {
  constructor(operation: string) {
    super(`Access denied for operation: ${operation}`, "ACCESS_DENIED");
  }
}


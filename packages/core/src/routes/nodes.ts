import { type } from "arktype";
import { Hono } from "hono";
import { createDb } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { NodeService } from "../services/node.js";
import { User, type JwtPayload } from "../domain/user.js";
import type { CreateNodeInput, UpdateNodeInput } from "../domain/node.js";
import { NodeNotFoundError, NodeAccessDeniedError } from "../domain/node.js";
import type { NodeId } from "../domain/ids.js";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  user: JwtPayload;
};

// Validation schemas (ArkTypeをそのまま使用)
const createNodeSchema = type({
  type: "'issue' | 'idea' | 'output' | 'comment'",
  "parent_id?": "string | null",
  title: "string",
  "content?": "string | null",
});

const updateNodeSchema = type({
  "title?": "string",
  "content?": "string | null",
});

const nodes = new Hono<{ Bindings: Bindings; Variables: Variables }>();

nodes.use("/*", authMiddleware);

// List all nodes (root level only by default)
nodes.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const parentId = c.req.query("parent_id") as NodeId | undefined;

  try {
    const nodesList = await nodeService.getNodes(parentId);
    return c.json(nodesList.map(node => node.toJSON()));
  } catch (error) {
    console.error("Failed to get nodes:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get a single node
nodes.get("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const id = c.req.param("id") as NodeId;

  try {
    const node = await nodeService.getNodeById(id);

    if (!node) {
      return c.json({ error: "Node not found" }, 404);
    }

    return c.json(node.toJSON());
  } catch (error) {
    console.error("Failed to get node:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create a node
nodes.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const userPayload = c.get("user");
  const user = User.fromJwtPayload(userPayload);

  try {
    const body = await c.req.json();

    // ArkTypeでバリデーション
    const parsed = createNodeSchema(body);
    if (parsed instanceof type.errors) {
      return c.json({ error: parsed.summary }, 400);
    }

    const createInput: CreateNodeInput = {
      type: parsed.type,
      title: parsed.title,
      content: parsed.content,
      parent_id: parsed.parent_id as NodeId | null | undefined,
    };

    const node = await nodeService.createNode(createInput, user);
    return c.json(node.toJSON(), 201);
  } catch (error) {
    console.error("Failed to create node:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Update a node (owner only)
nodes.patch("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const userPayload = c.get("user");
  const user = User.fromJwtPayload(userPayload);
  const id = c.req.param("id") as NodeId;

  try {
    const body = await c.req.json();

    // ArkTypeでバリデーション
    const parsed = updateNodeSchema(body);
    if (parsed instanceof type.errors) {
      return c.json({ error: parsed.summary }, 400);
    }

    const updateInput: UpdateNodeInput = {
      title: parsed.title,
      content: parsed.content,
    };

    const updated = await nodeService.updateNode(id, updateInput, user);
    return c.json(updated.toJSON());
  } catch (error) {
    if (error instanceof NodeNotFoundError) {
      return c.json({ error: "Node not found" }, 404);
    }
    if (error instanceof NodeAccessDeniedError) {
      return c.json({ error: "Forbidden" }, 403);
    }
    console.error("Failed to update node:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete a node (owner only)
nodes.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const userPayload = c.get("user");
  const user = User.fromJwtPayload(userPayload);
  const id = c.req.param("id") as NodeId;

  try {
    await nodeService.deleteNode(id, user);
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof NodeNotFoundError) {
      return c.json({ error: "Node not found" }, 404);
    }
    if (error instanceof NodeAccessDeniedError) {
      return c.json({ error: "Forbidden" }, 403);
    }
    console.error("Failed to delete node:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Like a node
nodes.post("/:id/like", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const userPayload = c.get("user");
  const user = User.fromJwtPayload(userPayload);
  const nodeId = c.req.param("id") as NodeId;

  try {
    await nodeService.likeNode(nodeId, user);
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof NodeNotFoundError) {
      return c.json({ error: "Node not found" }, 404);
    }
    console.error("Failed to like node:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Unlike a node
nodes.delete("/:id/like", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const userPayload = c.get("user");
  const user = User.fromJwtPayload(userPayload);
  const nodeId = c.req.param("id") as NodeId;

  try {
    await nodeService.unlikeNode(nodeId, user);
    return c.json({ ok: true });
  } catch (error) {
    console.error("Failed to unlike node:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Get likes for a node
nodes.get("/:id/likes", async (c) => {
  const db = createDb(c.env.DB);
  const nodeService = new NodeService(db);
  const nodeId = c.req.param("id") as NodeId;

  try {
    const likes = await nodeService.getNodeLikes(nodeId);
    return c.json(likes);
  } catch (error) {
    console.error("Failed to get node likes:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { nodes };
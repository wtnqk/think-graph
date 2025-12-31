import { type } from "arktype";
import { Hono } from "hono";
import { createDb } from "../lib/db.js";
import { authMiddleware } from "../middleware/auth.js";
import { EdgeService, EdgeNotFoundError, EdgeCreationError } from "../services/edge.js";
import type { CreateEdgeInput } from "../services/edge.js";
import type { NodeId, EdgeId } from "../domain/ids.js";
import type { JwtPayload } from "../domain/user.js";

type Bindings = {
  DB: D1Database;
  JWT_SECRET: string;
};

type Variables = {
  user: JwtPayload;
};

// Validation schemas
const createEdgeSchema = type({
  source_id: "string",
  target_id: "string",
});

const edges = new Hono<{ Bindings: Bindings; Variables: Variables }>();

edges.use("/*", authMiddleware);

// List edges (optionally filter by source or target)
edges.get("/", async (c) => {
  const db = createDb(c.env.DB);
  const edgeService = new EdgeService(db);
  const sourceId = c.req.query("source_id") as NodeId | undefined;
  const targetId = c.req.query("target_id") as NodeId | undefined;

  try {
    const filters = {
      ...(sourceId && { sourceId }),
      ...(targetId && { targetId }),
    };

    const edgesList = await edgeService.getEdges(filters);
    return c.json(edgesList);
  } catch (error) {
    console.error("Failed to get edges:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Create an edge
edges.post("/", async (c) => {
  const db = createDb(c.env.DB);
  const edgeService = new EdgeService(db);

  try {
    const body = await c.req.json();

    // ArkTypeでバリデーション
    const parsed = createEdgeSchema(body);
    if (parsed instanceof type.errors) {
      return c.json({ error: parsed.summary }, 400);
    }

    const createInput: CreateEdgeInput = {
      source_id: parsed.source_id as NodeId,
      target_id: parsed.target_id as NodeId,
    };

    const edge = await edgeService.createEdge(createInput);
    return c.json(edge, 201);
  } catch (error) {
    if (error instanceof EdgeCreationError) {
      return c.json({ error: "Source or target node not found" }, 404);
    }
    console.error("Failed to create edge:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

// Delete an edge
edges.delete("/:id", async (c) => {
  const db = createDb(c.env.DB);
  const edgeService = new EdgeService(db);
  const id = c.req.param("id") as EdgeId;

  try {
    await edgeService.deleteEdge(id);
    return c.json({ ok: true });
  } catch (error) {
    if (error instanceof EdgeNotFoundError) {
      return c.json({ error: "Edge not found" }, 404);
    }
    console.error("Failed to delete edge:", error);
    return c.json({ error: "Internal server error" }, 500);
  }
});

export { edges };

import { type } from "arktype";
import { Hono } from "hono";
import { ulid } from "ulid";
import { createDb } from "../lib/db";
import { authMiddleware } from "../middleware/auth";

type Bindings = {
	DB: D1Database;
	JWT_SECRET: string;
};

type Variables = {
	user: {
		sub: string;
		email: string;
		name: string;
	};
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
	const sourceId = c.req.query("source_id");
	const targetId = c.req.query("target_id");

	let query = db.selectFrom("edges").selectAll();

	if (sourceId) {
		query = query.where("source_id", "=", sourceId);
	}
	if (targetId) {
		query = query.where("target_id", "=", targetId);
	}

	const edgesList = await query.execute();
	return c.json(edgesList);
});

// Create an edge
edges.post("/", async (c) => {
	const db = createDb(c.env.DB);
	const body = await c.req.json();

	const parsed = createEdgeSchema(body);
	if (parsed instanceof type.errors) {
		return c.json({ error: parsed.summary }, 400);
	}

	// Verify both nodes exist
	const sourceNode = await db
		.selectFrom("nodes")
		.select("id")
		.where("id", "=", parsed.source_id)
		.executeTakeFirst();

	const targetNode = await db
		.selectFrom("nodes")
		.select("id")
		.where("id", "=", parsed.target_id)
		.executeTakeFirst();

	if (!sourceNode || !targetNode) {
		return c.json({ error: "Source or target node not found" }, 404);
	}

	const id = ulid();

	await db
		.insertInto("edges")
		.values({
			id,
			source_id: parsed.source_id,
			target_id: parsed.target_id,
			created_at: new Date().toISOString(),
		})
		.execute();

	const edge = await db
		.selectFrom("edges")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	return c.json(edge, 201);
});

// Delete an edge
edges.delete("/:id", async (c) => {
	const db = createDb(c.env.DB);
	const id = c.req.param("id");

	const edge = await db
		.selectFrom("edges")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	if (!edge) {
		return c.json({ error: "Edge not found" }, 404);
	}

	await db.deleteFrom("edges").where("id", "=", id).execute();

	return c.json({ ok: true });
});

export { edges };

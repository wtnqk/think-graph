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
	const parentId = c.req.query("parent_id");

	let query = db.selectFrom("nodes").selectAll();

	if (parentId) {
		query = query.where("parent_id", "=", parentId);
	} else {
		query = query.where("parent_id", "is", null);
	}

	const nodesList = await query.execute();
	return c.json(nodesList);
});

// Get a single node
nodes.get("/:id", async (c) => {
	const db = createDb(c.env.DB);
	const id = c.req.param("id");

	const node = await db
		.selectFrom("nodes")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	if (!node) {
		return c.json({ error: "Node not found" }, 404);
	}

	return c.json(node);
});

// Create a node
nodes.post("/", async (c) => {
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const body = await c.req.json();

	const parsed = createNodeSchema(body);
	if (parsed instanceof type.errors) {
		return c.json({ error: parsed.summary }, 400);
	}

	const id = ulid();
	const now = new Date().toISOString();

	await db
		.insertInto("nodes")
		.values({
			id,
			type: parsed.type,
			parent_id: parsed.parent_id ?? null,
			owner_id: user.sub,
			title: parsed.title,
			content: parsed.content ?? null,
			created_at: now,
			updated_at: now,
		})
		.execute();

	const node = await db
		.selectFrom("nodes")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	return c.json(node, 201);
});

// Update a node (owner only)
nodes.patch("/:id", async (c) => {
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const id = c.req.param("id");
	const body = await c.req.json();

	const node = await db
		.selectFrom("nodes")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	if (!node) {
		return c.json({ error: "Node not found" }, 404);
	}

	if (node.owner_id !== user.sub) {
		return c.json({ error: "Forbidden" }, 403);
	}

	const parsed = updateNodeSchema(body);
	if (parsed instanceof type.errors) {
		return c.json({ error: parsed.summary }, 400);
	}

	await db
		.updateTable("nodes")
		.set({
			...(parsed.title !== undefined && { title: parsed.title }),
			...(parsed.content !== undefined && { content: parsed.content }),
			updated_at: new Date().toISOString(),
		})
		.where("id", "=", id)
		.execute();

	const updated = await db
		.selectFrom("nodes")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	return c.json(updated);
});

// Delete a node (owner only)
nodes.delete("/:id", async (c) => {
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const id = c.req.param("id");

	const node = await db
		.selectFrom("nodes")
		.selectAll()
		.where("id", "=", id)
		.executeTakeFirst();

	if (!node) {
		return c.json({ error: "Node not found" }, 404);
	}

	if (node.owner_id !== user.sub) {
		return c.json({ error: "Forbidden" }, 403);
	}

	await db.deleteFrom("nodes").where("id", "=", id).execute();

	return c.json({ ok: true });
});

// Like a node
nodes.post("/:id/like", async (c) => {
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const nodeId = c.req.param("id");

	const node = await db
		.selectFrom("nodes")
		.select("id")
		.where("id", "=", nodeId)
		.executeTakeFirst();

	if (!node) {
		return c.json({ error: "Node not found" }, 404);
	}

	try {
		await db
			.insertInto("node_likes")
			.values({
				node_id: nodeId,
				user_id: user.sub,
				created_at: new Date().toISOString(),
			})
			.execute();
	} catch {
		// Already liked, ignore
	}

	return c.json({ ok: true });
});

// Unlike a node
nodes.delete("/:id/like", async (c) => {
	const db = createDb(c.env.DB);
	const user = c.get("user");
	const nodeId = c.req.param("id");

	await db
		.deleteFrom("node_likes")
		.where("node_id", "=", nodeId)
		.where("user_id", "=", user.sub)
		.execute();

	return c.json({ ok: true });
});

// Get likes for a node
nodes.get("/:id/likes", async (c) => {
	const db = createDb(c.env.DB);
	const nodeId = c.req.param("id");

	const likes = await db
		.selectFrom("node_likes")
		.innerJoin("users", "users.id", "node_likes.user_id")
		.select(["users.id", "users.name", "node_likes.created_at"])
		.where("node_id", "=", nodeId)
		.execute();

	return c.json({ likes, count: likes.length });
});

export { nodes };

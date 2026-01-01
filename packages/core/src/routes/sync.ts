import { Hono } from "hono";

type Bindings = {
	YJS_SYNC: DurableObjectNamespace;
	JWT_SECRET: string;
};

const sync = new Hono<{ Bindings: Bindings }>();

/**
 * WebSocket upgrade route for Yjs synchronization
 * Routes to appropriate Durable Object based on graphId
 */
sync.get("/:graphId", async (c) => {
	const graphId = c.req.param("graphId");

	try {
		// Get the Durable Object stub for this graph
		const id = c.env.YJS_SYNC.idFromName(graphId);
		const stub = c.env.YJS_SYNC.get(id);

		// Forward the request to the Durable Object
		// The DO will handle WebSocket upgrade and authentication
		return stub.fetch(c.req.raw);
	} catch (error) {
		console.error("Sync route error:", error);
		return c.json({ error: "Failed to connect to sync service" }, 500);
	}
});

export { sync };

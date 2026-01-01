import { DurableObject } from "cloudflare:workers";
import { verify } from "hono/jwt";

interface Session {
	socket: WebSocket;
	userId: string;
	quit: boolean;
}

interface Env {
	JWT_SECRET: string;
}

interface NodePosition {
	x: number;
	y: number;
}

interface SyncNode {
	id: string;
	type: string;
	title: string;
	content?: string;
	owner_id: string;
	parent_id?: string;
}

interface SyncEdge {
	id: string;
	source_id: string;
	target_id: string;
}

type MessageType =
	| "init"
	| "update"
	| "node_created"
	| "node_updated"
	| "node_deleted"
	| "edge_created"
	| "edge_deleted";

/**
 * Durable Object for position synchronization
 * Simplified version without Yjs for now - stores positions directly
 */
export class YjsSyncDO extends DurableObject<Env> {
	private positions: Map<string, NodePosition> = new Map();
	private sessions: Map<WebSocket, Session> = new Map();

	constructor(ctx: DurableObjectState, env: Env) {
		super(ctx, env);

		// Load persisted positions on initialization
		ctx.blockConcurrencyWhile(async () => {
			const stored = await ctx.storage.get<Record<string, NodePosition>>("positions");
			if (stored) {
				this.positions = new Map(Object.entries(stored));
			}
		});
	}

	async fetch(request: Request): Promise<Response> {
		// Verify JWT from cookie before accepting WebSocket
		const cookie = request.headers.get("Cookie");
		const userId = await this.verifyAuth(cookie);

		if (!userId) {
			return new Response("Unauthorized", { status: 401 });
		}

		const upgradeHeader = request.headers.get("Upgrade");
		if (upgradeHeader !== "websocket") {
			return new Response("Expected WebSocket", { status: 426 });
		}

		// Create WebSocket pair
		const pair = new WebSocketPair();
		const [client, server] = Object.values(pair);

		// Handle the server-side WebSocket
		this.handleSession(server, userId);

		return new Response(null, {
			status: 101,
			webSocket: client,
		});
	}

	private handleSession(socket: WebSocket, userId: string) {
		socket.accept();

		const session: Session = { socket, userId, quit: false };
		this.sessions.set(socket, session);

		// Send current positions to new client
		const initMessage = JSON.stringify({
			type: "init",
			positions: Object.fromEntries(this.positions),
		});
		socket.send(initMessage);

		socket.addEventListener("message", (event) => {
			if (session.quit) return;

			try {
				const message = JSON.parse(event.data as string);
				this.handleMessage(socket, message);
			} catch (error) {
				console.error("Error handling message:", error);
			}
		});

		socket.addEventListener("close", () => {
			session.quit = true;
			this.sessions.delete(socket);
		});

		socket.addEventListener("error", () => {
			session.quit = true;
			this.sessions.delete(socket);
		});
	}

	private handleMessage(
		socket: WebSocket,
		message: {
			type: MessageType;
			nodeId?: string;
			position?: NodePosition;
			node?: SyncNode;
			edge?: SyncEdge;
		},
	) {
		switch (message.type) {
			case "update":
				if (message.nodeId && message.position) {
					this.positions.set(message.nodeId, message.position);
					this.broadcast(socket, {
						type: "update",
						nodeId: message.nodeId,
						position: message.position,
					});
					this.persistPositions();
				}
				break;

			case "node_created":
			case "node_updated":
				if (message.node) {
					this.broadcast(socket, {
						type: message.type,
						node: message.node,
						position: message.position,
					});
				}
				break;

			case "node_deleted":
				if (message.nodeId) {
					this.positions.delete(message.nodeId);
					this.broadcast(socket, {
						type: "node_deleted",
						nodeId: message.nodeId,
					});
					this.persistPositions();
				}
				break;

			case "edge_created":
				if (message.edge) {
					this.broadcast(socket, {
						type: "edge_created",
						edge: message.edge,
					});
				}
				break;

			case "edge_deleted":
				if (message.edge?.id) {
					this.broadcast(socket, {
						type: "edge_deleted",
						edgeId: message.edge.id,
					});
				}
				break;
		}
	}

	private broadcast(excludeSocket: WebSocket, message: Record<string, unknown>) {
		const data = JSON.stringify(message);
		this.sessions.forEach((session, ws) => {
			if (ws !== excludeSocket && !session.quit) {
				try {
					ws.send(data);
				} catch {
					// Socket might be closed
				}
			}
		});
	}

	private async persistPositions() {
		try {
			await this.ctx.storage.put("positions", Object.fromEntries(this.positions));
		} catch (error) {
			console.error("Error persisting positions:", error);
		}
	}

	private async verifyAuth(cookie: string | null): Promise<string | null> {
		if (!cookie) return null;

		const cookies = cookie.split(";").reduce(
			(acc, c) => {
				const [key, value] = c.trim().split("=");
				if (key && value) {
					acc[key] = value;
				}
				return acc;
			},
			{} as Record<string, string>,
		);

		const token = cookies["auth_token"];
		if (!token) return null;

		try {
			const payload = await verify(token, this.env.JWT_SECRET);
			return payload.sub as string;
		} catch {
			return null;
		}
	}
}

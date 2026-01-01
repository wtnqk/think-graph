import type { ConnectionStatus, NodePosition, SyncNode, SyncEdge } from "./types";

export interface ProviderEvents {
	status: { status: ConnectionStatus };
	synced: { synced: boolean };
	update: { nodeId: string; position: NodePosition };
	init: { positions: Record<string, NodePosition> };
	node_created: { node: SyncNode; position?: NodePosition };
	node_updated: { node: SyncNode };
	node_deleted: { nodeId: string };
	edge_created: { edge: SyncEdge };
	edge_deleted: { edgeId: string };
}

type EventCallback<T> = (event: T) => void;

/**
 * WebSocket provider for position synchronization with Durable Objects
 * Uses simple JSON protocol instead of Yjs binary protocol
 */
export class DurableObjectProvider {
	private ws: WebSocket | null = null;
	private wsUrl: string;
	private synced = false;
	private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;
	private reconnectDelay = 1000;
	private maxReconnectDelay = 30000;
	private shouldConnect = true;
	private listeners: Map<keyof ProviderEvents, Set<EventCallback<unknown>>> = new Map();

	constructor(wsUrl: string) {
		this.wsUrl = wsUrl;
		this.connect();
	}

	get connected(): boolean {
		return this.ws?.readyState === WebSocket.OPEN;
	}

	get isSynced(): boolean {
		return this.synced;
	}

	on<K extends keyof ProviderEvents>(event: K, callback: EventCallback<ProviderEvents[K]>) {
		if (!this.listeners.has(event)) {
			this.listeners.set(event, new Set());
		}
		this.listeners.get(event)!.add(callback as EventCallback<unknown>);
	}

	off<K extends keyof ProviderEvents>(event: K, callback: EventCallback<ProviderEvents[K]>) {
		this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
	}

	private emit<K extends keyof ProviderEvents>(event: K, data: ProviderEvents[K]) {
		this.listeners.get(event)?.forEach((callback) => callback(data));
	}

	connect() {
		if (this.ws || !this.shouldConnect) return;

		this.emit("status", { status: "connecting" });

		this.ws = new WebSocket(this.wsUrl);

		this.ws.onopen = () => {
			this.emit("status", { status: "connected" });
			this.reconnectDelay = 1000;
		};

		this.ws.onmessage = (event) => {
			this.handleMessage(event.data as string);
		};

		this.ws.onclose = () => {
			this.ws = null;
			this.synced = false;
			this.emit("status", { status: "disconnected" });
			this.emit("synced", { synced: false });
			this.scheduleReconnect();
		};

		this.ws.onerror = () => {
			this.ws?.close();
		};
	}

	disconnect() {
		this.shouldConnect = false;
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
			this.reconnectTimeout = null;
		}
		this.ws?.close();
	}

	sendPosition(nodeId: string, position: NodePosition) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;

		this.ws.send(
			JSON.stringify({
				type: "update",
				nodeId,
				position,
			}),
		);
	}

	sendNodeCreated(node: SyncNode, position?: NodePosition) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;

		this.ws.send(
			JSON.stringify({
				type: "node_created",
				node,
				position,
			}),
		);
	}

	sendNodeUpdated(node: SyncNode) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;

		this.ws.send(
			JSON.stringify({
				type: "node_updated",
				node,
			}),
		);
	}

	sendNodeDeleted(nodeId: string) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;

		this.ws.send(
			JSON.stringify({
				type: "node_deleted",
				nodeId,
			}),
		);
	}

	sendEdgeCreated(edge: SyncEdge) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;

		this.ws.send(
			JSON.stringify({
				type: "edge_created",
				edge,
			}),
		);
	}

	sendEdgeDeleted(edgeId: string) {
		if (this.ws?.readyState !== WebSocket.OPEN) return;

		this.ws.send(
			JSON.stringify({
				type: "edge_deleted",
				edge: { id: edgeId },
			}),
		);
	}

	private scheduleReconnect() {
		if (this.reconnectTimeout || !this.shouldConnect) return;

		this.reconnectTimeout = setTimeout(() => {
			this.reconnectTimeout = null;
			this.connect();
		}, this.reconnectDelay);

		this.reconnectDelay = Math.min(this.reconnectDelay * 2, this.maxReconnectDelay);
	}

	private handleMessage(data: string) {
		try {
			const message = JSON.parse(data);

			switch (message.type) {
				case "init":
					this.synced = true;
					this.emit("synced", { synced: true });
					this.emit("init", { positions: message.positions });
					break;
				case "update":
					this.emit("update", {
						nodeId: message.nodeId,
						position: message.position,
					});
					break;
				case "node_created":
					this.emit("node_created", {
						node: message.node,
						position: message.position,
					});
					break;
				case "node_updated":
					this.emit("node_updated", {
						node: message.node,
					});
					break;
				case "node_deleted":
					this.emit("node_deleted", {
						nodeId: message.nodeId,
					});
					break;
				case "edge_created":
					this.emit("edge_created", {
						edge: message.edge,
					});
					break;
				case "edge_deleted":
					this.emit("edge_deleted", {
						edgeId: message.edgeId,
					});
					break;
			}
		} catch (error) {
			console.error("Error parsing message:", error);
		}
	}

	destroy() {
		this.shouldConnect = false;
		if (this.reconnectTimeout) {
			clearTimeout(this.reconnectTimeout);
		}
		this.ws?.close();
		this.listeners.clear();
	}
}

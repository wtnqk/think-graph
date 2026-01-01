import { DurableObjectProvider } from "./provider";
import type { NodePosition, ConnectionStatus, SyncNode, SyncEdge } from "./types";

type NodeCreatedCallback = (node: SyncNode, position?: NodePosition) => void;
type NodeUpdatedCallback = (node: SyncNode) => void;
type NodeDeletedCallback = (nodeId: string) => void;
type EdgeCreatedCallback = (edge: SyncEdge) => void;
type EdgeDeletedCallback = (edgeId: string) => void;

/**
 * Creates a reactive store for node positions
 * Uses WebSocket for real-time sync with Durable Objects
 */
export function createYjsStore(graphId: string) {
	// Reactive state using Svelte 5 $state
	let positions = $state<Map<string, NodePosition>>(new Map());
	let synced = $state(false);
	let status = $state<ConnectionStatus>("connecting");

	// Callbacks for node/edge events
	let onNodeCreatedCallbacks: NodeCreatedCallback[] = [];
	let onNodeUpdatedCallbacks: NodeUpdatedCallback[] = [];
	let onNodeDeletedCallbacks: NodeDeletedCallback[] = [];
	let onEdgeCreatedCallbacks: EdgeCreatedCallback[] = [];
	let onEdgeDeletedCallbacks: EdgeDeletedCallback[] = [];

	// Build WebSocket URL based on current location
	const wsProtocol =
		typeof window !== "undefined" && window.location.protocol === "https:" ? "wss:" : "ws:";
	const wsHost = typeof window !== "undefined" ? window.location.host : "localhost:5173";
	const wsUrl = `${wsProtocol}//${wsHost}/sync/${graphId}`;

	// WebSocket provider for real-time sync
	const wsProvider = new DurableObjectProvider(wsUrl);

	wsProvider.on("status", (event: { status: ConnectionStatus }) => {
		status = event.status;
	});

	wsProvider.on("synced", (event: { synced: boolean }) => {
		synced = event.synced;
	});

	wsProvider.on("init", (event: { positions: Record<string, NodePosition> }) => {
		// Load initial positions from server
		positions = new Map(Object.entries(event.positions));
	});

	wsProvider.on("update", (event: { nodeId: string; position: NodePosition }) => {
		// Update from another client
		const newPositions = new Map(positions);
		newPositions.set(event.nodeId, event.position);
		positions = newPositions;
	});

	wsProvider.on("node_created", (event: { node: SyncNode; position?: NodePosition }) => {
		if (event.position) {
			const newPositions = new Map(positions);
			newPositions.set(event.node.id, event.position);
			positions = newPositions;
		}
		onNodeCreatedCallbacks.forEach((cb) => cb(event.node, event.position));
	});

	wsProvider.on("node_updated", (event: { node: SyncNode }) => {
		onNodeUpdatedCallbacks.forEach((cb) => cb(event.node));
	});

	wsProvider.on("node_deleted", (event: { nodeId: string }) => {
		const newPositions = new Map(positions);
		newPositions.delete(event.nodeId);
		positions = newPositions;
		onNodeDeletedCallbacks.forEach((cb) => cb(event.nodeId));
	});

	wsProvider.on("edge_created", (event: { edge: SyncEdge }) => {
		onEdgeCreatedCallbacks.forEach((cb) => cb(event.edge));
	});

	wsProvider.on("edge_deleted", (event: { edgeId: string }) => {
		onEdgeDeletedCallbacks.forEach((cb) => cb(event.edgeId));
	});

	/**
	 * Set the position of a node
	 * This will sync to other clients
	 */
	function setPosition(nodeId: string, position: NodePosition) {
		// Update local state
		const newPositions = new Map(positions);
		newPositions.set(nodeId, position);
		positions = newPositions;

		// Send to server
		wsProvider.sendPosition(nodeId, position);
	}

	/**
	 * Get the position of a node
	 */
	function getPosition(nodeId: string): NodePosition | undefined {
		return positions.get(nodeId);
	}

	/**
	 * Delete a node's position
	 */
	function deletePosition(nodeId: string) {
		const newPositions = new Map(positions);
		newPositions.delete(nodeId);
		positions = newPositions;
	}

	/**
	 * Check if a node has a stored position
	 */
	function hasPosition(nodeId: string): boolean {
		return positions.has(nodeId);
	}

	/**
	 * Clean up resources
	 */
	function destroy() {
		wsProvider.destroy();
		onNodeCreatedCallbacks = [];
		onNodeUpdatedCallbacks = [];
		onNodeDeletedCallbacks = [];
		onEdgeCreatedCallbacks = [];
		onEdgeDeletedCallbacks = [];
	}

	// Notify methods (call after successful API operations)
	function notifyNodeCreated(node: SyncNode, position?: NodePosition) {
		wsProvider.sendNodeCreated(node, position);
	}

	function notifyNodeUpdated(node: SyncNode) {
		wsProvider.sendNodeUpdated(node);
	}

	function notifyNodeDeleted(nodeId: string) {
		wsProvider.sendNodeDeleted(nodeId);
	}

	function notifyEdgeCreated(edge: SyncEdge) {
		wsProvider.sendEdgeCreated(edge);
	}

	function notifyEdgeDeleted(edgeId: string) {
		wsProvider.sendEdgeDeleted(edgeId);
	}

	// Subscribe methods (for receiving changes from other clients)
	function onNodeCreated(callback: NodeCreatedCallback) {
		onNodeCreatedCallbacks.push(callback);
		return () => {
			onNodeCreatedCallbacks = onNodeCreatedCallbacks.filter((cb) => cb !== callback);
		};
	}

	function onNodeUpdated(callback: NodeUpdatedCallback) {
		onNodeUpdatedCallbacks.push(callback);
		return () => {
			onNodeUpdatedCallbacks = onNodeUpdatedCallbacks.filter((cb) => cb !== callback);
		};
	}

	function onNodeDeleted(callback: NodeDeletedCallback) {
		onNodeDeletedCallbacks.push(callback);
		return () => {
			onNodeDeletedCallbacks = onNodeDeletedCallbacks.filter((cb) => cb !== callback);
		};
	}

	function onEdgeCreated(callback: EdgeCreatedCallback) {
		onEdgeCreatedCallbacks.push(callback);
		return () => {
			onEdgeCreatedCallbacks = onEdgeCreatedCallbacks.filter((cb) => cb !== callback);
		};
	}

	function onEdgeDeleted(callback: EdgeDeletedCallback) {
		onEdgeDeletedCallbacks.push(callback);
		return () => {
			onEdgeDeletedCallbacks = onEdgeDeletedCallbacks.filter((cb) => cb !== callback);
		};
	}

	return {
		// Reactive state (read-only getters)
		get positions() {
			return positions;
		},
		get synced() {
			return synced;
		},
		get connected() {
			return status === "connected";
		},
		get status() {
			return status;
		},

		// Position methods
		setPosition,
		getPosition,
		deletePosition,
		hasPosition,

		// Notify methods (call after API success)
		notifyNodeCreated,
		notifyNodeUpdated,
		notifyNodeDeleted,
		notifyEdgeCreated,
		notifyEdgeDeleted,

		// Subscribe methods (for receiving changes)
		onNodeCreated,
		onNodeUpdated,
		onNodeDeleted,
		onEdgeCreated,
		onEdgeDeleted,

		destroy,
	};
}

export type YjsStore = ReturnType<typeof createYjsStore>;

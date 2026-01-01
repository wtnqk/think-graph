/**
 * Node position stored in Yjs
 */
export interface NodePosition {
	x: number;
	y: number;
}

/**
 * Connection status for WebSocket provider
 */
export type ConnectionStatus = "connecting" | "connected" | "disconnected";

/**
 * Yjs store state
 */
export interface YjsStoreState {
	positions: Map<string, NodePosition>;
	synced: boolean;
	connected: boolean;
	status: ConnectionStatus;
}

/**
 * Node data from API
 */
export interface SyncNode {
	id: string;
	type: string;
	title: string;
	content?: string;
	owner_id: string;
	parent_id?: string;
}

/**
 * Edge data from API
 */
export interface SyncEdge {
	id: string;
	source_id: string;
	target_id: string;
}

/**
 * WebSocket message types
 */
export type SyncMessageType =
	| "position_update"
	| "node_created"
	| "node_updated"
	| "node_deleted"
	| "edge_created"
	| "edge_deleted";

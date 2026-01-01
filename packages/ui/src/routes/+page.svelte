<script lang="ts">
	import {
		Background,
		BackgroundVariant,
		type Connection,
		Controls,
		type Edge,
		MiniMap,
		type Node,
		Panel,
		SvelteFlow,
	} from "@xyflow/svelte";
	import { onMount, onDestroy } from "svelte";
	import "@xyflow/svelte/dist/style.css";
	import { ApiClient } from "$lib/api";
	import { Auth } from "$lib/auth";
	import { createYjsStore, type YjsStore, type SyncNode, type SyncEdge } from "$lib/yjs";
	import CustomNode from "$lib/components/CustomNode.svelte";
	import CreateNodeModal from "$lib/components/CreateNodeModal.svelte";
	import type { ApiEdge, ApiNode, NodeType } from "$lib/types";
	import type { NodePosition } from "$lib/yjs";

	// Node and Edge stores using Svelte 5 $state
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Current user
	let currentUserId = $state<string | null>(null);

	// Yjs store for position sync
	let yjsStore = $state<YjsStore | null>(null);

	// Modal state
	let isCreateModalOpen = $state(false);

	// Custom node types
	const nodeTypes = {
		custom: CustomNode,
	};

	// Unsubscribe functions
	let unsubscribes: (() => void)[] = [];

	// Check authentication
	onMount(async () => {
		const user = await Auth.getCurrentUser();
		if (!user) {
			window.location.href = "/login";
			return;
		}
		currentUserId = user.id;

		// Initialize Yjs store with user's graph
		yjsStore = createYjsStore(user.id);

		// Subscribe to node/edge events from other clients
		unsubscribes.push(
			yjsStore.onNodeCreated((node: SyncNode, position?: NodePosition) => {
				const pos = position || { x: Math.random() * 500, y: Math.random() * 500 };
				nodes = [
					...nodes,
					{
						id: node.id,
						type: "custom",
						position: pos,
						data: {
							label: node.title,
							type: node.type,
							content: node.content,
							owner_id: node.owner_id,
							parent_id: node.parent_id,
							currentUserId,
						},
						parentId: node.parent_id || undefined,
					},
				];
			}),
		);

		unsubscribes.push(
			yjsStore.onNodeUpdated((node: SyncNode) => {
				nodes = nodes.map((n) =>
					n.id === node.id
						? {
								...n,
								data: {
									...n.data,
									label: node.title,
									type: node.type,
									content: node.content,
								},
							}
						: n,
				);
			}),
		);

		unsubscribes.push(
			yjsStore.onNodeDeleted((nodeId: string) => {
				nodes = nodes.filter((n) => n.id !== nodeId);
			}),
		);

		unsubscribes.push(
			yjsStore.onEdgeCreated((edge: SyncEdge) => {
				edges = [
					...edges,
					{
						id: edge.id,
						source: edge.source_id,
						target: edge.target_id,
					},
				];
			}),
		);

		unsubscribes.push(
			yjsStore.onEdgeDeleted((edgeId: string) => {
				edges = edges.filter((e) => e.id !== edgeId);
			}),
		);

		// Load nodes and edges from API
		await loadGraph();
	});

	onDestroy(() => {
		unsubscribes.forEach((unsub) => unsub());
		yjsStore?.destroy();
	});

	// Sync positions from Yjs to SvelteFlow nodes
	$effect(() => {
		if (!yjsStore) return;

		const yjsPositions = yjsStore.positions;
		if (yjsPositions.size === 0) return;

		// Update node positions from Yjs
		let hasChanges = false;
		const updatedNodes = nodes.map((node) => {
			const yjsPos = yjsPositions.get(node.id);
			if (yjsPos && (node.position.x !== yjsPos.x || node.position.y !== yjsPos.y)) {
				hasChanges = true;
				return { ...node, position: yjsPos };
			}
			return node;
		});

		if (hasChanges) {
			nodes = updatedNodes;
		}
	});

	async function loadGraph() {
		try {
			const [nodesData, edgesData] = await Promise.all([
				ApiClient.getNodes(),
				ApiClient.getEdges(),
			]);

			// Transform API data to SvelteFlow format
			nodes = (nodesData as ApiNode[]).map((node: ApiNode): Node => {
				// Try to get position from Yjs, fallback to random
				let position = yjsStore?.getPosition(node.id);
				if (!position) {
					position = { x: Math.random() * 500, y: Math.random() * 500 };
					// Save the generated position to Yjs
					yjsStore?.setPosition(node.id, position);
				}

				return {
					id: node.id,
					type: "custom",
					position,
					data: {
						label: node.title,
						type: node.type,
						content: node.content,
						owner_id: node.owner_id,
						parent_id: node.parent_id,
						currentUserId,
					},
					parentId: node.parent_id || undefined,
				};
			});

			edges = (edgesData as ApiEdge[]).map(
				(edge: ApiEdge): Edge => ({
					id: edge.id,
					source: edge.source_id,
					target: edge.target_id,
				}),
			);
		} catch (error) {
			console.error("Failed to load graph:", error);
		}
	}

	function onNodeDrag(eventData: {
		targetNode: Node | null;
		nodes: Node[];
		event: MouseEvent | TouchEvent;
	}) {
		const { targetNode } = eventData;
		if (!targetNode) return;

		// Only update the dragged node's position, keep others intact
		nodes = nodes.map((node) =>
			node.id === targetNode.id ? { ...node, position: targetNode.position } : node,
		);
	}

	function onNodeDragStop(eventData: {
		targetNode: Node | null;
		nodes: Node[];
		event: MouseEvent | TouchEvent;
	}) {
		const { targetNode: node } = eventData;
		if (node && yjsStore) {
			// Save position to Yjs (syncs automatically to other clients)
			yjsStore.setPosition(node.id, node.position);
		}
	}

	async function onConnect(connection: Connection) {
		if (!connection.source || !connection.target) {
			return;
		}

		try {
			const edge: ApiEdge = await ApiClient.createEdge({
				source_id: connection.source,
				target_id: connection.target,
			});

			// Notify other clients
			yjsStore?.notifyEdgeCreated({
				id: edge.id,
				source_id: edge.source_id,
				target_id: edge.target_id,
			});

			edges = [
				...edges,
				{
					id: edge.id,
					source: connection.source,
					target: connection.target,
				},
			];
		} catch (error) {
			console.error("Failed to create edge:", error);
		}
	}

	function openCreateModal() {
		isCreateModalOpen = true;
	}

	function closeCreateModal() {
		isCreateModalOpen = false;
	}

	async function handleCreateNode(data: { type: NodeType; title: string; content?: string }) {
		const position = { x: 250 + Math.random() * 100, y: 250 + Math.random() * 100 };

		try {
			const node: ApiNode = await ApiClient.createNode({
				type: data.type,
				title: data.title,
				content: data.content,
			});

			// Save position to Yjs
			yjsStore?.setPosition(node.id, position);

			// Notify other clients
			yjsStore?.notifyNodeCreated(
				{
					id: node.id,
					type: node.type,
					title: node.title,
					content: node.content,
					owner_id: node.owner_id,
				},
				position,
			);

			nodes = [
				...nodes,
				{
					id: node.id,
					type: "custom",
					position,
					data: {
						label: node.title,
						type: node.type,
						content: node.content,
						owner_id: node.owner_id,
						currentUserId,
					},
				},
			];

			closeCreateModal();
		} catch (error) {
			console.error("Failed to create node:", error);
		}
	}

	function logout() {
		Auth.logout();
	}
</script>

<div class="w-screen h-screen bg-gray-50">
	<SvelteFlow
		bind:nodes
		bind:edges
		{nodeTypes}
		onnodedrag={onNodeDrag}
		onnodedragstop={onNodeDragStop}
		onconnect={onConnect}
		fitView
		attributionPosition="bottom-left"
	>
		<Controls />
		<MiniMap />
		<Background variant={BackgroundVariant.Dots} />

		<Panel position="top-left">
			<div class="card card-compact bg-base-100 shadow-xl">
				<div class="card-body">
					<div class="flex items-center gap-2">
						<h1 class="card-title text-2xl">Think Graph</h1>
						{#if yjsStore}
							<div
								class="badge badge-sm"
								class:badge-success={yjsStore.connected}
								class:badge-warning={yjsStore.status === "connecting"}
								class:badge-error={yjsStore.status === "disconnected"}
								title={yjsStore.synced ? "Synced" : "Syncing..."}
							>
								{#if yjsStore.connected}
									{yjsStore.synced ? "Synced" : "Syncing"}
								{:else if yjsStore.status === "connecting"}
									Connecting
								{:else}
									Offline
								{/if}
							</div>
						{/if}
					</div>
					<div class="card-actions flex-col">
						<button onclick={openCreateModal} class="btn btn-primary btn-sm"> Add Node </button>
						<button onclick={logout} class="btn btn-outline btn-sm"> Logout </button>
					</div>
				</div>
			</div>
		</Panel>
	</SvelteFlow>

	<CreateNodeModal
		open={isCreateModalOpen}
		onClose={closeCreateModal}
		onCreate={handleCreateNode}
	/>
</div>

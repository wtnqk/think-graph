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
	import { onMount } from "svelte";
	import "@xyflow/svelte/dist/style.css";
	import { ApiClient } from "$lib/api";
	import { Auth } from "$lib/auth";
	import CustomNode from "$lib/components/CustomNode.svelte";
	import CreateNodeModal from "$lib/components/CreateNodeModal.svelte";
	import type { ApiEdge, ApiNode, NodeType } from "$lib/types";

	// Node and Edge stores using Svelte 5 $state
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Current user
	let currentUserId = $state<string | null>(null);

	// Modal state
	let isCreateModalOpen = $state(false);

	// Custom node types
	const nodeTypes = {
		custom: CustomNode,
	};

	// Check authentication
	onMount(async () => {
		const user = await Auth.getCurrentUser();
		if (!user) {
			window.location.href = "/login";
			return;
		}
		currentUserId = user.id;

		// Load nodes and edges from API
		await loadGraph();
	});

	async function loadGraph() {
		try {
			const [nodesData, edgesData] = await Promise.all([
				ApiClient.getNodes(),
				ApiClient.getEdges(),
			]);

			console.log("Loaded nodes:", nodesData);
			console.log("currentUserId:", currentUserId);

			// Transform API data to SvelteFlow format
			nodes = (nodesData as ApiNode[]).map(
				(node: ApiNode): Node => ({
					id: node.id,
					type: "custom",
					position: { x: Math.random() * 500, y: Math.random() * 500 }, // TODO: Load from Yjs
					data: {
						label: node.title,
						type: node.type,
						content: node.content,
						owner_id: node.owner_id,
						parent_id: node.parent_id,
						currentUserId,
					},
					parentId: node.parent_id || undefined,
				}),
			);

			edges = (edgesData as ApiEdge[]).map(
				(edge: ApiEdge): Edge => ({
					id: edge.id,
					source: edge.source_id,
					target: edge.target_id,
				}),
			);

			console.log("Nodes after transform:", nodes);
		} catch (error) {
			console.error("Failed to load graph:", error);
		}
	}

	function onNodeDragStop(eventData: {
		targetNode: Node | null;
		nodes: Node[];
		event: MouseEvent | TouchEvent;
	}) {
		const { targetNode: node } = eventData;
		if (node) {
			// TODO: Save position to Yjs
			console.log("Node position updated:", node.id, node.position);
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
					<h1 class="card-title text-2xl">Think Graph</h1>
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

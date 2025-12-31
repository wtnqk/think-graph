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
	import type { ApiEdge, ApiNode } from "$lib/types";

	// Node and Edge stores using Svelte 5 $state
	let nodes = $state.raw<Node[]>([]);
	let edges = $state.raw<Edge[]>([]);

	// Custom node types
	const nodeTypes = {
		custom: CustomNode,
	};

	// Check authentication
	onMount(async () => {
		if (!Auth.isAuthenticated()) {
			window.location.href = "/login";
			return;
		}

		// Load nodes and edges from API
		await loadGraph();
	});

	async function loadGraph() {
		try {
			const [nodesData, edgesData] = await Promise.all([
				ApiClient.getNodes(),
				ApiClient.getEdges(),
			]);

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

	async function addNode() {
		const position = { x: 250, y: 250 };

		try {
			const node: ApiNode = await ApiClient.createNode({
				type: "idea",
				title: "New Idea",
				content: "",
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
					},
				},
			];
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
						<button onclick={addNode} class="btn btn-primary btn-sm"> Add Node </button>
						<button onclick={logout} class="btn btn-outline btn-sm"> Logout </button>
					</div>
				</div>
			</div>
		</Panel>
	</SvelteFlow>
</div>

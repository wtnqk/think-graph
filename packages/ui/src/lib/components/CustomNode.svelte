<script lang="ts">
	import { Handle, Position } from "@xyflow/svelte";
	import { ApiClient } from "$lib/api";
	import { Auth } from "$lib/auth";

	import type { NodeData } from "$lib/types";

	export let data: NodeData;

	export let id: string;

	let isEditing = false;
	let editTitle = data.label;
	let editContent = data.content || "";

	// Get current user
	const currentUserId = Auth.getToken() ? parseJwt(Auth.getToken()!).sub : null;
	const isOwner = currentUserId === data.owner_id;

	function parseJwt(token: string) {
		const base64Url = token.split(".")[1];
		const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
		return JSON.parse(atob(base64));
	}

	// Node type colors using DaisyUI classes
	const typeConfig = {
		issue: {
			badge: "badge-error",
			card: "border-error",
			icon: "⚠️",
			bg: "bg-error/10",
		},
		idea: {
			badge: "badge-warning",
			card: "border-warning",
			icon: "💡",
			bg: "bg-warning/10",
		},
		output: {
			badge: "badge-success",
			card: "border-success",
			icon: "✅",
			bg: "bg-success/10",
		},
		comment: {
			badge: "badge-info",
			card: "border-info",
			icon: "💬",
			bg: "bg-info/10",
		},
	};

	const config = typeConfig[data.type] || typeConfig.idea;

	function startEdit() {
		if (!isOwner) return;
		isEditing = true;
		editTitle = data.label;
		editContent = data.content || "";
	}

	async function saveEdit() {
		if (!isOwner || !isEditing) return;

		try {
			await ApiClient.updateNode(id, {
				title: editTitle,
				content: editContent,
			});

			data.label = editTitle;
			data.content = editContent;
			isEditing = false;
		} catch (error) {
			console.error("Failed to update node:", error);
		}
	}

	function cancelEdit() {
		isEditing = false;
		editTitle = data.label;
		editContent = data.content || "";
	}

	async function deleteNode() {
		if (!isOwner) return;

		if (confirm("Are you sure you want to delete this node?")) {
			try {
				await ApiClient.deleteNode(id);
				// TODO: Remove from graph
			} catch (error) {
				console.error("Failed to delete node:", error);
			}
		}
	}
</script>

<div
	class="card card-compact bg-base-100 border-2 {config.card} {config.bg} shadow-md min-w-50 hover:shadow-lg transition-all duration-200"
>
	<Handle type="target" position={Position.Top} />

	<div class="card-body p-3">
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-2 flex-1">
				<div class="badge {config.badge} badge-sm">{config.icon}</div>
				{#if isEditing}
					<input
						type="text"
						bind:value={editTitle}
						class="input input-xs input-bordered flex-1"
						onclick={(e) => e.stopPropagation()}
					/>
				{:else}
					<h3 class="card-title text-sm">{data.label}</h3>
				{/if}
			</div>

			{#if isOwner}
				<div class="flex gap-1">
					{#if isEditing}
						<button onclick={saveEdit} class="btn btn-success btn-xs"> ✓ </button>
						<button onclick={cancelEdit} class="btn btn-error btn-xs"> ✕ </button>
					{:else}
						<button onclick={startEdit} class="btn btn-ghost btn-xs"> ✏️ </button>
						<button
							onclick={deleteNode}
							class="btn btn-ghost btn-xs text-error hover:bg-error hover:text-error-content"
						>
							🗑️
						</button>
					{/if}
				</div>
			{/if}
		</div>

		{#if data.content || isEditing}
			<div class="mt-2">
				{#if isEditing}
					<textarea
						bind:value={editContent}
						class="textarea textarea-bordered textarea-xs w-full"
						rows="3"
						onclick={(e) => e.stopPropagation()}
					></textarea>
				{:else}
					<p class="text-xs opacity-70">{data.content}</p>
				{/if}
			</div>
		{/if}

		{#if data.parent_id}
			<div class="badge badge-outline badge-xs mt-2">Nested</div>
		{/if}
	</div>

	<Handle type="source" position={Position.Bottom} />
</div>

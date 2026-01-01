<script lang="ts">
	import type { NodeType } from "$lib/types";

	interface Props {
		open: boolean;
		onClose: () => void;
		onCreate: (data: { type: NodeType; title: string; content?: string }) => void;
	}

	let { open, onClose, onCreate }: Props = $props();

	let selectedType: NodeType = $state("idea");
	let title = $state("");
	let content = $state("");

	const nodeTypes: { type: NodeType; label: string; icon: string; badge: string }[] = [
		{ type: "issue", label: "Issue", icon: "⚠️", badge: "badge-error" },
		{ type: "idea", label: "Idea", icon: "💡", badge: "badge-warning" },
		{ type: "output", label: "Output", icon: "✅", badge: "badge-success" },
		{ type: "comment", label: "Comment", icon: "💬", badge: "badge-info" },
	];

	function handleSubmit() {
		if (!title.trim()) return;

		onCreate({
			type: selectedType,
			title: title.trim(),
			content: content.trim() || undefined,
		});

		// Reset form
		selectedType = "idea";
		title = "";
		content = "";
	}

	function handleClose() {
		selectedType = "idea";
		title = "";
		content = "";
		onClose();
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape") {
			handleClose();
		}
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
	<!-- svelte-ignore a11y_click_events_have_key_events -->
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="modal modal-open" onclick={handleClose}>
		<div class="modal-box" onclick={(e) => e.stopPropagation()}>
			<h3 class="font-bold text-lg mb-4">Create New Node</h3>

			<!-- Type Selection -->
			<div class="form-control mb-4">
				<label class="label" for="node-type">
					<span class="label-text">Node Type</span>
				</label>
				<div class="flex flex-wrap gap-2">
					{#each nodeTypes as nodeType}
						<button
							type="button"
							class="btn btn-sm {selectedType === nodeType.type
								? nodeType.badge.replace('badge-', 'btn-')
								: 'btn-outline'}"
							onclick={() => (selectedType = nodeType.type)}
						>
							<span>{nodeType.icon}</span>
							<span>{nodeType.label}</span>
						</button>
					{/each}
				</div>
			</div>

			<!-- Title Input -->
			<div class="form-control mb-4">
				<label class="label" for="node-title">
					<span class="label-text">Title</span>
				</label>
				<input
					id="node-title"
					type="text"
					bind:value={title}
					placeholder="Enter node title..."
					class="input input-bordered w-full"
					autofocus
				/>
			</div>

			<!-- Content Input -->
			<div class="form-control mb-4">
				<label class="label" for="node-content">
					<span class="label-text">Content (optional)</span>
				</label>
				<textarea
					id="node-content"
					bind:value={content}
					placeholder="Enter description..."
					class="textarea textarea-bordered w-full"
					rows="3"
				></textarea>
			</div>

			<!-- Actions -->
			<div class="modal-action">
				<button type="button" class="btn btn-ghost" onclick={handleClose}>Cancel</button>
				<button
					type="button"
					class="btn btn-primary"
					onclick={handleSubmit}
					disabled={!title.trim()}
				>
					Create
				</button>
			</div>
		</div>
	</div>
{/if}

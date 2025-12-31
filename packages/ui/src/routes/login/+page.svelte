<script lang="ts">
	import { Auth } from "$lib/auth";
	import Icon from "@iconify/svelte";
	import { onMount } from "svelte";

	onMount(() => {
		if (Auth.isAuthenticated()) {
			window.location.href = "/";
		}
	});

	function handleLogin() {
		Auth.login();
	}
</script>

<div class="hero min-h-screen bg-gradient-to-br from-primary to-secondary">
	<div class="hero-content text-center">
		<div class="max-w-md">
			<div class="card bg-base-100 shadow-xl">
				<div class="card-body">
					<h1 class="card-title text-4xl justify-center mb-4">Think Graph</h1>
					<p class="text-base-content/70 mb-6">Collaborative graph editor for ideas</p>
					<div class="card-actions justify-center">
						<button onclick={handleLogin} class="btn btn-primary btn-wide">
							<Icon icon="logos:google" class="w-5 h-5" />
							Sign in with Google
						</button>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

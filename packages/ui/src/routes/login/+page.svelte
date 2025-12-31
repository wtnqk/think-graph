<script lang="ts">
	import { Auth } from '$lib/auth';
	import { onMount } from 'svelte';

	onMount(() => {
		if (Auth.isAuthenticated()) {
			window.location.href = '/';
		}
	});

	function handleLogin() {
		Auth.login();
	}
</script>

<div class="login-container">
	<div class="login-card">
		<h1>Think Graph</h1>
		<p>Collaborative graph editor for ideas</p>
		<button on:click={handleLogin} class="login-button">
			Sign in with Google
		</button>
	</div>
</div>

<style>
	.login-container {
		display: flex;
		justify-content: center;
		align-items: center;
		min-height: 100vh;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
	}

	.login-card {
		background: white;
		padding: 3rem;
		border-radius: 1rem;
		box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
		text-align: center;
		max-width: 400px;
	}

	h1 {
		margin: 0 0 1rem 0;
		font-size: 2rem;
		color: #333;
	}

	p {
		margin: 0 0 2rem 0;
		color: #666;
	}

	.login-button {
		background: #4285f4;
		color: white;
		border: none;
		padding: 0.75rem 2rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.login-button:hover {
		background: #357ae8;
	}
</style>
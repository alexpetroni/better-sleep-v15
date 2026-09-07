<script lang="ts">
	import { asset } from '$app/paths';
	import '../app.css';

	let { children } = $props();
</script>

<svelte:head>
	<link rel="icon" href={asset('/favicon.svg')} />
</svelte:head>

{@render children()}

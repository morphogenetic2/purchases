<script lang="ts">
	import "../app.css";
	import favicon from "$lib/assets/favicon.svg";

	let { children } = $props();
</script>

<svelte:head>
	<title>MiMe Orders - Lab Order Management</title>
	<meta
		name="description"
		content="Lab order management system for tracking purchases, inventory, and deliveries."
	/>
	<meta name="theme-color" content="#09090b" />
	<meta property="og:title" content="MiMe Orders - Lab Order Management" />
	<meta
		property="og:description"
		content="Lab order management system for tracking purchases, inventory, and deliveries."
	/>
	<meta property="og:type" content="website" />
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children()}

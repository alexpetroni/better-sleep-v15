<script lang="ts">
	let { label, dark = false }: { label: string; dark?: boolean } = $props();
</script>

<p
	class={[
		'inline-flex items-center gap-2 rounded-full px-3 py-1 text-[10px] font-medium tracking-[0.2em] uppercase ring-1',
		dark
			? 'bg-white/5 text-(--color-night-muted) ring-white/10'
			: 'bg-black/5 text-(--color-brand) ring-black/5'
	]}
>
	{label}
</p>

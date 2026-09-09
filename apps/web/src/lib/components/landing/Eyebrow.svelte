<script lang="ts">
	// Section eyebrow: a coral dot and small tracked caps in a paper pill.
	let { label, dark = false }: { label: string; dark?: boolean } = $props();
</script>

<p
	class={[
		'inline-flex items-center gap-2 rounded-full py-1 pr-3.5 pl-2.5 text-[11px] font-semibold tracking-[0.18em] uppercase',
		dark
			? 'bg-white/6 text-(--color-night-muted) ring-1 ring-white/10'
			: 'bg-white/70 text-(--color-ink)/70 shadow-pill'
	]}
>
	<span aria-hidden="true" class="h-1.5 w-1.5 rounded-full bg-(--color-accent)"></span>
	{label}
</p>

<script lang="ts">
	import { resolve } from '$app/paths';
	import Seo from '$lib/components/Seo.svelte';
	import { m } from '$lib/paraglide/messages';
	import { ArticleCards } from '$lib/modules/blog';
	import { ARCHETYPE_QUIZ_SLUG } from '$lib/modules/quiz';

	let { data } = $props();
	const archetype = $derived(data.archetype);
</script>

<Seo
	title={`${archetype.name} · ${data.site.name}`}
	description={archetype.essence}
	canonical={data.canonical}
	siteName={data.site.name}
/>

<div class="max-w-2xl">
	<p class="text-[11px] font-semibold tracking-[0.18em] text-(--color-accent) uppercase">
		{m.tipuri_kicker()}
	</p>
	<h1
		class="mt-2 mb-3 text-4xl font-extrabold tracking-[-0.03em] sm:text-5xl"
		data-testid="archetype-name"
	>
		{archetype.name}
	</h1>
	<p class="mb-6 font-serif text-xl leading-snug text-(--color-ink)/80 sm:text-2xl">
		{archetype.essence}
	</p>
	<blockquote
		class="mb-8 border-l-2 border-(--color-accent) pl-5 font-serif text-2xl leading-snug italic"
	>
		„{archetype.keyPhrase}”
	</blockquote>

	{#each archetype.intro as paragraph (paragraph)}
		<p class="mb-4 leading-relaxed">{paragraph}</p>
	{/each}
</div>

<section class="mt-10 grid gap-6 md:grid-cols-2">
	<div class="rounded-[1.5rem] bg-white p-7 shadow-paper">
		<h2 class="mb-3 text-xl font-bold tracking-tight">{m.tipuri_avoid_heading()}</h2>
		<ul class="list-disc space-y-3 pl-5 text-sm text-(--color-ink)/80">
			{#each archetype.avoid as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</div>
	<div class="rounded-[1.5rem] bg-white p-7 shadow-paper">
		<h2 class="mb-3 text-xl font-bold tracking-tight">{m.tipuri_start_heading()}</h2>
		<ul class="list-disc space-y-3 pl-5 text-sm text-(--color-ink)/80">
			{#each archetype.start as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</div>
</section>

{#if data.articles.length > 0}
	<section class="mt-12">
		<div class="mb-4 flex items-baseline justify-between">
			<h2 class="text-xl font-semibold">{m.tipuri_articles_heading()}</h2>
			<a
				href={resolve('/(public)/blog')}
				class="text-sm font-semibold text-(--color-accent) hover:underline"
			>
				{m.pillar_articles_all()} →
			</a>
		</div>
		<ArticleCards cards={data.articles} testid="archetype-article-card" />
	</section>
{/if}

<div
	data-testid="archetype-quiz-cta"
	class="mt-14 rounded-[2rem] bg-(--color-night) p-9 text-center text-(--color-night-ink) shadow-paper-lg"
>
	<h2 class="mb-3 font-serif text-3xl leading-tight">{m.tipuri_cta_heading()}</h2>
	<p class="mx-auto mb-6 max-w-xl text-(--color-night-muted)">{m.tipuri_cta_blurb()}</p>
	<a
		href={resolve('/(public)/quiz/[slug]', { slug: ARCHETYPE_QUIZ_SLUG })}
		class="inline-block rounded-full bg-(--color-moon) px-7 py-3 font-semibold text-(--color-night) transition-transform duration-500 ease-glide hover:scale-[1.02] active:scale-[0.98]"
	>
		{m.tipuri_cta_button()}
	</a>
</div>

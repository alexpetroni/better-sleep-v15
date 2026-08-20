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
	<p class="text-sm font-semibold tracking-wide text-(--color-brand) uppercase">
		{m.tipuri_kicker()}
	</p>
	<h1 class="mt-1 mb-2 text-3xl font-bold" data-testid="archetype-name">{archetype.name}</h1>
	<p class="mb-4 text-lg text-(--color-ink)/80">{archetype.essence}</p>
	<blockquote class="mb-8 border-l-4 border-(--color-brand-soft) pl-4 text-lg italic">
		„{archetype.keyPhrase}”
	</blockquote>

	{#each archetype.intro as paragraph (paragraph)}
		<p class="mb-4 leading-relaxed">{paragraph}</p>
	{/each}
</div>

<section class="mt-10 grid gap-6 md:grid-cols-2">
	<div class="rounded-xl border border-(--color-brand-soft) bg-white p-6">
		<h2 class="mb-3 text-xl font-semibold">{m.tipuri_avoid_heading()}</h2>
		<ul class="list-disc space-y-3 pl-5 text-sm text-(--color-ink)/80">
			{#each archetype.avoid as item (item)}
				<li>{item}</li>
			{/each}
		</ul>
	</div>
	<div class="rounded-xl border border-(--color-brand-soft) bg-white p-6">
		<h2 class="mb-3 text-xl font-semibold">{m.tipuri_start_heading()}</h2>
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
			<a href={resolve('/(public)/blog')} class="text-sm text-(--color-brand) hover:underline">
				{m.pillar_articles_all()} →
			</a>
		</div>
		<ArticleCards cards={data.articles} testid="archetype-article-card" />
	</section>
{/if}

<div
	data-testid="archetype-quiz-cta"
	class="mt-12 rounded-xl border border-(--color-brand-soft) bg-(--color-brand-soft)/20 p-6 text-center"
>
	<h2 class="mb-2 text-xl font-semibold">{m.tipuri_cta_heading()}</h2>
	<p class="mx-auto mb-4 max-w-xl text-(--color-ink)/80">{m.tipuri_cta_blurb()}</p>
	<a
		href={resolve('/(public)/quiz/[slug]', { slug: ARCHETYPE_QUIZ_SLUG })}
		class="inline-block rounded bg-(--color-brand) px-6 py-2 font-semibold text-white hover:opacity-90"
	>
		{m.tipuri_cta_button()}
	</a>
</div>

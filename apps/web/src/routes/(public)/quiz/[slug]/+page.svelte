<script lang="ts">
	import { m } from '$lib/paraglide/messages';
	import Seo from '$lib/components/Seo.svelte';
	import { canonicalUrl } from '$lib/seo';
	import QuizForm from './QuizForm.svelte';

	let { data } = $props();
</script>

<Seo
	title={data.quiz.title}
	description={m.quiz_seo_description({ title: data.quiz.title })}
	canonical={canonicalUrl(`/quiz/${data.quiz.slug}`)}
	siteName={data.site.name}
/>

<article data-testid="quiz-page">
	<h1 class="mb-4 text-3xl font-bold">{data.quiz.title}</h1>
	{#if data.quiz.introHtml}
		<div class="prose mb-8 max-w-none" data-testid="quiz-intro">
			<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized by renderMarkdown -->
			{@html data.quiz.introHtml}
		</div>
	{/if}

	{#key data.quiz.slug}
		<QuizForm quiz={data.quiz} />
	{/key}
</article>

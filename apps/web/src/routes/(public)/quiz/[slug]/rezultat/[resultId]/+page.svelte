<script lang="ts">
	import { resolve } from '$app/paths';
	import { m } from '$lib/paraglide/messages';
	import Seo from '$lib/components/Seo.svelte';
	import { canonicalUrl } from '$lib/seo';
	import CaptureForm from './CaptureForm.svelte';

	let { data, form } = $props();

	function percent(score: number, maxScore: number | null): number {
		if (!maxScore || maxScore <= 0) return 0;
		return Math.round(Math.min(100, Math.max(0, (score / maxScore) * 100)));
	}
</script>

<Seo
	title={m.quiz_result_title({ quiz: data.quizTitle })}
	description={m.quiz_seo_description({ title: data.quizTitle })}
	canonical={canonicalUrl(`/quiz/${data.quizSlug}`)}
	siteName={data.site.name}
/>

<svelte:head>
	<!-- Result pages carry personal scores (PII) — never index them. -->
	<meta name="robots" content="noindex" />
</svelte:head>

<article data-testid="quiz-result-page" class="mx-auto max-w-2xl">
	<p class="text-sm text-(--color-ink)/70">{data.quizTitle}</p>
	<h1 class="mb-6 text-3xl font-bold">{m.quiz_result_heading()}</h1>

	{#if data.profile.winner}
		<!-- Archetype result: named lived experience, no clinical score display. -->
		<section
			class="mb-8 rounded-xl border border-(--color-brand-soft) bg-(--color-brand-soft)/30 p-6"
		>
			<p class="mb-1 text-sm text-(--color-ink)/70">{m.quiz_result_archetype_kicker()}</p>
			<h2 class="mb-2 text-3xl font-bold text-(--color-brand)" data-testid="result-archetype">
				{data.profile.winner.label}
			</h2>
			<p class="text-lg" data-testid="result-archetype-essence">{data.profile.winner.essence}</p>
		</section>

		<section class="mb-8" data-testid="result-archetype-meaning">
			<h2 class="mb-4 text-lg font-semibold">{m.quiz_result_archetype_meaning()}</h2>
			{#each data.profile.winner.advice.split('\n\n') as paragraph, i (i)}
				<p class="mb-4">{paragraph}</p>
			{/each}
			{#if data.winnerPageSlug}
				<!-- The winner's full /tipuri guide — the natural next click (L-13). -->
				<p>
					<a
						href={resolve('/(public)/tipuri/[archetype]', { archetype: data.winnerPageSlug })}
						data-testid="result-archetype-link"
						class="font-semibold text-(--color-brand) hover:underline"
					>
						{m.quiz_result_archetype_guide({ name: data.profile.winner.label })}
					</a>
				</p>
			{/if}
		</section>

		{#if data.profile.runnerUp}
			<section
				class="mb-10 rounded-xl border border-(--color-brand-soft) p-6"
				data-testid="result-runner-up"
			>
				<h2 class="mb-1 text-lg font-semibold">
					{m.quiz_result_runner_up_heading({ name: data.profile.runnerUp.label })}
				</h2>
				<p class="mb-2 text-sm text-(--color-ink)/70">{m.quiz_result_runner_up_note()}</p>
				<p>{data.profile.runnerUp.essence}</p>
			</section>
		{/if}
	{:else}
		<section
			class="mb-8 rounded-xl border border-(--color-brand-soft) bg-(--color-brand-soft)/30 p-6"
		>
			<p class="mb-1 text-sm text-(--color-ink)/70" data-testid="result-score">
				{#if data.profile.maxScore !== null}
					{m.quiz_result_score({ score: data.profile.score, max: data.profile.maxScore })}
				{:else}
					{m.quiz_result_score_simple({ score: data.profile.score })}
				{/if}
			</p>
			<h2 class="mb-2 text-2xl font-bold text-(--color-brand)" data-testid="result-band">
				{data.profile.band.label}
			</h2>
			<p data-testid="result-advice">{data.profile.band.advice}</p>
		</section>
	{/if}

	{#if data.profile.dimensions.length > 0 && !data.profile.winner}
		<section class="mb-10">
			<h2 class="mb-4 text-lg font-semibold">{m.quiz_result_dimensions()}</h2>
			<ul class="space-y-3">
				{#each data.profile.dimensions as dim (dim.key)}
					<li data-testid="result-dimension" data-dimension={dim.key}>
						<div class="mb-1 flex justify-between text-sm">
							<span>{dim.label}</span>
							<span class="text-(--color-ink)/70">
								{dim.maxScore !== null ? `${dim.score} / ${dim.maxScore}` : dim.score}
							</span>
						</div>
						<div class="h-2 rounded bg-(--color-brand-soft)">
							<div
								class="h-2 rounded bg-(--color-brand)"
								style="width: {percent(dim.score, dim.maxScore)}%"
							></div>
						</div>
					</li>
				{/each}
			</ul>
		</section>
	{/if}

	<CaptureForm claimed={data.claimed} {form} />

	<p class="mt-8">
		<a href={resolve('/')} class="text-(--color-brand) hover:underline">{m.error_back_home()}</a>
	</p>
</article>

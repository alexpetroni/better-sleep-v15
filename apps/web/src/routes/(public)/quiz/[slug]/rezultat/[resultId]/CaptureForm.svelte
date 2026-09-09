<script lang="ts">
	import {
		ConsentCheckbox,
		HONEYPOT_FIELD,
		TextInput,
		questionStatus,
		type Question
	} from 'formcomp';
	import 'formcomp/theme.css';
	import { m } from '$lib/paraglide/messages';
	import type { ActionData } from './$types';

	// The deck's block-5 follow-up ("îți trimitem protocolul complet"): email
	// capture BELOW the ungated result. Posts as a plain form to `?/email`
	// (no progressive enhancement needed) — the server re-checks every gate.
	interface Props {
		claimed: boolean;
		form: ActionData;
	}
	let { claimed, form }: Props = $props();

	// BS-1's formcomp rules ARE the client-side gate: an email `text-input`
	// question and a required `consent` question, judged by questionStatus().
	const emailQuestion: Question = {
		id: 'email',
		type: 'text-input',
		inputType: 'email',
		required: true,
		label: m.quiz_capture_email_label()
	};
	const consentQuestion: Question = {
		id: 'newsletter_consent',
		type: 'consent',
		required: true,
		label: m.newsletter_consent_label()
	};

	let email = $state('');
	let consent = $state(false);
	let honeypot = $state('');
	let attempted = $state(false);
	let submitting = $state(false);

	const emailStatus = $derived(questionStatus(emailQuestion, email));
	const consentStatus = $derived(questionStatus(consentQuestion, consent));

	function handleSubmit(event: SubmitEvent) {
		// A filled honeypot POSTs normally and the SERVER silently drops it
		// (fake success) — delivery copy must only ever come from a real server
		// response (L-2), never from a client-side guess.
		if (emailStatus !== 'ok' || consentStatus !== 'ok') {
			event.preventDefault();
			attempted = true;
			return;
		}
		submitting = true;
	}
</script>

<!-- bfcache restore (back button) would otherwise revive a dead submit button. -->
<svelte:window onpageshow={() => (submitting = false)} />

<section class="rounded-xl border border-(--color-brand-soft) p-6">
	{#if form?.sent}
		<p data-testid="result-email-sent" class="font-medium text-green-700">
			{m.quiz_capture_sent()}
		</p>
	{:else}
		<h2 class="mb-1 text-lg font-semibold">{m.quiz_capture_heading()}</h2>
		<p class="mb-4 text-sm text-(--color-ink)/70">{m.quiz_capture_blurb()}</p>
		{#if claimed}
			<p class="mb-4 text-sm text-(--color-ink)/70" data-testid="result-already-claimed">
				{m.quiz_email_already()}
			</p>
		{/if}
		{#if form?.error === 'rate-limited'}
			<p data-testid="result-email-error" class="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">
				{m.quiz_email_rate_limited()}
			</p>
		{:else if form?.error === 'consent'}
			<p data-testid="result-email-error" class="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">
				{m.newsletter_consent_required()}
			</p>
		{:else if form?.error}
			<p data-testid="result-email-error" class="mb-3 rounded bg-red-50 p-2 text-sm text-red-700">
				{m.quiz_email_invalid()}
			</p>
		{/if}
		<form
			method="POST"
			action="?/email"
			class="formcomp"
			novalidate
			data-testid="capture-form"
			onsubmit={handleSubmit}
		>
			<!-- Anti-spam honeypot (BS-1): off-screen but NOT display:none, so
			     naive bots still fill it; humans post it empty. -->
			<div class="absolute -left-[9999px] size-px overflow-hidden" aria-hidden="true">
				<input
					type="text"
					name={HONEYPOT_FIELD}
					tabindex="-1"
					autocomplete="off"
					bind:value={honeypot}
				/>
			</div>
			<div class="mb-3">
				<TextInput
					bind:value={email}
					name="email"
					type="email"
					label={emailQuestion.label}
					placeholder={m.newsletter_email_placeholder()}
					warning={attempted && emailStatus !== 'ok'}
				/>
				{#if attempted && emailStatus !== 'ok'}
					<p class="mt-1 text-sm text-red-700" data-testid="capture-email-error">
						{emailStatus === 'missing' ? m.quiz_capture_email_required() : m.quiz_email_invalid()}
					</p>
				{/if}
			</div>
			<div class="mb-4">
				<ConsentCheckbox
					bind:value={consent}
					name="newsletter_consent_box"
					label={consentQuestion.label}
					warning={attempted && consentStatus !== 'ok'}
				/>
				{#if attempted && consentStatus !== 'ok'}
					<p class="mt-1 text-sm text-red-700" data-testid="capture-consent-error">
						{m.newsletter_consent_required()}
					</p>
				{/if}
			</div>
			{#if consent}
				<!-- The value the server trusts exists only while the box is ticked. -->
				<input type="hidden" name="newsletter_consent" value="yes" />
			{/if}
			<button
				type="submit"
				disabled={submitting}
				data-testid="result-email-submit"
				class="rounded-full bg-(--color-brand) px-4 py-2 font-semibold text-white hover:opacity-90 disabled:opacity-60"
			>
				{m.quiz_capture_submit()}
			</button>
		</form>
	{/if}
</section>

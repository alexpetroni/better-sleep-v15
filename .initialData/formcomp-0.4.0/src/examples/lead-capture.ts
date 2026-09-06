import type { FormConfig } from '../lib/types.js';

export const leadCaptureConfig: FormConfig = {
	version: 1,
	// Demo endpoint — the browser tests stub it; in the sandbox a submit shows
	// the built-in error handling.
	submit: {
		url: '/api/lead-demo'
	},
	settings: {
		honeypot: true,
		successTitle: 'You are on the list!',
		successMessage: 'Check your inbox to confirm your subscription.',
		submitLabel: 'Subscribe'
	},
	steps: [
		{
			id: 'signup',
			label: 'Sign up',
			intro: 'Email-format validation, a GDPR consent checkbox, and an invisible anti-spam honeypot.',
			groups: [
				{
					id: 'email-group',
					label: 'Your email',
					questions: [
						{
							id: 'email',
							uuid: '3f1c2d84-6b1a-4f0e-9c5d-000000000101',
							type: 'text-input',
							inputType: 'email',
							label: 'Email address',
							required: true,
							placeholder: 'jane@example.com'
						},
						{
							id: 'gdpr_consent',
							uuid: '3f1c2d84-6b1a-4f0e-9c5d-000000000102',
							type: 'consent',
							label: 'I agree to receive the newsletter and I accept the privacy policy.',
							required: true
						}
					]
				}
			]
		}
	]
};

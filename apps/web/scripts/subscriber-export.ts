// GDPR subject-access/portability export CLI (art. 15/20, review M-10): prints
// everything held for one email address as JSON — the read-side twin of
// `pnpm subscriber:delete`, over the same tables.
// Usage: pnpm subscriber:export -- --email person@example.com
import { parseArgs } from 'node:util';
import { loadRootEnv } from './env.ts';
import { createDb } from '../src/lib/db/client.ts';
import { exportSubscriberData } from '../src/lib/modules/gdpr/export.ts';

loadRootEnv();

const args = process.argv.slice(2);
if (args[0] === '--') args.shift();
const { values } = parseArgs({ args, options: { email: { type: 'string' } } });

if (!values.email) {
	console.error('Usage: pnpm subscriber:export -- --email <email>');
	process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const db = createDb(databaseUrl);
try {
	const result = await exportSubscriberData({ db }, values.email);
	if (!result.ok) {
		console.error(`Invalid email address: ${values.email}`);
		process.exit(1);
	}
	// JSON on stdout only — pipe straight into a file for the data subject.
	console.log(JSON.stringify(result.value, null, 2));
} finally {
	await db.$client.end();
}

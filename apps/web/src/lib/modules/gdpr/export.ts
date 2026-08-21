import { eq, inArray } from 'drizzle-orm';
import type { Db } from '../../db/client.ts';
import { normalizeEmail } from '../../util/email.ts';
import type { Result } from '../../util/result.ts';
import { subscribers, type SubscriberRow } from '../crm/schema.ts';
import { emailLog } from '../email/schema.ts';
import { invoices } from '../invoice/schema.ts';
import { nurtureEnrollments } from '../nurture/schema.ts';
import { quizResults } from '../quiz/schema.ts';
import { orders } from '../shop/schema.ts';

/**
 * GDPR subject-access/portability export (art. 15/20, review M-10): everything
 * held for one email address, as one JSON-able object. The symmetric read-side
 * of `eraseSubscriberData` — it walks exactly the tables erasure touches, plus
 * the nurture enrollments erasure removes via the subscriber FK cascade:
 *
 * - the subscriber row (consents incl. wording refs, confirmation state);
 * - their linked quiz results (the erase tool unlinks these);
 * - nurture enrollments (marketing-automation state for the subscriber);
 * - orders under the email, incl. shipping/billing capture (anonymized on
 *   erasure);
 * - invoices for those orders (retained under accounting law even after
 *   erasure — report them so the answer to the data subject is precise);
 * - email log entries sent to the address.
 *
 * Node-safe (used by the `pnpm subscriber:export` CLI). Read-only; runs in
 * one transaction so the export is a consistent snapshot.
 */

type Row<T extends { $inferSelect: unknown }> = T['$inferSelect'];

export interface SubjectAccessExport {
	email: string;
	subscriber: SubscriberRow | null;
	quizResults: Row<typeof quizResults>[];
	nurtureEnrollments: Row<typeof nurtureEnrollments>[];
	orders: Row<typeof orders>[];
	/** Retained under Legea contabilității 82/1991 art. 25 — never erased. */
	invoices: Row<typeof invoices>[];
	emailLog: Row<typeof emailLog>[];
}

export type ExportResult = Result<SubjectAccessExport, 'invalid-email'>;

export async function exportSubscriberData(
	deps: { db: Db },
	rawEmail: string
): Promise<ExportResult> {
	const email = normalizeEmail(rawEmail);
	if (!email) return { ok: false, error: 'invalid-email' };

	return deps.db.transaction(async (tx): Promise<ExportResult> => {
		const [subscriber] = await tx.select().from(subscribers).where(eq(subscribers.email, email));

		const [results, enrollments] = subscriber
			? await Promise.all([
					tx.select().from(quizResults).where(eq(quizResults.subscriberId, subscriber.id)),
					tx
						.select()
						.from(nurtureEnrollments)
						.where(eq(nurtureEnrollments.subscriberId, subscriber.id))
				])
			: [[], []];

		const orderRows = await tx.select().from(orders).where(eq(orders.email, email));
		const invoiceRows =
			orderRows.length === 0
				? []
				: await tx
						.select()
						.from(invoices)
						.where(
							inArray(
								invoices.orderId,
								orderRows.map((o) => o.id)
							)
						);

		const logRows = await tx.select().from(emailLog).where(eq(emailLog.toEmail, email));

		return {
			ok: true,
			value: {
				email,
				subscriber: subscriber ?? null,
				quizResults: results,
				nurtureEnrollments: enrollments,
				orders: orderRows,
				invoices: invoiceRows,
				emailLog: logRows
			}
		};
	});
}

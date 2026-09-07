import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
	return twMerge(clsx(inputs));
}

/**
 * DOM id / `name` base of a question or group inside a form instance:
 * `<formId>-<id>` so several forms on one page do not collide, or the raw id
 * when there is no form instance (a standalone component).
 */
export function scopedId(formId: string | undefined, id: string): string {
	return formId ? `${formId}-${id}` : id;
}

/** Id of a group wrapper element; `base` is the group's scoped id. */
export function groupElementId(base: string): string {
	return `formcomp-group-${base}`;
}

/** Id of the `role="alert"` message of a group in warning (referenced by aria-describedby). */
export function groupAlertId(base: string): string {
	return `${groupElementId(base)}-alert`;
}

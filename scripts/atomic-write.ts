// Crash-safe file writes for the content regeneration scripts (review M-9):
// a plain `writeFile` interrupted mid-write leaves a truncated bundle behind;
// writing to a temp file and renaming makes each file appear whole or not at
// all (rename is atomic within a directory on POSIX filesystems).
import { rename, writeFile } from 'node:fs/promises';

export async function writeFileAtomic(target: string, content: string): Promise<void> {
	const tmp = `${target}.tmp`;
	await writeFile(tmp, content, 'utf8');
	await rename(tmp, target);
}

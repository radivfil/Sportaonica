import { promises as fs } from "node:fs";

/**
 * Mutual exclusion for the JSON store.
 *  1. An in-process promise queue serialises concurrent requests in one Node process.
 *  2. An exclusive lock file (O_EXCL) serialises across processes (e.g. several
 *     `next start` workers sharing one disk). Stale locks are broken after `staleMs`.
 * Production should use the Supabase RPC (row-level locking) instead.
 */
const queues = new Map<string, Promise<unknown>>();

export async function withLock<T>(lockPath: string, fn: () => Promise<T>, staleMs = 10_000): Promise<T> {
  const prev = queues.get(lockPath) ?? Promise.resolve();
  let release!: () => void;
  const current = new Promise<void>((r) => (release = r));
  const chained = prev.then(() => current);
  queues.set(lockPath, chained);
  await prev.catch(() => undefined);
  try {
    await acquireFileLock(lockPath, staleMs);
    try {
      return await fn();
    } finally {
      await fs.rm(lockPath, { force: true });
    }
  } finally {
    release();
    if (queues.get(lockPath) === chained) queues.delete(lockPath);
  }
}

async function acquireFileLock(lockPath: string, staleMs: number) {
  const started = Date.now();
  for (;;) {
    try {
      const handle = await fs.open(lockPath, "wx");
      await handle.writeFile(String(process.pid));
      await handle.close();
      return;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST") throw err;
      try {
        const stat = await fs.stat(lockPath);
        if (Date.now() - stat.mtimeMs > staleMs) {
          await fs.rm(lockPath, { force: true });
          continue;
        }
      } catch {
        continue; // lock vanished between open and stat
      }
      if (Date.now() - started > staleMs * 2) throw new Error("Could not acquire data lock");
      await new Promise((r) => setTimeout(r, 5 + Math.random() * 15));
    }
  }
}

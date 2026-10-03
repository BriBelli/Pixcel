/**
 * RETRY FOR TRANSIENT MODEL-API FAILURES.
 *
 * Research is one API call deep: search the web, hand the corpus to a model, extract the facts. When
 * that single call times out, the catch returns an empty result — and an empty result is
 * indistinguishable from "we researched this model and it has no notable capabilities". The record
 * is then persisted as researched, with nothing in it.
 *
 * That is the same shape as the bug that kept the succession sweep silent for weeks: a transport
 * failure quietly becoming an answer. A timeout is not a finding. It is a reason to ask again.
 *
 * Only TRANSIENT failures are retried. A malformed request or a refused key will fail identically
 * every time, and retrying it just spends the budget three times before reporting the same thing.
 */

/** Errors worth asking again about: the network wobbled, or the provider is busy. */
function isTransient(err: unknown): boolean {
  const e = err as { status?: number; name?: string; message?: string } | null;
  if (!e) return false;
  if (typeof e.status === 'number') {
    // 408 timeout · 409 conflict · 429 rate limit · 5xx server. Everything else is OUR fault and
    // will fail the same way next time.
    return e.status === 408 || e.status === 409 || e.status === 429 || e.status >= 500;
  }
  const text = `${e.name ?? ''} ${e.message ?? ''}`.toLowerCase();
  return /timeout|timed out|econnreset|econnrefused|enotfound|socket hang up|network|fetch failed|overloaded/.test(text);
}

export interface RetryOptions {
  /** Total attempts, including the first. */
  attempts?: number;
  /** First backoff in ms; doubles each time. */
  baseDelayMs?: number;
  /** Named in the log so a retry storm is traceable to what caused it. */
  label?: string;
}

/**
 * Run `fn`, retrying transient failures with exponential backoff.
 *
 * Rethrows the last error when every attempt fails, so the caller still decides what an outright
 * failure means — this makes a flaky call reliable, it does not make a broken one succeed.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts: RetryOptions = {}): Promise<T> {
  const attempts = Math.max(1, opts.attempts ?? 3);
  const base = opts.baseDelayMs ?? 1500;
  let lastErr: unknown;

  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (!isTransient(err) || i === attempts - 1) throw err;
      const wait = base * 2 ** i;
      console.warn(
        `[retry] ${opts.label ?? 'call'} failed (${(err as Error)?.message ?? 'unknown'}) — attempt ${i + 1}/${attempts}, retrying in ${wait}ms`,
      );
      await new Promise((r) => setTimeout(r, wait));
    }
  }
  throw lastErr;
}

export { isTransient as __isTransientForTests };

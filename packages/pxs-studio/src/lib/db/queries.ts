/**
 * QUERIES — the paginated read helpers (MODIFICATION 2).
 *
 * Reads run the active-status filter AND pagination TOGETHER in ONE backend query (Brian):
 * `filter: { status:'active', thread_id }` + `limit`/`offset` in a single `repo.query`. The
 * returned `total` is the ACTIVE count only — non-active rows (inactive/deleted/edited) are
 * excluded from both the page and the total.
 *
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import type { Interaction } from './models';
import type { QueryResult, Repository } from './repository';

export interface PageParams {
  limit?: number;
  offset?: number;
  sort?: 'asc' | 'desc';
}

/**
 * List the ACTIVE interactions of a thread, paginated. One backend call: the status filter
 * and the limit/offset ride together. `total` counts active rows only.
 */
export async function listActiveInteractions(
  repo: Repository,
  user_id: string,
  thread_id: string,
  { limit, offset, sort = 'asc' }: PageParams = {}
): Promise<QueryResult<Interaction>> {
  const { items, total } = await repo.query({
    category: 'interaction',
    user_id,
    filter: { thread_id, status: 'active' },
    limit,
    offset,
    sort,
  });
  return { items: items as Interaction[], total };
}

/**
 * LIVING CONTEXT — memory-first / DB-async conversation state, addressable by interaction_id.
 *
 * The class holds an in-memory `Map<thread_id, Interaction[]>` cache (the memory-first layer).
 * Mutations touch memory IMMEDIATELY and fire the DB write async — the caller path is never
 * blocked on persistence. Every async mutator returns `{ flushed }` so tests (and any caller
 * that needs durability) can await the pending DB work.
 *
 * Reads (`hydrate`) run the active-filter + pagination together in one backend call (MOD 2).
 *
 * Pure TS — no React/Next/DOM — so it runs under `node:test`.
 */

import type { Interaction } from './models';
import { listActiveInteractions, type PageParams } from './queries';
import type { Repository } from './repository';
import { cascadeArchiveDownstream, transitionStatus } from './status';

export class LivingContext {
  private cache = new Map<string, Interaction[]>();

  constructor(private repo: Repository) {}

  /** The current in-memory interactions for a thread (empty if never hydrated/appended). */
  peek(thread_id: string): Interaction[] {
    return this.cache.get(thread_id) ?? [];
  }

  /**
   * Load ACTIVE interactions for a thread (paginated — MOD 2), cache them, and return them.
   * The status filter + limit/offset ride in a single backend query.
   */
  async hydrate(
    user_id: string,
    thread_id: string,
    page: PageParams = {}
  ): Promise<Interaction[]> {
    const { items } = await listActiveInteractions(this.repo, user_id, thread_id, page);
    this.cache.set(thread_id, items);
    return items;
  }

  /**
   * Append an interaction: push to memory NOW, flush to the DB async. The DB `put` is NOT
   * awaited in the caller path — the returned `flushed` promise exposes it for tests/durability.
   */
  append(interaction: Interaction): { flushed: Promise<void> } {
    const list = this.cache.get(interaction.thread_id) ?? [];
    list.push(interaction);
    this.cache.set(interaction.thread_id, list);

    const flushed = this.repo.put(interaction).then(() => undefined);
    return { flushed };
  }

  /**
   * Mark an interaction deleted (guarded transition) + cascade-archive the downstream ACTIVE
   * interactions. Memory is updated immediately; the DB work is fired async.
   */
  markDeleted(
    user_id: string,
    thread_id: string,
    interaction_id: string
  ): { flushed: Promise<void> } {
    const target = this.findInMemory(thread_id, interaction_id);
    // Memory-first: drop the deleted turn (and its downstream) from the visible cache.
    if (target) this.pruneFrom(thread_id, target.created_at);

    const flushed = (async () => {
      await transitionStatus(this.repo, 'interaction', interaction_id, 'deleted');
      // Cascade archives everything at-or-after the deleted turn that is still active
      // (the deleted turn itself is now non-active, so it's skipped by the guard).
      if (target) await cascadeArchiveDownstream(this.repo, thread_id, target.created_at);
    })();
    return { flushed };
  }

  /**
   * Edit: mark the target `edited`, insert `newInteraction` as its replacement
   * (parent_interaction_id = the edited id), and cascade-archive the downstream active turns.
   * Memory reflects the swap immediately; the DB work is fired async.
   */
  markEdited(
    user_id: string,
    thread_id: string,
    interaction_id: string,
    newInteraction: Interaction
  ): { flushed: Promise<void> } {
    const target = this.findInMemory(thread_id, interaction_id);
    const child: Interaction = { ...newInteraction, parent_interaction_id: interaction_id };

    // Memory-first: drop the edited turn + downstream, then append the replacement.
    if (target) this.pruneFrom(thread_id, target.created_at);
    const list = this.cache.get(thread_id) ?? [];
    list.push(child);
    this.cache.set(thread_id, list);

    const flushed = (async () => {
      await transitionStatus(this.repo, 'interaction', interaction_id, 'edited');
      // Cascade downstream ACTIVE turns to archived. The edited turn is now non-active
      // and is skipped by the guard, so it lands as `edited`, not `archived`.
      if (target) await cascadeArchiveDownstream(this.repo, thread_id, target.created_at);
      await this.repo.put(child);
    })();
    return { flushed };
  }

  private findInMemory(thread_id: string, interaction_id: string): Interaction | undefined {
    return this.cache.get(thread_id)?.find((i) => i.id === interaction_id);
  }

  /** Remove cached interactions at-or-after `from_created_at` (the memory-side of a cascade). */
  private pruneFrom(thread_id: string, from_created_at: number): void {
    const list = this.cache.get(thread_id);
    if (!list) return;
    this.cache.set(
      thread_id,
      list.filter((i) => i.created_at < from_created_at)
    );
  }
}

export function createLivingContext(repo: Repository): LivingContext {
  return new LivingContext(repo);
}

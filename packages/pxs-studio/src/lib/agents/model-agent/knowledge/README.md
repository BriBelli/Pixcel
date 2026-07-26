# Model Agent — Knowledge

Durable, human-readable knowledge the Model agent is "skilled in" — one markdown shard per provider
under `providers/`, generated from the deterministic roster (`src/lib/engine/provider-roster.ts`).

This is the **md** half of the md/json split:
- **`knowledge/`** (here) — durable knowledge (providers, and soon per-model criteria). Low-churn,
  committed, changes when the roster/registry changes.
- **`state/health.json`** — live runtime health (pings, statuses, HTTP reasons, timings). Rewritten
  every warm-up, gitignored.

Regenerate with `syncProviderKnowledge()` (see `../warmup.ts`).

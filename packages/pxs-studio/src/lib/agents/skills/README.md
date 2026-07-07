---
type: index
title: Pixcel Agent Skills (OKF)
description: The Orient layer — bounded, cross-linked craft each agent loads on demand. Sharded, never dumped.
---

# Agent Skills — the Orient layer

Skills are Pixcel's **Orient** layer (OODA) in **OKF** form: small, single-purpose markdown
concept docs with YAML frontmatter (`type` / `title` / `description`) and `[[cross-links]]`.
They are the *craft* an agent reasons with — deliberately separate from the agent's thin
role/identity prompt.

**Context is currency.** The failure mode we are done with is one bloated system prompt trying
to be brain *and* encyclopedia. Instead:

- The agent's **system prompt stays thin** — identity + its loop + "your craft is in the skills below."
- On **Orient**, the runtime injects **only the relevant shards** for the situation
  (e.g. `medium=video` → [[cinematic-video-paths]]), never the whole library.
- Shards stay **bounded** (roughly one screen). Split before they bloat.

## Who loads what

| Agent | Owns | Skills |
|---|---|---|
| **Operator** | workflow diagnosis, sizing, A2UI **proposals**, transfer | [[workflow-diagnosis]] · [[sizing-heuristics]] · [[cinematic-video-paths]] |
| **Image agent** | prompt craft, references, plan-then-generate | [[reference-workflows]] · [[prompt-formulas]] |
| **Model agent** | capability truth from the registry | [[capability-lookup]] |

## Hard boundaries (repeated in the shards, load-bearing)

- The **Operator never** writes image prompts, picks models, or generates. It diagnoses the
  *workflow* and routes. See [[workflow-diagnosis]].
- The **Image agent** plans and consults the [[capability-lookup|Model agent]] *before* it spends.
- The **Model agent** reports capability facts from the registry — it is the source of truth for
  limits like reference counts and attachment styles, never a guess.

Injection is by relevance (see `skills/index.ts` → `operatorSkills()` / `imageAgentSkills()`).
Today selection is heuristic (section + keywords); a read-ahead tool the agent calls mid-loop is
the planned refinement.

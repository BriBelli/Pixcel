---
type: concept
title: OODA + OKF — the blueprint
description: The loop (Observe/Orient/Decide/Act) run at machine velocity; Orient is the moat; OKF is how we win it; the files-vs-DB storage split.
---

# OODA + OKF

Modern agentic AI is Boyd's **OODA loop** — Observe → Orient → Decide → Act — run at machine velocity (compress the loop faster than the environment adapts). Pixcel's tuned version:

| OODA | Pixcel |
|---|---|
| Observe | **Analyze** the prompt + current state |
| Orient | **Identify** — make sense in context (the decisive step) |
| Decide | **Classify** — help · ask · transfer |
| Act | **Respond** — reply · A2UI question · transfer |

It is a **LOOP, never a line.** The Operator loops; each specialist loops; results feed back. Never force a fast loop into a brittle linear pipeline (the "Line vs Loop" trap).

## Orient is the moat; OKF is how we win it
Boyd: Orient is decisive. Google's **OKF** (Open Knowledge Format — UTF-8 markdown + YAML `type`/`title`/`description` frontmatter, cross-linked, `index.md` + `log.md`; minimally opinionated, no required folder tree) *solves the orientation bottleneck*: an agent reads a concept file and updates its worldview in one token pass — no scraping, no RAG. Our Orient layer = OKF concept docs: **models** (Model agent's knowledge) · **living context** (active + correlated records) · **assets** (8-part backbone) · **tools-as-agents** (the registry). Every action appends to a `log.md` (= our status/passLog audit).

## Storage splits by data type (not either/or)
- **OKF files = the kitchen (knowledge)** — static, authored, git-versioned: model registry, tools-as-agents, playbooks, prompt formulas, craft. The Model agent self-restocks by rewriting a `.md`, no code deploy.
- **DB = the current orders (state)** — dynamic, per-user, queryable: conversations, generated assets, the baton, the status-managed correlated graph. `assemble(active + correlated)` by query.
- Orient reads BOTH; DB state is rendered into the OKF shape on assembly.
- **Context Sharding** (never dump giant .md into context): one concept per file + read-ahead progressive disclosure (inject paths, pull on demand). **DEFERRED:** converting `model-registry.ts` → OKF files until the Model agent's self-restocking needs it.

Related: [agents-and-transfer](agents-and-transfer.md) · [workflow-sizing-and-routing](workflow-sizing-and-routing.md)

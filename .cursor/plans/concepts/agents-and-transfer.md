---
type: concept
title: Agents + Transfer
description: The Operator / specialists / Model agent, and the Transfer (hand-off = Epistemic Frame, hand-back = State Transfer Contract).
---

# Agents + Transfer

## The agents
- **Operator** (was primary/coordinator/detective) — the professional front door. Greets, validates, runs OODA, routes. Hospitality is the point (a great company's operator who transfers you to exactly the right specialist). **The transfer experience IS the product.**
- **Specialists** — Image agent, Video agent — each runs its own OODA loop and works *directly* with the user during its leg.
- **Model agent** — the cross-cutting AI-models expert (a meteorologist/financial-analyst for models: image/video/general/code — every model). Invoked BY a specialist; together they run the OODA workflow (specialist owns the creative workflow, Model owns which model + config, and drives the Prompt Guide against the targeted models).

## Transfer (the OODA hand-off)
Product word: **Transfer** ("I'll transfer you to the Image agent"). Backend: **baton** = a typed record, never prose.

**Hand-OFF = the Epistemic Frame** — the Operator injects a bounded (~<500 token) world-view: **Localized Scope** (task target + goal) · **Pruned Ontology** (only the facts this agent needs) · **Local Boundaries** (permitted actions, output budget). Header: "verified facts — don't re-verify" → specialist starts at Decide. Bloat control: read-ahead (inject OKF paths, not content) · dependency pruning (tag-match, strip unrelated = our active+correlated filter) · state-flattening (frontmatter as minified JSON).

**Hand-BACK = the State Transfer Contract** — a typed, immutable **Delta State Payload**: **Lineage** (specialist_id/loop_id/duration) · **Delta** (`added/mutated/deleted` = OUR STATUS GRAPH: added=new active, mutated=updated, deleted=→inactive) · **Signal** (status + recommended_next_phase + confidence). The Operator re-Orients without recompute: event-sourcing (apply the delta as code) · context-masking (inject only the delta) · signal short-circuit (jump to Decide; confidence drives the escalation boundary → hand back to Operator or ask the user).

Stack: TS interfaces + our SQLite status-DB as the event store — NOT Pydantic/LangGraph.

Related: [ooda-okf](ooda-okf.md) · [workflow-sizing-and-routing](workflow-sizing-and-routing.md)

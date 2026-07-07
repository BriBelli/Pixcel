---
type: concept
title: Workflow sizing + section-aware routing
description: Match workflow weight to intent (small/large), never over-gate; the entry section sets the Operator's prior; the three routing targets; A2UI + everything-is-a-chat.
---

# Workflow sizing + routing

## Sizing — match weight to intent, never over-gate
The Operator dispatches a workflow SMALL or LARGE, sized to how deep the user wants to go:
- **Small / quick** — bare nameable subject / casual "just make me a z28 camaro" → fast inline image in chat, no Prompt Guide. Keep it (many personas want exactly this). It **gracefully offers escalation** ("Want to go deeper with a custom image workflow?") — predictive default + choose-for-yourself, never forced.
- **Large / heavy** — depth/project/scene/iteration/consistency → transfer to the Image agent + Image IDE.

**Over-gating** (forcing the heavy process on every prompt) is the anti-pattern — Photolif's brittle pipeline and the pixel-artisan's forced bonus-loop churn are both this. Gate only when it earns its keep.

## Routing is SECTION-AWARE + agent-designed
The entry nav section sets the Operator's prior: **Chat** = broad/from-scratch (a video scene from a cold prompt reasonably locks a reference image first → transfer to Image, but EXPLAIN the why) · **Image** = assume image · **Video** = assume video (recommend references, don't force an image detour). Video best-practice (start/end frames, char refs, storyboards) is too situational to hardcode → the agent **designs the workflow in real time**, never a fixed route.

## Three routing targets
① **Chat** — answer directly, no transfer. ② **Image** — images (incl. images a video needs) → Image agent. ③ **Video** — films/shorts (requires images) → Video agent.

## A2UI + everything-is-a-chat
One engine (context + dynamic A2UI + agent brain), configured per workflow — no bespoke IDEs. Agents ask via a **formatted A2UI question** (label + text-area; chips only when the axis is known), never prose. The composer is the user's own prompt line. Claude Design = gospel; calm/direct, no fluff.

Related: [ooda-okf](ooda-okf.md) · [agents-and-transfer](agents-and-transfer.md)

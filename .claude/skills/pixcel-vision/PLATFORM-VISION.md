# The Platform Vision — weaving the two projects together

*Added 2026-06-22. The merge of the other project (multi-LLM + image/video → JSON, file editing) with
this one (the Statue Method autonomous convergent agent + the Pixcel pixel pattern). v1 — will sharpen.
Tags: `[proven]` / `[hypothesis]` / `[bet]`. Note: reasoned from Brian's description of the other
project, not its code — revisit when that codebase is in hand.*

## The realization
**Two independent projects converged on the same primitive: media-as-structured-JSON, not files.**
- Other project: images/video (and edits) → JSON. Found the JSON pattern was the real value.
- This project: pixel art → JSON (`PXSFrame`). "Stay Pure," hardware-valid, authored grid.

When two efforts land on the same abstraction from opposite ends, that abstraction is the core.
**Data-as-JSON is the platform substrate**, and both projects already speak it — that's the seam. `[bet]`

## What each side brings
| Other project | This project |
|---|---|
| Multi-LLM (all major labs), run separate **or** dual/parallel | The **Statue Method** — autonomous, *convergent* agent |
| Image + video generation + **editing** | **Depth/craft** quality + the **watchable** process |
| Breadth of media types → JSON | The **pixel pattern** (proven hero vertical) + trajectory data |

Breadth (other) × depth/convergence (here), unified by the JSON primitive.

## Brian's three moves — my honest take

**1. Brittle AI workflow → an autonomous agent that *creates* proper workflows.**
This is the highest-value move, and **the thing you built here is literally the cure.** Brittle
pipelines fail from drift; open-ended agents fail from wandering. The Statue Method's discipline —
**commit the plan (VISION), rough it (SHAPE), refine on top (POLISH), verify (QA), never regress
(keep-best), with an independent auditor** — is exactly what makes generation *converge* instead of
churn. Generalize it from "paint pixel art" to "**author a workflow**": VISION = commit the workflow
plan; SHAPE/POLISH/QA = build → refine → validate the pipeline; keep-best = never ship a regressed
workflow. **The anti-churn machinery you fought for is the anti-brittleness machinery for agents.** `[bet]`

**2. Multi-LLM (Claude / GPT / Gemini), separate or dual.**
Right instinct, but the clean architecture is **model-per-ROLE, not "run everything always"** (that
just multiplies cost). The Statue Method already splits into roles:
- **Brain / judge / orchestrator** (reasoning): the VISION step, the auditor, the eyes-open decide-loop.
  Claude plays this here; GPT/Gemini can play it too — that's where **parallel/consensus** earns its
  keep (the "forum of LLMs" as a judge panel, or A/B across brains).
- **Hands / generator** (raster media): for images/video, the *generation* models (Gemini image,
  GPT-image, video models) are the strong hands; the brain orchestrates + judges them.
- *Note the pixel case is special:* the drawer is **reasoning-driven** (Claude writes the char-map by
  thinking, not by rastering), so here Claude is **both** brain and hands. For image/video you split
  them. That split *is* the multi-LLM architecture.

So: **reasoning models orchestrate + judge, generation models produce, the Statue Method converges
them, everything serializes to JSON.** Keep it a separate phase (agreed) — but design the role
abstraction now so the engine isn't Claude-hardwired. `[hypothesis]`

**3. Keep Pixcel (pixel) as core; merged thing as a new tab / the exclusive IP that grows.**
One gentle reframe. What you're actually building is a **media-as-JSON autonomous creative platform**;
**pixel art is vertical #1** — the proven, recognizable, *fundable* hero. Ship it as the anchor. But
the merged engine isn't a side feature — it's the **foundation pixel-art already sits on.** Fine to
*surface* it as a tab; just **architect pixel-art as one vertical on the shared core**, not the core
with a bolt-on. The IP/growth lives in the platform (convergent agent + multi-LLM + JSON); the hero
lives in the pixel tab.

## The unified architecture (the weave)
```
SURFACES   Pixel-art (hero tab)  ·  Image/Video gen+edit  ·  Autonomous Studio (IP/growth tab)
              │                       │                         │
ENGINE     ───┴───────────────────────┴─────────────────────────┘
           The Statue Method, generalized: a convergent autonomous agent that
           commits a vision/workflow → shapes → polishes → QAs → keep-best.
              │
MODELS     Multi-LLM as ROLES: reasoning brains (orchestrate/judge, optional consensus)
           + generation hands (image/video). Right model per job.
              │
PRIMITIVE  Media-as-JSON — the shared contract every surface serializes into
           (PXSFrame · image-as-JSON · video-as-JSON · edit-as-JSON). The moat + the seam.
```

## Input images — two paths, one seam (the exemplar line holds)
Brian **already ported this engine's image→JSON conversion into the sister project** — it instantly
turns image files into PXSFrame JSON records in the DB. `[proven]` That confirms the seam is real and
two-way. There are **two legitimate image paths, and one forbidden one:**

1. **Mechanical convert** — `ImageHelpers.loadImage()` faithfully quantizes an image → PXSFrame. No
   LLM, deterministic, instant. The **storage/digitize** path (the sister project's "image file → JSON
   record"). No exemplar issue — it's format conversion. ✅
2. **Image as intent → VISION** — the user attaches an image as the *subject*; the **VISION step reads
   it** and commits an *original* design brief; the drawer paints from reasoning. "Make pixel art OF
   this." ✅ on-method.
   ```
   attach image ─▶ VISION (Claude vision: read subject, salient features, pose)
                    ─▶ commit ORIGINAL brief + palette ─▶ SHAPE→POLISH→QA (paint from reasoning)
   ```
3. **Image as style exemplar to the drawer** — "imitate these sprites." ❌ A/B-proven harm
   (homogenizes, caps the ceiling). Same for Tavily/internet *reference images*.

**The line:** an image may define **WHAT** to depict, or be **digitized faithfully** — it must never be
the **style the drawer copies**. Tavily belongs to the platform's research-agent layer, not the
drawer's eyes. See [[feedback_no-exemplars-pure-reasoning]] + docs/PIXCEL-CRAFT-RUBRIC.md.

## The honest risks
- **Scope explosion / lost focus.** Merging two apps + multi-LLM + image + video + autonomous
  workflows is enormous. The Statue Method's own lesson — *commit a vision, don't sprawl* — applies to
  **the merge itself.** Commit the unifying thesis; shape the seam; resist building everything at once.
- **The commodity trap.** There are many "multi-model AI media tools." Multi-LLM and image/video are
  **table stakes** — not the pitch. The differentiation stays exactly what it was: **structured-data
  output + the convergent autonomous method + the watchable process + the trajectory data.** Lead with
  the IP; use multi-LLM/image/video as enablers.
- **Multi-LLM cost/complexity.** Be deliberate — roles + consensus-where-it-pays, not all-models-always.
- **Don't break the proven core.** keep-best applies to the codebase: the pixel engine works — merge
  *around* it, don't destabilize it.

## Sequencing (apply the Statue Method to the merge)
1. **VISION** — write the one-sentence unifying thesis (below). Commit it. This prevents the sprawl.
2. **SHAPE** — build the **seam first**: (a) generalize the engine off pixel-specifics into a reusable
   convergent core; (b) the shared media-as-JSON contract. Then prove **one non-pixel media type flows
   through the Statue Method** (an image edit, or SVG) — the cheap Layer-2 probe. If it converges, the
   platform thesis is real.
3. **Multi-LLM** — separate phase (agreed). Design the role abstraction now; implement later.
4. **POLISH/QA** — the tabs/UX and the cross-surface experience.
5. **keep-best** — never destabilize the shipping pixel hero while weaving.

## One-line truth
*You didn't build a pixel-art app and a media tool — you built (twice) a **media-as-JSON platform**, and
the Statue Method is the convergent autonomous engine that makes multi-LLM workflows produce *finished*
work instead of brittle or wandering ones. Pixel art is the proven hero; the platform is the IP that
grows. Merge with the same discipline that made the art converge: commit the vision, shape the seam,
keep-best.*

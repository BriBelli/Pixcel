# Plan (DEFERRED) — Image attachment as INTENT → the VISION step

> **Status: NOT STARTED — captured for later.** Build when the M3 engine work settles. Another thread
> is currently editing the engine files; **re-validate this plan against current code before executing.**
>
> **The principle (locked):** an input image may define **WHAT** to depict — never **HOW** to draw.
> The attachment enters at the **one safe place: VISION.** It becomes *understanding* (a committed text
> brief), not *imitation*. **The drawer and auditor never see the source image.** That's how we get
> image-input *without* regressing pure-reasoning quality. See docs/PIXCEL-CRAFT-RUBRIC.md +
> [[feedback_no-exemplars-pure-reasoning]].

## Goal
Let a user attach an image as the **subject** ("make pixel art *of* this"). The engine reads it once,
in VISION, commits an **original** design brief + palette, then paints from reasoning as it does today.

This is distinct from the **mechanical convert** path (`ImageHelpers.loadImage` → faithful PXSFrame),
which already exists and is unchanged. Convert = digitize; this = *interpret*.

## The flow
```
attach image ─▶ VISION (Claude vision: read subject, salient features, pose, framing, suggested palette)
                 ─▶ commit ORIGINAL brief (TEXT) + palette
                 ─▶ SHAPE → POLISH → QA  (drawer + auditor get the TEXT brief only — NEVER the image)
```

## The one hard guarantee (design for it, test for it)
**The source image is added to exactly ONE message: the VISION/`designVision` call.** It must never
appear in the drawer's or auditor's message content. Make this true *by construction*:
- the image lives in a local variable scoped to the vision call;
- the brief returned by VISION is plain text + palette (what the rest of the pipeline already consumes);
- add a code comment + ideally an assertion/guard that drawer/audit message builders receive no image
  blocks.

## Work items (verify file paths first — engine is being edited)
1. **VISION call accepts an optional image** — `lib/live-jobs.ts` `designVision` (or current equivalent):
   take optional `imageBase64`; when present, send a multimodal content block (image + the existing
   vision instruction) to the vision model. Prompt addition in `lib/ai-art-system-prompt.ts`
   (`statueVisionSystemPrompt` / `statueVisionUserMessage`): *"A reference image of the SUBJECT is
   attached. Read what it depicts — subject, key identity features, pose, framing — and commit an
   ORIGINAL pixel-art design that READS as that subject at the target size. Do NOT trace or copy it;
   design from understanding. Honor the craft rubric (fit-to-size, fill the frame, limited palette)."*
2. **Drawer/auditor untouched** — they keep receiving the committed text brief only. Confirm no image
   leaks into their context (the guarantee above).
3. **Transport** — the route (`generate-art` and/or `live-art`) accepts an optional image (base64);
   pass it through to the engine; cap size / validate mime; strip it from anything logged verbosely.
4. **UI** — attach control in the prompt panel (`LiveArtisanPanel` / chat panel): preview thumbnail +
   remove; send alongside the text prompt. Text + image both feed VISION (text = extra direction).
5. **SSE** — no new event needed; `vision.committed` already carries the brief the UI shows. Optionally
   add `vision.source` (a flag that an image was used) for the live show.

## Edge cases / decisions
- **Image + text prompt** → both go to VISION (text refines the read, e.g. "make it cute / 16²").
- **Which path does the user want?** Two buttons or a toggle: **"Convert"** (mechanical digitize) vs
  **"Create art of this"** (intent→VISION). Don't silently pick — they're different products.
- **Vision-capable model** — VISION must run on a vision model (Opus 4.8 has vision). In the future
  multi-LLM world this is the "brain" role; keep the image bound to that role only.
- **No Tavily / no internet reference here.** Research stays in the platform layer, not the drawer.

## Verification
1. Attach a photo (e.g. a real owl) → confirm the committed brief *describes the subject* in the
   engine's own words (not "copy this image").
2. **Inspect the drawer/auditor messages** (log/trace) → confirm **zero image content blocks**. This is
   the regression guard.
3. Output is **original pixel art** that reads as the subject — not a quantized look-alike (that's the
   convert path). Compare against a pure-text run of the same subject: quality should match, not drop.
4. `cd packages/pxs-studio && tsc --noEmit`.

## Out of scope (note, don't build)
- Multi-image / style-transfer (that's exemplar territory — forbidden for the drawer).
- The mechanical convert UX (already exists).
- Multi-LLM role routing (separate phase — see pixcel-vision/PLATFORM-VISION.md).

# Model Capability Requirements — the Pixcel pipeline

What a model's API **must** support to run the *full* Pixcel generation pipeline (the
[artisan loop](AGENTIC-ARTISAN-THESIS.md), not the degraded tool-less chat version). Stated
vendor-neutrally: each item lists the **Anthropic feature we use**, the **generic capability**
it maps to, **where it's used**, and **why there's no bandaid**. If a model lacks a HARD
requirement, it's out — we do not work around it.

> Note: this lists *capabilities*, not a per-vendor support table. Vendor feature sets change
> constantly; verify each candidate against its own current API docs using the checklist at
> the end. (I do not assert what any specific competitor supports today.)

---

## HARD requirements (missing any → the model is out)

### 1. Multimodal **vision input** (image understanding)
- **Anthropic feature:** image content blocks — `{ type: "image", source: { type: "base64",
  media_type: "image/png", data } }` — passed back into the conversation.
- **Generic capability:** the API accepts images as input and the model can reason about their
  *visual* content (well enough to judge a small pixel render).
- **Where used:** every draft is rendered to a real PNG and shown back to the model so it
  **sees its own work** and fixes what it sees (the "blindfold off" loop); the best-of judge
  also *looks* at rendered candidates.
- **Why no bandaid:** without vision the model can only re-read its own coordinates/char-map —
  that is exactly the blind self-critique that never converged in the months-long failures.
  The "char-map *is* the render" text trick is a deliberate **degraded** mode for tool-less
  chats; using it on a vision-capable pipeline would be a bandaid. → **out.**

### 2. **Reasoning / extended thinking** with controllable, *high* effort
- **Anthropic feature:** `thinking: { type: "adaptive" }` + `output_config: { effort: "high" }`.
- **Generic capability:** a genuine internal reasoning/thinking mode that can be set to a high
  effort/budget (a true "reasoning model," not just a chat model with a "think step by step"
  instruction).
- **Where used:** every draft. Quality lives in the reasoning depth.
- **Why no bandaid:** throttling reasoning produced blobs in our own tests; prompt-only
  "reasoning" on a non-reasoning model is a bandaid for the exact thing that determines
  quality. → **out.**

### 3. **Tool use / function calling** with JSON-Schema-constrained arguments
- **Anthropic feature:** `tools: [{ name, input_schema }]` (our `submit_art` takes the
  char-map schema); plus structured outputs (`output_config.format`) for the judge verdicts.
- **Generic capability:** function/tool calling where the arguments are **validated against a
  JSON Schema**, or equivalent strict structured output.
- **Where used:** the artist submits its drawing as a schema-validated char-map; the judge
  returns a schema-validated verdict.
- **Why no bandaid:** parsing free-text "here's the JSON" is brittle — it's the same
  unreliability that sank the one-shot approaches. Schema enforcement is required. → **out** if
  only free-text output is available.

### 4. **Multi-turn tool use _with images in the loop_** (the combination)
- **Anthropic feature:** appending a `tool_result` / user turn that contains an **image**, then
  the model reasons over it and calls the tool again — repeatedly.
- **Generic capability:** the API allows an image to be fed back *inside an ongoing tool-use
  conversation* and the model continues the loop.
- **Where used:** draw → (image fed back) → judge → draw again. The entire OODA loop.
- **Why no bandaid:** many models support vision **or** tools, but the pipeline needs them
  **together, multi-turn** — image in, tool call out, repeat. If the API can't place an image
  mid-tool-loop, the loop can't run. → **out.**

---

## STRONGLY RECOMMENDED (degrades UX / reliability if missing, not quality)

### 5. **Token streaming** (SSE)
- **Anthropic feature:** `messages.stream()`.
- **Why:** powers the live "watch it design + improve" progress, and prevents request
  timeouts on long generations. Not quality-critical, but the experience and long-run
  reliability depend on it.

### 6. Adequate **output-token budget** + context window
- Our char-map encoding already keeps output small (≈ 1 char/cell), so this is rarely the
  binding limit now — but the model still needs enough output budget for the largest grids
  plus its reasoning tokens, and enough context to hold the multi-turn image loop.

---

## The one-line test for any candidate model

> Can it, **in a single multi-turn conversation**: (a) call a **schema-constrained tool**, (b)
> receive an **image** of the result back, (c) **reason at high effort** about what it sees, and
> (d) call the tool again to fix it — looping until done?

If yes → it can run the full pipeline. If any of (a)–(d) is missing → it's out (or limited to
the degraded tool-less char-map mode, which we are not using).

## Verification checklist (run against the model's live docs/API)

- [ ] Accepts image inputs (base64 and/or URL); vision quality good enough to judge a small render.
- [ ] Real reasoning/thinking mode with a high/controllable effort setting.
- [ ] Tool/function calling with JSON-Schema-validated arguments (or strict structured output).
- [ ] Allows an **image inside a tool_result / follow-up turn**, multi-turn, and continues the loop.
- [ ] Streaming responses.
- [ ] Output token + context budget sufficient for the target resolution + reasoning.

---

## Footnote: the tool-less chat version

The portable [PIXCEL-SKILL.md](PIXCEL-SKILL.md) runs on *any* text LLM because it replaces
vision with "re-read your own char-map." That is a real, useful mode for experimenting in a
plain chat — but it is the **degraded** path. The requirements above are for the **full**
pipeline, where the model literally sees and fixes its own rendered art. Per your call:
models that can't meet the hard requirements are simply out.

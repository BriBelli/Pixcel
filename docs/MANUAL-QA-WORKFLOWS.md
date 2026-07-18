# Pixcel Studio — Manual QA Workflows (end-to-end)

A run-and-document checklist across everything we currently have. Perform in order; record
**PASS / FAIL + notes** on each. Grounded in the real entry points (routes, buttons, SSE events) as
of `feature/model-registry`.

> Legend — **Trigger** = how you start it · **Expect** = the observable outcome · **Record** = your result.

---

## 0 · Setup (do first)

- **0.1 Start dev.** From repo root: `npm run studio:dev` (uses the Node-24 shim; the studio requires Node ≥24).
  - Expect: Next.js 16 boots, no crash. Open the printed localhost URL.
  - Record: ⬜
- **0.2 Env keys** in `packages/pxs-studio/.env.local`:
  - `ANTHROPIC_API_KEY` — required for statue/live engine, generate-art, Operator, image-agent.
  - `GEMINI_API_KEY` — required for real image **pixels** in the image-agent path.
  - Without a key the route returns HTTP 500 `"…_API_KEY is not set"`. Confirm both are set.
  - Record: ⬜
- **0.3 Cost note.** Live/generate/Operator/image-agent all **meter + hard-cap** spend per user. For pure
  *mechanics* smoke tests use `model: "claude-haiku-4-5"` (cheap); for *quality* runs use `claude-opus-4-8`.
  Watch cost via the `cost.update` SSE events / usage records.

---

## 1 · Art / Statue Engine (the crown jewel)

> ⚠️ **Finding to confirm first (WF-ART-0):** the live-show UI (`MatrixArtStage` + `LiveArtisanPanel`,
> inside `Studio.tsx`) only renders when `page.tsx` stage === `'studio'`, and the surface map found **no
> wired nav/button that sets `'studio'`** on this branch (NavRail is Chat/Image/Video/Assets only). So the
> live show may currently be reachable **only via the API**. **Action:** confirm how you open the live show
> in-app. If there's no entry, that's a gap to fix before UI testing — flag it and use the API path (1A) meanwhile.

### 1A · Instant Statue via API (VISION → refine → bonus → keep-best)
- **Trigger (start):**
  ```bash
  curl -s -X POST localhost:3000/api/live-art \
    -H 'content-type: application/json' \
    -d '{"prompt":"a barn owl on a branch at dusk","size":32,"model":"claude-haiku-4-5"}'
  # → {"jobId":"..."}
  ```
- **Trigger (watch the live paint):**
  ```bash
  curl -N "localhost:3000/api/live-art?id=<jobId>&stream=1"
  ```
- **Expect (SSE event order):** `job.started` → `vision.start` → `vision.committed` (brief/palette/cols/rows)
  → repeated `stage.enter` · `pass.start` · **`pass.delta`** (cell-by-cell strokes) · `pass.done` · `audit.verdict`
  → `keepbest.snapshot`/`keepbest.shipped` → `job.done`. Every event carries `seq` + `costUsd`.
- **Expect (behavior):** VISION commits a design brief + palette + aspect; the refine loop names ONE
  highest-value flaw per pass and fixes it; it ends on a **human keep/reject verdict** (not auto-saved).
- **Record:** ⬜ (note: did strokes stream? did it converge? final look at `?id=<jobId>&full=1`)

### 1B · Steamroller discipline (observe, not a button)
- **Trigger:** same job as 1A — read the `pass.start` messages.
- **Expect:** each pass sweeps the whole asset and calls out a single flaw (top→bottom discipline). If the
  same element is reworked twice it's forced to simplify; a stuck design may `redesign` (re-VISION simpler,
  max 2). No infinite churn.
- **Record:** ⬜

### 1C · Bonus loop / polish (always-attack, keep-better, stop on 2-dry)
- **Trigger:** happens automatically once the refine loop APPROVES; or manually hit **↻ Iterate** in review UI.
- **Expect:** up to 4 bonus attempts, each A/B compared and **biased to keep the current** (non-regressive);
  only a real improvement sticks; stops after 2 consecutive non-improvements. Events carry stage `'bonus'`.
- **Record:** ⬜

### 1D · Live controls (while a job runs)
- **Trigger (each is `POST /api/live-art` with the job `id`):**
  - Pause / Cancel: `{"id":"<id>","control":"pause"}` / `"cancel"`
  - Live feedback mid-run: `{"id":"<id>","feedback":"make the eyes larger"}`
  - Keep / reject verdict: `{"id":"<id>","verdict":"keep"}` / `"reject"`
  - Resume: `{"id":"<id>","resume":"<id>"}`
- **Expect:** `job.paused` / `job.cancelled` fire; feedback appears as `feedback.injected` and changes the next
  pass; verdict finalizes; resume continues from the last frame.
- **Record:** ⬜

### 1E · Quick generate (synchronous artist — `/api/generate-art`)
- **Trigger:**
  ```bash
  curl -N -X POST localhost:3000/api/generate-art \
    -H 'content-type: application/json' \
    -d '{"prompt":"a red maple leaf","size":16,"model":"claude-haiku-4-5"}'
  ```
- **Expect:** NDJSON `status` · `plan_delta` (thinking) · `iteration` (draft frames) · `frame` (final) · maybe
  `error`. Draw→render→see→fix loop; keeps the best draft if it hits the cap without a clean DONE.
- **Record:** ⬜

---

## 2 · Main Studio Flows

### 2A · Splash → chat (persistent shell)
- **Trigger:** load `/`. Type a prompt on the splash and submit.
- **Expect:** the shell (NavRail + wall + Settings) does **not** re-mount; only the center well cross-fades
  splash→chat; chat mounts already "thinking." (Persistent-shell behavior — nothing flickers/reflows.)
- **Record:** ⬜
- **2A.2** `/?new` forces first-visit copy; without it, a returning user (has projects) sees "Welcome back."
- **Record:** ⬜

### 2B · Operator classification (`/api/chat-turn`)
- **Trigger:** in chat, send prompts of different intent, e.g. (i) "make me an image of a fox",
  (ii) "what models do you support?", (iii) something ambiguous.
- **Expect:** one hospitable opener streams as text, then a `decide` verdict acts: image intent → **transfer**
  into the image workspace (`transfer` + `frame`); ambiguous → an A2UI **question**/**options** block; casual →
  reply + suggestion chips. Spend is gated before any token; usage is metered.
- **Record:** ⬜ (note which action each prompt produced)

### 2C · Image agent + Prompt Guide builder (`/api/image-agent`)
- **Trigger:** after a transfer, land on the image workspace. Edit the **Prompt Guide** parts; watch the score.
- **Expect:** the builder A2UI block renders parts + values; editing a part updates the single-surface prompt
  string (color-coded, dim comma separators) and the **honest per-part score** moves (reaches 1.0, no 80% cap).
  The agent can co-edit the parts.
- **Record:** ⬜
- **2C.2 References block:** the model-agent recommends "attach up to N" as a **fact** (e.g. nano-banana = 3),
  and may surface support you didn't ask for. Confirm N matches the chosen model.
- **Record:** ⬜
- **2C.3 Real pixels:** with `GEMINI_API_KEY` set, a generation renders image tiles (`image` events).
  Without it: the agent still reasons/streams text but no tiles.
- **Record:** ⬜

### 2D · @-mention typeahead (Composer)
- **Precondition:** save at least one asset first (see 2F).
- **Trigger:** in the workspace composer, type `@` then a few letters of a saved asset's name/tag.
- **Expect:** a live dropdown of matching saved assets; ↑/↓/Enter/Tab to pick; Esc closes. Picking inserts
  `@name ` and attaches the asset **by id** (real lineage — no duplicate upload).
- **Record:** ⬜
- **2D.2 Lineage:** generate with an @-mentioned reference, then check the asset's lineage — the generation's
  `reference_asset_ids` should point at the **existing** saved asset id, not a new copy.
- **Record:** ⬜

### 2E · Save-to-Assets (hover Save on a tile)
- **Trigger:** hover a generated tile → click the **Save** (💾) icon.
- **Expect:** the icon flips to a check ("Saved"); the tile is promoted to a durable `retention:'saved'` asset;
  saving the same tile twice is idempotent (deduped by url).
- **Record:** ⬜

### 2F · Assets catalog
- **Trigger:** NavRail → **Assets**.
- **Expect:** full-view catalog (grid, kind chips, search); lists saved assets newest-first; drag-drop upload;
  Details drawer edits title/alt/caption/tags/description; Delete soft-deletes. (Should be the NEW catalog, not
  the old Pixel Studio screen.)
- **Record:** ⬜

### 2G · Projects panel (thread = project)
- **Trigger:** NavRail → **» Projects** toggle (bottom, above avatar).
- **Expect:** slide-out list sorted by last-updated; **New project** resets to a fresh chat; **open** a project
  hydrates its history (`/api/chat-history`) and moves it to the top; inline **rename**; **delete** with a confirm
  ("Delete project + its assets?").
- **Record:** ⬜
- **2G.2 Round-trip (protect this):** open a project → work → navigate away → back. Everything reloads as a
  pristine changelog; **nothing is lost** (the 360° state-preserving loop).
- **Record:** ⬜

### 2H · Delete last turn
- **Trigger:** delete the most recent chat turn (calls `/api/chat-mutate`).
- **Expect:** the turn is removed and the thread state stays consistent on reload.
- **Record:** ⬜

---

## 3 · Model Registry (self-maintaining — curl for now)

> No UI trigger yet (cron/manual by design). GET reads need no key; POST does real work.

### 3A · Read what the agent knows
- **Trigger:** `curl -s localhost:3000/api/models/refresh` and `curl -s localhost:3000/api/models/maintain`
- **Expect:** refresh GET → `{providers:[…]}` (last-checked, confirmed, discovered, unconfirmed per provider,
  empty on a fresh DB); maintain GET → `{cards:[…]}` (discovered/researched models + seed overrides).
- **Record:** ⬜

### 3B · Force a refresh pass (real network to provider /models)
- **Trigger:** `curl -s -X POST localhost:3000/api/models/refresh`
- **Expect:** a `summary` — `providersChecked` includes providers with a `modelsEndpoint` + a key set (google,
  openai, …); `discoveredCount` / `unconfirmedCount` reported. Re-run immediately → **fewer/zero** providers
  checked (TTL not lapsed = stale-while-revalidate working).
- **Record:** ⬜

### 3C · Run maintenance (LLM spend — deliberate)
- **Trigger:** `curl -s -X POST localhost:3000/api/models/maintain`
- **Expect:** a `summary` — `researched` (discoveries turned into cards), `incremented`/`retired` (ghost aging),
  `reset`. Then `GET /maintain` shows new cards. A discovered model should become routable in later image runs.
- **Record:** ⬜

### 3D · Lazy trigger (no action — verify it never taxes a turn)
- **Trigger:** run any image-agent turn (2C).
- **Expect:** the turn returns normally; a background refresh may fire **only** if a provider is past its 24h TTL.
  No added latency on the user's turn.
- **Record:** ⬜

---

## 4 · Known gaps / things to confirm (report back)

- **G1 — Live-show UI entry:** is there a way to open the `'studio'` stage (Matrix live show) from the UI? The
  map found none. If not, we should wire a temporary entry so the crown jewel is testable in-app.
- **G2 — Registry UI:** refresh/maintain are curl-only. Decide if they get a small admin surface (or stay cron).
- **G3 — Node 24:** the `node:sqlite` DB requires Node 24; the dev shim handles it. Confirm no accidental Node-20 runs.

---

### Suggested pass order
0 (setup) → 2A–2H (studio flows, no/low spend) → 3A–3D (registry) → 1E (quick generate) → 1A–1D (live engine,
higher spend) — cheap-mechanics first, crown-jewel quality last.

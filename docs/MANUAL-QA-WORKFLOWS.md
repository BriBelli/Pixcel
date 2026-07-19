# Pixcel — Manual QA Checklist (Nav · Agent Orchestration · Image Workspace)

A granular, **try-to-break-it** checklist for a steamroller / statue-refinement pass on the surface
in the studio image workspace: primary nav, agent orchestration & surfacing & intelligence, the
Prompt Guide, references, and the Agent panel.

> **Out of scope this pass:** the Pixcel Art / statue / live-show / generate-art engine — intentionally
> excluded (the prior version with that section is in git history; restore for a later pass).

**How to use:** check ⬜ → ✅ pass / ❌ fail. On any ❌ or "meh", jot the flaw inline — that's the
steamroller fuel. Cheap/no-spend items first; real generation last.

---

## 0 · Setup
- ⬜ **0.1** `npm run studio:dev` boots (Node 24 shim), no console errors on load.
- ⬜ **0.2** `ANTHROPIC_API_KEY` set (Operator + image agent); `GEMINI_API_KEY` set (real pixels).
- ⬜ **0.3** Reload the page a few times — no flash of wrong state, no layout jump.

---

## 1 · Primary Nav & Persistent Shell
- ⬜ **1.1** Nav shows Chat · Image · Video · Assets; the active section is visibly selected.
- ⬜ **1.2** Click each section — the center well swaps, but the shell (nav + wall) does **not** re-mount / flicker.
- ⬜ **1.3** Collapse toggle (`»`) collapses the rail; expand (`«`) restores it. State holds across a section switch.
- ⬜ **1.4** Projects toggle (bottom, above avatar) opens the slide-out; opens/closes cleanly.
- ⬜ **1.5** Avatar / settings popover opens; Settings reachable; closes on outside-click.
- ⬜ **1.6** Rapidly click between sections 10× — no stuck state, no doubled panels, no console errors.
- ⬜ **1.7** Video section: confirm it degrades gracefully (placeholder / honest "coming" state, no crash).
- **Break-it:** ⬜ **1.8** collapse the rail mid-generation — does the workspace keep streaming? ⬜ **1.9** open Projects while the agent is mid-reply — no state clobber.

---

## 2 · Splash → Chat Entry
- ⬜ **2.1** Load `/` → splash. Type a prompt, submit → cross-fades to chat, mounts already "thinking."
- ⬜ **2.2** Shell doesn't re-mount on the splash→chat transition (nothing reflows/flickers).
- ⬜ **2.3** `/?new` forces the first-visit greeting; without it a returning user sees "Welcome back."
- **Break-it:** ⬜ **2.4** submit an empty/whitespace prompt — blocked or handled, no dead transition. ⬜ **2.5** submit a huge paragraph — transitions cleanly, nothing truncates the flow.

---

## 3 · Agent Orchestration — Operator (the intelligence)
- ⬜ **3.1** Send an image intent ("I want to create a car") → hospitable opener streams, then **transfers** to the image specialist ("bring in the image specialist to shape the details"). Model badge shows **Opus 4.8**.
- ⬜ **3.2** Send a casual/question ("what models do you support?") → replies (no needless transfer), may show suggestion chips.
- ⬜ **3.3** Send an **ambiguous** intent → the Operator **cross-validates** (an A2UI question/options block: "[Use Pixcel Studio][Use Image Model][Other]"), doesn't silently guess.
- ⬜ **3.4** Timestamps + model badge render on each message; agent avatar on the left, user on the right.
- ⬜ **3.5** The opener is warm/professional (production voice, never toy/cute).
- **Break-it (intelligence stress):**
  - ⬜ **3.6** Intent with two goals in one message ("a logo AND a photo of a car") — does it disambiguate sensibly?
  - ⬜ **3.7** Nonsense / gibberish — graceful clarify, not a wrong confident transfer.
  - ⬜ **3.8** Send a message, then immediately send another before the first finishes — no interleave corruption.
  - ⬜ **3.9** The **big car-scene paragraph** (from your prompt) — does the Operator parse intent correctly and transfer, not choke on length?
  - ⬜ **3.10** Refresh the page mid-reply — on reload the thread rehydrates as a clean changelog, nothing half-written.

---

## 4 · Prompt Guide — Builder Parts & Score (surfacing intelligence)
- ⬜ **4.1** After transfer, the Prompt Guide opens titled "Prompt guide · <subject>" with 5 parts: Subject · Action · Context · Composition · Style.
- ⬜ **4.2** Header shows model-aware copy: "Each part maps to what **Nano Banana** rewards" and a **Prompt quality** score + "Thin · N/5 parts".
- ⬜ **4.3** Empty parts show a **THIN** badge; the badge clears as a part is filled.
- ⬜ **4.4** Each part has guidance text (e.g. Subject: "be specific about materials and texture") and suggestion chips (+ classic muscle car, + sleek EV, …). Clicking a chip appends it to that part's value.
- ⬜ **4.5** The **score moves** as parts fill and reaches **100%** when rich (confirm **no 80% cap**).
- ⬜ **4.6** The per-part weighting feels right (Subject/Style move the score more than others).
- **Break-it:**
  - ⬜ **4.7** Fill only Subject → score reflects partial; fill all 5 richly → near/at 100%.
  - ⬜ **4.8** Paste a paragraph into one part — no layout break, score sane.
  - ⬜ **4.9** Clear every part — score drops gracefully, no NaN/────.

---

## 5 · Single-Surface Prompt String (the color-coded field)
- ⬜ **5.1** Bottom bar reads as ONE field: "a car, action, context, composition, style" with **dim comma separators** and each part **color-coded** (Subject/Action/Context/Composition/Style legend + word count · %).
- ⬜ **5.2** **Two-way binding:** edit a part in the Guide → the string updates; edit the string → the part updates. No lost characters at phrase boundaries.
- ⬜ **5.3** The info (i) affordance explains the color mapping; the close (×) dismisses the bar.
- ⬜ **5.4** Legend colors match the part labels exactly.
- **Break-it:**
  - ⬜ **5.5** Type fast across a comma boundary — no dropped/duplicated characters.
  - ⬜ **5.6** Delete a whole part via the string — the corresponding Guide part empties + re-shows THIN.
  - ⬜ **5.7** Very long single part — the string wraps/scrolls without breaking the bar.

---

## 6 · References & Model Facts (@-mention)
- ⬜ **6.1** References block names the model ("Nano Banana (Gemini 2.5 Flash Image)") and shows **"Attach — up to 3"** — the N is a **fact from the model-agent**, not a guess.
- ⬜ **6.2** "Supports:" line lists real capabilities (holds up to 3 refs · style-transfer variants · multi-image compositing · editing/inpaint).
- ⬜ **6.3** Attach an image → thumbnail appears with an × to remove.
- ⬜ **6.4** Attach up to the max (3) → a 4th is blocked gracefully (no crash, clear limit).
- ⬜ **6.5** `@` in the composer → live typeahead of **saved assets**; ↑/↓/Enter/Tab pick, Esc closes.
- ⬜ **6.6** Picking an `@`-asset inserts `@name ` and attaches **by id** (lineage link, no duplicate).
- **Break-it:**
  - ⬜ **6.7** `@` with **no saved assets** — empty state, no error.
  - ⬜ **6.8** `@xyz` matching nothing — no dropdown / graceful empty.
  - ⬜ **6.9** Remove all references — block returns to the clean "Attach up to N" state.

---

## 7 · Subject Pivot / Rebuild (known-fragile — hit it hard)
- ⬜ **7.1** Build a "car" prompt, then tell the agent "actually make it **an airplane**" → the Prompt Guide **rebuilds** for the new subject (placeholders/chips update; no stale "car" fields left).
- ⬜ **7.2** Pivot again (airplane → dragon) — same clean rebuild.
- ⬜ **7.3** Pivot the **medium** (image → video, if surfaced) — the guide adapts, doesn't half-update.
- ⬜ **7.4** Score + THIN badges reset correctly on a pivot (not carrying the old subject's fill).

---

## 8 · Render & Result Surfacing
- ⬜ **8.1** **Render** triggers generation; tiles stream into the center gallery.
- ⬜ **8.2** With `GEMINI_API_KEY`, real pixels render; without it, agent still reasons + text streams (no silent hang).
- ⬜ **8.3** Hover a tile → Save (💾), viewer (eye), copy, download icons; Save flips to a check.
- ⬜ **8.4** Open a tile in the full-screen viewer; prev/next; Esc closes.
- **Break-it:**
  - ⬜ **8.5** Click Render twice fast — no double job / doubled tiles.
  - ⬜ **8.6** Render with a THIN (nearly empty) prompt — agent handles gracefully (asks or best-efforts).
  - ⬜ **8.7** Save the same tile twice — idempotent (stays "Saved", no duplicate asset).

---

## 9 · Agent Panel (conversation & co-edit)
- ⬜ **9.1** Right "Agent" panel shows the running conversation; user bubbles right (outlined blue), agent left.
- ⬜ **9.2** "Consult with me…" composer sends a workspace turn that talks **straight to the image agent** (no Operator re-diagnosis / double spend).
- ⬜ **9.3** Ask the agent to edit a specific part ("make the subject a red convertible") → the Guide part updates (agent co-edit).
- ⬜ **9.4** Panel is horizontally resizable (drag) and the width persists.
- **Break-it:** ⬜ **9.5** send a workspace turn with an attachment + `@`-mention together — both land correctly.

---

## 10 · Assets & Projects (persistence + the 360° round-trip)
- ⬜ **10.1** Nav → Assets shows the **new catalog** (grid, kind chips, search) — not the old Pixel Studio screen.
- ⬜ **10.2** A saved tile appears in the catalog; Details drawer edits title/alt/caption/tags; Delete soft-deletes.
- ⬜ **10.3** Projects: New resets to a fresh chat; open hydrates history + moves to top; rename inline; delete with confirm.
- ⬜ **10.4** **360° round-trip:** open a project → work → leave → return. Everything reloads as a pristine changelog, **nothing lost** (protect this).
- **Break-it:** ⬜ **10.5** rapid-click several projects — top-of-list reshuffles but no data loss / no wrong thread loaded.

---

## 11 · Cross-cutting "try to break the orchestration"
- ⬜ **11.1** Transfer to image, go back to Chat, return to Image — workspace state (parts, refs, tiles) preserved.
- ⬜ **11.2** Two rapid pivots + a render queued between them — agent stays coherent, no orphaned guide.
- ⬜ **11.3** Leave the tab idle a few minutes, return — no broken stream, state intact.
- ⬜ **11.4** Trigger the usage cap (if testable) — a clean "cap reached" message, no half-charged state.
- ⬜ **11.5** Everything metered: token/spend recorded per turn (spot-check usage records).

## 12 · Model Registry — the new self-maintaining stuff (curl for now)
> No UI yet (cron/manual by design). GET reads need no key; POST does real work.
- ⬜ **12.1** `GET /api/models/refresh` → `{providers:[…]}` (per-provider: last-checked, confirmed, discovered, unconfirmed). Empty on a fresh DB is fine.
- ⬜ **12.2** `GET /api/models/maintain` → `{cards:[…]}` (discovered/researched models + seed overrides).
- ⬜ **12.3** `POST /api/models/refresh` → a `summary`; `providersChecked` includes providers with an endpoint + key set. **Re-run immediately → fewer/zero checked** (stale-while-revalidate / TTL working).
- ⬜ **12.4** `POST /api/models/maintain` (LLM spend) → `summary` with `researched` / `incremented` / `retired` / `reset`; then `GET /maintain` shows new cards.
- ⬜ **12.5** **Lazy trigger never taxes a turn:** run an image turn (§8) — it returns normally; a background refresh fires **only** if a provider is past its 24h TTL (no added latency).
- ⬜ **12.6** After a discovery is researched (12.4), it becomes routable in a later image run (live catalog feeds routing).
- **Break-it:** ⬜ **12.7** `POST /refresh` with a provider key missing — that provider is skipped, others still work, no crash. ⬜ **12.8** Spam `POST /refresh` — TTL prevents redundant network hammering.

---

### Steamroller notes (log flaws here as you go)
- …

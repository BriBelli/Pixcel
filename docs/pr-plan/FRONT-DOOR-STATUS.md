# Front-door build status — `feature/chat-turn-real`

_Overnight autonomous session, 2026-07-04. Nothing pushed or merged — all reviewable commits on the branch._

## How to run / verify
```bash
cd /Users/brian/projects/Pixcel
nvm use            # reads .nvmrc → Node 24 (the /usr/local Node 20 shadows it otherwise)
node -v            # must be v24.x — SQLite persistence needs it
npm run studio:dev
```
Green checks (Node 24): `tsc --noEmit` clean · `npm run test:db` → 26/26 · `next build` compiles. Engine untouched; zero model/API calls this session.

## Built this session (main..HEAD, newest first)
| Commit | What |
|---|---|
| `f7e9480` | **PR-4b delete-last-turn** — `POST /api/chat-mutate` soft-deletes (status layer + cascade); turns carry `interactionId`; hover-revealed ghost trash on the last done turn |
| `6678872` | **PR-4b hydrate** — `GET /api/chat-history`; reload **restores the conversation from SQLite** (boots into chat when a thread was persisted, else splash; fresh splash prompt = new thread) |
| `886bb74` | **SSE reveal choreography** — turn fades in → text → a2ui reveals *under* the response → suggestions (one easing curve, one-shot, reduced-motion aware) |
| `41d54eb` | **Cross-fade hand-off + branded loader** — splash→chat is a 440ms cross-fade (not a hard swap); the off-brand "PXS Studio / Loading WebAssembly…" screen → a calm breathing Pixcel mark |
| `98e20ff` | **Dormant wall + CSS cursor** — chat wall goes dormant (logoScale 0, intensity 0.04) killing the "Pixcel" logo watermark collision; streaming cursor is a CSS block (no tofu) |
| `6a9c07a` `083357f` | SQLite loads via dynamic `import()` (Turbopack-safe) + degrades to memory on old Node |
| `7b3ab18` | **SQLite dev adapter** on built-in `node:sqlite` (local = SQLite, prod = DynamoDB) |
| `a6aa3e5` | Token split — `prompt.tokens` (input) vs `response.tokens_used` (output) |
| `1adfe59` | **PR-4a** — design-true chat shell on the PR-2 primitives |

## What's now visible / working
- Calm branded boot loader (no more "PXS Studio v4.0.0 Production Architecture").
- Splash→chat cross-fades; the wall no longer collides with the conversation.
- A streaming turn *performs*: text streams, then the options reveal under it, then suggestions.
- **Persistence is real and visible**: your conversation persists to `.pxs-dev.db` and is restored on reload. Watch it in the SQLite Viewer or `npm run db:inspect`.
- Hover the last turn → soft-delete it (audit-preserving; the row goes `deleted` in SQLite).

## Deferred (on purpose) — with reasons
1. **Edit / regenerate** mutations — they re-run the model = **token spend**; not safe to build unattended. The DB layer (status/cascade, `parent_interaction_id`) already supports them.
2. **Persistent single wall** — hoist the wall to ONE instance the UI floats above (charter), prop-tweening splash→dormant. Purely **visual**; needs your eyes. The dormant wall + cross-fade already remove the collision, so this is polish.
3. **The big pour** — the manifest/OKF pipeline + the spine/edges context substrate. Held as **direction**, not built (your call to start).

## Decisions to confirm when you're back
- **Reload behavior**: currently reload with an active thread boots straight into that conversation (else splash). Flip in `app/page.tsx` if reload should ALWAYS show the splash.
- **Delete affordance** placement/styling (hover ghost trash, top-right) — minimal on purpose; tune on hot-reload.
- **Merge + push**: the branch is ready for your review; `main` is still yours to push (4 commits ahead of origin from earlier).

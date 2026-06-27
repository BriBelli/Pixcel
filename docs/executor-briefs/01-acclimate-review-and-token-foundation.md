# Executor Brief 01 — Acclimate → second-review → global token foundation (A1)

> Paste this whole file as the opening prompt of a **fresh Claude Code session** in the Pixcel repo.
> You are an **executor + independent second reviewer** on the Pixcel unification. Work on branch
> `feature/pixcel-unification` (it has the latest landing/token work to review). Be precise, keep diffs
> small, follow the design rules exactly, and **never touch the crown jewel** (defined below).

---

## Part 0 — Orient (read, in this order)
1. `docs/PIXCEL-UNIFICATION-PLAN.md` — the north star (one product; statue = system primitive; the chef).
2. `docs/UNIFICATION-LOG.md` — locked decisions + the migration verdict map + resolved forks.
3. `docs/PIXCEL-AGENT-PRIMITIVE.md` — the chef primitive (context only; don't build it).
4. `design-handoff/pixcel-handoff/START_HERE.md` — what Pixcel is + how the handoff works.
5. `design-handoff/pixcel-handoff/CLAUDE.md` — **THE design rules. Non-negotiable. Reviewers revert violations.**
6. `design-handoff/pixcel-handoff/colors_and_type.css` — the canonical tokens.
7. `design-handoff/pixcel-handoff/docs/art-studio-integration-guide.md` — how the design maps onto this repo.
8. `CLAUDE.md` (repo root) — build/architecture + the "Stay Pure" hard rule.

Then skim the **current state** you'll be reviewing:
- `git log --oneline -8`
- `packages/pxs-studio/src/components/LandingPage.tsx`
- `packages/pxs-studio/src/app/tokens.css`
- `packages/pxs-studio/src/app/globals.css`

## The crown jewel — DO NOT TOUCH (hard list, applies to every part)
The proven autonomous artisan engine and its live show. Presentation/UI only — never its logic:
- `packages/pxs-studio/src/lib/live-jobs.ts` and `ai-art-system-prompt.ts` + any engine prompts
- `MatrixArtStage.tsx` **draw loop / WRITE→CASCADE→DATA mechanics / generation** (you may restyle color/layout in later parts, never the loop)
- `src/store/live-art-store.*` wiring, the `/api/*` routes (SSE + Anthropic calls)
If a task seems to require touching these, STOP and flag it.

---

## Part 1 — Second review + understanding pulse-check  ⟵ do this first, then STOP
Independently review the recent landing + token work (the last ~2 commits). Produce a report at
`docs/executor-briefs/01-review-findings.md` containing:

1. **Understanding pulse-check** (5–8 bullets, your own words): the unification thesis; the design
   system's hard rules; what the crown jewel is and why it's untouchable; why tokens were landed
   *additively* (not a global swap yet).
2. **Design-system conformance** of `LandingPage.tsx` + `tokens.css` — flag any deviation from
   `design-handoff/pixcel-handoff/CLAUDE.md` with `file:line`: gradients on chrome, non-token hex, wrong
   font weights, off radii, emoji, solid gray borders (should be alpha), the Pixel-X mark, the Art squiggle.
3. **Correctness & safety**: any bugs or React/TS issues; confirm the change is presentation-only and the
   crown jewel is untouched. Run `cd packages/pxs-studio && npx tsc --noEmit` and report the result.
4. **Verdict**: ship-as-is / ship-with-nits / needs-changes, with the top 3 concrete fixes if any.

**Then STOP and present the report. Do not start Part 2.** Wait for the human to confirm your understanding
and say "proceed to A1." (If anything you found breaks the crown jewel or contradicts the plan, say so loudly.)

---

## Part 2 — A1: the global token foundation  ⟵ only after the human says "proceed"
**Goal:** make the canonical DS tokens the single source of truth so the *entire* app renders in warm
charcoal + soft Google-blue + IBM Plex, **with every existing `className` still working** (repoint, don't rename).

Follow `art-studio-integration-guide.md` §4:
1. Make `tokens.css` (the `--a2ui-*` / `--pxs-*` tokens) authoritative. Adopt the base: body background →
   `var(--a2ui-bg-app)`, app font → IBM Plex (`--a2ui-font-family` / `--a2ui-font-mono`).
2. **Repoint `tailwind.config.js`** `theme.extend.colors` at the DS tokens so existing utilities render Pixcel:
   map `background-*`, `text-*`, `border`, `primary`/accent, status colors to the matching `--a2ui-*` tokens.
3. Retire the old GitHub `:root` block in `globals.css` (`--background-primary:#0d1117` …) — **alias those old
   names to the new tokens** if anything still reads them, so nothing breaks; remove only once unreferenced.
4. Swap the body/display font from `Space Grotesk` → IBM Plex per the design system.
5. **No new hex anywhere** — every color resolves to a token (the repo's rule and the design system's).

**Verify:** `npx tsc --noEmit` clean; `npm run studio:dev` boots; the studio shell, the right Pixcel AI panel,
the gallery, and the landing all read in charcoal/blue/Plex with **no illegible or broken surfaces** (eyeball
a real run). Note anything that shifted unexpectedly.

**Deliverable:** work on branch `design/a1-token-foundation`; keep the diff small and focused (no unrelated
refactors); commit with a body that lists the token map and any judgment calls; append a short "A1 done"
section to `docs/executor-briefs/01-review-findings.md`. Leave it for human + architect diff review — do not
merge.

## Standing rules
- Design-handoff `CLAUDE.md` wins over instinct. Tokens only; if the system can't answer, note it — don't invent.
- Small, reviewable diffs. Sentence case, alpha borders, no gradients on chrome, no emoji (Lucide SVG only).
- End each work session by summarizing the diff + open questions for the architect.

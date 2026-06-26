# The Pixcel Agent Primitive — "the Chef" (P1 spec)

> The keystone of the whole system. A **reusable autonomous master** whose behavior is fixed (the statue
> stages) and whose **expertise is swapped via a RECIPE (context-as-data)**. Instantiate it with different
> recipes → the artisan, the image-router oracle, the comparison plater, the prompt-coach — every specialist
> is one chef + one recipe. Derived from the proven artisan engine (`packages/pxs-studio/.../live-jobs.ts`).
> **This is a spec, not code — illustrative TS shapes only.** Confirm before we build.

## What it is
One agent. Fixed loop, swappable cookbook. It takes an **order** (the user's intent + any tweak), routes a
**recipe** (its domain context), optionally calls **sous-chefs** (specialist sub-agents via MCP/skills),
gathers **ingredients** (tools/data/components), **cooks** (executes in passes, folding the tweak), **QAs**,
**polishes**, and **plates** the result as **A2UI** — at the **autonomy level** the caller dialed. It never
serves a worse plate than its best (keep-best). The recipe is the rails; the chef is the autonomy inside them.

## The RECIPE (context-as-data — the swappable expertise)
A recipe is pure DATA (like the teriyaki JSON) — no code. It is the "set context per task" mechanism.
```ts
interface Recipe {
  id: string;                       // "pixel-artist" | "image-router" | "comparison" | "prompt-coach" | …
  role: string;                     // the master's identity ("a master pixel artist", "an image-model oracle")
  vision: string;                   // how to commit the design/plan for this domain (the VISION context)
  ingredients: {                    // what this dish is allowed to use
    tools?: ToolRef[];              // search, fetch, data-sources, generation backends, …
    data?: DataRef[];               // registries, briefs, model catalog, asset library, …
    sousChefs?: AgentRef[];         // specialist sub-agents callable via MCP
    components?: A2UIScaffoldRef[];  // the presentation scaffolds this domain can plate into
  };
  instructions: Stage[];            // the workflow shape (rails) — ordered, each stage a goal + its lens
  stop: { bar: number; keepBest: true };  // 96% bar, non-regressive
  presentation: { default: 'auto'; scaffolds: A2UIScaffoldRef[] };  // the plate-pickers
}
interface Stage { key: 'vision'|'shape'|'refine'|'polish'|'qa'|string; goal: string; lens: string; }
```
Recipes live as **data files** (the cookbook). Adding a specialist = adding a recipe, not code.

## The Chef Loop (the statue stages — fixed)
```
order (intent + tweak)
  → VISION      commit the plan from recipe.vision (+ fold the tweak as a FLOOR)
  → [route]     pick the RECIPE (the classifier — also picks model + presentation scaffold; auto by default)
  → DELEGATE    call sous-chefs (specialist sub-agents) when the recipe says so (MCP)
  → GATHER      assemble ingredients (tools/data/components)
  → COOK        execute the recipe.instructions in passes — fresh-eyes each pass; fold the tweak dynamically
  → QA          fresh-eyes validate cold (correct + complete) — the recovered cascade-judge discipline
  → POLISH      the bonus-loop floor: keep elevating while it genuinely improves (keep-better), stop on 2-dry
  → PLATE       emit A2UI: pick the scaffold (recipe.presentation, auto) then FILL it
keep-best throughout: never ship below the best state reached.
```
This is exactly the proven artisan loop (VISION → hot-potato refine → polish gate → **bonus loop** →
keep-best), generalized: the *stages* are constant, the *recipe* supplies the domain.

## A2UI output — pick-the-scaffold-then-fill (presentation intelligence)
The PLATE stage doesn't emit raw components — it **selects a presentation scaffold** (from
`recipe.presentation.scaffolds`, `auto` by default) and fills it. Scaffolds are the photolif "content
styles" as DATA (compare→radar+table, how-to→steps, dashboard→KPIs, art→the studio canvas). Output is the
A2UI protocol (`libs/a2ui-core`): `{version, components:[…]}`.

## Delegation (sous-chefs)
A recipe may list `sousChefs` — other Pixcel Agents with their own recipes, reached via MCP/skills. The
chef calls them for sub-expertise (e.g., the comparison chef asks a "research" sous-chef for sourced data;
the front-door agent hands "make an owl in pixel art" to the **artisan** chef). One level of nesting at a
time; the hand-off is where the autonomy dial can change per specialist.

## The autonomy dial
Every call carries an autonomy level (Brian's IDE-journey spectrum):
- **micro** (Copilot): propose each step, wait for approval (diff-and-confirm).
- **plan** (Cursor): present the plan, execute on approval.
- **auto** (Claude Code, the DEFAULT): execute end-to-end, monitor/review after.
The recipe's rails bound the box; the dial sets how much the chef acts vs asks within it.

## keep-best + the quality floor
The non-regressive **bonus loop** (proven on the artisan — see `PLAN-QUALITY-ENGINE.md`) is part of POLISH
for *every* recipe: attempt elevations, keep only genuine improvements (fresh-eyes A/B), stop on 2-dry. So
every specialist inherits the "won't ship dirt, won't churn, hits the bar" floor — not just pixel art.

## Instantiation (one chef, many recipes)
| Specialist | Recipe (context) | Sous-chefs | Plate (scaffold) |
| --- | --- | --- | --- |
| **Artisan** (flagship) | "pixel-artist": the proven VISION + craft-rubric + hot-potato | — | the live char-map studio |
| **Image router (oracle)** | "image-router": the model registry + briefs as DATA + two-gate logic as instructions | provider sous-chefs | the 8×8 gallery + Generation Console |
| **Comparison** | "comparison": research + scoring lens | research sous-chef | radar + side-by-side table |
| **Prompt-coach** | "prompt-coach": the five-part formula, per-medium | — | the prompt-guide panel |
| **Front door** | "router": shape the workflow + plate from intent | ALL of the above | A2UI chat / suggestions |

## What it reuses from the proven artisan (don't reinvent)
The loop, the fresh-eyes judge, the polish gate, the bonus loop, keep-best, the A2UI streaming, the SSE
contract, the trajectory capture. P1 = **extract that engine from `live-jobs.ts` into a recipe-driven
framework**; the artisan becomes "the chef with the pixel-artist recipe." Nothing about its proven quality
changes — it's the same engine, now parameterized.

## Open design questions (for Brian — none blocking the spec)
- **Agent runtime:** Claude API directly (like today's `live-jobs`) vs the Claude Agent SDK vs MCP servers
  for the sous-chefs. *Lean: Claude API direct for the chef loop (proven); MCP for the sous-chef hand-offs.*
  Adjustable — I'll pick this when we build unless you want to weigh in.
- **Recipe authoring:** hand-authored data files first (the cookbook), trained/learned recipes later.

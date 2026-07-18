# Reference Profile — one primitive for character / object / environment / style

**Status:** approved (Brian, 2026-07-17). Reframes plan #5 "Character Profile".

## Why

A "Character Profile" (a canonical multi-angle reference sheet, `@`-mentioned, reused across shots)
is a real industry pattern — but character is just ONE subject. A bike wants the same treatment
("object profile"); a location wants it ("environment profile", possibly from real Google-Maps
coordinates); a look wants it ("style profile"). Building those as four features spirals. Building
ONE primitive with a per-kind recipe does not.

## The primitive

A **Reference Profile** = a canonical, multi-view capture of a subject, saved as a **tagged,
`@`-mentionable asset** (reuses the asset-lineage + mention system already shipped). It is not a new
asset type so much as an asset with a **profile role** + a set of view-children.

```
Profile (an asset) {
  kind: 'character' | 'object' | 'environment' | 'style'   // discriminator
  subject: string                                          // "Johnny", "the bike", "Neo-Tokyo alley"
  source:  uploaded-image | generated-concept | external   // external = coords/StreetView (HOOK)
  base_sheet: asset_id                                      // the canonical multi-view sheet
  views: asset_id[]                                         // tagged children (angles/expressions)
  tag: string                                              // @johnny — resolves to this profile
}
```

## The moat: `kind` → shot RECIPE (data, not code)

The only thing that differs per kind is HOW you capture that class — a **recipe** the Model agent
picks. This is per-class craft (the moat) applied to profiles, bounded at the broad-class grain:

| kind | recipe (how to shoot it) |
|---|---|
| character | 360° turnaround + expression set |
| object | orthographic / three-quarter views (the black-armor sheet pattern) |
| environment | establishing + wide angles; `source` may be uploaded, generated, OR real coords/StreetView |
| style | swatch / mood board |

A **new kind is a new recipe row (data)** — not a new feature. That contains the spiral.

## Scope (bounded — don't over-complicate)

- **Build first:** `character` + `object` recipes. These cover the Echelon near-term need.
- **Leave hooks, don't build:** `environment` (esp. Google-Maps coordinates → StreetView/satellite
  as a `source`) and `style`. The primitive must have room (`kind`, open `source`), but the recipes
  land later.
- **Expansion sheets on demand:** poses / action / style-transfer are ADDITIONAL sheets under the
  same profile id, generated when a job needs them — never one mega-sheet (dilutes fidelity + blows
  the reference budget). The agent decides how many a job needs.

## Ties

- Assets are already `kind` + `tags` + lineage — a Profile is an asset with a profile role + view
  children ([[project_asset-system-lineage]]).
- `@`-mention resolves `@johnny` → the profile (the mention system already shipped).
- Generation reuses references-as-input; a profile is "1000 words to the LLM".

## Slices (draft)

1. **Data model** — Profile as an asset extension (`profile_kind`, `profile_role`, `view_ids`) +
   the recipe registry (character/object). No UI yet.
2. **Generation** — one ref → agent runs the kind's recipe → base sheet; persist as a profile with
   tagged view children.
3. **@-mention + reuse** — `@`-mentioning a profile feeds its sheet as a reference (real lineage).
4. **Expansion sheets** — on-demand pose/action/style sheets under the same profile.
5. **UI** — profile card, view grid, "make a Reference Profile from this" affordance.

## Out of scope (hooks only)

Environment coords/StreetView ingestion, style-board recipe, LoRA/train-a-model (rejected — a
workaround; modern models do consistency from a good sheet natively).

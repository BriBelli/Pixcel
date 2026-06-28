# Pixcel — Product Surface Spec (the Grok synthesis, brains-swapped)

> **How to read this doc (Brian, 2026-06-28).** This is the pre-artisan Grok synthesis of what Pixcel
> *is* as a **product surface** — the media-as-JSON thesis, the media library, A2UI, multi-model access,
> the video pipeline, node storyboarding, the business vision. **ADOPT all of it as the surface.**
> But **REPLACE its ORCHESTRATION across the board** with our **autonomous statue/chef pattern** — the
> brittle pieces it describes (a `model_registry.py` "smart-routing" decision tree, rigid 5-level prompt
> *pipelines*, node graphs as fixed workflows) become **autonomous masters + context-as-data + A2UI**.
> The surface stays; the brains change. Authority for the pattern: `PIXCEL-UNIFICATION-PLAN.md`,
> `PIXCEL-AGENT-PRIMITIVE.md`, `THE-STATUE-METHOD.md`. The crown-jewel artisan is the proof the pattern
> works; everything here is a sibling professional with swapped context.

## Translation table — brittle (as written) → autonomous (what we build)
| Grok spec describes | We build instead |
|---|---|
| `model_registry.py` smart-routing / fallbacks (decision trees) | A **ranking ORACLE** (an autonomous master that reasons the best model per task), not a hand-maintained tree |
| 5-level / Tao-Prompts frameworks as fixed prompt **pipelines** | The frameworks as **context/guidance injected** into an autonomous prompt-master; it decides HOW (no rigid pipeline) |
| Node-based storyboard graph as the fixed workflow engine | The agent **constructs the workflow** per request (one-of-a-kind saved; common → templates/tools); nodes are a *view*, not the cage |
| Per-surface Python decision logic (image/video/scene pipelines) | One **statue primitive**, re-instanced per role (image/video/scene/asset/prompt-coach masters) |
| Brittle provider integration glue | Providers as **tools/MCP** the autonomous masters call; free will to reach past them |
| Hash-reference domain schemas (CAD-style) as static config | Domain schemas as **context-as-data (Recipe)** fed to the master — see per-class craft |

Everything below is the adopted surface (verbatim Grok synthesis, for reference). Read it for the WHAT;
take the HOW from the autonomous pattern.

---

## 1. Executive summary
Pixcel: AI-powered image/video generation, editing, and IDE platform that empowers a **single creator** to
produce full professional studio-quality output (scripts, art, media) directly from vision.
**Core innovation (the Pixcel Thesis):** treat media as **structured JSON data streams** (not opaque binary
blobs) → zero-friction screen→data extraction, AI-native frame-level CRUD, diff-based micro-versioning,
real-time cloud streaming/editing. Complements (not limited to) FFmpeg for lossless frame extraction.
Long-term: evolve into a full AI-provider business ("like a cable provider" for models) with unified APIs +
smart routing.

## 2. The thesis & innovation
- **Media = structured JSON data streams.** Zero-friction extraction; frame/layer/element CRUD the AI does
  natively; diff-based micro-versioning (precise changes, not whole-file); real-time cloud/collab editing;
  FFmpeg integration for lossless exact frame extraction where needed.
- **Domain decomposition & precision.** For high-accuracy real-world subjects (e.g. a Lamborghini Gallardo),
  use hash-reference domain schemas (CAD-inspired) — structured, reusable components for consistent output.
  *(We carry this as context-as-data / per-class craft, not static config.)*
- **Workflow philosophy:** iterative "describe + reference + edit + iterate," pixel-precise, Photoshop-level
  control in an AI-native environment.

## 3. System architecture & components
- **Media library** — WordPress-inspired central hub: Images, Scenes, Storyboards, Documents, Audio,
  Spreadsheets; flexible tag/metadata; first-class reference assets (camera angles, lighting, styles);
  hash-reference domain schemas for precise versioned referencing.
- **A2UI protocol** — AI-to-UI comms with schema versioning for **persistent UI state across chat
  history/threads** (critical for long creative sessions + context continuity).
- **Model registry & orchestration** — centralized management, smart routing, fallbacks, unified interfaces;
  hybrid chat/IDE interface. *(→ autonomous ranking oracle, not a registry tree.)*
- **Data & metadata layer** — an 8-part media metadata schema; YAML data-source manifests for secure AI
  discovery/traversal/routing (PHI/PII restrictions for enterprise, e.g. Camelot).

## 4. Multi-model integrations & provider strategy
- **Image:** FLUX, Ideogram, Recraft (V4.1+), Stability, Gemini, xAI/Grok, Seedream 4.0, Nano Banana /
  Higgsfield, etc. Focus: quality, consistency, style control, cinematic permissiveness.
- **Video (highest priority)** — the most critical feature for professional film/TV output. Providers: Google
  Veo 3 (quality options), fal.ai, Replicate (ongoing reliability/pricing tracking). Capabilities:
  image-to-video chaining, multi-frame motion, lip-sync/audio, dynamic camera angles, consistent characters,
  FX (fire/water/ice). Node-based storyboard tools for pre-vis, scene chaining/stitching, transitions.
  Prompting: **5-level video prompting frameworks (Tao Prompts + custom prompt-matrix)** for hierarchical
  cinematic control. Examples: choreographed fight scenes w/ FX. Grok Imagine for video experiments.

## 5. Advanced prompting & metadata
Structured prompting (5-level, **Tao Prompts** methodology, prompt-matrix for systematic variation),
universal nomenclature alignment across models, YAML manifests for granular AI-powered data-source access.

## 6. Project Echelon (cinematic story/film project)
A parallel dedicated project: testbed for advanced video/storyboarding; a canonical narrative universe;
extended scenes (e.g. Post-SC-002+), AI video sequences, storyboarding, asset reuse from the media library.
*(This is the film-bible/“first 3 scenes” work — see the north-star + living-dynamic-media memories.)*

## 7. Dev environment & tooling
Claude Code (agentic, VS Code/Cursor + CLI, multi-file planning, terminal). macOS (MacBook Pro). Brian: 20+
yrs full-stack + digital-media artistry; exceptional visual-spatial reasoning (maps exact pixel
dimensions/geometry mentally); Adobe-user perspective (CS2 Photoshop as reference peak). FFmpeg for media.

## 8. Business & scaling vision
Scale to a full AI-provider platform: unified APIs, smart routing, advanced controls, subscription/API plans
("cable provider" model). **Camelot:** enterprise AI-agent warehouse (Databricks + Unity Catalog + Agent
Bricks) — multi-agent pipelines (Analyze/Router/A2UI), RAG, secure YAML manifests.

## 9. Content policy
**TV-MA / mature cinematic** support — violence-heavy, artistic, narrative-driven (explicitly
non-pornographic). Requires permissive model APIs + moderation toggles.

## 10. Ongoing priorities (from the spec)
Video revamp (provider stability, lip-sync, stitching), autonomous-agent architecture, branding (Pixel-X
mark, IBM Plex per the Claude Design handoff — note: the spec said "PXC monogram / Geist," superseded by the
Claude Design canon), scaling infra. Maintain strict fidelity to the **JSON data model as foundation**.

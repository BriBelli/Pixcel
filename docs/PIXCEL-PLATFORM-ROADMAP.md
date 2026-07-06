# Pixcel Platform — Rebuild Roadmap

_The fresh, autonomous rebuild. One engine, subject-swapped from "draw pixel art" to "curate any creative workflow." Photolif = POC + cautionary tale (its capabilities are proven; its brittle hardcoded routing is not). Claude Design (`design-handoff/pixcel-handoff`) is **gospel**._

Status legend: 📋 planned · ✍️ fleshing · 🔨 building · 👀 in review · ✅ merged

---

## The architecture (the cement — don't re-litigate)

- **EVERYTHING IS A CHAT.** A workflow is a chat. The canvas is a chat. An edit is a chat. One engine = **context + dynamic A2UI components + the agent brain**. Build it once; *configure* it into every surface (consultant chat, image-chat-workflow, canvas, edit, film, video, later games/sims). A chat can be made to *not look like a chat* (paced screens, z-index vs y-scroll) — still a chat underneath. **No bespoke IDEs / no per-vertical UIs.**
- **Chat = the consultant/waiter.** "What do you want?" — precise, options-based, never overloaded. Chat does **not** make projects (that was the old design). A **project only materializes on SAVE**. Chat · Workflow · Project are three separate things.
- **The primary agent orchestrates, never generates.** It's the single user-facing funnel (far-right, persistent, holds top-level context). It analyzes/classifies → **builds a workflow** → **dispatches context-primed specialist agents** (chef→sous-chef handoff). Specialists (image/model/prompt-guide/maintenance) are **headless executors** — no direct user relationship. The user finesses **mid-flight by prompting the primary**, which steers the running specialists (pause/resume/feedback-injection). Thumbs-down = standard complaint only.
- **Intelligent model usage.** 4 images from a model = 1 native batch call, not 4 (photolif's naive x-calls hit caps + misuse models). The coordinator's job is the *smart* workflow.
- **OKF manifest / tools-as-agents.** Models, tools, and specialist agents are registered `{name, description, how-to-use}`; the agent selects by lookup, **not** a prose dump or hardcoded gates. Better guardrails, no restrictions inside the confined scope.
- **A2UI component registry, not LLM-dump.** Components are data (`{type, description, props, examples, match}`), **prescribed-in-context per workflow**; one renderer generated from it. Build the tooling/context/system, then **let it rip — WYSIWYG**; the agent assembles the UI live.
- **Autonomous, self-restocking pantry.** Model records carry timestamps; stale/unknown → a model-agent Tavily-researches + re-writes the DB record. No static pantry rot.
- **Assets = the neural-net backbone.** 8-part metadata (subject · action_pose · environment_setting · lighting_atmosphere · composition_framing · style_aesthetic · colors_effects · technical_constraints) + namespaced tags + `source_prompt_id`. Late-binding by tag.
- **The Prompt Guide** — the 5-part formula ([Cinematography] + [Subject] + [Action] + [Context] + [Style & Ambiance]) + effectiveness score. De-blinds the user (critical at 60+ gens/turn).
- **Claude Design gospel:** AI comms stream **into the agent chat, never over the canvas**; canvas gets its space; **no one-off components** (recycle unified sets, uniqueness = configuration); no "matrix" design, no top-right pixel-art thing.

_Full detail lives in the assistant's memory: `project_core-product-shape`, `project_media-pipeline-recreation`, `project_manifest-okf-pipeline`, `project_living-canvas-ui`, `project_ai-native-substrate-essence`._

---

## The plans

### Foundation (the one engine)
| # | Plan | Scope | Status |
|---|---|---|---|
| **P1** | **Consultant chat + sources** | Refine the current chat into the consultant experience (precise, options, no overload) + a **sources** (citations/attribution) layer, strictly to the Claude Design gospel. Builds on what we have. | 📋 (next) |
| **P2** | **A2UI component registry** | Register-not-dump: components as data (`{type, description, props, examples, match}`), prescribed-in-context per workflow, one generated renderer. The WYSIWYG substrate. | 📋 |
| **P3** | **Assets backbone** | Evolve the DB into the neural-net substrate: 8-part metadata + namespaced tags + `source_prompt_id`, spine+edges+semantic. Project-on-save. | 📋 |

### The brain
| # | Plan | Scope | Status |
|---|---|---|---|
| **P4** | **The coordinator** | Generalize our statue kernel → `runEngine<State,Action,Plan>` for workflow-curation: consultant → analyze/classify → build-workflow → dispatch. Orchestrates, never generates. Single user funnel; steers specialists mid-flight. | 📋 |
| **P5** | **OKF manifest + A2A dispatch** | Tools-as-agents registry + the chef→sous-chef context-primed handoff. | 📋 |

### The specialists
| # | Plan | Scope | Status |
|---|---|---|---|
| **P6** | **Model agent + auto-maintenance** | Timestamp-freshness + Tavily research + DB re-write (self-restocking pantry). | 📋 |
| **P7** | **Image executor** | Intelligent multi-model gen (native batch, N×K fan-out gallery, keep-best). | 📋 |
| **P8** | **The Prompt Guide** | 5-part formula + effectiveness score + the prompt-guide agent. | 📋 |

### The workflows (configured chats)
| # | Plan | Scope | Status |
|---|---|---|---|
| **P9** | **Image-chat-workflow** | The image IDE as a configured chat (canvas-is-a-chat, draggable panels, prompt paths, nav-shift). | 📋 |
| **P10** | **Edit + multi-image compositing** | Edit-is-a-chat; insert object/person into a scene without regenerating. | 📋 |
| **P11** | **Video · scenes · storyboards · film** | The video mirror + scene recipes (tag late-binding) + storyboard concat. | 📋 |

**Cross-cutting (woven through, not separate):** the paced async "real professional agents" experience · the action-bar feedback loop · comms-in-agent-chat.

---

## How we run it
Each plan: **flesh → Brian reviews → approve → build → review diff → merge.** Digestible, non-blocking where possible, each a rollback point. Statue-style: broad shape first, then deepen. Crown-jewel pixel engine stays untouched — we generalize the *pattern* beside it.

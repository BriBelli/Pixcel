# PR-10f — Media-agnostic generalization

> Part of the [Prompt Builder Studio](./PROMPT-BUILDER-STUDIO.md). Proves the thesis: the same
> Builder · Guide · Agent structure serves **image, video, pixel, anim** — only the parts change.
> (Spec sharpens with reference images as we approach it.)

## Why

The whole design is beautiful *because* it's agnostic — media-as-JSON. If the Builder only works for
images, it's a feature; if it works for every media type with the same components, it's the platform.
The agent already emits the parts, so generalizing is mostly proving + tuning, not rebuilding.

## Steps (outline — refine with images)

1. **Per-media formulas, agent-defined.** Video → e.g. Subject / Motion / Camera / Context / Style;
   pixel → subject / palette / density / … ; the agent chooses the parts from `media`. Code stays a
   dumb renderer — no per-media branches deciding content.
2. **One renderer, many media.** The `BuilderPanel` + preview + scoring + Guide render whatever parts
   arrive, regardless of media. Verify no image-only assumptions leaked into the components.
3. **Route to the right specialist.** Video transfers reach the video path (still reference-first);
   the Builder is the shared consult across specialists.

## Out of scope

The video/anim generation engines themselves. This proves the *builder surface* generalizes; the
downstream renderers are their own tracks.

## Verify

- A video request produces a Builder with video-appropriate parts via the same components; an image
  request still works; no `if (media === 'image')` content branches in code. `tsc` clean.

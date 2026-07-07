---
name: Example Cursor Plan
overview: A minimal example showing the Cursor plan file format.
todos:
  - id: a1b2c3d4-0001-4000-8000-000000000001
    content: Read the relevant files
    status: completed
  - id: a1b2c3d4-0002-4000-8000-000000000002
    content: Make the change
    status: in-progress
  - id: a1b2c3d4-0003-4000-8000-000000000003
    content: Verify it works
    status: pending
isProject: false
---

# Example Cursor Plan

This is the markdown body. Cursor renders everything below the frontmatter as normal markdown.

## Goal

Do one small thing, in three steps.

## Notes

- File must end in `.plan.md`
- Frontmatter is YAML between `---` fences
- Todo `status` values: `pending`, `in-progress`, `completed`, `error`
- Save to workspace → `.cursor/plans/` (committable)
- Default location → `~/.cursor/plans/` (global)

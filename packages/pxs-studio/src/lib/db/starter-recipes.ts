/**
 * Starter Recipes — built-in, read-only Recipes (Prompts) that ship with Pixcel so the Recipes surface
 * has REAL content on day one (not the "pending real recipes" placeholder). The Character Reference
 * Sheet is the canonical one — the Reference-Profile workhorse (a [SLOT] recipe → a character asset →
 * an @-mentionable reference in scene projects).
 *
 * These are merged into the Recipes list alongside user-saved Prompts, and "New from template" can
 * instantiate them by id. They live in code (not the DB) so every user gets them without seeding; a
 * user who edits one is really doing "Save as template" into their own DB-backed Prompt.
 */

export interface StarterRecipe {
  id: string;
  name: string;
  description: string;
  text: string;
  variables: string[];
}

export const STARTER_RECIPES: StarterRecipe[] = [
  {
    id: 'recipe-character-reference-sheet',
    name: 'Character Reference Sheet',
    description:
      'A 4-angle character sheet (front · left · right · back), full-body + portrait each — the consistent-character workhorse.',
    text: `Create a professional character reference sheet of [CHARACTER DESCRIPTION].

[DETAILED APPEARANCE & CLOTHING]

Background: [BACKGROUND DESCRIPTION]

Arrange into four vertical columns, each representing one viewing angle. Each column contains a full-body view on top and a matching close-up portrait directly beneath it.

Columns (left → right):
Column 1: front view (full body above, front portrait below)
Column 2: left profile (full body facing left) with portrait facing left below
Column 3: right profile (full body facing right) with portrait facing right below
Column 4: back view, with matching portrait below.

Maintain even spacing and framing around the character. Clean silhouette, consistent alignment, and clean panel separation. Thin borders only. No text anywhere.

Photorealistic, DSLR, muted colors. Shot on 35mm film. Flat lighting. High quality, sharp focus.`,
    variables: ['CHARACTER DESCRIPTION', 'DETAILED APPEARANCE & CLOTHING', 'BACKGROUND DESCRIPTION'],
  },
];

export function getStarterRecipe(id: string): StarterRecipe | undefined {
  return STARTER_RECIPES.find((r) => r.id === id);
}

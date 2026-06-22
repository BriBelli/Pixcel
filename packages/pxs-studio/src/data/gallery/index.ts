import type { PXSFrame } from '../../store/pxs-store';
import type { GalleryEntry } from '../../store/gallery-store';
import pixcelLogo from '../defaults/pixcel-logo.json';
import smiley16 from './smiley-16.json';
import heart20 from './heart-20.json';
import star24 from './star-24.json';
import mushroom16 from './mushroom-16.json';
import dog16 from './dog-16.json';
import banana16 from './banana-16.json';
import lambo32 from './lambo-32.json';
import monkey32 from './monkey-32.json';
import robot32 from './robot-32.json';
import cat32 from './cat-32.json';
import raceCar32 from './race-car-32.json';
import saguaro16 from './saguaro-16.json';
import appleLive16 from './apple-live-16.json';
import owlLive32 from './owl-live-32.json';
import dragonLive48b from './dragon-live-48b.json';
import trexClaudeCode32 from './trex-claudecode-32.json';
// Statue-engine pieces (VISION → SHAPE → POLISH → QA + keep-best, autonomous; docs/THE-STATUE-METHOD.md)
import catStatue32 from './cat-statue-32.json';
import axolotlStatue32 from './axolotl-statue-32.json';
import mushroomStatue32 from './mushroom-statue-32.json';
import treefrogStatue32 from './treefrog-statue-32.json';

export type { GalleryEntry };

/**
 * Curated PXS art (the built-in seeds). AI/user-generated pieces are added at runtime via
 * the gallery store (src/store/gallery-store.ts). To add a built-in: save `your-art.json`
 * here (PXSFrame shape), then append an entry below with `builtin: true`.
 */
export const GALLERY_ENTRIES: GalleryEntry[] = [
  {
    id: 'pixcel-logo',
    title: 'Pixcel Logo',
    prompt: 'Default studio wordmark (landing artwork)',
    promptBy: 'human',
    composedBy: 'human',
    frame: pixcelLogo as PXSFrame,
    builtin: true,
  },
  {
    id: 'smiley-16',
    title: 'Smiley',
    prompt:
      'Cheerful pixel smiley on dark background — yellow face, simple eyes and grin',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: smiley16 as PXSFrame,
    builtin: true,
  },
  {
    id: 'heart-20',
    title: 'Pixel Heart',
    prompt: 'Small red pixel heart icon, retro game style, centered on dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: heart20 as PXSFrame,
    builtin: true,
  },
  {
    id: 'star-24',
    title: 'Golden Star',
    prompt: 'Five-point golden star centered on a dark night-sky grid',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: star24 as PXSFrame,
    builtin: true,
  },
  {
    id: 'mushroom-16',
    title: 'Toadstool',
    prompt:
      'Classic retro mushroom — red cap with white spots and a cream stem, centered on a dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: mushroom16 as PXSFrame,
    builtin: true,
  },
  {
    id: 'dog-16',
    title: 'Puppy',
    prompt:
      'Cute front-facing sitting dog with floppy ears, cream muzzle and paws, on a dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: dog16 as PXSFrame,
    builtin: true,
  },
  {
    id: 'banana-16',
    title: 'Banana',
    prompt:
      'A ripe yellow banana — curved crescent with a brown stem and blossom tip, on a dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: banana16 as PXSFrame,
    builtin: true,
  },
  {
    id: 'lambo-32',
    title: 'Lambo',
    prompt:
      'Iconic front view of a yellow Lamborghini Gallardo — wide low wedge, slanted headlights, three lower air intakes, 32x32',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: lambo32 as PXSFrame,
    builtin: true,
  },
  {
    id: 'monkey-32',
    title: 'Monkey',
    prompt:
      'A cute sitting monkey, front view — round head, big ears, heart-shaped face, belly, hands, feet and a curled tail, 32x32',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: monkey32 as PXSFrame,
    builtin: true,
  },
  {
    id: 'robot-32',
    title: 'Robot',
    prompt:
      'A friendly retro robot, front view — antenna with red light, glowing cyan eyes, grille mouth, chest light, arms and legs, 32x32',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: robot32 as PXSFrame,
    builtin: true,
  },
  {
    id: 'cat-32',
    title: 'Cat',
    prompt:
      'A cute sitting orange tabby cat, front view — ears with pink inner, green eyes, pink nose, cream belly, curling tail and paws, 32x32',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: cat32 as PXSFrame,
    builtin: true,
  },
  {
    id: 'race-car-32',
    title: 'Race Car',
    prompt:
      'A red side-view race car — sleek low body, cockpit windshield, rear spoiler, white number roundel, two wheels, 32x32',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: raceCar32 as PXSFrame,
    builtin: true,
  },
  {
    id: 'saguaro-16',
    title: 'Saguaro Cactus',
    prompt: 'a green cactus — in-app pipeline, pure max reasoning (Opus 4.8, high effort)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: saguaro16 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'apple-live-16',
    title: 'Apple (Live)',
    prompt: 'a red apple — live-artisan: eyes-open, painted gesture by gesture on an erasable canvas (Opus 4.8)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: appleLive16 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'owl-live-32',
    title: 'Owl (Bar)',
    prompt: 'an owl — the hero bar (eyes-open sculptor cascade, Opus 4.8); the quality the statue engine targets',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: owlLive32 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'dragon-live-48b',
    title: 'Dragon (Bar 48²)',
    prompt: 'a majestic dragon — the 48² hero bar (eyes-open sculptor cascade, Opus 4.8)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: dragonLive48b as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'trex-claudecode-32',
    title: 'T-Rex (Bar)',
    prompt:
      'a T-rex — the hand-authored hero bar (eyes-open artisan loop, full reasoning, 9 drafts, 32²)',
    promptBy: 'human',
    composedBy: 'human',
    frame: trexClaudeCode32 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'cat-statue-32',
    title: 'Cat (Statue)',
    prompt: 'a cat — Pixcel statue engine: VISION → SHAPE → POLISH → QA, autonomous (Opus 4.8)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: catStatue32 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'axolotl-statue-32',
    title: 'Axolotl (Statue)',
    prompt: 'an axolotl — Pixcel statue engine: VISION → SHAPE → POLISH → QA, autonomous; the hard draft-1-wrong subject, nailed (Opus 4.8)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: axolotlStatue32 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'mushroom-statue-32',
    title: 'Mushroom (Statue)',
    prompt: 'a red mushroom — Pixcel statue engine: VISION → SHAPE → POLISH → QA, autonomous (Opus 4.8)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: mushroomStatue32 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
  {
    id: 'treefrog-statue-32',
    title: 'Tree Frog (Statue)',
    prompt: 'a red-eyed tree frog — Pixcel statue engine: VISION → SHAPE → POLISH → QA, autonomous (Opus 4.8)',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: treefrogStatue32 as PXSFrame,
    builtin: true,
    model: 'claude-opus-4-8',
  },
];

import type { PXSFrame } from '../../store/pxs-store';
import pixcelLogo from '../defaults/pixcel-logo.json';
import smiley16 from './smiley-16.json';
import heart20 from './heart-20.json';
import star24 from './star-24.json';
import mushroom16 from './mushroom-16.json';
import dog16 from './dog-16.json';

export interface GalleryEntry {
  id: string;
  title: string;
  prompt: string;
  /** Who wrote the prompt vs who composed the pixels */
  promptBy: 'human' | 'ai-composer';
  composedBy: 'human' | 'ai-composer';
  frame: PXSFrame;
}

/**
 * Curated PXS art for manual AI experiments.
 * To add a piece: save `your-art.json` here (PXSFrame shape), then append an entry below.
 */
export const GALLERY_ENTRIES: GalleryEntry[] = [
  {
    id: 'pixcel-logo',
    title: 'Pixcel Logo',
    prompt: 'Default studio wordmark (landing artwork)',
    promptBy: 'human',
    composedBy: 'human',
    frame: pixcelLogo as PXSFrame,
  },
  {
    id: 'smiley-16',
    title: 'Smiley',
    prompt:
      'Cheerful pixel smiley on dark background — yellow face, simple eyes and grin',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: smiley16 as PXSFrame,
  },
  {
    id: 'heart-20',
    title: 'Pixel Heart',
    prompt: 'Small red pixel heart icon, retro game style, centered on dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: heart20 as PXSFrame,
  },
  {
    id: 'star-24',
    title: 'Golden Star',
    prompt: 'Five-point golden star centered on a dark night-sky grid',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: star24 as PXSFrame,
  },
  {
    id: 'mushroom-16',
    title: 'Toadstool',
    prompt:
      'Classic retro mushroom — red cap with white spots and a cream stem, centered on a dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: mushroom16 as PXSFrame,
  },
  {
    id: 'dog-16',
    title: 'Puppy',
    prompt:
      'Cute front-facing sitting dog with floppy ears, cream muzzle and paws, on a dark canvas',
    promptBy: 'human',
    composedBy: 'ai-composer',
    frame: dog16 as PXSFrame,
  },
];

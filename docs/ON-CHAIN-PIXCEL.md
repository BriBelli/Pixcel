# Pixcel On-Chain — the accidental perfect on-chain art primitive

> **Status: captured opportunity, NOT built.** A direction, not a commitment. The honest read: Pixcel
> wasn't built for blockchain, but its data model happens to be the best-shaped thing in existence for
> *fully-on-chain generative art*. The value here is durable **regardless of the crypto hype cycle** —
> it's a technical fit, not a bet on coin prices.

## The one-liner
**Pixcel art is compact structured data, so it can live 100% on-chain — forever, deterministically,
with verifiable provenance.** That is the prized, premium corner of on-chain art, and almost nothing
else is shaped to do it.

## Why Pixcel fits (and almost nothing else does)
1. **Compact structured data → fully on-chain.** A `PXSFrame` is a few KB; a char-map + palette is
   **under 1 KB** for small art. That's small enough to store *entirely on the blockchain* — the art
   itself, not a link to it.
   - **The dirty secret of most NFTs:** the chain only stores a *pointer* (an IPFS hash or a URL). The
     actual JPEG lives off-chain on someone's server — and *can vanish* ("the JPEG disappeared" is a
     real, recurring NFT failure). "100% on-chain" projects (Art Blocks, Autoglyphs, OnChainMonkey) are
     the cult/premium tier precisely because they don't have this dependency. **Pixcel is born that way.**
2. **Deterministic render.** Store the data; the renderer produces the identical image anywhere, every
   time. On-chain art needs determinism — Pixcel's "data → solid-color grid" render is exactly that
   (one solid color per cell, Stay Pure, no ambiguity).
3. **Provenance via the trajectory.** Every piece carries its generation history (VISION brief → passes
   → audits → final). That's a verifiable **"making-of"** — collectible authenticity baked in, not
   bolted on. The 80-gesture legacy dragon's story *is* its certificate.
4. **On-brand for collectibles.** Rare-by-process pieces (the dragon), limited curated drops, 1-of-1
   cards — the engine naturally produces unique, provenanced artifacts. Pairs with #1–3 cleanly.

## What a fully-on-chain Pixcel piece looks like (technical sketch)
```
on-chain payload (tiny):
  palette:  { b:"#8a5a2b", w:"#f2e2c2", ... }     // char → hex
  grid:     "....bbbb....\n..bbwwwwbb..\n..."        // the char-map (a compact string)
  meta:     { subject, dims, model, createdAt }
  provenance (optional): hash of the trajectory (vision+passes+audits)

on-chain (or client) renderer:  payload → PXSFrame → solid-color grid → image
```
The whole artwork is the payload — kilobytes, not megabytes. A contract can store it, a deterministic
renderer (on-chain SVG/canvas, or any client) reconstructs it identically, forever. The trajectory can
be hashed on-chain (proof-of-making) with the full record kept off-chain or in metadata.

## The honest caveats (read these)
- **It is NOT "encrypted images."** That phrase isn't a real, defined category for us. *Steganography*
  (hiding data inside the pixels) is technically possible but gimmicky — **don't chase it.** The real
  thing is on-chain *storage* + *provenance*, not encryption.
- **Crypto markets are volatile and scam-heavy.** Don't build *for the hype*. Build the durable asset —
  the on-chain-art tech + the provenance — which holds value whether or not the market is up.
- **It's a lane, not a pivot.** The core product (reasoned pixel art) stands on its own. On-chain is an
  *unfair advantage* you can deploy into the collectibles/NFT market if/when you choose — not a
  dependency.

## The play, if pursued
Lead with **fully-on-chain, provenanced, limited Pixcel collectibles** (cards / 1-of-1s like the legacy
dragon). The pitch writes itself: *"real generative art that lives entirely on-chain, with a verifiable
making-of — not a link to a JPEG that might disappear."* That's a differentiated position the big image
models (off-chain, heavy, non-deterministic, no provenance) structurally cannot occupy.

*See also: [pixcel-vision skill → USE-CASES](../.claude/skills/pixcel-vision/USE-CASES.md) (the
collectibles lane); the data model in [AGENTS.md](../AGENTS.md).*

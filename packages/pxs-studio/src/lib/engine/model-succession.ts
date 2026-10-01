/**
 * SUCCESSOR DETECTION — noticing that the model you route to has been superseded.
 *
 * The refresh pass answers "does this model still exist?" and "are there ids we have never seen?".
 * Neither question catches the thing that actually degrades output quality: a model we curated is
 * still live, still working, still confirmed — and a NEWER VERSION of it shipped beside it.
 *
 * That failure has now happened four times in this project. FLUX sat two generations stale. Recraft
 * V3 was routed to while V4.1 had been the API default for months. Happy Horse was seeded at 1.0 with
 * 1.1 live. And Seedance 2.0 was in the registry while 2.5 — double the clip length — was one page
 * away. Every one was caught by a person reading a docs site, which is precisely the labour this
 * system exists to eliminate.
 *
 * The reason discovery misses it: `bytedance/seedance-2.5/...` is simply an unfamiliar id. Nothing
 * connects it to `bytedance/seedance-2.0/...`, so it lands as a candidate among dozens rather than as
 * "the model you are using, but newer".
 *
 * So: parse ids into (family, version) and compare. Pure + deterministic — this is a string question,
 * and answering it with an LLM call would be both slower and less reliable.
 */

/** A model id split into the part that identifies it and the part that versions it. */
export interface ParsedModelId {
  /** The id with version numbers removed — what makes two ids the same MODEL. */
  family: string;
  /** Version components, most significant first. Empty when the id carries no version. */
  version: number[];
  raw: string;
}

/**
 * Split an id into family + version. Handles the shapes providers actually use:
 *   bytedance/seedance-2.5/text-to-video → family 'bytedance/seedance/text-to-video', v [2,5]
 *   gemini-3.1-flash-image               → family 'gemini-flash-image',                v [3,1]
 *   recraftv4_1                          → family 'recraft',                           v [4,1]
 *   flux-2-pro                           → family 'flux-pro',                          v [2]
 */
export function parseModelId(rawId: string): ParsedModelId {
  // Strip the variant label BEFORE parsing, so the version is read from the id the provider
  // versioned rather than from a codename bolted onto the end of it.
  const id = stripVariantSuffix(rawId);
  // Some providers glue the version straight onto the name with no separator ('recraftv4_1',
  // 'recraftv3'). Insert one so a single rule handles both conventions — without this, 'recraftv4_1'
  // parses as family 'recraftv4' version 1, and never matches 'recraftv3' as its predecessor.
  const lowered = id.toLowerCase().trim().replace(/([a-z])v(\d)/g, '$1-v$2');
  const version: number[] = [];

  // Capture the FIRST version-looking token (2.5 · 3.1 · v4_1 · -2-), then strip every such token so
  // the remainder is a stable family name.
  const versionToken = /(?:^|[^a-z0-9])v?(\d+(?:[._]\d+)*)(?=$|[^a-z0-9]|[a-z])/;
  const m = lowered.match(versionToken);
  if (m) for (const part of m[1].split(/[._]/)) version.push(Number(part));

  const family = lowered
    .replace(/(?:^|[^a-z0-9])v?\d+(?:[._]\d+)*(?=$|[^a-z0-9]|[a-z])/g, '-')
    .replace(/[-_/]+/g, '-')
    .replace(/^-|-$/g, '')
    // Rejoin path segments so 'bytedance-seedance-text-to-video' compares cleanly.
    .replace(/-+/g, '-');

  return { family, version, raw: rawId };
}

/** Is `a` a strictly newer version than `b`? Compares component by component. */
export function isNewerVersion(a: number[], b: number[]): boolean {
  const len = Math.max(a.length, b.length);
  for (let i = 0; i < len; i++) {
    const x = a[i] ?? 0;
    const y = b[i] ?? 0;
    if (x > y) return true;
    if (x < y) return false;
  }
  return false;
}

export interface Succession {
  /** The registry id currently in use. */
  currentId: string;
  /** The newer id found live at the provider. */
  successorId: string;
  currentVersion: string;
  successorVersion: string;
  /** What the two ids have in common — evidence the match is not a coincidence. */
  family: string;
}

/**
 * Find live ids that are NEWER VERSIONS of models we already curate.
 *
 * Deliberately conservative: a succession is only reported when the family matches exactly and the
 * version is strictly higher. A newer version is a PROMPT TO RESEARCH, never an automatic swap —
 * Seedance 2.5 doubles clip length but drops 4K, so "newer" is not always "better for this job", and
 * deciding that requires reading the docs, which is the research pass's work.
 */
export function findSuccessors(
  curatedIds: string[],
  liveIds: string[],
  /**
   * The WHOLE catalog, when the caller has it.
   *
   * The sweep works one family at a time, so `curatedIds` is usually a single model — and a `held`
   * set built from that alone knows nothing about the rest of the registry. That is how
   * "gemini-3-pro-image → gemini-3.1-flash-image" kept being reported while gemini-3.1-flash-image
   * sat in the catalog: the call that found it had never heard of it. Defaults to `curatedIds`.
   */
  heldIds: string[] = curatedIds,
): Succession[] {
  const curated = curatedIds.map(parseModelId).filter((p) => p.version.length > 0);
  const live = liveIds.map(parseModelId).filter((p) => p.version.length > 0);
  const out: Succession[] = [];

  /**
   * What we ALREADY carry, as family + version. A finding the operator has already acted on trains
   * them to skim the report, which is how the next real one gets missed.
   */
  const held = new Set(
    heldIds.map(parseModelId).filter((p) => p.version.length > 0).map((p) => `${familyKey(p.family)}:${p.version.join('.')}`),
  );

  for (const c of curated) {
    // The newest live id in the same family, if it beats what we have.
    let best: ParsedModelId | null = null;
    const cKey = familyKey(c.family);
    for (const l of live) {
      // Compared on the host-agnostic key, so a successor that appeared first on another host still
      // matches the record we hold.
      const lKey = familyKey(l.family);
      if (!sameFamily(lKey, cKey)) continue;

      // A LINE DOES NOT CHANGE WHAT IT PRODUCES.
      //
      // The family key deliberately strips 'image' and 'video' as noise so the same line matches
      // across hosts that spell it differently — which also destroys the only signal separating an
      // image line from a text one. 'gpt-image-1.5' and 'gpt-4.1' both key to "gpt", so the text
      // model read as an exact-family successor to the image model.
      //
      // So the kind is checked on the RAW ids, where the word survives, and it must AGREE. An
      // exemption for ids that declare no kind is what let 'gpt-4.1' and 'grok-4.7' through; every
      // real successor here names its medium, so requiring it costs nothing and removes the whole
      // class of false positive.
      if (mediaKind(c.raw) !== mediaKind(l.raw)) continue;
      if (!isNewerVersion(l.version, c.version)) continue;
      // A number in an id is not always a version — see plausibleJump.
      if (!plausibleJump(c.version, l.version)) continue;
      // Already in the catalog under another record — a real newer version, and old news.
      if (held.has(`${lKey}:${l.version.join('.')}`)) continue;
      if (!best || isNewerVersion(l.version, best.version)) best = l;
    }
    if (best) {
      out.push({
        currentId: c.raw,
        successorId: best.raw,
        currentVersion: c.version.join('.'),
        successorVersion: best.version.join('.'),
        family: c.family,
      });
    }
  }
  // De-duplicate on the SUCCESSOR, not on our own record.
  //
  // One discovery is one finding. Keying on the current model's family reported the same new model
  // once per record that could claim it — hold a `pro` and a `flash` line and the arrival of
  // Gemini 4 lands twice, which reads as two things to chase.
  const seen = new Set<string>();
  return out.filter((s) => {
    if (seen.has(s.successorId)) return false;
    seen.add(s.successorId);
    return true;
  });
}

// ── THE SWEEP ────────────────────────────────────────────────────────────────────────────────────

/** What a succession sweep found, per provider. */
export interface SuccessionReport {
  /** The provider SEARCHED — not necessarily the one the current model is registered under. */
  provider: string;
  successions: Succession[];
  /** Families checked — so "found nothing" is distinguishable from "never looked". */
  checkedFamilies: string[];
}

export interface SuccessionDeps {
  /**
   * Ask a provider what it has in a model family. Injected so the sweep is testable without network.
   * Providers differ: some publish a full listing, fal takes a keyword. Either way the caller returns
   * live ids for that family.
   */
  search: (provider: string, familyKeyword: string) => Promise<string[]>;
}

/**
 * Tokens that say nothing about WHICH family a model belongs to: the vendor that made it, the
 * endpoint it is served on, and the size/speed variant. Stripping them is what lets the same family
 * be recognised across hosts.
 */
const FAMILY_NOISE = new Set([
  'text', 'to', 'video', 'image', 'reference', 'edit', 'fast', 'pro', 'dev', 'lite', 'turbo',
  'bytedance', 'alibaba', 'google', 'openai', 'black', 'forest', 'labs', 'blackforestlabs', 'fal',
  'ai', 'stability', 'stabilityai', 'base', 'large', 'medium', 'small', 'max', 'mini', 'preview',
  'quality', 'standard', 'ultra', 'plus', 'latest', 'beta', 'exp', 'experimental',
]);

/**
 * A DATED or CODENAMED suffix — `-2026-09-08`, `-flare`, `-sunburst`.
 *
 * Providers ship variants under names the version parser cannot read. `gpt-image-2.5-flare` parsed
 * to family "gpt-image-flare", which can never equal "gpt-image", so GPT Image 2.5 was invisible to
 * the sweep even once it could authenticate. A trailing date is unambiguous; a trailing single word
 * after a version number is a variant label, not a new family — "gpt-image-2.5-flare" is still the
 * gpt-image line, and treating it as its own family is how you sit two generations behind.
 */
function stripVariantSuffix(id: string): string {
  // Only the DATE is stripped here, because only the date is unambiguous. A trailing word might be
  // a TIER that genuinely distinguishes a model ('flux-2-pro' vs 'flux-2-dev') or a meaningless
  // codename ('gpt-image-2.5-flare'), and no rule can tell them apart from the string alone.
  // Codenames are handled by tolerant MATCHING instead — see `sameFamily`.
  return id.replace(/-\d{4}-\d{2}-\d{2}$/, '');
}

/**
 * Do two ids belong to the same model LINE?
 *
 * Exact key equality is too strict, because providers bolt unpredictable labels onto a line:
 * 'gpt-image-2.5-flare' keys to "gpt-flare" while our 'gpt-image-1.5' keys to "gpt". A word list of
 * codenames would work until the next codename, which is the hardcoding trap this whole system
 * exists to avoid — so the rule is structural instead: one key being a PREFIX of the other means the
 * longer one is the shorter line plus a label.
 *
 * Deliberately permissive. Within a single provider's own family search, over-matching costs a
 * finding the operator reads and dismisses; under-matching costs two whole generations shipped
 * without anyone noticing. We have now paid the second price twice.
 */
/**
 * Which MEDIA a model id advertises. Prefix-tolerant family matching is permissive by design, and
 * the cost showed up immediately: 'gpt-image-1.5' matched 'gpt-6.1-sol' and 'grok-imagine-image-2.0'
 * matched 'grok-4.7' — both TEXT models, both reported as successors to an image model. A line does
 * not change what it produces, so the kind has to agree.
 */
function mediaKind(id: string): 'image' | 'video' | 'audio' | 'unknown' {
  const v = id.toLowerCase();
  if (/\b(video|veo|seedance|kling|sora|runway)\b|video/.test(v)) return 'video';
  if (/\b(tts|speech|audio|music|lyria|voice)\b/.test(v)) return 'audio';
  if (/image|imagen|dall|flux|recraft|ideogram|diffusion|qwen-image/.test(v)) return 'image';
  return 'unknown';
}

/**
 * Is this version jump believable?
 *
 * Provider ids carry numbers that are not versions. fal writes Gemini 2.5 as 'gemini-25-flash', so
 * it parses as version 25 and looks like a colossal upgrade over our 3; 'recraft-20b' is a parameter
 * count and reads as version 20 over our 4.1. Both were reported as successors.
 *
 * A real line does not jump an order of magnitude. Anything beyond a few majors ahead is a number
 * that is not a version, and saying nothing beats sending the operator to check a model that does
 * not exist.
 */
function plausibleJump(from: number[], to: number[]): boolean {
  const a = from[0] ?? 0;
  const b = to[0] ?? 0;
  if (a === 0) return b <= 5;
  return b <= a + 3;
}

function sameFamily(a: string, b: string): boolean {
  if (a === b) return true;
  const [short, long] = a.length <= b.length ? [a, b] : [b, a];
  return long.startsWith(`${short}-`);
}

/**
 * The host-agnostic identity of a model family.
 *
 * THE FLUX 3 MISS lived here. `black-forest-labs/flux-2-pro` parsed to family
 * "black-forest-labs-flux-pro" while fal's `blackforestlabs/flux-3/text-to-image` parsed to
 * "blackforestlabs-flux-text-to-image" — the same family, two strings that can never be equal, so
 * the successor was invisible even once we thought to ask fal. The vendor writes its own name
 * differently per host and every host bolts its endpoint path on; neither changes what the model IS.
 */
export function familyKey(family: string): string {
  const words = stripVariantSuffix(family).split('-').filter((w) => w && !FAMILY_NOISE.has(w));
  return words.join('-') || family;
}

/** The searchable keyword for a family — the distinctive word, not the whole path. */
export function familyKeyword(id: string): string {
  const family = parseModelId(id).family;
  // 'bytedance-seedance-text-to-video' → 'seedance'. Drop vendor prefixes and endpoint suffixes so
  // the query is the model NAME, which is what a search index actually matches on.
  const words = family.split('-').filter((w) => w && !FAMILY_NOISE.has(w));
  return words[0] ?? family;
}

/**
 * Sweep every curated model's family for a newer version.
 *
 * Targeted rather than exhaustive: it asks "is there a newer X?" for each X we actually route to,
 * instead of pulling entire catalogues and diffing. That works with keyword-only APIs like fal's, and
 * it asks the question that matters — a provider's full listing is mostly models we will never use.
 */
export async function sweepForSuccessors(
  models: { id: string; provider: string; providerModelId?: string }[],
  deps: SuccessionDeps,
  /**
   * Every provider worth asking. A model FAMILY is not owned by the host we happen to reach it
   * through — Replicate and fal are universal hosts serving the same lines — so a family must be
   * swept across all of them, not only the one its current record points at.
   *
   * This is the FLUX 3 miss: our FLUX 2 is registered under Replicate, so the sweep asked Replicate
   * and only Replicate. fal had been listing blackforestlabs/flux-3 the whole time and Replicate had
   * nothing, so a whole generation went unnoticed while the sweep reported "checked, found nothing".
   *
   * Omitted → falls back to the providers present on `models`, which is the old behaviour.
   */
  providers?: string[],
): Promise<SuccessionReport[]> {
  // One entry per family, carrying the registry id so a finding names the record to update.
  const families = new Map<string, { keyword: string; curatedId: string; registryId: string }>();
  for (const m of models) {
    const curatedId = m.providerModelId ?? m.id;
    const keyword = familyKeyword(curatedId);
    if (!keyword || families.has(keyword)) continue;
    families.set(keyword, { keyword, curatedId, registryId: m.id });
  }

  const hosts = providers?.length ? providers : Array.from(new Set(models.map((m) => m.provider)));

  // The WHOLE catalog, so a per-family check still knows what the registry already holds.
  const heldIds = models.map((m) => m.providerModelId ?? m.id);

  /**
   * One DISCOVERY is one finding, across every host.
   *
   * The same model is listed by several hosts under different ids — GPT Image 2.5 is
   * 'gpt-image-2.5-flare' on OpenAI and 'openai/gpt-image-2.5/sunburst/edit' on fal — so
   * de-duplicating inside a single provider's pass still reported it once per host.
   *
   * Keyed on OUR family plus the version, because the successors' own keys are exactly what differs:
   * the codenames resolve to "gpt-flare" and "gpt-sunburst". What is stable across every host is the
   * record this concerns and the version that beat it.
   */
  const announced = new Set<string>();

  const reports: SuccessionReport[] = [];
  for (const provider of hosts) {
    const successions: Succession[] = [];
    const checkedFamilies: string[] = [];

    for (const f of families.values()) {
      checkedFamilies.push(f.keyword);
      try {
        const live = await deps.search(provider, f.keyword);
        // Map any successor back to OUR registry id, so the report names the record to update.
        for (const s of findSuccessors([f.curatedId], live, heldIds)) {
          const discovery = `${f.keyword}:${s.successorVersion}`;
          if (announced.has(discovery)) continue;
          announced.add(discovery);
          successions.push({ ...s, currentId: f.registryId });
        }
      } catch {
        /* a provider that will not answer is not a finding — the next pass tries again */
      }
    }
    reports.push({ provider, successions, checkedFamilies });
  }
  return reports;
}

/* =============================================================
 * Pixcel · Prompt Guide — model registry + analyzer
 * -----------------------------------------------------------------
 * Client-side stand-in for the per-model Prompt Guide agent. In
 * production these formulas + scoring come from the model agent over
 * the READ / POST contract (see the backend doc). Here we run a
 * deterministic heuristic analyzer over the nomenclature lexicons so
 * typing in the prompt bar lights up parts and moves the score live.
 *
 * Nano Banana Pro data is lifted from Google's official guide:
 * cloud.google.com/.../ultimate-prompting-guide-for-nano-banana
 * Canonical text-to-image formula:
 *   [Subject] + [Action] + [Location/Context] + [Composition] + [Style]
 * =========================================================== */
(function () {
  'use strict';

  /* segment colors — all from the design-system palette */
  var C = {
    blue:   '#8ab4f8', // --a2ui-accent
    green:  '#6ee7a0', // --a2ui-success
    coral:  '#f87171',
    gold:   '#fbbf24',
    purple: '#c58af9', // --a2ui-link-visited
  };

  /* ---- lexicons (industry + Nano Banana nomenclature) ---- */
  var LEX = {
    action: [
      'standing','sitting','seated','running','walking','leaning','lying','crouching',
      'kneeling','jumping','floating','posing','statuesque','stance','mid-stride','mid-air',
      'looking','gazing','staring','glancing','turned','slightly turned','facing','smiling',
      'frowning','laughing','crying','holding','gripping','reaching','pointing','gesturing',
      'adjusting','tending','fixing','repairing','sits','sit','rests','resting','tilts',
      'arms crossed','hands on hips','head tilted','eyes closed','walking toward','confident',
      'dynamic pose','action pose','intense expression','calm','serene','determined',
    ],
    context: [
      'studio','studio backdrop','seamless backdrop','seamless','backdrop','forest','jungle',
      'desert','city','cityscape','street','empty street','alley','rooftop','corridor','hallway',
      'room','interior','indoor','outdoor','landscape','mountain','mountains','beach','ocean',
      'underwater','space','spaceship','habitat','snow','rain','storm','night',
      'dusk','dawn','sunset','sunrise','background','environment','neon-lit','dystopian',
      'futuristic','medieval','ancient','warehouse','cafe','office','subway','platform','bar',
      'laboratory','temple','ruins','living room','kitchen','garden','deck','dock','harbor',
    ],
    composition: [
      'low angle','low-angle','high angle','high-angle','dutch angle','eye level','eye-level',
      'birds eye',"bird's eye",'worms eye',"worm's eye",'extreme close-up','extreme closeup',
      'close-up','closeup','close up','medium close-up','medium shot','medium-shot','medium-full',
      'medium-full shot','cowboy shot','wide shot','wide-angle','wide angle','establishing shot',
      'full body','full-body','full shot','center-framed','centered','portrait','headshot',
      'over-the-shoulder','over the shoulder','two-shot','from behind','overhead','top-down',
      'aerial','aerial view','macro','macro lens','pov','point of view','three-quarter',
      'profile','front view','shallow depth of field','depth of field','f/1.8','f/2.8','85mm',
      '50mm','35mm','24mm','telephoto','fisheye','gopro','fujifilm','disposable camera','dslr',
    ],
    style: [
      'photorealistic','hyperrealistic','hyper-realistic','hyper-detailed','cinematic',
      'cinematic lighting','editorial','fashion magazine','film still','movie scene','realistic',
      'stylized','anime','3d render','illustration','concept art','oil painting','watercolor',
      'van gogh','vector','minimalist',
      // film / medium
      'medium-format','medium format','analog film','35mm film','film grain','pronounced grain',
      'grainy','1980s color film','kodak portra','polaroid','high saturation','low saturation',
      // lighting
      'golden hour','blue hour','three-point','softbox','three-point softbox','volumetric',
      'god rays','rim lighting','rim light','backlighting','backlit','chiaroscuro','harsh light',
      'soft light','soft lighting','dramatic lighting','studio lighting','natural light','neon glow',
      // grade
      'teal and orange','muted teal','muted tones','cool tones','warm tones','warm vintage',
      'desaturated','high contrast','low contrast','pastel','color grading','color grade',
      'monochrome','black and white','vibrant','moody',
    ],
    material: [
      'tweed','leather','silk','velvet','denim','wool','cotton','linen','satin','lace','knit',
      'plate armor','etched','silver leaf','ceramic','glossy','matte','metallic','brushed metal',
      'chrome','wood','marble','glass','tailored','structured','sleek','ornate','weathered',
    ],
  };

  function scan(text, list) {
    var t = ' ' + text.toLowerCase().replace(/[^a-z0-9\s'&/.-]/g, ' ').replace(/\s+/g, ' ') + ' ';
    var hits = [];
    for (var i = 0; i < list.length; i++) {
      var term = list[i];
      if (t.indexOf(term) !== -1) hits.push(term);
    }
    hits.sort(function (a, b) { return b.length - a.length; });
    var kept = [];
    hits.forEach(function (h) { if (!kept.some(function (k) { return k.indexOf(h) !== -1; })) kept.push(h); });
    return kept;
  }
  function titleCase(s) { return s.replace(/\b\w/g, function (c) { return c.toUpperCase(); }); }
  function clauseAround(raw, terms) {
    if (!terms.length) return '';
    var m = raw.match(new RegExp('[^,.]*\\b(' + terms.slice(0, 3).map(esc).join('|') + ')\\b[^,.]*', 'i'));
    return m ? m[0].trim() : '';
  }
  function esc(s) { return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

  /* ---- the Nano Banana Pro 5-part formula (real order) ---- */
  var NANO_PARTS = [
    {
      id: 'subject', label: 'Subject', color: C.blue, weight: 22, icon: 'user',
      def: 'Identify the main focal point — be specific about materials and texture.',
      blurb: 'Define the physical makeup, not just the object. Don\u2019t ask for \u201ca suit\u201d \u2014 ask for \u201cnavy blue tweed\u201d; not \u201carmor\u201d but \u201cornate plate etched with silver leaf.\u201d Nano Banana reasons over concrete detail, so materiality is what separates good from breathtaking.',
      tip: 'Name 2\u20134 concrete, physical details.',
      type: 'text',
      placeholder: 'e.g. a fashion model in a tailored brown tweed dress',
      example: 'a striking fashion model wearing a tailored brown dress, sleek boots, holding a structured handbag',
    },
    {
      id: 'action', label: 'Action', color: C.green, weight: 17, icon: 'zap',
      def: 'Describe what the subject is doing — pose, stance, expression.',
      blurb: 'A clear stance and expression anchors the body language. One deliberate action reads stronger than a stacked list of verbs.',
      tip: 'One clear pose + one expression.',
      type: 'text',
      placeholder: 'e.g. posing with a confident, statuesque stance, slightly turned',
      example: 'posing with a confident, statuesque stance, slightly turned',
    },
    {
      id: 'context', label: 'Context', color: C.coral, weight: 19, icon: 'globe',
      def: 'Detail the environment. Frame positively \u2014 say what you want, not what you don\u2019t.',
      blurb: 'Nano Banana follows \u201cempty street\u201d far better than \u201cno cars.\u201d Seamless studio backdrops give clean, controllable results; specific locations supply depth and atmosphere.',
      tip: 'Describe the setting positively.',
      type: 'text',
      placeholder: 'e.g. a seamless, deep cherry-red studio backdrop',
      example: 'on a seamless, deep cherry-red studio backdrop',
    },
    {
      id: 'composition', label: 'Composition', color: C.gold, weight: 20, icon: 'clapperboard',
      def: 'Define the shot, framing, and camera. Use photographic terms.',
      blurb: 'Direct the camera. Dictate hardware (GoPro, Fujifilm, a disposable) and lens \u2014 \u201clow-angle, shallow depth of field (f/1.8)\u201d, \u201cwide-angle\u201d for scale, \u201cmacro\u201d for fine detail. Framing is control.',
      tip: 'Shot type + angle + lens.',
      type: 'enum',
      options: ['Medium-full shot, center-framed','Medium shot','Close-up','Extreme close-up','Full-body shot','Low-angle shot','High-angle shot','Wide-angle shot','Aerial view','Macro lens','Shallow depth of field (f/1.8)','Shot on Fujifilm','Shot on GoPro'],
      placeholder: 'e.g. Medium-full shot, center-framed',
      example: 'Medium-full shot, center-framed',
    },
    {
      id: 'style', label: 'Style', color: C.purple, weight: 18, icon: 'palette',
      def: 'Set the aesthetic \u2014 lighting, lens, film stock, and color grade.',
      blurb: 'Three moves: design the lighting (three-point softbox, chiaroscuro, golden-hour backlighting), name the medium and film stock (\u201cmedium-format analog film, pronounced grain\u201d), and set the color grade (\u201cmuted teal tones\u201d). This sets the emotional finish.',
      tip: 'Lighting + film stock + color grade.',
      type: 'tags',
      options: ['Photorealistic','Cinematic lighting','Editorial','Medium-format analog film','Pronounced grain','High saturation','Three-point softbox','Chiaroscuro','Golden-hour backlighting','Muted teal tones','1980s color film','Shot on 35mm'],
      placeholder: 'e.g. editorial, medium-format film, cinematic lighting',
      example: 'fashion-magazine editorial, medium-format analog film, pronounced grain, high saturation, cinematic lighting',
    },
  ];

  /* Clause-based extraction: split the prompt into clauses and assign each
     clause to AT MOST ONE part (its best lexicon match). This guarantees no
     two parts ever show the same text. The first clause is the Subject. */
  function extractValues(text) {
    var raw = text.trim();
    var empty = { subject: '', action: '', context: '', composition: '', style: [],
      _hits: { action: [], context: [], composition: [], style: [], material: [] } };
    if (!raw) return empty;

    var clauses = raw.split(/[,.\n]+/).map(function (s) { return s.trim(); }).filter(function (s) { return s.length > 1; });
    if (!clauses.length) return empty;

    var subject = clauses[0];
    var buckets = { action: [], context: [], composition: [], style: [] };
    var allHits = { action: [], context: [], composition: [], style: [], material: scan(raw, LEX.material) };

    for (var i = 1; i < clauses.length; i++) {
      var cl = clauses[i];
      var counts = {
        composition: scan(cl, LEX.composition).length,
        style: scan(cl, LEX.style).length,
        action: scan(cl, LEX.action).length,
        context: scan(cl, LEX.context).length,
      };
      // tie-break priority: technical terms (composition/style) win over loose action/context
      var order = ['composition', 'style', 'action', 'context'], best = '', bestN = 0;
      order.forEach(function (k) { if (counts[k] > bestN) { bestN = counts[k]; best = k; } });
      if (best && bestN > 0) { buckets[best].push(cl); allHits[best] = allHits[best].concat(scan(cl, LEX[best])); }
    }

    return {
      subject: subject,
      action: buckets.action.join(', '),
      context: buckets.context.join(', '),
      composition: buckets.composition.join(', '),
      style: buckets.style.map(titleCase),
      _hits: { action: allHits.action, context: allHits.context, composition: allHits.composition, style: allHits.style, material: allHits.material },
    };
  }

  function scorePart(part, vals) {
    var hits = vals._hits, present = false, value = '', n = 0;
    if (part.id === 'subject') { present = !!vals.subject; value = vals.subject; n = vals.subject ? Math.max(1, hits.material.length + 1) : 0; }
    else if (part.id === 'action') { present = !!vals.action; value = vals.action; n = hits.action.length; }
    else if (part.id === 'context') { present = !!vals.context; value = vals.context; n = hits.context.length; }
    else if (part.id === 'composition') { present = !!vals.composition; value = vals.composition; n = hits.composition.length; }
    else if (part.id === 'style') { present = vals.style.length > 0; value = vals.style.join(', '); n = hits.style.length; }
    var max = 20, score = present ? Math.min(max, 12 + Math.min(7, (n - 1) * 2 + 1)) : 0;
    return { id: part.id, label: part.label, color: part.color, present: present, value: value, score: score, max: max, rating: Math.round((score / max) * 10) / 2 };
  }

  function partNote(part, ps) {
    if (!ps.present) return 'Missing. ' + part.tip + ' This is the biggest single lift to your score.';
    if (ps.score >= 18) return 'Strong. ' + part.tip;
    if (ps.score >= 14) return 'Good, but thin \u2014 ' + part.tip.toLowerCase();
    return 'Present but vague. ' + part.tip;
  }

  function buildOptimized(parts, scored) {
    var seg = {}; scored.forEach(function (s) { seg[s.id] = s; });
    var inserted = [];
    function val(id, fb) { var s = seg[id]; if (s && s.present && s.value) return s.value; inserted.push(id); return fb; }
    var subj = val('subject', 'the subject described with two concrete material details');
    var act = val('action', 'in a deliberate pose with a clear expression');
    var ctx = val('context', 'on a seamless, controlled studio backdrop');
    var comp = val('composition', 'Medium-full shot, center-framed, shallow depth of field');
    var sty = val('style', 'photorealistic, cinematic lighting, medium-format film, muted color grade');
    var text = cap(subj) + ', ' + act + ', ' + ctx + '. ' + cap(comp) + '. ' + cap(sty) + '.';
    return { text: text.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.'), inserted: inserted };
  }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }

  function analyze(text, model) {
    var parts = (model && model.parts) || NANO_PARTS;
    var vals = extractValues(text || '');
    var scored = parts.map(function (p) { return scorePart(p, vals); });
    var used = scored.filter(function (s) { return s.present; }).length;
    var totalW = parts.reduce(function (a, p) { return a + p.weight; }, 0), weighted = 0;
    parts.forEach(function (p, i) { weighted += (scored[i].score / 20) * p.weight; });
    var overall = Math.round((weighted / totalW) * 100);
    var words = (text || '').trim().split(/\s+/).filter(Boolean).length;
    var specificity = scored.reduce(function (a, s) { return a + s.score; }, 0) / (parts.length * 20);
    var lenScore = words === 0 ? 0 : words < 6 ? 0.4 : words < 12 ? 0.7 : words < 70 ? 1 : 0.85;
    var clarity = Math.round((0.5 * specificity + 0.5 * lenScore) * 5 * 2) / 2;
    var band = overall >= 85 ? 'Excellent' : overall >= 70 ? 'Strong' : overall >= 50 ? 'Developing' : overall >= 25 ? 'Weak' : 'Bare idea';
    var opt = buildOptimized(parts, scored);
    var notes = {}; parts.forEach(function (p, i) { notes[p.id] = partNote(p, scored[i]); });
    return {
      overall: overall, band: band, componentsUsed: used, componentsTotal: parts.length,
      clarity: clarity, words: words, parts: scored, notes: notes,
      optimized: opt.text, inserted: opt.inserted,
      segments: scored.map(function (s) { return { id: s.id, label: s.label, color: s.color, value: s.score }; }),
    };
  }

  /* ---- model registry (real Nano Banana specs) ---- */
  var MODELS = [
    {
      id: 'nano-banana-pro', name: 'Nano Banana Pro', vendor: 'Google', provider: 'gemini',
      kind: 'Image', live: true, rank: 1, brief: 'Deep prompt reasoning \u2014 best text & camera control',
      tagline: 'Gemini 3 Pro Image \u00b7 deep-reasoning generation & editing',
      strengths: ['Reasons over your whole prompt before it generates', 'Studio-grade camera, lighting & text control', 'Up to 14 reference images for consistency'],
      specs: ['Gemini 3 Pro Image', '1K / 2K / 4K', '16:9 \u00b7 9:16 \u00b7 21:9 +7', '14 refs'],
      formula: '[Subject] + [Action] + [Location/Context] + [Composition] + [Style]',
      intro: 'A structured prompt yields consistent, high-quality results. Nano Banana rewards this five-part formula for optimal control.',
      parts: NANO_PARTS,
      source: 'Pixcel Model Agent \u00b7 synced from Google guide \u00b7 2026.03',
      example: 'A striking fashion model wearing a tailored brown dress, sleek boots, and holding a structured handbag, posing with a confident, statuesque stance, slightly turned, on a seamless, deep cherry-red studio backdrop. Medium-full shot, center-framed. Fashion-magazine editorial, shot on medium-format analog film, pronounced grain, high saturation, cinematic lighting.',
    },
    { id: 'nano-banana-2', name: 'Nano Banana 2', vendor: 'Google', provider: 'gemini', kind: 'Image', live: false, rank: 1 },
    { id: 'midjourney-v7', name: 'Midjourney v7', vendor: 'Midjourney', provider: 'replicate', kind: 'Image', live: true, rank: 2,
      brief: 'Strongest aesthetic default \u2014 rich, stylized grades' },
    { id: 'seedream-4', name: 'Seedream 4.0', vendor: 'ByteDance', provider: 'fal', kind: 'Image', live: true, rank: 3,
      brief: 'Fast, razor-sharp realism \u2014 excellent materials' },
    { id: 'flux-dev', name: 'FLUX.1 dev', vendor: 'Black Forest Labs', provider: 'bfl', kind: 'Image', live: true, rank: 4,
      brief: 'Precise prompt adherence', flag: 'TV-MA' },
    { id: 'grok-image', name: 'Grok Image', vendor: 'xAI', provider: 'xai', kind: 'Image', live: true, rank: 5,
      brief: 'Permissive \u00b7 fast turnarounds' },
    { id: 'gpt-image-1.5', name: 'GPT Image 1.5', vendor: 'OpenAI', provider: 'gpt', kind: 'Image', live: true, rank: 6,
      brief: 'Strong instruction following', gate1: { reason: 'content_blocks' } },
    { id: 'ideogram-3', name: 'Ideogram 3.0', vendor: 'Ideogram', provider: 'ideogram', kind: 'Image', live: true, rank: 7,
      brief: 'In-image typography specialist', gate1: { reason: 'specialist_only' } },
    { id: 'recraft-v3', name: 'Recraft v3', vendor: 'Recraft', provider: 'recraft', kind: 'Image', live: true, rank: 8,
      brief: 'Vector & brand-grade output', gate1: { reason: 'aspect' } },
    { id: 'sd-3.5', name: 'Stable Diffusion 3.5', vendor: 'Stability AI', provider: 'stability', kind: 'Image', live: true, rank: 9,
      brief: 'Open-weight workhorse', gate1: { reason: 'product_tier' } },
    { id: 'veo-3.1', name: 'Veo 3.1', vendor: 'Google', provider: 'gemini', kind: 'Video', live: false, rank: 1 },
  ];

  /* ---- routing — Gate 1 drop vocabulary (closed set, from routing-mechanics) ---- */
  var ROUTE_DROPS = {
    content_blocks:  { label: 'Content policy', detail: 'Provider would refuse this prompt' },
    product_tier:    { label: 'Tier',           detail: 'Not in your plan' },
    aspect:          { label: 'Aspect',         detail: '21:9 not supported' },
    no_api_key:      { label: 'No key',         detail: 'Credentials missing' },
    probe_failed:    { label: 'Offline',        detail: 'Health probe failed' },
    no_ref_path:     { label: 'No refs',        detail: 'Ref roles unsupported' },
    specialist_only: { label: 'Specialist',     detail: 'Narrow specialist \u2014 off general routes' },
  };

  /* ---- the routing brain (client stand-in): resolve pins + auto + slots into
     a frozen plan, exactly as Gate 1 → Gate 2 → Plan would server-side. ---- */
  function resolveRouting(pins, auto, slots, images) {
    images = images || 4;
    var byId = {}; MODELS.forEach(function (m) { byId[m.id] = m; });
    var live = MODELS.filter(function (m) { return m.live && m.kind === 'Image'; });
    var eligible = live.filter(function (m) { return !m.gate1; }).sort(function (a, b) { return a.rank - b.rank; });
    var dropped = live.filter(function (m) { return m.gate1; }).sort(function (a, b) { return a.rank - b.rank; });

    var pool = [], seen = {};
    pins.forEach(function (id) {
      var m = byId[id]; if (!m || seen[id]) return;
      if (auto && pool.length >= slots) return;
      seen[id] = 1; pool.push({ id: id, model: m, source: 'pin', rank: m.rank });
    });
    if (auto) {
      for (var i = 0; i < eligible.length && pool.length < slots; i++) {
        var m = eligible[i]; if (seen[m.id]) continue;
        seen[m.id] = 1; pool.push({ id: m.id, model: m, source: 'auto', rank: m.rank });
      }
    }
    var mode = auto ? 'auto' : 'strict';
    var primary = (pool.filter(function (p) { return p.model.parts; })[0] || pool[0] || null);
    return {
      pool: pool, mode: mode, eligible: eligible, dropped: dropped,
      slots: slots, auto: auto, images: images, pins: pins.slice(),
      runs: pool.length * images, cascade: auto,
      primaryId: primary ? primary.id : (MODELS[0] && MODELS[0].id),
    };
  }
  var ROUTE_MODE = {
    auto:   { label: 'Auto',   line: 'Pixcel fills any open slots and reruns the next-best model on a failure.' },
    strict: { label: 'Strict', line: 'Only your pinned models run. Pass or fail \u2014 no fallback.' },
  };

  /* worked example breakdown for the READ state (real Nano Banana example) */
  var EXAMPLE_BREAKDOWN = [
    { id: 'subject', label: 'Subject', value: 'Fashion model, tailored brown dress', score: 18, rating: 4.5 },
    { id: 'action', label: 'Action', value: 'Confident, statuesque stance, turned', score: 18, rating: 4.5 },
    { id: 'context', label: 'Context', value: 'Seamless cherry-red studio backdrop', score: 19, rating: 5 },
    { id: 'composition', label: 'Composition', value: 'Medium-full shot, center-framed', score: 18, rating: 4.5 },
    { id: 'style', label: 'Style', value: 'Editorial, medium-format film, grain', score: 18, rating: 4.5 },
  ];

  /* ---- Assets — the spine. Named, tagged, referenceable entities (not blobs).
     "Library, not folders": every surface reads & writes here; prompts hold
     references, so swapping an asset re-resolves everything that points at it. ---- */
  var ASSET_TYPES = {
    character: { label: 'Character', glyph: 'user',    color: C.blue },
    style:     { label: 'Style',     glyph: 'palette', color: C.purple },
    backdrop:  { label: 'Backdrop',  glyph: 'globe',   color: C.coral },
    material:  { label: 'Material',  glyph: 'layers',  color: C.gold },
    pose:      { label: 'Pose',      glyph: 'zap',     color: C.green },
    frame:     { label: 'Frame',     glyph: 'image',   color: '#9aa0aa' },
  };
  var ASSETS = [
    { id: 'jonny-1', name: 'Jonny 1', type: 'character', tags: ['armored', 'matte black'], refs: 11, self: true,
      usedIn: ['This sheet · 8 views'] },
    { id: 'noir-grade', name: 'Noir grade', type: 'style', tags: ['muted teal', 'cinematic'], refs: 6,
      usedIn: ['Jonny 1 · 8 views', 'Alley scene · 2 shots'], alts: ['Golden hour', 'Bleach bypass', 'Neon noir'] },
    { id: 'charcoal-cyc', name: 'Charcoal cyc', type: 'backdrop', tags: ['seamless', 'studio'], refs: 9,
      usedIn: ['Jonny 1 · 8 views', 'Bust set · 1'], alts: ['Cherry-red cyc', 'White cyc', 'Concrete bay'] },
    { id: 'brushed-plating', name: 'Brushed plating', type: 'material', tags: ['etched silver', 'metal'], refs: 7,
      usedIn: ['Jonny 1 · subject'] },
    { id: 'amber-visor', name: 'Amber visor', type: 'material', tags: ['glow', 'accent'], refs: 4,
      usedIn: ['Jonny 1 · anchor'] },
    { id: 'hero-poses', name: 'Hero poses', type: 'pose', tags: ['8 poses', 'dynamic'], refs: 3,
      usedIn: ['Jonny 1 · 3 views'] },
    { id: 'three-point', name: 'Three-point soft', type: 'style', tags: ['softbox', 'key light'], refs: 5,
      usedIn: ['Jonny 1 · lighting'], alts: ['Hard key', 'Ring light', 'Window light'] },
    { id: 'front-001', name: 'front-001', type: 'frame', tags: ['front', '2K'], refs: 1 },
    { id: 'tq-002', name: 'tq-002', type: 'frame', tags: ['3/4 left', '2K'], refs: 1 },
    { id: 'profile-003', name: 'profile-003', type: 'frame', tags: ['profile', '2K'], refs: 1 },
  ];

  window.PG = {
    MODELS: MODELS, analyze: analyze, C: C,
    EXAMPLE_BREAKDOWN: EXAMPLE_BREAKDOWN,
    titleCase: titleCase,
    ROUTE_DROPS: ROUTE_DROPS, ROUTE_MODE: ROUTE_MODE, resolveRouting: resolveRouting,
    ASSETS: ASSETS, ASSET_TYPES: ASSET_TYPES,
  };
})();

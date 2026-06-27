/* global React, IDEIcon, IDEProviderDot, PG */
/* Pixcel · Image IDE — Workflow landing (empty canvas state).
   Three rotating starting cards + a "View all workflows" catalog. The catalog
   is a stand-in for the dynamic feature set the media-model agent maintains:
   each entry is FEATURE → CAPABILITIES/SPECS → MODELS, surfaced from each
   provider's official docs. Nothing here is hard-coded in production. */
(function () {
  'use strict';
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, h = React.createElement;
  var PG = window.PG || { MODELS: [] };
  var MODEL_BY_ID = {}; (PG.MODELS || []).forEach(function (m) { MODEL_BY_ID[m.id] = m; });

  /* ── catalog: the agent-defined feature/workflow set ──
     id, icon (Lucide), title (FEATURE), sub (short), spec (CAPABILITIES/SPECS),
     models (MODELS, by id), cat (filter group). */
  var CATALOG = [
    { id: 'character', icon: 'layers', title: 'Build a character', sub: 'One subject, consistent across every pose', cat: 'Start',
      spec: 'Lock a single subject and regenerate it across any pose, angle, or outfit with reference chaining — a reusable, consistent asset.',
      models: ['nano-banana-pro', 'seedream-4', 'flux-dev'] },
    { id: 'scene', icon: 'aperture', title: 'Compose a scene', sub: 'An environment you can reshoot from any angle', cat: 'Start',
      spec: 'Establish a location, then relight and reshoot it from new camera angles while the set stays coherent across frames.',
      models: ['nano-banana-pro', 'midjourney-v7', 'seedream-4'] },
    { id: 'refine', icon: 'wand', title: 'Refine an image', sub: 'Small, single-change edits on a clean base', cat: 'Start',
      spec: 'Make targeted, single-change edits — swap an object, fix a detail, adjust wardrobe — without disturbing the rest of the frame.',
      models: ['nano-banana-pro', 'flux-dev', 'gpt-image-1.5'] },

    { id: 'style-burst', icon: 'contrast', title: 'Style transfer bursts', sub: 'Your image rendered across many styles at once', cat: 'Style',
      spec: 'Recreate one image in a range of styles you select — Cel animation, Claymation, Plushie, 3D Cartoon, Comic — generated together in a single response so you can compare and pick. Free-form styles welcome; common ones are suggested.',
      models: ['nano-banana-pro', 'gpt-image-1.5', 'seedream-4'] },
    { id: 'photoreal', icon: 'image', title: 'Photoreal & natural looks', sub: 'Believable lighting, lenses, and film stocks', cat: 'Style',
      spec: 'Drive realism through photographic language — lens, film stock, lighting, and color grade — as a family of looks, not one fixed "realistic" preset.',
      models: ['seedream-4', 'flux-dev', 'nano-banana-pro'] },
    { id: 'restyle-set', icon: 'sliders', title: 'Restyle or regrade a set', sub: 'Shift a whole set to a new look', cat: 'Style',
      spec: 'Apply a new color grade or style across an existing set so every frame moves together and stays consistent.',
      models: ['nano-banana-pro', 'midjourney-v7'] },

    { id: 'story', icon: 'grid', title: 'Multi-image stories', sub: 'Tell a story or steps across a set', cat: 'Story',
      spec: 'Generate a coherent multi-panel set — a narrative, sequence, or step-by-step — with characters and tone carried across every frame.',
      models: ['nano-banana-pro', 'gpt-image-1.5'] },
    { id: 'storyboard', icon: 'layers', title: 'Storyboard & comic strip', sub: 'Pre-vis grids for film and video', cat: 'Story',
      spec: 'Turn a character set plus a one-line narrative into a storyboard grid or comic strip — the pre-vis layer that feeds AI video pipelines.',
      models: ['nano-banana-pro', 'midjourney-v7'] },

    { id: 'infographic', icon: 'file', title: 'Infographics & explainers', sub: 'Structured info for a specific audience', cat: 'Docs',
      spec: 'Explainers, posters, labeled diagrams, timelines, and visual-wiki assets for students, execs, or customers. For dense, text-heavy layouts, set output quality to high.',
      models: ['nano-banana-pro', 'gpt-image-1.5', 'ideogram-3'] },
    { id: 'slides', icon: 'grid', title: 'Slides, diagrams & charts', sub: 'Productivity imagery with legible text', cat: 'Docs',
      spec: 'Generate slide visuals, diagrams, charts, and productivity images with legible in-image text and consistent layout.',
      models: ['nano-banana-pro', 'ideogram-3', 'gpt-image-1.5'] },
    { id: 'typography', icon: 'pencil', title: 'In-image text & typography', sub: 'Accurate words, headlines, and labels', cat: 'Docs',
      spec: 'Render legible, well-kerned text inside the image — headlines, labels, packaging copy — with a typography-specialist model.',
      models: ['ideogram-3', 'nano-banana-pro', 'gpt-image-1.5'] },

    { id: 'logo', icon: 'tag', title: 'Logo generation', sub: 'Clean, original marks that scale', cat: 'Brand',
      spec: 'From brand personality and use case, produce a simple, original mark with strong shape, balanced negative space, and scalability across sizes.',
      models: ['recraft-v3', 'ideogram-3', 'nano-banana-pro'] },
    { id: 'ads', icon: 'target', title: 'Ads & marketing creative', sub: 'On-brand creative with product and copy', cat: 'Brand',
      spec: 'Compose ad creative — product, layout, and headline space — sized for the channels you are shipping to.',
      models: ['nano-banana-pro', 'gpt-image-1.5', 'ideogram-3'] },
    { id: 'product', icon: 'crop', title: 'Product & packshots', sub: 'Studio product shots on any backdrop', cat: 'Brand',
      spec: 'Place a product on seamless or styled backdrops with controlled lighting and reflections for catalog-ready packshots.',
      models: ['seedream-4', 'nano-banana-pro', 'recraft-v3'] },

    { id: 'lowlat', icon: 'zap', title: '512p low-latency mode', sub: 'Fast drafts at lower resolution', cat: 'Speed',
      spec: 'Nano Banana 2 introduces a 512p mode optimized for speed and low-latency use while holding quality for many cases — ideal for rapid iteration.',
      models: ['nano-banana-2'] },

    { id: 'inpaint', icon: 'brush', title: 'Inpaint & object edit', sub: 'Mask and replace a region', cat: 'Edit',
      spec: 'Mask a region to add, remove, or swap an element while matching the surrounding lighting and texture.',
      models: ['nano-banana-pro', 'flux-dev', 'gpt-image-1.5'] },
    { id: 'upscale', icon: 'maximize', title: 'Upscale & enhance', sub: 'Higher resolution and crisper detail', cat: 'Edit',
      spec: 'Increase resolution and recover detail for print or large-format output without re-rolling the composition.',
      models: ['seedream-4', 'flux-dev'] },
  ];

  /* the rotating showcase pages — exactly three per page (first page is the
     classic Build / Compose / Refine trio) */
  var FEATURED_ORDER = ['character', 'scene', 'refine', 'style-burst', 'story', 'infographic',
    'logo', 'ads', 'storyboard', 'photoreal', 'slides', 'lowlat', 'typography', 'product', 'inpaint'];
  var BY_ID = {}; CATALOG.forEach(function (c) { BY_ID[c.id] = c; });
  var PAGES = [];
  for (var i = 0; i < FEATURED_ORDER.length; i += 3) {
    PAGES.push(FEATURED_ORDER.slice(i, i + 3).map(function (id) { return BY_ID[id]; }));
  }
  var CATS = ['All', 'Start', 'Style', 'Story', 'Docs', 'Brand', 'Edit', 'Speed'];

  function modelInfo(id) {
    var m = MODEL_BY_ID[id];
    return m ? { name: m.name, provider: m.provider } : { name: id, provider: 'gemini' };
  }

  /* ── models chip-strip — provider dots + a label ── */
  function ModelStrip(props) {
    var ids = props.ids || [];
    var shown = ids.slice(0, 4);
    var first = ids.length ? modelInfo(ids[0]).name : '';
    var extra = ids.length - 1;
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 } },
      h('div', { style: { display: 'flex', alignItems: 'center' } },
        shown.map(function (id, k) {
          return h('span', { key: id, title: modelInfo(id).name,
            style: { marginLeft: k ? -6 : 0, borderRadius: 7, background: 'var(--a2ui-bg-app)', padding: 1, display: 'inline-flex', position: 'relative', zIndex: shown.length - k } },
            h(IDEProviderDot, { provider: modelInfo(id).provider, size: 13, box: 20 }));
        })),
      h('span', { style: { fontSize: 11, color: 'var(--a2ui-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' } },
        first + (extra > 0 ? '  +' + extra : '')));
  }

  /* ── a featured starting card (compact) ── */
  function Card(props) {
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var c = props.item;
    return h('button', { onClick: function () { props.onPick(c); },
      onMouseEnter: function () { setHover(true); }, onMouseLeave: function () { setHover(false); },
      style: { width: 212, textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 9, padding: '15px 16px',
        borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit',
        background: hover ? 'var(--a2ui-bg-secondary)' : 'var(--a2ui-bg-tertiary)',
        border: '1px solid ' + (hover ? 'var(--a2ui-border-default)' : 'transparent'),
        boxShadow: hover ? 'var(--a2ui-shadow-sm)' : 'none',
        transition: 'background 200ms ease, border-color 200ms ease, box-shadow 200ms ease' } },
      h('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 32, height: 32, borderRadius: 9,
        background: hover ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-bg-elevated)',
        color: hover ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)', transition: 'background 200ms ease, color 200ms ease' } },
        h(IDEIcon, { name: c.icon, size: 17 })),
      h('span', { style: { fontSize: 13.5, fontWeight: 600, color: 'var(--a2ui-text-primary)', letterSpacing: '-0.01em' } }, c.title),
      h('span', { style: { fontSize: 11.5, lineHeight: 1.45, color: 'var(--a2ui-text-tertiary)',
        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, c.sub));
  }

  /* ── a full catalog card (FEATURE / CAPABILITIES / MODELS) ── */
  function FeatureCard(props) {
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var c = props.item;
    return h('button', { onClick: function () { props.onPick(c); },
      onMouseEnter: function () { setHover(true); }, onMouseLeave: function () { setHover(false); },
      style: { textAlign: 'left', display: 'flex', flexDirection: 'column', gap: 11, padding: 18,
        borderRadius: 12, cursor: 'pointer', fontFamily: 'inherit', height: '100%',
        background: hover ? 'var(--a2ui-bg-secondary)' : 'var(--a2ui-bg-tertiary)',
        border: '1px solid ' + (hover ? 'var(--a2ui-border-default)' : 'transparent'),
        boxShadow: hover ? 'var(--a2ui-shadow-sm)' : 'none',
        transition: 'background 180ms ease, border-color 180ms ease, box-shadow 180ms ease' } },
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 10 } },
        h('span', { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 34, height: 34, flexShrink: 0, borderRadius: 9,
          background: hover ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-bg-elevated)',
          color: hover ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)', transition: 'background 180ms ease, color 180ms ease' } },
          h(IDEIcon, { name: c.icon, size: 18 })),
        h('div', { style: { flex: 1 } }),
        h('span', { style: { fontSize: 9.5, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase',
          color: 'var(--a2ui-text-tertiary)', background: 'var(--a2ui-bg-elevated)', borderRadius: 9999, padding: '3px 8px' } }, c.cat)),
      h('span', { style: { fontSize: 14, fontWeight: 600, color: 'var(--a2ui-text-primary)', letterSpacing: '-0.01em' } }, c.title),
      h('span', { style: { flex: 1, fontSize: 11.5, lineHeight: 1.5, color: 'var(--a2ui-text-tertiary)',
        display: '-webkit-box', WebkitLineClamp: 4, WebkitBoxOrient: 'vertical', overflow: 'hidden' } }, c.spec),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, paddingTop: 11, borderTop: '1px solid var(--pxs-border-subtle)' } },
        h(ModelStrip, { ids: c.models })));
  }

  /* ── the "view all" catalog overlay ── */
  function Catalog(props) {
    var qs = useState(''); var query = qs[0], setQuery = qs[1];
    var ct = useState('All'); var cat = ct[0], setCat = ct[1];
    useEffect(function () {
      function onKey(e) { if (e.key === 'Escape') props.onClose(); }
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('keydown', onKey); };
    }, []);
    var q = query.trim().toLowerCase();
    var list = CATALOG.filter(function (c) {
      if (cat !== 'All' && c.cat !== cat) return false;
      if (!q) return true;
      return (c.title + ' ' + c.spec + ' ' + c.sub).toLowerCase().indexOf(q) !== -1;
    });

    return h('div', { style: { position: 'absolute', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 } },
      h('div', { onClick: props.onClose, style: { position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)',
        backdropFilter: 'blur(3px)', WebkitBackdropFilter: 'blur(3px)', animation: 'pxs-card-fade 200ms ease' } }),
      h('div', { style: { position: 'relative', width: 'min(960px, 100%)', maxHeight: '100%', display: 'flex', flexDirection: 'column',
        background: 'var(--a2ui-bg-app)', border: '1px solid var(--a2ui-border-default)', borderRadius: 16,
        boxShadow: 'var(--a2ui-shadow-lg)', overflow: 'hidden', animation: 'pxs-card-stack 260ms cubic-bezier(0.22, 1, 0.36, 1)' } },

        /* header */
        h('div', { style: { flexShrink: 0, padding: '18px 20px 14px', borderBottom: '1px solid var(--pxs-border-subtle)' } },
          h('div', { style: { display: 'flex', alignItems: 'flex-start', gap: 12 } },
            h('div', { style: { flex: 1, minWidth: 0 } },
              h('div', { style: { display: 'flex', alignItems: 'center', gap: 9 } },
                h('h2', { style: { margin: 0, fontSize: 17, fontWeight: 600, letterSpacing: '-0.01em', color: 'var(--a2ui-text-primary)' } }, 'All workflows'),
                h('span', { style: { fontSize: 12, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-dim)' } }, CATALOG.length + ' features')),
              h('p', { style: { margin: '6px 0 0', fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-tertiary)', maxWidth: 560 } },
                h('span', { style: { display: 'inline-flex', verticalAlign: '-2px', marginRight: 6, color: 'var(--a2ui-success)' } }, h(IDEIcon, { name: 'refresh', size: 12 })),
                'Surfaced from each provider\u2019s official docs by the model agent. Capabilities and supported models stay in sync \u2014 not hard-coded.')),
            h('button', { title: 'Close', onClick: props.onClose,
              style: { flexShrink: 0, width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                background: 'transparent', color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 8, cursor: 'pointer' },
              onMouseEnter: function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; e.currentTarget.style.color = 'var(--a2ui-text-secondary)'; },
              onMouseLeave: function (e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--a2ui-text-tertiary)'; } },
              h(IDEIcon, { name: 'x', size: 17 }))),

          /* search + category filters */
          h('div', { style: { display: 'flex', alignItems: 'center', gap: 10, marginTop: 14, flexWrap: 'wrap' } },
            h('div', { style: { display: 'inline-flex', alignItems: 'center', gap: 8, height: 34, padding: '0 12px', flex: '1 1 220px', minWidth: 180,
              background: 'var(--a2ui-bg-input)', border: '1px solid var(--a2ui-border-default)', borderRadius: 8 } },
              h('span', { style: { display: 'inline-flex', color: 'var(--a2ui-text-tertiary)' } }, h(IDEIcon, { name: 'aperture', size: 14 })),
              h('input', { value: query, placeholder: 'Search workflows\u2026', onChange: function (e) { setQuery(e.target.value); },
                style: { flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'inherit', fontSize: 13, color: 'var(--a2ui-text-primary)' } })),
            h('div', { style: { display: 'flex', alignItems: 'center', gap: 5, flexWrap: 'wrap' } },
              CATS.map(function (cc) {
                var on = cat === cc;
                return h('button', { key: cc, onClick: function () { setCat(cc); },
                  style: { height: 28, padding: '0 11px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500,
                    background: on ? 'var(--a2ui-bg-active)' : 'transparent', color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)', transition: 'background 150ms ease, color 150ms ease' },
                  onMouseEnter: function (e) { if (!on) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; },
                  onMouseLeave: function (e) { if (!on) e.currentTarget.style.background = 'transparent'; } }, cc);
              })))),

        /* grid */
        h('div', { className: 'ide-scroll', style: { flex: 1, minHeight: 0, overflowY: 'auto', padding: 20 } },
          list.length
            ? h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(266px, 1fr))', gap: 12 } },
                list.map(function (c) { return h(FeatureCard, { key: c.id, item: c, onPick: props.onPick }); }))
            : h('div', { style: { padding: '48px 0', textAlign: 'center', color: 'var(--a2ui-text-tertiary)', fontSize: 13 } },
                'No workflows match \u201c' + query + '\u201d.'))));
  }

  function Dots(props) {
    return h('div', { style: { display: 'flex', alignItems: 'center', gap: 7, marginTop: 22 } },
      props.pages.map(function (_, k) {
        var on = k === props.active;
        return h('button', { key: k, title: 'Page ' + (k + 1), onClick: function () { props.onGo(k); },
          style: { width: on ? 20 : 7, height: 7, borderRadius: 9999, border: 'none', cursor: 'pointer', padding: 0,
            background: on ? 'var(--pxs-accent-text)' : 'var(--a2ui-border-strong)', transition: 'width 240ms ease, background 240ms ease' } });
      }));
  }

  /* ── per-section landing copy + conceptual help cards ──
     Image is the full, live workflow experience (cards + catalog). Art / Video /
     Anim are tailored conceptual mocks: a “describe it” header over slotted
     suggestions — start-from-Pixcel, popular models, and what’s new. */
  var SECTION_META = {
    art: {
      title: 'What art do you want to create?',
      sub: 'e.g. a neon koi drifting through circuit-board reeds, 16-bit',
      cards: [
        { id: 'art-pixcel', icon: 'scribble', title: 'Commission with Pixcel', sub: 'Hand a one-line brief to the autonomous artisan — it designs and sculpts the piece live' },
        { id: 'art-models', icon: 'sparkles', title: 'Popular art models', sub: 'Browse the pixel and illustration models trending this week' },
        { id: 'art-new', icon: 'wand', title: 'New styles & features', sub: 'Fresh palettes, dithering, and char-map effects just added' },
      ],
    },
    video: {
      title: 'What video(s) do you want to create today?',
      sub: 'e.g. a slow dolly across a misty forest at dawn, cinematic',
      cards: [
        { id: 'vid-still', icon: 'image', title: 'Animate a still', sub: 'Turn one of your images into a short motion clip' },
        { id: 'vid-models', icon: 'sparkles', title: 'Popular video models', sub: 'The text-to-video and image-to-video models people use now' },
        { id: 'vid-new', icon: 'wand', title: 'New motion features', sub: 'Camera moves, longer durations, and synced audio just landed' },
      ],
    },
    anim: {
      title: 'What animation do you want to create?',
      sub: 'e.g. a seamless 8-frame pixel campfire loop',
      cards: [
        { id: 'anim-loop', icon: 'grid', title: 'Looping pixel animation', sub: 'A seamless loop — campfire, water, or an idle cycle' },
        { id: 'anim-sprite', icon: 'layers', title: 'Sprite sheet', sub: 'Frame-by-frame sheets ready to drop into a game engine' },
        { id: 'anim-new', icon: 'wand', title: 'New anim features', sub: 'Onion-skinning and frame interpolation just added' },
      ],
    },
  };

  function Landing(props) {
    var pg = useState(0); var page = pg[0], setPage = pg[1];
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var ov = useState(false); var open = ov[0], setOpen = ov[1];
    var onPick = props.onPick || function () {};

    /* auto-rotate the three featured cards (paused on hover / when catalog open /
       reduced-motion) */
    useEffect(function () {
      if (hover || open) return;
      if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
      var t = setTimeout(function () { setPage(function (p) { return (p + 1) % PAGES.length; }); }, 6000);
      return function () { clearTimeout(t); };
    }, [page, hover, open]);

    var sec = props.section || 'image';
    var meta = SECTION_META[sec];          // undefined for image (the full experience)
    var title = meta ? meta.title : 'What image(s) do you want to create?';
    var sub = meta ? meta.sub : 'e.g. a rain-soaked rooftop portrait at dusk, cinematic';
    var trio = PAGES[page] || PAGES[0];

    return h(React.Fragment, null,
      h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: 32, pointerEvents: 'none' } },
        h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', pointerEvents: 'auto' } },
          h('h1', { style: { margin: 0, fontSize: 27, fontWeight: 400, letterSpacing: '-0.01em', color: 'var(--a2ui-text-primary)', textAlign: 'center' } },
            title),
          h('p', { style: { margin: '12px 0 0', fontSize: 14, lineHeight: 1.5, color: 'var(--a2ui-text-tertiary)', textAlign: 'center' } },
            sub),

          meta
            /* tailored conceptual state — a static slotted trio, catalog comes later */
            ? h('div', { style: { display: 'flex', gap: 12, justifyContent: 'center', marginTop: 30, animation: 'pxs-card-fade 360ms ease' } },
                meta.cards.map(function (c) { return h(Card, { key: c.id, item: c, onPick: onPick }); }))
            /* image — the full live workflow experience (rotating trio + catalog) */
            : h(React.Fragment, null,
                h('div', { onMouseEnter: function () { setHover(true); }, onMouseLeave: function () { setHover(false); },
                  style: { marginTop: 30 } },
                  h('div', { key: page, style: { display: 'flex', gap: 12, justifyContent: 'center', animation: 'pxs-card-fade 360ms ease' } },
                    trio.map(function (c) { return h(Card, { key: c.id, item: c, onPick: onPick }); }))),
                h(Dots, { pages: PAGES, active: page, onGo: setPage }),
                h('button', { onClick: function () { setOpen(true); },
                  style: { display: 'inline-flex', alignItems: 'center', gap: 8, marginTop: 22, height: 34, padding: '0 14px',
                    background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-secondary)', border: '1px solid var(--pxs-border-subtle)',
                    borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, transition: 'background 150ms ease, border-color 150ms ease' },
                  onMouseEnter: function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-secondary)'; e.currentTarget.style.borderColor = 'var(--a2ui-border-default)'; },
                  onMouseLeave: function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-tertiary)'; e.currentTarget.style.borderColor = 'var(--pxs-border-subtle)'; } },
                  h('span', { style: { display: 'inline-flex', color: 'var(--a2ui-text-tertiary)' } }, h(IDEIcon, { name: 'grid', size: 15 })),
                  'View all workflows',
                  h('span', { style: { fontSize: 11, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-dim)' } }, CATALOG.length)))),

        ),
      open && h(Catalog, { onClose: function () { setOpen(false); }, onPick: function (c) { setOpen(false); onPick(c); } }));
  }

  window.IDEWorkflowLanding = Landing;
})();

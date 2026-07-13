/* global React, PXART_OWL */
/* Pixcel Art Studio — char-map drafting table + the Statue Method run driver.
   The autonomous artisan: VISION → SHAPE → POLISH → QA, watched live as a
   matrix-style char-map that cascades into finished pixel art. */
(function () {
  'use strict';
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef, useLayoutEffect = React.useLayoutEffect;
  var OWL = window.PXART_OWL;
  var W = OWL.W, H = OWL.H, PAL = OWL.palette, CHARFOR = OWL.charFor;

  /* ───────────────── icons ───────────────── */
  var I = {
    moon: ['M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9z'],
    sun: ['M12 17a5 5 0 1 0 0-10 5 5 0 0 0 0 10z', 'M12 1v2', 'M12 21v2', 'M4.22 4.22l1.42 1.42', 'M18.36 18.36l1.42 1.42', 'M1 12h2', 'M21 12h2', 'M4.22 19.78l1.42-1.42', 'M18.36 5.64l1.42-1.42'],
    sparkles: ['M9.94 14.34A1 1 0 0 0 9 15a1 1 0 0 0 .94.66l1.42.46a1 1 0 0 1 .64.64l.46 1.42a1 1 0 0 0 1.9 0l.46-1.42a1 1 0 0 1 .64-.64l1.42-.46a1 1 0 0 0 0-1.9l-1.42-.46a1 1 0 0 1-.64-.64l-.46-1.42a1 1 0 0 0-1.9 0l-.46 1.42a1 1 0 0 1-.64.64z', 'M5 3v4M3 5h4M6 17v2M5 18h2'],
    pause: ['M6 4h3v16H6zM15 4h3v16h-3z'],
    x: ['M18 6 6 18M6 6l12 12'],
    check: ['M20 6 9 17l-5-5'],
    save: ['M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7', 'M7 3v4a1 1 0 0 0 1 1h7'],
    iterate: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M3 21v-5h5'],
    redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
    undo: ['m9 14-5-5 5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H7'],
    tangle: ['M18.0 13.7L17.9 14.1L17.8 14.4L17.7 14.8L17.5 15.1L17.2 15.4L16.9 15.7L16.6 16.0L16.2 16.2L15.7 16.4L15.2 16.6L14.7 16.8L14.2 16.9L13.7 17.0L13.1 17.0L12.6 17.0L12.0 17.0L11.5 16.9L11.0 16.8L10.5 16.6L10.0 16.5L9.6 16.2L9.2 16.0L8.8 15.7L8.5 15.5L8.3 15.1L8.1 14.8L7.9 14.5L7.9 14.1L7.8 13.8L7.9 13.4L7.9 13.0L8.1 12.7L8.3 12.3L8.5 12.0L8.8 11.7L9.2 11.3L9.5 11.0L9.9 10.8L10.4 10.5L10.8 10.3L11.3 10.1L11.8 9.9L12.3 9.8L12.7 9.7L13.2 9.6L13.7 9.5L14.1 9.5L14.5 9.5L14.9 9.5L15.2 9.5L15.5 9.6L15.8 9.7L16.0 9.8L16.1 9.9L16.2 10.1L16.2 10.2L16.2 10.4L16.1 10.5L15.9 10.7L15.8 10.8L15.5 11.0L15.2 11.1L14.8 11.3L14.4 11.4L14.0 11.5L13.5 11.6L13.0 11.7L12.5 11.7L12.0 11.8L11.4 11.8L10.9 11.8L10.3 11.7L9.8 11.7L9.3 11.6L8.8 11.5L8.3 11.4L7.9 11.3L7.5 11.2L7.1 11.0L6.8 10.9L6.5 10.7L6.3 10.5L6.2 10.3L6.1 10.2L6.0 10.0L6.1 9.8L6.2 9.7L6.3 9.5L6.5 9.4L6.8 9.3L7.1 9.2L7.4 9.1L7.8 9.1L8.3 9.0L8.7 9.0L9.2 9.1L9.8 9.1L10.3 9.2L10.9 9.4L11.4 9.5L11.9 9.7L12.5 9.9L13.0 10.2L13.5 10.4L14.0 10.7L14.4 11.0L14.8 11.4L15.1 11.7L15.4 12.1L15.7 12.4L15.9 12.8L16.0 13.2L16.1 13.6L16.1 13.9L16.1 14.3L16.0 14.7L15.9 15.0L15.7 15.3L15.4 15.6L15.1 15.9L14.8 16.2L14.4 16.4L14.0 16.6L13.6 16.7L13.1 16.9L12.7 16.9L12.2 17.0L11.7 17.0L11.2 17.0L10.7 16.9L10.3 16.8L9.9 16.7L9.5 16.5L9.1 16.3L8.7 16.1L8.5 15.8L8.2 15.6L8.0 15.2L7.9 14.9L7.8 14.6L7.8 14.2L7.8 13.9L7.9 13.5L8.0 13.2L8.2 12.8L8.5 12.4L8.8 12.1L9.1 11.8L9.5 11.4L10.0 11.1L10.4 10.9L10.9 10.6L11.4 10.4L12.0 10.2L12.5 10.0L13.1 9.8L13.6 9.7L14.2 9.6L14.7 9.5L15.2 9.5L15.7 9.5L16.1 9.5L16.5 9.5L16.9 9.6L17.2 9.7L17.5 9.8L17.7 9.9L17.8 10.0L17.9 10.2L18.0 10.3'],
    scribble: ['M3.0 12.00L3.7 9.65L4.3 8.81L5.0 10.02L5.7 12.50L6.4 14.66L7.0 15.11L7.7 13.56L8.4 11.01L9.1 9.09L9.8 9.04L10.4 10.89L11.1 13.45L11.8 15.08L12.4 14.73L13.1 12.62L13.8 10.12L14.5 8.82L15.2 9.57L15.8 11.87L16.5 14.26L17.2 15.20L17.9 14.08L18.5 11.62L19.2 9.41L19.9 8.86L20.6 10.33L21.0 12.00'],
    chevronRight: ['m9 18 6-6-6-6'],
    chevronDown: ['m6 9 6 6 6-6'],
    chevronLeft: ['m15 18-6-6 6-6'],
    send: ['M14.54 2.46 22 2l-.46 7.46', 'M22 2 11 13', 'M22 2 15 22l-4-9-9-4z'],
    bot: ['M12 8V4', 'M9 4h6', 'M5 8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2z', 'M9 13h.01M15 13h.01', 'M1 14h2M21 14h2'],
    image: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
    layers: ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5', 'm22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5'],
    sliders: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
    maximize: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
    grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
    lock: ['M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', 'M8 9V6a4 4 0 1 1 8 0v3'],
    cpu: ['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M9 9h6v6H9z', 'M15 2v2M9 2v2M15 20v2M9 20v2M20 9h2M20 14h2M2 9h2M2 14h2'],
    panelRight: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M15 3v18'],
    feather: ['M12.67 19a2 2 0 0 0 1.42-.59l5.5-5.5a2.12 2.12 0 0 0-3-3l-5.5 5.5A2 2 0 0 0 11 16.33z', 'M16 8 2 22', 'M17.5 15H9'],
    eye: ['M2.06 12.35a1 1 0 0 1 0-.7 10.94 10.94 0 0 1 19.88 0 1 1 0 0 1 0 .7 10.94 10.94 0 0 1-19.88 0z', 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l3 2'],
    plus: ['M5 12h14M12 5v14'],
    minus: ['M5 12h14'],
    heart: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
    download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
  };
  function Ic(p) {
    var d = I[p.name] || I.sparkles, s = p.size || 18;
    return (
      <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={p.sw || 2} strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, display: 'block' }}>
        {d.map(function (dd, i) { return <path key={i} d={dd} />; })}
      </svg>
    );
  }

  /* ───────────────── run store (state + grid bus + driver) ───────────────── */
  var NOISE = '#&BKbcetpygo<>+=*x?01'.split('');
  var STAGES = ['VISION', 'SHAPE', 'POLISH', 'QA'];

  function buildCellPlan() {
    // ordered reveal plan for non-empty owl cells
    var struct = [], detail = [];
    for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
      var k = OWL.rows[y][x];
      if (k === '.') continue;
      var cell = { i: y * W + x, x: x, y: y, k: k, ch: CHARFOR[k] || '?', color: PAL[k] };
      if ('cCmrypwk'.indexOf(k) >= 0) detail.push(cell); else struct.push(cell);
    }
    function ord(a, b) { return (a.y - b.y) || (a.x - b.x); }
    struct.sort(ord); detail.sort(ord);
    return { struct: struct, detail: detail, all: struct.concat(detail) };
  }
  var PLAN = buildCellPlan();

  var ArtStore = (function () {
    var s = {
      phase: 'idle',        // idle | designing | shaping | refining | resolving | done | saved
      label: 'READY',       // screen label
      status: '',           // status line under canvas
      stageIdx: -1,         // active stage in STAGES
      stagesDone: [],       // completed stage names
      cost: 0, elapsed: 0, pass: 0,
      thinking: '', brief: '', briefOpen: false,
      log: [],              // {kind:'sys'|'note'|'ok', text}
      prompt: 'owl',
      res: 32, aspect: 'Auto', maxRev: 12, model: 'Opus 4.8',
      running: false, canSave: false,
      savedCount: 7, lastCells: 0, lastCost: 0,
      speed: 1, density: 1,
      canvasStyle: 'studio',   // studio (decluttered, art floats) | matrix (full-board char sea)
    };
    var subs = [], grid = null, token = 0, timers = [];
    function emit() { var snap = s; subs.slice().forEach(function (f) { f(snap); }); }
    function set(p) { s = Object.assign({}, s, p); emit(); }
    function get() { return s; }
    function use() {
      var st = useState(s);
      useEffect(function () { var f = function (n) { st[1](n); }; subs.push(f); return function () { var i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); }; }, []);
      return st[0];
    }
    function bindGrid(api) { grid = api; }
    function later(fn, ms) { var t = setTimeout(fn, ms / s.speed); timers.push(t); return t; }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function running() { return s.running; }

    // ───── delta-time timeline engine (robust to tab-throttling / capture) ─────
    // A single setInterval advances show-time by the real elapsed delta, so when
    // ticks are throttled the timeline FAST-FORWARDS (bigger steps) instead of stalling.
    var ticker = null, runT = 0, lastNow = 0, timeline = [], total = 0, appliedIdx = -1, lastEmitT = 0;
    var rev = { struct: 0, detail: 0, rows: 0, shadow: false };
    var curCost = 0, curThinking = '';

    function buildBrief(p) {
      return 'Subject: front-facing perched ' + p + ', the definitive cute-but-fierce icon.\n' +
        'View: head-on, bilaterally symmetric, centered on the vertical axis.\n' +
        'Silhouette: rounded teardrop body, broad head wider than tall, two pointed ear tufts at the top corners.\n' +
        'Proportions: head ~45% of height blending into a plump body; huge eyes dominate the face.\n' +
        'Face: two large round eyes (yellow ring + black pupil + tiny white catchlight), short downward beak.\n' +
        'Shading: light from upper-left, kept symmetric; lighter crown/breast, darker flanks; ground/branch shadow.';
    }
    function sl(text, pr) { return text.slice(0, Math.floor(Math.max(0, Math.min(1, pr)) * text.length)); }
    function revUpTo(list, key, target) { var c = rev[key]; while (c < target && c < list.length) { if (grid) grid.writeChar(list[c]); c++; } rev[key] = c; }
    function colUpTo(target) { var c = rev.rows; while (c < target && c < H) { if (grid) grid.colorRow(c); c++; } rev.rows = c; }

    function startTicker() {
      lastNow = performance.now();
      if (ticker) return;
      ticker = setInterval(function () {
        var now = performance.now(), dt = now - lastNow; lastNow = now;
        runT += dt * s.speed;
        dispatch();
      }, 40);
    }
    function stopTicker() { if (ticker) { clearInterval(ticker); ticker = null; } }

    function dispatch() {
      if (!timeline.length) return;
      var i = 0, acc = 0, cur = -1, prog = 0;
      for (; i < timeline.length; i++) { if (runT < acc + timeline[i].dur) { cur = i; prog = (runT - acc) / timeline[i].dur; break; } acc += timeline[i].dur; }
      if (cur < 0) { finishRun(); return; }
      while (appliedIdx < cur) { appliedIdx++; timeline[appliedIdx].enter(); if (appliedIdx < cur) timeline[appliedIdx].update(1); }
      timeline[cur].update(Math.max(0, Math.min(1, prog)));
      if (performance.now() - lastEmitT > 80) { lastEmitT = performance.now(); s = Object.assign({}, s, { cost: curCost, thinking: curThinking, elapsed: runT / 1000 }); emit(); }
    }
    function finishRun() {
      stopTicker();
      revUpTo(PLAN.struct, 'struct', PLAN.struct.length); revUpTo(PLAN.detail, 'detail', PLAN.detail.length);
      colUpTo(H); if (grid) grid.finish();
      set({ phase: 'done', label: 'RESOLVED', running: false, canSave: true, stageIdx: -1, stagesDone: STAGES.slice(),
        status: 'The artist says it\u2019s done — keep it or iterate', cost: Math.round(curCost * 100) / 100, thinking: curThinking,
        lastCells: W * H, lastCost: Math.round(curCost * 100) / 100,
        log: s.log.concat([{ kind: 'ok', text: 'REFINE approved ✓ — locked' }, { kind: 'ok', text: 'Finished' }]) });
    }

    function buildTimeline(p, res) {
      var dim = (res - 2) + '×' + res;
      var sketch = 'I\u2019m sketching out a ' + p + ' design, ' + dim + ' — ear tufts at the top corners, a broad head tapering into a teardrop body, head in the middle, body below, feet at the bottom on a branch. Keeping the whole thing mirrored around the centre column.';
      var shape = 'Blocking in the silhouette first — the head base widens to its widest point around the eye line, then the body tapers below it. Laying the outline and base feathers before any detail goes down.';
      var face = 'Now the face — each eye is a 5×5 block: yellow ring, black pupil, a white catchlight at the top-left for that dominant owl look. Short downward beak between the eyes. Cream breast patch in, darker folded wings against the flanks.';
      var qa = 'Scanning the ' + p + ' for issues — eyes, catchlights, beak, ear tufts and feet all read clean. The belly below the cream band is a touch flat; a soft mid-tone shadow band near the feet gives it roundness. A modest polish, nothing overworked.';
      return [
        { dur: 2600, enter: function () { rev = { struct: 0, detail: 0, rows: 0, shadow: false }; if (grid) { grid.clear(); grid.noise(true); }
            set({ phase: 'designing', label: 'DESIGNING', running: true, canSave: false, pass: 0, stageIdx: 0, stagesDone: [], thinking: '', brief: buildBrief(p),
              status: 'Comprehensive · Designing the vision…', log: [{ kind: 'sys', text: 'VISION — committing a feasible, native-to-resolution design' }] }); },
          update: function (pr) { curThinking = sl(sketch, pr); curCost = 0.04 * pr; } },
        { dur: 2800, enter: function () { set({ phase: 'shaping', label: 'WRITING', stageIdx: 1, stagesDone: ['VISION'], pass: 1, thinking: '',
              status: 'Comprehensive · Painting pass 1 — block-in…',
              log: [{ kind: 'sys', text: 'VISION — committing a feasible, native-to-resolution design' }, { kind: 'ok', text: 'VISION committed — design locked · moderate · ' + dim }, { kind: 'sys', text: 'REFINE — hot-potato — fresh-eyes judge + fix each pass' }, { kind: 'note', text: 'initial block-in' }] }); },
          update: function (pr) { revUpTo(PLAN.struct, 'struct', Math.floor(pr * PLAN.struct.length)); curThinking = sl(shape, pr); curCost = 0.04 + 0.10 * pr; } },
        { dur: 3000, enter: function () { set({ phase: 'refining', label: 'THINKING', stageIdx: 2, stagesDone: ['VISION', 'SHAPE'], pass: 1, thinking: '', status: 'Comprehensive · REFINE · pass 1' }); },
          update: function (pr) { revUpTo(PLAN.struct, 'struct', PLAN.struct.length); revUpTo(PLAN.detail, 'detail', Math.floor(pr * PLAN.detail.length)); curThinking = sl(face, pr); curCost = 0.14 + 0.50 * pr; } },
        { dur: 2600, enter: function () { set({ phase: 'refining', label: 'THINKING', pass: 2, thinking: '', status: 'Comprehensive · REFINE · pass 2',
              log: s.log.concat([{ kind: 'note', text: 'Lower belly is a flat tan slab — add a soft mid-tone shadow band to give the breast round volume.' }]) }); },
          update: function (pr) { revUpTo(PLAN.detail, 'detail', PLAN.detail.length); if (pr > 0.5 && !rev.shadow) { rev.shadow = true; if (grid) grid.flipShadowBand(); } curThinking = sl(qa, pr); curCost = 0.64 + 0.13 * pr; } },
        { dur: 2300, enter: function () { revUpTo(PLAN.struct, 'struct', PLAN.struct.length); revUpTo(PLAN.detail, 'detail', PLAN.detail.length); if (grid) grid.noise(false);
              set({ phase: 'resolving', label: 'RESOLVING', stageIdx: 3, stagesDone: ['VISION', 'SHAPE', 'POLISH'], thinking: '', status: 'Comprehensive · QA — fresh-eyes judge' }); },
          update: function (pr) { colUpTo(Math.floor(pr * H)); curCost = 0.77; } },
      ];
    }

    function start(prompt) {
      var p = (prompt || s.prompt || 'owl').trim() || 'owl';
      stopTicker();
      curCost = 0; curThinking = ''; runT = 0; appliedIdx = -1;
      rev = { struct: 0, detail: 0, rows: 0, shadow: false };
      timeline = buildTimeline(p, s.res);
      total = timeline.reduce(function (a, b) { return a + b.dur; }, 0);
      set({ prompt: p, cost: 0, elapsed: 0, running: true });
      startTicker();
    }
    function cancel() { stopTicker(); token++; if (grid) { grid.clear(); } set({ phase: 'idle', label: 'READY', running: false, canSave: false, status: '', thinking: '', stageIdx: -1, stagesDone: [], cost: 0, elapsed: 0, pass: 0 }); }
    function save() {
      set({ phase: 'saved', canSave: false, savedCount: s.savedCount + 1, status: 'Kept · saved to Assets · ' + (s.res - 2) + '×' + s.res + ' · $' + (Math.round(s.cost * 100) / 100).toFixed(2) });
    }
    function iterate() {
      stopTicker();
      var base = s.cost; curThinking = ''; runT = 0; appliedIdx = -1; rev.rows = 0;
      var iterText = 'Taking another pass — tightening the crown highlight and the catchlights, deepening the flank shadow a touch for more volume.';
      timeline = [
        { dur: 1700, enter: function () { if (grid) grid.toChars(); set({ phase: 'refining', label: 'THINKING', running: true, canSave: false, stageIdx: 2, stagesDone: ['VISION', 'SHAPE'], pass: s.pass + 1, thinking: '', status: 'Comprehensive · REFINE · iterating' }); },
          update: function (pr) { curThinking = sl(iterText, pr); curCost = base + 0.08 * pr; } },
        { dur: 2000, enter: function () { rev.rows = 0; if (grid) grid.noise(false); set({ phase: 'resolving', label: 'RESOLVING', stageIdx: 3, stagesDone: ['VISION', 'SHAPE', 'POLISH'], thinking: '', status: 'Comprehensive · QA — fresh-eyes judge' }); },
          update: function (pr) { colUpTo(Math.floor(pr * H)); curCost = base + 0.08; } },
      ];
      total = 3700;
      startTicker();
    }
    function setPrompt(v) { set({ prompt: v }); }
    function patch(p) { set(p); }
    function debugFinish() {
      // synchronous paint to the resolved owl — verification only
      stopTicker();
      if (grid) { grid.noise(false); PLAN.all.forEach(function (c) { grid.writeChar(c); }); for (var y = 0; y < H; y++) grid.colorRow(y); grid.finish(); }
      set({ phase: 'done', label: 'RESOLVED', running: false, canSave: true, stageIdx: -1, stagesDone: STAGES.slice(),
        status: 'The artist says it\u2019s done — keep it or iterate', cost: 0.77, elapsed: 308, pass: 3, lastCells: W * H, lastCost: 0.77,
        brief: s.brief || 'front-facing perched owl', thinking: 'The piece is resolved — eyes, catchlights, beak and the soft breast shadow all read clean.',
        log: [{ kind: 'ok', text: 'VISION committed — design locked' }, { kind: 'sys', text: 'REFINE — hot-potato — fresh-eyes judge + fix each pass' }, { kind: 'note', text: 'soft mid-tone shadow band added to the lower belly' }, { kind: 'ok', text: 'REFINE approved ✓ — locked' }, { kind: 'ok', text: 'Finished' }] });
    }
    return { use: use, get: get, bindGrid: bindGrid, start: start, cancel: cancel, save: save, iterate: iterate, setPrompt: setPrompt, patch: patch, debugFinish: debugFinish, STAGES: STAGES };
  })();

  /* ───────────────── char-map drafting table ───────────────── */
  function CharMapTable(props) {
    var st = ArtStore.use();
    var boardRef = useRef(null), gridRef = useRef(null);
    var cells = useRef([]);          // span refs
    var model = useRef(null);        // per-cell state
    var noiseTimer = useRef(null);
    var cz = useState(14); var cell = cz[0], setCell = cz[1];
    var hz = useState(null); var hov = hz[0], setHov = hz[1];
    var fz = useState({ cols: 0, rows: 0 }); var field = fz[0], setField = fz[1];
    var matrix = true; // single immersive canvas — a full char-map sea with the art forming in the center
    var zz = useState(1); var zoom = zz[0], setZoom = zz[1];
    var glz = useState(false); var gridOn = glz[0], setGridOn = glz[1];

    // build per-cell model once
    if (!model.current) {
      model.current = [];
      for (var y = 0; y < H; y++) for (var x = 0; x < W; x++) {
        var k = OWL.rows[y][x];
        model.current.push({ x: x, y: y, k: k, ch: CHARFOR[k] || '?', color: PAL[k], empty: k === '.', revealed: false, resolved: false });
      }
    }

    // deterministic replay of the finished art (survives layout remounts so the
    // piece never blanks out when the canvas component is re-created)
    function repaintDone() {
      var ph = ArtStore.get().phase;
      if (ph !== 'done' && ph !== 'saved') return;
      model.current.forEach(function (m, i) {
        var el = cells.current[i]; if (!el) return;
        if (m.empty) { el.textContent = ''; el.style.background = 'transparent'; el.style.boxShadow = 'none'; el.style.textShadow = 'none'; return; }
        m.resolved = true; el.textContent = ''; el.style.color = 'transparent'; el.style.textShadow = 'none'; el.style.boxShadow = 'none';
        el.style.background = m.color;
      });
    }

    // imperative grid API
    useEffect(function () {
      var api = {
        clear: function () {
          stopNoise();
          model.current.forEach(function (m, i) {
            m.revealed = false; m.resolved = false;
            var el = cells.current[i]; if (!el) return;
            el.textContent = ''; el.style.background = 'transparent'; el.style.color = 'var(--cm-dim)'; el.style.textShadow = 'none'; el.style.opacity = '1';
          });
        },
        writeChar: function (c) {
          var i = c.y * W + c.x, m = model.current[i], el = cells.current[i]; if (!el) return;
          m.revealed = true; el.textContent = m.ch;
          el.style.color = 'var(--cm-ink)'; el.style.textShadow = '0 0 6px var(--cm-glow), 0 0 2px var(--cm-glow)';
          el.style.background = 'transparent';
          // settle to steady ink shortly after the glow
          (function (e) { setTimeout(function () { if (e.style) { e.style.textShadow = '0 0 3px var(--cm-glow)'; e.style.color = 'var(--cm-ink-2)'; } }, 240); })(el);
        },
        colorRow: function (row) {
          for (var x = 0; x < W; x++) {
            var i = row * W + x, m = model.current[i], el = cells.current[i]; if (!el) continue;
            if (m.empty) { el.textContent = ''; el.style.background = 'transparent'; el.style.textShadow = 'none'; continue; }
            m.resolved = true; el.textContent = ''; el.style.color = 'transparent'; el.style.textShadow = 'none';
            el.style.background = m.color; el.style.boxShadow = '0 0 10px ' + hexA(m.color, 0.45);
            (function (e) { setTimeout(function () { if (e.style) e.style.boxShadow = 'none'; }, 360); })(el);
          }
        },
        flipShadowBand: function () {
          // darken a belly band — visible "judge + fix"
          for (var x = 0; x < W; x++) for (var yy = 24; yy <= 26; yy++) {
            var i = yy * W + x, m = model.current[i], el = cells.current[i]; if (!el || m.empty) continue;
            if ('cC'.indexOf(m.k) >= 0) { m.ch = 'e'; el.textContent = el.textContent ? 'e' : el.textContent; el.style.textShadow = '0 0 7px var(--cm-glow)'; (function (e) { setTimeout(function () { if (e.style) e.style.textShadow = '0 0 3px var(--cm-glow)'; }, 300); })(el); }
          }
        },
        toChars: function () {
          model.current.forEach(function (m, i) {
            var el = cells.current[i]; if (!el || m.empty) return;
            m.resolved = false; el.style.background = 'transparent'; el.style.boxShadow = 'none';
            el.textContent = m.ch; el.style.color = 'var(--cm-ink-2)'; el.style.textShadow = '0 0 3px var(--cm-glow)';
          });
        },
        finish: function () { stopNoise(); },
        noise: function (on) { if (on) startNoise(); else stopNoise(); },
        repaint: function () { repaintDone(); },
      };
      ArtStore.bindGrid(api);
      return function () { stopNoise(); };
    }, []);

    // when this table (re)mounts on a finished piece, replay it deterministically
    useEffect(function () { repaintDone(); }, [cell, st.phase]);

    function startNoise() {
      stopNoise();
      noiseTimer.current = setInterval(function () {
        var d = ArtStore.get().density;
        for (var n = 0; n < Math.round(34 * d); n++) {
          var i = Math.floor(Math.random() * model.current.length), m = model.current[i], el = cells.current[i];
          if (!el || m.revealed || m.resolved) continue;
          el.textContent = NOISE[Math.floor(Math.random() * NOISE.length)];
          el.style.color = 'var(--cm-dim)'; el.style.textShadow = 'none';
          (function (e) { setTimeout(function () { if (e && e.style && !e.dataset.kept) e.textContent = ''; }, 360 + Math.random() * 500); })(el);
        }
      }, 110);
    }
    function stopNoise() { if (noiseTimer.current) { clearInterval(noiseTimer.current); noiseTimer.current = null; } }

    // fit cell size to available board space
    useLayoutEffect(function () {
      var el = boardRef.current; if (!el) return;
      function fit() {
        var r = el.getBoundingClientRect();
        var pad = matrix ? 14 : 26, rulerT = props.rulers ? 16 : 4, rulerL = props.rulers ? 18 : 4;
        var aw = r.width - pad * 2 - rulerL, ah = r.height - pad * 2 - rulerT - (props.bottomInset || 0);
        var c = Math.floor(Math.min(aw / W, ah / H));
        var emax = Math.min(props.maxCell || 24, 21);
        c = Math.max(8, Math.min(emax, c));
        setCell(c);
        if (matrix) setField({ cols: Math.ceil(r.width / c) + 2, rows: Math.ceil(r.height / c) + 2 });
      }
      fit();
      var ro = new ResizeObserver(fit); ro.observe(el);
      return function () { ro.disconnect(); };
    }, [props.rulers, props.maxCell, matrix, props.bottomInset]);

    var gw = cell * W, gh = cell * H;
    var ticks = []; for (var t = 0; t <= W; t += 5) ticks.push(t);
    var rticks = []; for (var rt = 0; rt <= H; rt += 5) rticks.push(rt);
    var running = st.running, designing = st.phase === 'designing';

    return (
      <div ref={boardRef} className="pxart-board" style={{ position: 'relative', flex: 1, minWidth: 0, minHeight: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden',
        paddingBottom: props.bottomInset || 0,
        backgroundColor: 'var(--pxs-bg-canvas)',
        backgroundImage: matrix ? 'none' : 'radial-gradient(circle at 1px 1px, rgba(138,180,248,0.05) 1px, transparent 0)',
        backgroundSize: (cell) + 'px ' + (cell) + 'px',
        '--cm-dim': 'var(--pxart-dim, rgba(138,180,248,0.13))', '--cm-ink': 'var(--pxart-ink, rgba(174,203,250,0.95))', '--cm-ink-2': 'var(--pxart-ink-2, rgba(138,180,248,0.62))',
        '--cm-glow': 'var(--pxart-glow, rgba(138,180,248,0.55))' }}>

        {/* matrix mode — full-board char-map sea behind the centered art */}
        {matrix && field.cols > 0 && <MatrixField cols={field.cols} rows={field.rows} cell={cell} />}

        {/* canvas meta — structured metadata cluster, top-left (dimension · model · cost) */}
        <div style={{ position: 'absolute', left: 16, top: 14, zIndex: 5, display: 'inline-flex', alignItems: 'stretch', whiteSpace: 'nowrap',
          fontFamily: 'var(--a2ui-font-mono)', fontSize: 11.5, background: 'var(--a2ui-glass-dark)',
          backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)', border: '1px solid var(--pxs-glass-border)',
          borderRadius: 9, overflow: 'hidden', boxShadow: 'var(--a2ui-shadow-sm)' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 10px', color: 'var(--a2ui-text-secondary)' }}>
            <span style={{ color: 'var(--pxs-accent-text)' }}><Ic name="cpu" size={12} /></span>
            {(st.res - 2) + '×' + st.res}
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', padding: '5px 10px', color: 'var(--a2ui-text-tertiary)', borderLeft: '1px solid var(--pxs-border-subtle)' }}>{st.model}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 10px', borderLeft: '1px solid var(--pxs-border-subtle)',
            color: st.cost > 0 ? 'var(--a2ui-success)' : 'var(--a2ui-text-dim)' }}>
            {st.pass ? <span style={{ color: 'var(--a2ui-text-tertiary)' }}>p{st.pass}</span> : null}
            ${st.cost.toFixed(2)}
          </span>
        </div>

        {/* canvas dock — vertical tool bar, top-right (zoom · fit · grid · export) */}
        <CanvasDock zoom={zoom} gridOn={gridOn}
          onZoomIn={function () { setZoom(function (z) { return Math.min(2.4, Math.round((z + 0.2) * 10) / 10); }); }}
          onZoomOut={function () { setZoom(function (z) { return Math.max(0.6, Math.round((z - 0.2) * 10) / 10); }); }}
          onFit={function () { setZoom(1); }}
          onGrid={function () { setGridOn(function (g) { return !g; }); }} />

        {/* the board: rulers + grid, "pinned" to the drafting surface */}
        <div style={{ position: 'relative', zIndex: 1, display: 'grid',
          gridTemplateColumns: (props.rulers ? '18px ' : '') + 'max-content',
          gridTemplateRows: (props.rulers ? '16px ' : '') + 'max-content', gap: 0,
          transform: 'scale(' + zoom + ')', transition: 'transform 180ms cubic-bezier(0.22,1,0.36,1)' }}>
          {props.rulers && <div />}
          {props.rulers &&
            <div style={{ position: 'relative', height: 16 }}>
              {ticks.map(function (tk) { return (
                <span key={tk} style={{ position: 'absolute', left: tk * cell, bottom: 0, transform: 'translateX(-50%)',
                  width: 1, height: tk % W === 0 || tk === 0 ? 7 : 5, background: 'var(--a2ui-text-dim)', opacity: 0.6 }} />
              ); })}
            </div>}
          {props.rulers &&
            <div style={{ position: 'relative', width: 18 }}>
              {rticks.map(function (tk) { return (
                <span key={tk} style={{ position: 'absolute', top: tk * cell, right: 0, transform: 'translateY(-50%)',
                  height: 1, width: 7, background: 'var(--a2ui-text-dim)', opacity: 0.6 }} />
              ); })}
            </div>}

          {/* grid surface */}
          <div ref={gridRef} onMouseLeave={function () { setHov(null); }}
            style={{ position: 'relative', width: gw, height: gh, display: 'grid',
              gridTemplateColumns: 'repeat(' + W + ', ' + cell + 'px)', gridTemplateRows: 'repeat(' + H + ', ' + cell + 'px)',
              fontFamily: 'var(--a2ui-font-mono)', fontSize: Math.round(cell * 0.74) + 'px', lineHeight: cell + 'px',
              boxShadow: matrix ? 'none' : '0 0 0 1px rgba(255,255,255,0.05)',
              backgroundColor: 'transparent',
              backgroundImage: gridOn ? 'linear-gradient(var(--pxs-border-subtle) 1px, transparent 1px), linear-gradient(90deg, var(--pxs-border-subtle) 1px, transparent 1px)' : 'none',
              backgroundSize: cell + 'px ' + cell + 'px',
              borderRadius: 2, cursor: st.phase === 'done' || st.phase === 'saved' ? 'crosshair' : 'default' }}>
            {model.current.map(function (m, i) {
              return <span key={i} ref={function (el) { cells.current[i] = el; }}
                onMouseEnter={(st.phase === 'done' || st.phase === 'saved') ? function () { setHov({ x: m.x, y: m.y }); } : undefined}
                style={{ display: 'block', textAlign: 'center', color: 'var(--cm-dim)', userSelect: 'none',
                  outline: hov && hov.x === m.x && hov.y === m.y ? '1px solid var(--pxs-accent-focus)' : 'none', outlineOffset: -1 }} />;
            })}
            {/* registration crop marks */}
            <CropMarks />
            {designing && <DesigningVeil />}
            {st.phase === 'idle' &&
              <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 10, pointerEvents: 'none' }}>
                <span style={{ color: 'var(--cm-ink-2)', opacity: 0.5 }}><Ic name="scribble" size={30} /></span>
                <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 11, letterSpacing: '0.06em', color: 'var(--a2ui-text-dim)' }}>the table is empty · commission a piece</span>
              </div>}
          </div>
        </div>

        {/* hover coordinate readout (edit affordance) */}
        {hov && (st.phase === 'done' || st.phase === 'saved') &&
          <div style={{ position: 'absolute', bottom: 12, left: 16, fontFamily: 'var(--a2ui-font-mono)', fontSize: 11,
            color: 'var(--a2ui-text-tertiary)', background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(8px)',
            border: '1px solid var(--pxs-glass-border)', borderRadius: 6, padding: '3px 8px', pointerEvents: 'none' }}>
            x{String(hov.x).padStart(2, '0')} · y{String(hov.y).padStart(2, '0')} · edit
          </div>}

        {/* slot-machine meta — the live thinking + data stream, as a graceful
           vertical-scrolling overlay down the canvas margin (fades top & bottom) */}
        {st.phase !== 'idle' && st.phase !== 'done' && st.phase !== 'saved' && (st.running || st.thinking) &&
          <SlotMeta st={st} compact={props.compact} />}

        {props.children}
      </div>
    );
  }

  /* full-board matrix char-sea — decorative, imperative flicker, memo'd so it never
     re-renders on the per-tick store emits (only on cols/rows/cell change). */
  var MatrixField = React.memo(function MatrixField(props) {
    var cols = props.cols, rows = props.rows, cell = props.cell;
    var total = cols * rows;
    var spans = useRef([]);
    var timer = useRef(null);
    useEffect(function () {
      function paint(el, force) {
        if (!el) return;
        if (force || Math.random() < 0.34) { el.textContent = NOISE[Math.floor(Math.random() * NOISE.length)]; el.style.opacity = (0.05 + Math.random() * 0.22).toFixed(2); }
        else { el.textContent = ''; }
      }
      spans.current.forEach(function (el) { paint(el, false); });
      var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduce) return;
      var n = Math.max(6, Math.round(total * 0.02));
      timer.current = setInterval(function () {
        for (var k = 0; k < n; k++) {
          var i = Math.floor(Math.random() * total), el = spans.current[i]; if (!el) continue;
          if (Math.random() < 0.55) paint(el, true); else el.textContent = '';
        }
      }, 150);
      return function () { if (timer.current) { clearInterval(timer.current); timer.current = null; } };
    }, [cols, rows]);
    var arr = []; for (var i = 0; i < total; i++) arr.push(i);
    return (
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', display: 'grid',
        gridTemplateColumns: 'repeat(' + cols + ', ' + cell + 'px)', gridAutoRows: cell + 'px',
        justifyContent: 'center', alignContent: 'center', fontFamily: 'var(--a2ui-font-mono)',
        fontSize: Math.round(cell * 0.66) + 'px', lineHeight: cell + 'px', color: 'var(--cm-dim)',
        pointerEvents: 'none', userSelect: 'none' }}>
        {arr.map(function (i) { return <span key={i} ref={function (el) { spans.current[i] = el; }} style={{ textAlign: 'center' }} />; })}
      </div>
    );
  });

  /* slot-machine meta — matrix-mode ambient data stream down the left margin,
     graceful top/bottom fade, newest line slides up into focus. */
  function SlotMeta(props) {
    var st = props.st;
    var scrollRef = useRef(null);
    var base = Math.max(0, st.log.length - 7);
    var lines = st.log.slice(-7).map(function (l, i) { return { id: base + i, k: l.kind, t: l.text }; });
    if (st.thinking) lines.push({ id: 'think', k: 'think', t: st.thinking });
    useEffect(function () { var n = scrollRef.current; if (n) n.scrollTop = n.scrollHeight; }, [st.log.length, st.thinking]);
    return (
      <div style={{ position: 'absolute', left: props.compact ? 12 : 24, top: 0, bottom: props.compact ? 132 : 0, width: props.compact ? 'min(220px, 52vw)' : 230, zIndex: 6,
        display: 'flex', alignItems: 'center', pointerEvents: 'none' }}>
        <div ref={scrollRef} className="ide-scroll" style={{ width: '100%', maxHeight: '60%', overflow: 'hidden',
          WebkitMaskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
          maskImage: 'linear-gradient(to bottom, transparent, #000 22%, #000 78%, transparent)',
          display: 'flex', flexDirection: 'column', gap: 11, paddingTop: 24, paddingBottom: 24 }}>
          {lines.map(function (it) {
            var think = it.k === 'think';
            var col = it.k === 'ok' ? 'var(--a2ui-success)' : it.k === 'note' ? 'var(--a2ui-warning)' : think ? 'var(--cm-ink)' : 'var(--pxs-accent-text)';
            var op = think ? 0.96 : 0.55;
            return <div key={it.id} className="pxart-slotline" style={{ '--slot-op': op, opacity: op,
              fontFamily: 'var(--a2ui-font-mono)', fontSize: think ? 12 : 10.5, lineHeight: 1.55, color: col,
              textShadow: think ? '0 0 8px var(--cm-glow)' : 'none' }}>{think ? it.t : ('◆ ' + it.t)}</div>;
          })}
        </div>
      </div>
    );
  }

  function CanvasDock(props) {
    return (
      <div style={{ position: 'absolute', top: 14, right: 14, zIndex: 6, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
        padding: '6px 5px', background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(12px)', WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid var(--pxs-glass-border)', borderRadius: 12, boxShadow: 'var(--a2ui-shadow-lg)' }}>
        <DockBtn name="plus" title="Zoom in" onClick={props.onZoomIn} />
        <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9, color: 'var(--a2ui-text-tertiary)', lineHeight: 1, padding: '1px 0' }}>{Math.round(props.zoom * 100)}</span>
        <DockBtn name="minus" title="Zoom out" onClick={props.onZoomOut} />
        <DockBtn name="maximize" title="Fit to screen" onClick={props.onFit} />
        <span style={{ width: 22, height: 1, background: 'var(--pxs-border-subtle)', margin: '3px 0' }} />
        <DockBtn name="grid" title="Toggle grid" onClick={props.onGrid} active={props.gridOn} />
        <span style={{ width: 22, height: 1, background: 'var(--pxs-border-subtle)', margin: '3px 0' }} />
        <DockBtn name="download" title="Export PNG" onClick={props.onExport} />
      </div>
    );
  }
  function DockBtn(props) {
    var hv = useState(false);
    return (
      <button title={props.title} onClick={props.onClick}
        onMouseEnter={function () { hv[1](true); }} onMouseLeave={function () { hv[1](false); }}
        style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: props.active ? 'var(--pxs-accent-subtle)' : hv[0] ? 'var(--a2ui-bg-hover)' : 'transparent',
          color: props.active ? 'var(--pxs-accent-text)' : hv[0] ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-secondary)',
          border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0, transition: 'background 150ms ease, color 150ms ease' }}>
        <Ic name={props.name} size={17} />
      </button>
    );
  }

  function StateChip(props) {
    var run = props.running;
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--a2ui-font-mono)',
        fontSize: 11, fontWeight: 600, letterSpacing: '0.08em', color: run ? 'var(--pxs-accent-text)' : 'var(--a2ui-success)',
        background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(10px)', WebkitBackdropFilter: 'blur(10px)',
        border: '1px solid var(--pxs-glass-border)', borderRadius: 7, padding: '5px 11px' }}>
        <span className={run ? 'pxart-pulse' : ''} style={{ width: 7, height: 7, borderRadius: 9999,
          background: run ? 'var(--pxs-accent-focus)' : 'var(--a2ui-success)' }} />
        {props.label}
      </span>
    );
  }
  function CropMarks() {
    var c = { position: 'absolute', width: 9, height: 9, pointerEvents: 'none', opacity: 0.5 };
    var ln = 'var(--pxs-accent-focus)';
    return (
      <React.Fragment>
        <span style={Object.assign({ top: -4, left: -4, borderTop: '1px solid ' + ln, borderLeft: '1px solid ' + ln }, c)} />
        <span style={Object.assign({ top: -4, right: -4, borderTop: '1px solid ' + ln, borderRight: '1px solid ' + ln }, c)} />
        <span style={Object.assign({ bottom: -4, left: -4, borderBottom: '1px solid ' + ln, borderLeft: '1px solid ' + ln }, c)} />
        <span style={Object.assign({ bottom: -4, right: -4, borderBottom: '1px solid ' + ln, borderRight: '1px solid ' + ln }, c)} />
      </React.Fragment>
    );
  }
  function DesigningVeil() {
    return (
      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', pointerEvents: 'none' }}>
        <span className="pxart-scan" style={{ position: 'absolute', left: 0, right: 0, height: 2,
          background: 'linear-gradient(90deg, transparent, var(--pxs-accent-focus), transparent)', opacity: 0.5 }} />
      </div>
    );
  }

  function hexA(hex, a) {
    if (!hex || hex[0] !== '#') return 'rgba(138,180,248,' + a + ')';
    var n = hex.slice(1); if (n.length === 3) n = n.split('').map(function (c) { return c + c; }).join('');
    var r = parseInt(n.slice(0, 2), 16), g = parseInt(n.slice(2, 4), 16), b = parseInt(n.slice(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
  }

  window.PXART = { Ic: Ic, ArtStore: ArtStore, CharMapTable: CharMapTable, STAGES: STAGES, W: W, H: H, hexA: hexA };
})();

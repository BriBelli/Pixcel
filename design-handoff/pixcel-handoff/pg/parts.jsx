/* global React */
/* Pixcel · Prompt Guide — shared primitives (icons, donut, stars, editable field) */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* ───────────────── Lucide icons (inline, stroke=2, currentColor) ───────────────── */
  var P = {
    clapperboard: ['M4 11v8a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-8z','m4 11-.88-2.87a1 1 0 0 1 .67-1.25l13.4-3.85a1 1 0 0 1 1.25.67l.87 2.87','m6.6 4.99 2.57 4.5','m11.07 3.71 2.56 4.5'],
    user: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2','M12 7a4 4 0 1 0 0 0.01'],
    zap: ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
    globe: ['M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18z','M3.6 9h16.8M3.6 15h16.8','M12 3a14.5 14.5 0 0 0 0 18 14.5 14.5 0 0 0 0-18z'],
    palette: ['M12 22a10 10 0 1 1 0-20 8 8 0 0 1 8 8 4 4 0 0 1-4 4h-1.5a2 2 0 0 0-1.5 3.3A2 2 0 0 1 12 22z','M13.5 6.5h.01M17.5 10.5h.01M8.5 6.5h.01M6.5 10.5h.01'],
    settings: ['M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z','M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z'],
    wand: ['m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12','m14 7 3 3','M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9'],
    sparkles: ['M9.94 14.34A1 1 0 0 0 9 15a1 1 0 0 0 .94.66l1.42.46a1 1 0 0 1 .64.64l.46 1.42a1 1 0 0 0 1.9 0l.46-1.42a1 1 0 0 1 .64-.64l1.42-.46a1 1 0 0 0 0-1.9l-1.42-.46a1 1 0 0 1-.64-.64l-.46-1.42a1 1 0 0 0-1.9 0l-.46 1.42a1 1 0 0 1-.64.64z','M5 3v4M3 5h4M6 17v2M5 18h2'],
    x: ['M18 6 6 18M6 6l12 12'],
    chevronDown: ['m6 9 6 6 6-6'],
    chevronRight: ['m9 18 6-6-6-6'],
    check: ['M20 6 9 17l-5-5'],
    refresh: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8','M21 3v5h-5','M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16','M8 16H3v5'],
    copy: ['M15 2H9a1 1 0 0 0-1 1v1H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h1a1 1 0 0 0 1-1V7z'],
    arrowLeftRight: ['M8 3 4 7l4 4','M4 7h16','m16 21 4-4-4-4','M20 17H4'],
    plus: ['M5 12h14M12 5v14'],
    pencil: ['M21.17 6.83a2.83 2.83 0 0 0-4-4L4 16v4h4z','m15 5 4 4'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 16v-4M12 8h.01'],
    book: ['M4 19.5A2.5 2.5 0 0 1 6.5 17H20','M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z'],
    target: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z','M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z','M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
    trend: ['M16 7h6v6','m22 7-8.5 8.5-5-5L2 17'],
    layers: ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z','m22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5','m22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5'],
    panelRight: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z','M15 3v18'],
  };
  function Icon(props) {
    var name = props.name, size = props.size || 18, paths = P[name] || P.info;
    return h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'none',
      stroke: 'currentColor', strokeWidth: props.sw || 2, strokeLinecap: 'round', strokeLinejoin: 'round',
      style: { flexShrink: 0, display: 'block' } },
      paths.map(function (d, i) { return h('path', { key: i, d: d }); }));
  }

  /* ───────────────── Donut ───────────────── */
  // segments: [{label,color,value}], renders a ring split by value
  function Donut(props) {
    var segments = props.segments, size = props.size || 168, stroke = props.stroke || 26;
    var center = props.center; // {top, bottom}
    var r = (size - stroke) / 2, cx = size / 2, circ = 2 * Math.PI * r;
    var total = segments.reduce(function (a, s) { return a + Math.max(0.0001, s.value); }, 0) || 1;
    var gap = segments.length > 1 ? 0.018 * circ : 0; // small gap between segments
    var offset = 0;
    return h('div', { style: { position: 'relative', width: size, height: size } },
      h('svg', { width: size, height: size, viewBox: '0 0 ' + size + ' ' + size,
        style: { transform: 'rotate(-90deg)' } },
        h('circle', { cx: cx, cy: cx, r: r, fill: 'none', stroke: 'var(--a2ui-bg-elevated)', strokeWidth: stroke }),
        segments.map(function (s, i) {
          var frac = Math.max(0.0001, s.value) / total;
          var len = frac * circ - gap;
          if (len < 0) len = 0;
          var dash = len + ' ' + (circ - len);
          var el = h('circle', { key: i, cx: cx, cy: cx, r: r, fill: 'none', stroke: s.color,
            strokeWidth: stroke, strokeDasharray: dash, strokeDashoffset: -offset,
            style: { transition: 'stroke-dasharray 500ms cubic-bezier(0.22,1,0.36,1), stroke-dashoffset 500ms cubic-bezier(0.22,1,0.36,1)' } });
          offset += frac * circ;
          return el;
        })),
      center && h('div', { style: { position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 2 } },
        h('div', { style: { fontSize: 30, fontWeight: 700, color: 'var(--a2ui-text-primary)', lineHeight: 1, fontVariantNumeric: 'tabular-nums' } }, center.top),
        center.bottom && h('div', { style: { fontSize: 11, color: 'var(--a2ui-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' } }, center.bottom)));
  }

  /* ───────────────── Stars (supports halves) ───────────────── */
  function Stars(props) {
    var v = props.value || 0, size = props.size || 13;
    var full = Math.floor(v), half = v - full >= 0.5;
    var items = [];
    for (var i = 0; i < 5; i++) {
      var fill = i < full ? 1 : (i === full && half ? 0.5 : 0);
      items.push(h('span', { key: i, style: { position: 'relative', display: 'inline-block', width: size, height: size, color: 'var(--a2ui-warning)' } },
        h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'var(--a2ui-bg-elevated)', stroke: 'none', style: { position: 'absolute', inset: 0 } },
          h('path', { d: STAR })),
        fill > 0 && h('span', { style: { position: 'absolute', inset: 0, width: (fill * 100) + '%', overflow: 'hidden' } },
          h('svg', { width: size, height: size, viewBox: '0 0 24 24', fill: 'currentColor', stroke: 'none' },
            h('path', { d: STAR })))));
    }
    return h('span', { style: { display: 'inline-flex', gap: 1, alignItems: 'center' } }, items);
  }
  var STAR = 'M11.48 3.5a.56.56 0 0 1 1.04 0l2.13 4.32 4.77.69a.56.56 0 0 1 .31.96l-3.45 3.36.82 4.74a.56.56 0 0 1-.82.6L12 16.32l-4.27 2.25a.56.56 0 0 1-.82-.6l.82-4.74-3.45-3.36a.56.56 0 0 1 .31-.96l4.77-.69z';

  /* ───────────────── Trend badge ───────────────── */
  function Badge(props) {
    var tone = props.tone || 'neutral';
    var map = {
      good: { c: 'var(--a2ui-success)', b: 'var(--a2ui-success-bg)' },
      warn: { c: 'var(--a2ui-warning)', b: 'var(--a2ui-warning-bg)' },
      bad:  { c: 'var(--a2ui-error)', b: 'var(--a2ui-error-bg)' },
      neutral: { c: 'var(--a2ui-text-tertiary)', b: 'var(--a2ui-bg-elevated)' },
      accent: { c: 'var(--a2ui-accent)', b: 'var(--a2ui-accent-subtle)' },
    }[tone];
    return h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11,
      fontWeight: 500, padding: '3px 9px', borderRadius: 9999, color: map.c, background: map.b, whiteSpace: 'nowrap' } },
      props.icon !== false && h(Icon, { name: 'trend', size: 11, sw: 2.5 }),
      props.children);
  }

  /* ───────────────── EditableField — type-aware CRUD on a formula part ───────────────── */
  // type: 'text' | 'enum' | 'tags'. value string. onChange(newVal).
  P.trash = ['M3 6h18','M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2','M10 11v6M14 11v6'];

  function EditableField(props) {
    var part = props.part, value = props.value, present = props.present;
    var onChange = props.onChange, onClear = props.onClear, accent = part.color;
    var editing = props.editing, setEditing = props.setEditing;
    var inputRef = useRef(null), wrapRef = useRef(null);
    var draft = useState(value || ''); var d = draft[0], setD = draft[1];
    useEffect(function () { setD(value || ''); }, [value, editing]);
    useEffect(function () {
      if (editing && inputRef.current) inputRef.current.focus();
      function onDoc(e) { if (editing && wrapRef.current && !wrapRef.current.contains(e.target)) commit(); }
      document.addEventListener('mousedown', onDoc);
      return function () { document.removeEventListener('mousedown', onDoc); };
    }, [editing, d]);

    function commit() { onChange(d.trim()); setEditing(null); }
    function commitVal(v) { onChange((v || '').trim()); setEditing(null); }
    function cancel() { setD(value || ''); setEditing(null); }

    /* ── display mode ── */
    if (!editing) {
      var filled = present && value;
      return h('div', { ref: wrapRef, onClick: function () { setEditing(part.id); }, title: 'Click to edit',
        style: { position: 'relative', cursor: 'text', borderRadius: 8, padding: '8px 30px 8px 11px', minHeight: 17,
          fontFamily: 'var(--a2ui-font-mono)', fontSize: 12.5, lineHeight: 1.55,
          background: filled ? 'var(--a2ui-cool-950)' : 'transparent',
          color: filled ? accent : 'var(--a2ui-text-tertiary)',
          border: filled ? '1px solid transparent' : '1px dashed var(--a2ui-border-default)',
          transition: 'background 150ms ease' },
        onMouseEnter: function (e) { e.currentTarget.querySelector('.pg-ei').style.opacity = 1; },
        onMouseLeave: function (e) { e.currentTarget.querySelector('.pg-ei').style.opacity = 0; } },
        h('span', { style: { display: 'block', fontStyle: filled ? 'normal' : 'italic' } },
          filled ? value : ('Add ' + part.label.toLowerCase())),
        h('span', { className: 'pg-ei', style: { position: 'absolute', top: 7, right: 9, opacity: 0,
          transition: 'opacity 150ms ease', color: 'var(--a2ui-text-secondary)', display: 'inline-flex' } },
          h(Icon, { name: filled ? 'pencil' : 'plus', size: 13 })));
    }

    /* ── edit shell ── */
    var shell = { borderRadius: 9, background: 'var(--a2ui-bg-input-focus)', border: '1px solid ' + accent,
      padding: 4, width: '100%', boxSizing: 'border-box' };
    var footer = h('div', { style: { display: 'flex', alignItems: 'center', gap: 4, padding: '4px 4px 2px', marginTop: 2 } },
      onClear && h('button', { onClick: onClear, title: 'Remove part',
        style: { display: 'inline-flex', alignItems: 'center', gap: 4, background: 'transparent', border: 'none',
          color: 'var(--a2ui-text-tertiary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11, padding: '3px 4px' } },
        h(Icon, { name: 'trash', size: 12 })),
      h('div', { style: { flex: 1 } }),
      h('button', { onClick: cancel, style: txtBtn('var(--a2ui-text-secondary)', 'transparent') }, 'Cancel'),
      h('button', { onClick: commit, style: txtBtn('var(--a2ui-text-inverse)', accent) }, 'Save'));

    if (part.type === 'enum') {
      var q = (d || '').toLowerCase();
      var opts = (part.options || []).filter(function (o) { return o.toLowerCase().indexOf(q) !== -1; });
      return h('div', { ref: wrapRef, style: shell },
        h('input', { ref: inputRef, value: d, onChange: function (e) { setD(e.target.value); },
          onKeyDown: function (e) { if (e.key === 'Enter') commit(); if (e.key === 'Escape') cancel(); },
          placeholder: part.placeholder,
          style: { width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none',
            fontFamily: 'var(--a2ui-font-mono)', fontSize: 12.5, color: 'var(--a2ui-text-primary)', padding: '6px 7px' } }),
        h('div', { className: 'pg-scroll', style: { maxHeight: 168, overflowY: 'auto', display: 'flex', flexDirection: 'column',
          gap: 1, marginTop: 2, borderTop: '1px solid var(--a2ui-border-subtle)', paddingTop: 3 } },
          opts.length ? opts.map(function (o, i) {
            var on = o.toLowerCase() === q;
            return h('button', { key: i, onClick: function () { commitVal(o); },
              onMouseEnter: function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; },
              onMouseLeave: function (e) { e.currentTarget.style.background = on ? 'var(--a2ui-accent-subtle)' : 'transparent'; },
              style: { display: 'flex', alignItems: 'center', gap: 7, width: '100%', textAlign: 'left', cursor: 'pointer',
                background: on ? 'var(--a2ui-accent-subtle)' : 'transparent', border: 'none', borderRadius: 6,
                padding: '7px 8px', fontFamily: 'var(--a2ui-font-family)', fontSize: 12.5, color: 'var(--a2ui-text-primary)' } },
              h('span', { style: { width: 14, color: accent, display: 'inline-flex', flexShrink: 0 } }, on ? h(Icon, { name: 'check', size: 13 }) : null),
              o);
          }) : h('div', { style: { padding: '7px 8px', fontSize: 12, color: 'var(--a2ui-text-tertiary)' } }, 'Use \u201c' + d + '\u201d \u2014 press Enter')),
        footer);
    }

    if (part.type === 'tags') {
      var selected = d.split(',').map(function (s) { return s.trim(); }).filter(Boolean);
      var lower = selected.map(function (x) { return x.toLowerCase(); });
      function toggle(o) {
        var set = selected.slice(), idx = lower.indexOf(o.toLowerCase());
        if (idx === -1) set.push(o); else set.splice(idx, 1);
        setD(set.join(', '));
      }
      return h('div', { ref: wrapRef, style: shell },
        h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 5, padding: '5px 5px 2px' } },
          (part.options || []).map(function (o, i) {
            var on = lower.indexOf(o.toLowerCase()) !== -1;
            return h('button', { key: i, onClick: function () { toggle(o); }, style: chipBtn(accent, on) }, o);
          })),
        footer);
    }

    // text
    return h('div', { ref: wrapRef, style: shell },
      h('textarea', { ref: inputRef, value: d, rows: Math.min(5, Math.max(2, Math.ceil((d.length || 1) / 32))),
        onChange: function (e) { setD(e.target.value); },
        onKeyDown: function (e) { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) commit(); if (e.key === 'Escape') cancel(); },
        placeholder: part.placeholder,
        style: { width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
          fontFamily: 'var(--a2ui-font-mono)', fontSize: 12.5, lineHeight: 1.6, color: 'var(--a2ui-text-primary)', padding: '6px 7px' } }),
      footer);
  }

  function txtBtn(col, bg) {
    return { fontFamily: 'var(--a2ui-font-family)', fontSize: 12, fontWeight: 500, padding: '5px 12px', borderRadius: 7,
      cursor: 'pointer', color: col, background: bg, border: 'none' };
  }
  function chipBtn(accent, on) {
    return { fontFamily: 'var(--a2ui-font-family)', fontSize: 11.5, fontWeight: 500, padding: '4px 10px',
      borderRadius: 9999, cursor: 'pointer', whiteSpace: 'nowrap',
      background: on ? accent : 'transparent', color: on ? '#10131a' : 'var(--a2ui-text-secondary)',
      border: '1px solid ' + (on ? accent : 'var(--a2ui-border-default)') };
  }

  Object.assign(window, { PGIcon: Icon, PGDonut: Donut, PGStars: Stars, PGBadge: Badge, PGEditableField: EditableField });
})();

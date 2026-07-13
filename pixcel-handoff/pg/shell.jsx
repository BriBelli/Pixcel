/* global React, PGIcon */
/* Pixcel · Prompt Guide — A2UI Chat shell + gear Tools popover + prompt bar */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  /* ── left icon rail (matches product: chat / images / list / panel) ── */
  function Rail(props) {
    var items = [
      { id: 'chat', name: 'message-square' }, { id: 'images', name: 'image' },
      { id: 'list', name: 'menu' }, { id: 'panel', name: 'panelRight' },
    ];
    return h('div', { style: { width: 56, flexShrink: 0, background: 'var(--a2ui-bg-app)',
      borderRight: '1px solid var(--a2ui-border-subtle)', display: 'flex', flexDirection: 'column',
      alignItems: 'center', padding: '14px 0', gap: 4 } },
      h(RailBtn, { onClick: props.onCollapse, title: 'Collapse' }, h(Chevrons)),
      h('div', { style: { height: 8 } }),
      items.map(function (it) {
        return h(RailBtn, { key: it.id, active: it.id === 'images', title: it.id },
          h(PGIcon, { name: it.name, size: 19 }));
      }));
  }
  function Chevrons() {
    return h('svg', { width: 18, height: 18, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round', strokeLinejoin: 'round' },
      h('path', { d: 'm6 17 5-5-5-5' }), h('path', { d: 'm13 17 5-5-5-5' }));
  }
  function RailBtn(props) {
    var hov = useState(false); var hover = hov[0], setHover = hov[1];
    return h('button', { onClick: props.onClick, title: props.title,
      onMouseEnter: function () { setHover(true); }, onMouseLeave: function () { setHover(false); },
      style: { width: 38, height: 38, display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: props.active ? 'var(--a2ui-bg-active)' : hover ? 'var(--a2ui-bg-hover)' : 'transparent',
        color: props.active ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)',
        border: 'none', borderRadius: 9, cursor: 'pointer', transition: 'all 150ms ease' } }, props.children);
  }

  /* ── top bar ── */
  function TopBar(props) {
    return h('div', { style: { height: 64, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 18px', borderBottom: '1px solid var(--a2ui-border-subtle)' } },
      h('span', { style: { display: 'inline-flex', alignItems: 'center' } },
        h('img', { src: 'assets/logo-mark-white.svg', alt: 'Pixcel', style: { display: 'block', height: 32, width: 'auto' }, onError: function (e) { e.target.style.display = 'none'; } })),
      h('div', { style: { flex: 1 } }),
      // gear / tools
      h(ToolsButton, { tools: props.tools, onToggleTool: props.onToggleTool }),
      h('button', { style: { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px',
        background: 'transparent', color: 'var(--a2ui-text-secondary)', border: '1px solid var(--a2ui-border-default)',
        borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 500 } },
        h(PGIcon, { name: 'image', size: 15 }), 'Assets'),
      h('span', { style: { width: 32, height: 32, borderRadius: 9999, background: 'var(--a2ui-bg-elevated)',
        border: '1px solid var(--a2ui-border-default)', display: 'inline-block' } }));
  }

  /* ── gear "Tools" popover — Adobe-style panel manager ── */
  function ToolsButton(props) {
    var op = useState(false); var open = op[0], setOpen = op[1];
    var ref = useRef(null);
    useEffect(function () {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', onDoc); return function () { document.removeEventListener('mousedown', onDoc); };
    }, []);
    var TOOLS = [
      { id: 'promptGuide', name: 'Prompt guide', desc: 'Score & shape prompts per model', icon: 'wand', live: true },
      { id: 'references', name: 'References', desc: 'Style, character & camera rails', icon: 'layers', live: false },
      { id: 'structure', name: 'Structure', desc: 'Per-model request grammar', icon: 'target', live: false },
      { id: 'modelLab', name: 'Model lab', desc: 'Compare model strengths', icon: 'sparkles', live: false },
    ];
    return h('div', { ref: ref, style: { position: 'relative' } },
      h('button', { onClick: function () { setOpen(!open); }, title: 'Tools',
        style: { width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: open ? 'var(--a2ui-bg-active)' : 'transparent', color: open ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-secondary)',
          border: '1px solid ' + (open ? 'var(--a2ui-border-default)' : 'transparent'), borderRadius: 9, cursor: 'pointer', transition: 'all 150ms ease' } },
        h(PGIcon, { name: 'settings', size: 18 })),
      open && h('div', { style: { position: 'absolute', top: 'calc(100% + 8px)', right: 0, width: 290, zIndex: 200,
        background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 14, boxShadow: 'var(--a2ui-shadow-lg)', padding: 8 } },
        h('div', { style: { fontSize: 10.5, fontWeight: 600, color: 'var(--a2ui-text-tertiary)', textTransform: 'uppercase',
          letterSpacing: '0.5px', padding: '6px 10px 8px' } }, 'Panels & tools'),
        TOOLS.map(function (t) {
          var on = !!props.tools[t.id];
          return h('button', { key: t.id, onClick: function () { if (t.live) props.onToggleTool(t.id); },
            disabled: !t.live, style: { width: '100%', display: 'flex', alignItems: 'center', gap: 11, padding: '9px 10px',
              background: 'transparent', border: 'none', borderRadius: 10, cursor: t.live ? 'pointer' : 'not-allowed',
              fontFamily: 'inherit', textAlign: 'left', opacity: t.live ? 1 : 0.55, transition: 'background 150ms ease' },
            onMouseEnter: function (e) { if (t.live) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; },
            onMouseLeave: function (e) { e.currentTarget.style.background = 'transparent'; } },
            h('span', { style: { width: 32, height: 32, borderRadius: 8, flexShrink: 0, display: 'inline-flex',
              alignItems: 'center', justifyContent: 'center', background: on ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-bg-tertiary)',
              color: on ? 'var(--a2ui-accent)' : 'var(--a2ui-text-secondary)' } }, h(PGIcon, { name: t.icon, size: 16 })),
            h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', gap: 1 } },
              h('span', { style: { fontSize: 13, fontWeight: 500, color: 'var(--a2ui-text-primary)' } }, t.name),
              h('span', { style: { fontSize: 11, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.3 } }, t.live ? t.desc : 'Coming soon')),
            t.live && h(Toggle, { on: on }));
        })));
  }
  function Toggle(props) {
    return h('span', { style: { width: 34, height: 20, borderRadius: 9999, flexShrink: 0, position: 'relative',
      background: props.on ? 'var(--a2ui-accent)' : 'var(--a2ui-bg-elevated)', transition: 'background 200ms ease' } },
      h('span', { style: { position: 'absolute', top: 2, left: props.on ? 16 : 2, width: 16, height: 16, borderRadius: 9999,
        background: '#fff', transition: 'left 200ms cubic-bezier(0.22,1,0.36,1)', boxShadow: '0 1px 2px rgba(0,0,0,0.4)' } }));
  }

  /* ── prompt bar (Chat / Image / Video + model) ── */
  function PromptBar(props) {
    var mode = props.mode, setMode = props.setMode;
    var ta = useRef(null);
    useEffect(function () {
      var el = ta.current; if (!el) return;
      el.style.height = 'auto'; el.style.height = Math.min(160, el.scrollHeight) + 'px';
    }, [props.value]);
    return h('div', { style: { flexShrink: 0, padding: '0 24px 24px', display: 'flex', justifyContent: 'center' } },
      h('div', { style: { width: '100%', maxWidth: 760, background: 'var(--a2ui-bg-secondary)',
        border: '1px solid var(--a2ui-border-default)', borderRadius: 18, padding: 8,
        boxShadow: 'var(--a2ui-shadow-lg)' } },
        h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: 8 } },
          h('button', { style: iconGhost() }, h(PGIcon, { name: 'paperclip', size: 18 })),
          h('textarea', { ref: ta, value: props.value, rows: 1,
            onChange: function (e) { props.onChange(e.target.value); },
            placeholder: 'Describe the image you want\u2026',
            style: { flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'inherit', fontSize: 15, lineHeight: 1.5, color: 'var(--a2ui-text-primary)',
              padding: '8px 4px', maxHeight: 160 } }),
          h('button', { title: 'Send', style: { width: 38, height: 38, flexShrink: 0, display: 'inline-flex',
            alignItems: 'center', justifyContent: 'center', borderRadius: 12, border: 'none', cursor: 'pointer',
            background: props.value.trim() ? 'var(--a2ui-accent)' : 'var(--a2ui-bg-elevated)',
            color: props.value.trim() ? 'var(--a2ui-text-inverse)' : 'var(--a2ui-text-tertiary)', transition: 'background 150ms ease' } },
            h(PGIcon, { name: 'send', size: 17 }))),
        h('div', { style: { display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, padding: '0 2px' } },
          h(ModePills, { mode: mode, setMode: setMode }),
          h('div', { style: { flex: 1 } }),
          props.tools.promptGuide && h('button', { onClick: props.onReopenGuide, style: { display: 'inline-flex', alignItems: 'center', gap: 6,
            padding: '5px 10px', borderRadius: 9999, background: 'var(--a2ui-accent-subtle)', color: 'var(--a2ui-accent)',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 11.5, fontWeight: 600 } },
            h(PGIcon, { name: 'wand', size: 13 }), props.guideScore != null ? props.guideScore + '%' : 'Guide on'),
          h('button', { style: { display: 'inline-flex', alignItems: 'center', gap: 6, padding: '5px 11px',
            borderRadius: 9999, background: 'var(--a2ui-bg-tertiary)', border: '1px solid var(--a2ui-border-default)',
            cursor: 'pointer', fontFamily: 'inherit' } },
            h('span', { style: { width: 14, height: 14, display: 'inline-flex' } },
              h('img', { src: 'assets/provider-icons/' + props.model.provider + '.ico', width: 14, height: 14, alt: '', onError: function (e) { e.target.style.display = 'none'; } })),
            h('span', { style: { fontSize: 11.5, fontWeight: 500, color: 'var(--a2ui-text-secondary)' } }, props.model.name)))));
  }
  function ModePills(props) {
    return h('div', { style: { display: 'inline-flex', background: 'var(--a2ui-bg-app)', borderRadius: 9999, padding: 2, gap: 2 } },
      ['Chat', 'Image', 'Video'].map(function (m) {
        var on = props.mode === m;
        return h('button', { key: m, onClick: function () { props.setMode(m); },
          style: { padding: '5px 13px', borderRadius: 9999, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12, fontWeight: 500, background: on ? 'var(--a2ui-bg-elevated)' : 'transparent',
            color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)', transition: 'all 150ms ease' } }, m);
      }));
  }
  function iconGhost() {
    return { width: 38, height: 38, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 12, cursor: 'pointer' };
  }

  /* ── center conversation area ── */
  function ChatArea(props) {
    var hasPrompt = (props.value || '').trim().length > 0;
    return h('div', { className: 'pg-scroll', style: { flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' } },
      hasPrompt ? h(DraftEcho, { value: props.value, model: props.model }) : h(EmptyState, { onPick: props.onChange }));
  }
  function EmptyState(props) {
    var seeds = ['A cinematic character portrait', 'A product hero shot', 'A mascot turnaround sheet'];
    return h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18, padding: 24, textAlign: 'center' } },
      h('h1', { style: { margin: 0, fontSize: 30, fontWeight: 700, color: 'var(--a2ui-text-primary)', letterSpacing: '-0.02em' } }, 'What should we make?'),
      h('p', { style: { margin: 0, fontSize: 15, color: 'var(--a2ui-text-secondary)', maxWidth: 440, lineHeight: 1.55 } },
        'Describe an image and the Prompt Guide will score it against your model before you spend a run.'),
      h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'center', maxWidth: 520 } },
        seeds.map(function (s, i) {
          return h('button', { key: i, onClick: function () { props.onPick(s); }, style: {
            padding: '9px 16px', borderRadius: 9999, background: 'var(--a2ui-bg-secondary)', border: '1px solid var(--a2ui-border-default)',
            color: 'var(--a2ui-text-secondary)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 13 } }, s);
        })));
  }
  function DraftEcho(props) {
    return h('div', { style: { maxWidth: 760, width: '100%', margin: '0 auto', padding: '28px 24px', display: 'flex', flexDirection: 'column', gap: 14 } },
      h('div', { style: { alignSelf: 'flex-end', maxWidth: '85%', background: 'var(--a2ui-accent)', color: 'var(--a2ui-text-inverse)',
        borderRadius: '16px 16px 4px 16px', padding: '12px 16px', fontSize: 14.5, lineHeight: 1.6 } }, props.value),
      h('div', { style: { display: 'flex', alignItems: 'center', gap: 8, color: 'var(--a2ui-text-tertiary)', fontSize: 12.5, padding: '4px 2px' } },
        h('span', { style: { width: 22, height: 22, borderRadius: 9999, overflow: 'hidden', display: 'inline-flex', flexShrink: 0 } },
          h('img', { src: 'assets/provider-icons/' + props.model.provider + '.ico', width: 22, height: 22, alt: '', onError: function (e) { e.target.style.display = 'none'; } })),
        'Draft on ' + props.model.name + ' \u2014 refine in the Prompt Guide \u2192 then send to fan out.'));
  }

  Object.assign(window, { PGRail: Rail, PGTopBar: TopBar, PGPromptBar: PromptBar, PGChatArea: ChatArea });
})();

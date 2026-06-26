/* global React, ReactDOM, PG, IDERail, IDEPrimaryNav, IDETopBar, IDECanvas, IDEIcon, IDEModelTrigger, IDEAgentPanel,
   IDEAnalyzeFields, IDEAssemble, IDEBuilderPanel, IDEGuidePanel, IDESuggestionsPanel, IDEFloatingPrompt,
   IDEAssetsPanel, IDEResizeHandle,
   IDEPageHeader,
   useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle */
/* Pixcel · Image IDE — root wiring: shell + canvas + canonical prompt + Build/Guide/Suggest dock */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState;
  var useEffect = React.useEffect;

  var TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "dockLayout": "tabbed",
    "density": "regular",
    "dockSide": "right",
    "railLabels": false
  }/*EDITMODE-END*/;

  /* land populated — a coherent character reference-sheet build (the OpenArt pattern) */
  var INITIAL_FIELDS = {
    subject: 'A sleek armored character in a matte black bodysuit with brushed-metal plating',
    anchors: ['etched silver seams', 'amber visor glow'],
    action: 'standing in a confident, statuesque stance, slightly turned',
    context: 'on a seamless charcoal studio backdrop',
    composition: 'Full-body shot',
    style: ['Cinematic lighting', 'Three-point softbox', 'Muted teal tones'],
  };

  var TABS = [
    { id: 'build', label: 'Build', icon: 'pencil', sub: 'intake' },
    { id: 'guide', label: 'Guide', icon: 'wand', sub: 'model' },
    { id: 'suggest', label: 'Suggestions', icon: 'sparkles', sub: 'live' },
  ];

  function App() {
    var tw = useTweaks(TWEAK_DEFAULTS); var t = tw[0], setTweak = tw[1];
    var canvasMode = window.IDECanvasStore.use().mode;
    var fs = useState(INITIAL_FIELDS); var fields = fs[0], setFields = fs[1];
    var tabState = useState('build'); var tab = tabState[0], setTab = tabState[1];
    var colState = useState(null); var collapsed = colState[0], setCollapsed = colState[1];
    var agState = useState(function () { return typeof window === 'undefined' || window.innerWidth >= 1180; });
    var agentOpen = agState[0], setAgentOpen = agState[1];
    var asState = useState(false); var assetsQuick = asState[0], setAssetsQuick = asState[1];
    var afState = useState(false); var assetsFull = afState[0], setAssetsFull = afState[1];
    /* drag-to-resize: null = follow the default (density / built-in); a number overrides */
    var dwState = useState(null); var dockOverride = dwState[0], setDockOverride = dwState[1];
    var dkState = useState(true); var dockOpen = dkState[0], setDockOpen = dkState[1];
    var awState = useState(340); var assetsW = awState[0], setAssetsW = awState[1];
    var gwState = useState(376); var agentW = gwState[0], setAgentW = gwState[1];
    /* active primary section (Art/Image/Video/Anim) — drives which tool sub-rail shows */
    var secState = useState('image'); var section = secState[0], setSection = secState[1];

    /* routing — pins claim slots; Auto fills + rescues the rest from the
       Gate-1-eligible / Gate-2-ranked roster. The plan drives Build/Guide. */
    var pinState = useState(['nano-banana-pro']); var pins = pinState[0], setPins = pinState[1];
    var autoState = useState(true); var auto = autoState[0], setAuto = autoState[1];
    var slotState = useState(3); var slots = slotState[0], setSlots = slotState[1];
    var imgState = useState(4); var images = imgState[0], setImages = imgState[1];
    var byId = {}; PG.MODELS.forEach(function (m) { byId[m.id] = m; });
    var decision = PG.resolveRouting(pins, auto, slots, images);
    var selectedModels = decision.pool.map(function (p) { return p.model; });
    var selectedIds = selectedModels.map(function (m) { return m.id; });
    /* primary = first model in the plan that carries a formula; it drives Build/Guide/score */
    var model = (byId[decision.primaryId] && byId[decision.primaryId].parts) ? byId[decision.primaryId]
      : (selectedModels.filter(function (m) { return m.parts; })[0] || PG.MODELS[0]);
    function togglePin(id) {
      setPins(function (prev) {
        var i = prev.indexOf(id);
        if (i === -1) { var n = prev.concat([id]); if (auto && n.length > slots) setSlots(n.length); return n; }
        var m = prev.slice(); m.splice(i, 1); return m;
      });
    }
    function clampSlots(v) { setSlots(Math.max(1, Math.min(8, v))); }
    function clampImages(v) { setImages(Math.max(1, Math.min(8, v))); }
    var picker = { decision: decision, pins: pins, auto: auto, slots: slots, images: images,
      selected: selectedModels, selectedIds: selectedIds, primaryId: model.id,
      togglePin: togglePin, setAuto: setAuto, setSlots: clampSlots, setImages: clampImages };

    var analysis = IDEAnalyzeFields(fields, model);
    var assembled = IDEAssemble(fields);
    function setField(k, v) { setFields(function (f) { var n = Object.assign({}, f); n[k] = v; return n; }); }
    function generate() {}
    function jump(id) { setTab(id); }

    var dockBase = t.density === 'compact' ? 366 : t.density === 'roomy' ? 446 : 406;
    var dockW = dockOverride != null ? dockOverride : dockBase;
    var split = t.dockLayout === 'split';

    var dock = dockOpen
      ? h(Dock, { key: 'dock', tab: tab, setTab: setTab, split: split, collapsed: collapsed, setCollapsed: setCollapsed,
          width: dockW, model: model, fields: fields, setField: setField, analysis: analysis, onGenerate: generate, onJump: jump,
          side: t.dockSide, onCollapse: function () { setDockOpen(false); } })
      : h(DockRail, { key: 'dock', side: t.dockSide, score: analysis.overall, onExpand: function () { setDockOpen(true); } });

    var primaryNav = h(IDEPrimaryNav, { key: 'primary', section: section, onSection: setSection,
      assetsOpen: assetsQuick, onToggleAssets: function () { setAssetsQuick(!assetsQuick); },
      onOpenFullAssets: function () { setAssetsQuick(false); setAssetsFull(true); },
      agentOpen: agentOpen, onToggleAgent: function () { setAgentOpen(!agentOpen); } });
    var rail = section === 'image' && h(IDERail, { key: 'rail', labeled: t.railLabels });
    var canvasWrap = h('div', { key: 'cw', style: { flex: 1, minWidth: 0, position: 'relative', display: 'flex', minHeight: 0 } },
      h('div', { style: { flex: 1, minWidth: 0, position: 'relative', background: 'var(--pxs-bg-canvas)',
        backgroundImage: window.IDEDotBg, backgroundSize: '22px 22px' } }),
      canvasMode !== 'focus' && h(IDEFloatingPrompt, { fields: fields, setField: setField, model: model, picker: picker, analysis: analysis,
        assembled: assembled, onGenerate: generate, onJump: jump }));
    var main = h('div', { key: 'main', style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, position: 'relative' } },
      h('div', { style: { flex: 1, display: 'flex', minHeight: 0 } },
        assetsFull && h(IDEAssetsPanel, { key: 'assets', width: assetsW, onClose: function () { setAssetsFull(false); } }),
        assetsFull && h(IDEResizeHandle, { key: 'assets-rs', width: assetsW, min: 280, max: 520, side: 'left',
          onResize: setAssetsW, onReset: function () { setAssetsW(340); } }),
        canvasWrap));

    var agent = h(IDEAgentPanel, { key: 'agent', open: agentOpen, setOpen: setAgentOpen, model: model, width: agentW });

    /* divider on the dock's inner edge, and on the agent's left edge when open */
    var dockSide = t.dockSide;
    var dockHandle = dockOpen && h(IDEResizeHandle, { key: 'dock-rs', width: dockW, min: 320, max: 640,
      side: dockSide === 'left' ? 'left' : 'right', onResize: setDockOverride, onReset: function () { setDockOverride(null); } });
    var agentHandle = agentOpen && h(IDEResizeHandle, { key: 'agent-rs', width: agentW, min: 320, max: 580, side: 'right',
      onResize: setAgentW, onReset: function () { setAgentW(376); } });

    var children = dockSide === 'left'
      ? [dock, dockHandle, main, agentHandle, agent]
      : [main, dockHandle, dock, agentHandle, agent];

    /* app shell: tool rail runs the full height on the far left; the global Pixcel
       top bar + page sit in a column to its right. */
    var workspace = h('div', { key: 'ws', style: { flex: 1, display: 'flex', minHeight: 0 } }, children);

    /* app shell: full-height tool rail on the left (Export + Assets live on it),
       no global top bar — autosave is implicit. */
    return h('div', { className: 'pxs-scope', style: { position: 'fixed', inset: 0, display: 'flex', flexDirection: 'row',
      background: 'var(--pxs-bg-host)', color: 'var(--a2ui-text-primary)' } },
      primaryNav,
      rail,
      workspace,
      h(TweaksPanel, null,
        h(TweakSection, { label: 'Right dock' }),
        h(TweakRadio, { label: 'Layout', value: t.dockLayout, options: ['tabbed', 'split'],
          onChange: function (v) { setTweak('dockLayout', v); } }),
        h(TweakRadio, { label: 'Side', value: t.dockSide, options: ['left', 'right'],
          onChange: function (v) { setTweak('dockSide', v); } }),
        h(TweakSection, { label: 'Density' }),
        h(TweakRadio, { label: 'Width', value: t.density, options: ['compact', 'regular', 'roomy'],
          onChange: function (v) { setTweak('density', v); } }),
        h(TweakSection, { label: 'Canvas' }),
        h(TweakToggle, { label: 'Rail labels', value: t.railLabels, onChange: function (v) { setTweak('railLabels', v); } }),
        h(TweakSection, { label: 'Panels' }),
        h(TweakToggle, { label: 'Show agent dock', value: agentOpen, onChange: function (v) { setAgentOpen(v); } })));
  }

  /* ── right dock ── */
  function Dock(props) {
    var split = props.split, tab = props.tab;
    var showSplit = split && (tab === 'build' || tab === 'guide');

    var body;
    if (showSplit) body = h(SplitBody, props);
    else if (tab === 'build') body = h(IDEBuilderPanel, { model: props.model, fields: props.fields, setField: props.setField, analysis: props.analysis, onGenerate: props.onGenerate });
    else if (tab === 'guide') body = h(IDEGuidePanel, { model: props.model, analysis: props.analysis });
    else body = h(IDESuggestionsPanel, { model: props.model, fields: props.fields, setField: props.setField, analysis: props.analysis, onJump: props.onJump });

    return h('aside', { key: 'dock', style: { width: props.width, flexShrink: 0, height: '100%', background: 'var(--a2ui-bg-app)',
      borderLeft: '1px solid var(--a2ui-border-default)', borderRight: '1px solid var(--a2ui-border-default)',
      display: 'flex', flexDirection: 'column', minHeight: 0 } },
      h(Switcher, { tab: tab, setTab: props.setTab, split: split, score: props.analysis.overall, side: props.side, onCollapse: props.onCollapse }),
      h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } }, body));
  }

  function Switcher(props) {
    var collapseIcon = props.side === 'left' ? 'chevronLeft' : 'chevronRight';
    return h('div', { style: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 2, padding: 8,
      borderBottom: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)' } },
      TABS.map(function (tb) {
        var active = props.split ? (tb.id === 'suggest' ? props.tab === 'suggest' : props.tab !== 'suggest') : props.tab === tb.id;
        return h('button', { key: tb.id, onClick: function () { props.setTab(tb.id); },
          style: { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6, height: 36,
            background: active ? 'var(--a2ui-bg-active)' : 'transparent', color: active ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)',
            border: 'none', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, transition: 'all 150ms ease' },
          onMouseEnter: function (e) { if (!active) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; },
          onMouseLeave: function (e) { if (!active) e.currentTarget.style.background = 'transparent'; } },
          h('span', { style: { display: 'inline-flex', color: active && tb.id !== 'guide' ? 'var(--pxs-accent-text)' : 'inherit' } }, h(IDEIcon, { name: tb.icon, size: 15 })),
          tb.label,
          tb.id === 'build' && props.score > 0 && h('span', { style: { fontSize: 10.5, fontWeight: 600, fontFamily: 'var(--a2ui-font-mono)',
            color: active ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-disabled)' } }, props.score + '%'));
      }),
      h('button', { key: 'collapse', title: 'Collapse panel', onClick: props.onCollapse,
        style: { flexShrink: 0, width: 32, height: 32, marginLeft: 2, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'transparent', color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 8, cursor: 'pointer' },
        onMouseEnter: function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; e.currentTarget.style.color = 'var(--a2ui-text-secondary)'; },
        onMouseLeave: function (e) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--a2ui-text-tertiary)'; } },
        h(IDEIcon, { name: collapseIcon, size: 16 })));
  }

  /* ── collapsed dock → slim rail (mirrors the Agent rail) ── */
  function DockRail(props) {
    var onLeft = props.side === 'left';
    var border = onLeft ? { borderRight: '1px solid var(--pxs-border-subtle)' } : { borderLeft: '1px solid var(--pxs-border-subtle)' };
    function railBtn(extra) {
      return Object.assign({ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        background: 'transparent', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 9, cursor: 'pointer', position: 'relative' }, extra || {});
    }
    return h('aside', { key: 'dock', style: Object.assign({ width: 48, flexShrink: 0, height: '100%', background: 'var(--a2ui-cool-900)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 10 }, border) },
      h('button', { title: 'Expand prompt', onClick: props.onExpand,
        style: { width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 9, cursor: 'pointer' } },
        h(IDEIcon, { name: onLeft ? 'chevronRight' : 'chevronLeft', size: 16 })),
      h('button', { title: 'Expand prompt', onClick: props.onExpand, style: railBtn({ color: 'var(--pxs-accent-text)' }) },
        h(IDEIcon, { name: 'pencil', size: 17 })),
      h('span', { style: { writingMode: 'vertical-rl', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--a2ui-text-tertiary)', marginTop: 2 } }, 'Prompt'),
      props.score > 0 && h('span', { style: { writingMode: 'vertical-rl', fontSize: 10, fontWeight: 600, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-disabled)', marginTop: 2 } }, props.score + '%'));
  }

  function SplitBody(props) {
    var collapsed = props.collapsed, setCollapsed = props.setCollapsed;
    var buildOpen = collapsed !== 'build', guideOpen = collapsed !== 'guide';
    return h('div', { style: { flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column' } },
      h(SectionHeader, { label: 'Prompt Builder', sub: 'intake', icon: 'pencil', accent: true,
        open: buildOpen, onToggle: function () { setCollapsed(buildOpen ? 'build' : null); } }),
      buildOpen && h('div', { style: { flex: guideOpen ? '1 1 0' : '1 1 100%', minHeight: 0, overflow: 'hidden', borderBottom: '1px solid var(--pxs-border-subtle)' } },
        h(IDEBuilderPanel, { model: props.model, fields: props.fields, setField: props.setField, analysis: props.analysis, onGenerate: props.onGenerate })),
      h(SectionHeader, { label: 'Prompt Guide', sub: 'reflects ' + props.model.name, icon: 'wand',
        open: guideOpen, onToggle: function () { setCollapsed(guideOpen ? 'guide' : null); } }),
      guideOpen && h('div', { style: { flex: buildOpen ? '1 1 0' : '1 1 100%', minHeight: 0, overflow: 'hidden' } },
        h(IDEGuidePanel, { model: props.model, analysis: props.analysis })));
  }

  function SectionHeader(props) {
    return h('button', { onClick: props.onToggle, style: { flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9,
      padding: '10px 14px', background: 'var(--a2ui-cool-900)', border: 'none', borderTop: '1px solid var(--pxs-border-subtle)',
      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' } },
      h('span', { style: { display: 'inline-flex', color: props.accent ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)' } }, h(IDEIcon, { name: props.icon, size: 15 })),
      h('span', { style: { fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' } }, props.label),
      h('span', { style: { fontSize: 11, color: 'var(--a2ui-text-tertiary)' } }, props.sub),
      h('div', { style: { flex: 1 } }),
      h('span', { style: { display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', transform: props.open ? 'none' : 'rotate(-90deg)', transition: 'transform 200ms ease' } },
        h(IDEIcon, { name: 'chevronDown', size: 15 })));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();

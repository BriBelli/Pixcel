/* global React */
/* Pixcel · Image IDE — Studio chrome: icon set, tool rail, top bar, canvas */
(function () {
  'use strict';
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  /* ───────────────── shared canvas/tool store (rail ↔ canvas) ───────────────── */
  /* Rail and Canvas mount as siblings; this tiny pub/sub lets a tool selected on
     the rail drive the canvas, and a frame opened on the canvas drive the rail. */
  var CanvasStore = (function () {
    var s = { tool: 'move', mode: 'view', zoom: 1, selected: 'front', brush: 56 };
    var subs = [];
    function set(patch) { s = Object.assign({}, s, patch); subs.slice().forEach(function (f) { f(s); }); }
    function get() { return s; }
    function use() {
      var pair = useState(s);
      useEffect(function () {
        var f = function (ns) { pair[1](ns); };
        subs.push(f);
        return function () { var i = subs.indexOf(f); if (i >= 0) subs.splice(i, 1); };
      }, []);
      return pair[0];
    }
    return { set: set, get: get, use: use };
  })();

  /* ───────────────── icons (Lucide, stroke 2, currentColor) ───────────────── */
  var II = {
    x: ['M18 6 6 18M6 6l12 12'],
    undo: ['M9 14 4 9l5-5', 'M4 9h10.5a5.5 5.5 0 0 1 0 11H11'],
    redo: ['m15 14 5-5-5-5', 'M20 9H9.5a5.5 5.5 0 0 0 0 11H13'],
    download: ['M12 3v12', 'm7 10 5 5 5-5', 'M5 21h14'],
    export: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4', 'M7 9l5-5 5 5', 'M12 4v12'],
    chevronDown: ['m6 9 6 6 6-6'],
    chevronRight: ['m9 18 6-6-6-6'],
    chevronLeft: ['m15 18-6-6 6-6'],
    sparkles: ['M9.94 14.34A1 1 0 0 0 9 15a1 1 0 0 0 .94.66l1.42.46a1 1 0 0 1 .64.64l.46 1.42a1 1 0 0 0 1.9 0l.46-1.42a1 1 0 0 1 .64-.64l1.42-.46a1 1 0 0 0 0-1.9l-1.42-.46a1 1 0 0 1-.64-.64l-.46-1.42a1 1 0 0 0-1.9 0l-.46 1.42a1 1 0 0 1-.64.64z', 'M5 3v4M3 5h4M6 17v2M5 18h2'],
    wand: ['m12 8-9.04 9.06a2.82 2.82 0 1 0 3.98 3.98L16 12', 'm14 7 3 3', 'M5 6v4M19 14v4M10 2v2M7 8H3M21 16h-4M11 3H9'],
    pencil: ['M21.17 6.83a2.83 2.83 0 0 0-4-4L4 16v4h4z', 'm15 5 4 4'],
    sliders: ['M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6'],
    layers: ['m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z', 'm22 12.5-9.17 4.16a2 2 0 0 1-1.66 0L2 12.5', 'm22 17.5-9.17 4.16a2 2 0 0 1-1.66 0L2 17.5'],
    crop: ['M6 2v14a2 2 0 0 0 2 2h14', 'M18 22V8a2 2 0 0 0-2-2H2'],
    move: ['M5 9 2 12l3 3', 'M9 5l3-3 3 3', 'M15 19l-3 3-3-3', 'M19 9l3 3-3 3', 'M2 12h20', 'M12 2v20'],
    contrast: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 18a6 6 0 0 0 0-12z'],
    eraser: ['m7 21-4.3-4.3a1 1 0 0 1 0-1.4l9.6-9.6a1 1 0 0 1 1.4 0l5.6 5.6a1 1 0 0 1 0 1.4L13 21', 'M22 21H7', 'm5 11 9 9'],
    grid: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
    code: ['m18 16 4-4-4-4', 'm6 8-4 4 4 4', 'm14.5 4-5 16'],
    clock: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 6v6l4 2'],
    image: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M8.5 11a1.5 1.5 0 1 0 0-3 1.5 1.5 0 0 0 0 3z', 'm21 15-5-5L5 21'],
    send: ['M14.54 2.46 22 2l-.46 7.46', 'M22 2 11 13', 'M22 2 15 22l-4-9-9-4z'],
    paperclip: ['M13.234 20.252 21 12.3', 'm16 6-8.414 8.586a2 2 0 0 0 2.829 2.829l8.414-8.586a4 4 0 0 0-5.657-5.657l-8.379 8.551a6 6 0 0 0 8.485 8.485l8.379-8.551'],
    maximize: ['M8 3H5a2 2 0 0 0-2 2v3', 'M21 8V5a2 2 0 0 0-2-2h-3', 'M3 16v3a2 2 0 0 0 2 2h3', 'M16 21h3a2 2 0 0 0 2-2v-3'],
    lock: ['M5 11a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2z', 'M8 9V6a4 4 0 1 1 8 0v3'],
    check: ['M20 6 9 17l-5-5'],
    copy: ['M15 2H9a1 1 0 0 0-1 1v1H7a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-1h1a1 1 0 0 0 1-1V7z'],
    plus: ['M5 12h14M12 5v14'],
    refresh: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
    bot: ['M12 8V4', 'M9 4h6', 'M5 8a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-8a2 2 0 0 0-2-2z', 'M9 13h.01M15 13h.01', 'M1 14h2M21 14h2'],
    message: ['M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z'],
    info: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 16v-4M12 8h.01'],
    aperture: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'm14.31 8 5.74 9.94', 'M9.69 8h11.48', 'm7.38 12 5.74-9.94', 'M9.69 16 3.95 6.06', 'M14.31 16H2.83', 'm16.62 12-5.74 9.94'],
    circle: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z'],
    checkSquare: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'm9 12 2 2 4-4'],
    loader: ['M12 2v4', 'm16.2 7.8 2.9-2.9', 'M18 12h4', 'm16.2 16.2 2.9 2.9', 'M12 18v4', 'm7.8 16.2-2.9 2.9', 'M2 12h4', 'm7.8 7.8-2.9-2.9'],
    atSign: ['M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8z', 'M16 8v5a3 3 0 0 0 6 0v-1a10 10 0 1 0-4 8'],
    cpu: ['M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2z', 'M9 9h6v6H9z', 'M15 2v2M9 2v2M15 20v2M9 20v2M20 9h2M20 14h2M2 9h2M2 14h2'],
    target: ['M12 22a10 10 0 1 0 0-20 10 10 0 0 0 0 20z', 'M12 18a6 6 0 1 0 0-12 6 6 0 0 0 0 12z', 'M12 14a2 2 0 1 0 0-4 2 2 0 0 0 0 4z'],
    stop: ['M9 8h6a1 1 0 0 1 1 1v6a1 1 0 0 1-1 1H9a1 1 0 0 1-1-1V9a1 1 0 0 1 1-1z'],
    history: ['M3 12a9 9 0 1 0 3-6.7L3 8', 'M3 3v5h5', 'M12 7v5l3 2'],
    panelRight: ['M3 5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', 'M15 3v18'],
    pin: ['M12 17v5', 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'],
    minus: ['M5 12h14'],
    zap: ['M4 14a1 1 0 0 1-.78-1.63l9.9-10.2a.5.5 0 0 1 .86.46l-1.92 6.02A1 1 0 0 0 13 10h7a1 1 0 0 1 .78 1.63l-9.9 10.2a.5.5 0 0 1-.86-.46l1.92-6.02A1 1 0 0 0 11 14z'],
    shield: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
    slots: ['M3 3h7v7H3z', 'M14 3h7v7h-7z', 'M14 14h7v7h-7z', 'M3 14h7v7H3z'],
    save: ['M15.2 3a2 2 0 0 1 1.4.6l3.8 3.8a2 2 0 0 1 .6 1.4V19a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2z', 'M17 21v-7a1 1 0 0 0-1-1H8a1 1 0 0 0-1 1v7', 'M7 3v4a1 1 0 0 0 1 1h7'],
    file: ['M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7z', 'M14 2v5a1 1 0 0 0 1 1h5'],
    tag: ['M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z', 'M7.5 7.5h.01'],
    hand: ['M18 11V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2', 'M14 10V4a2 2 0 0 0-2-2 2 2 0 0 0-2 2v2', 'M10 10.5V6a2 2 0 0 0-2-2 2 2 0 0 0-2 2v8', 'M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15'],
    scribble: ['M3.0 12.00L3.7 9.65L4.3 8.81L5.0 10.02L5.7 12.50L6.4 14.66L7.0 15.11L7.7 13.56L8.4 11.01L9.1 9.09L9.8 9.04L10.4 10.89L11.1 13.45L11.8 15.08L12.4 14.73L13.1 12.62L13.8 10.12L14.5 8.82L15.2 9.57L15.8 11.87L16.5 14.26L17.2 15.20L17.9 14.08L18.5 11.62L19.2 9.41L19.9 8.86L20.6 10.33L21.0 12.00'],
    brush: ['m9.06 11.9 8.07-8.06a2.85 2.85 0 1 1 4.03 4.03l-8.06 8.08', 'M7.07 14.94c-1.66 0-3 1.35-3 3.02 0 1.33-2.5 1.52-2 2.02 1.08 1.1 2.49 2.02 4 2.02 2.2 0 4-1.8 4-4.04a3.01 3.01 0 0 0-3-3.02z'],
  };
  function IDEIcon(props) {
    var paths = II[props.name] || II.info, size = props.size || 18;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={props.sw || 2} strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, display: 'block' }}>
        {paths.map(function (d, i) { return <path key={i} d={d} />; })}
      </svg>
    );
  }

  /* WordPress-media-style glyph, recast for photo + video: a photo card (sun +
     mountains) in front, a video card peeking behind top-right with a play badge. */
  function MediaPVIcon(props) {
    var size = props.size || 18;
    return (
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor"
        strokeWidth={props.sw || 2} strokeLinecap="round" strokeLinejoin="round"
        style={{ flexShrink: 0, display: 'block' }}>
        {/* video card behind, top-right, with a filled play badge */}
        <path d="M9 6.5V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-1.5" />
        <path d="M15.4 7.4v4.7l4-2.35z" fill="currentColor" stroke="none" />
        {/* photo card in front, bottom-left, with sun + mountains */}
        <rect x="2.5" y="6.5" width="13" height="13" rx="2.5" />
        <circle cx="6.4" cy="10.4" r="1.3" />
        <path d="m2.9 16.5 3.1-2.9 2.3 2.1L11 13l4.5 4.1" />
      </svg>
    );
  }

  /* ───────────────── primary left panel (expandable main nav) ───────────────── */
  /* The app's main navigation column, left of the tool rail. Collapses to an icon
     rail, expands to a labeled panel. The Pixcel X mark anchors the top. Contents
     are placeholder for now. */
  function PrimaryNav(props) {
    var as = useState('image'); var active = props.section != null ? props.section : as[0];
    function selectSection(id) { as[1](id); if (props.onSection) props.onSection(id); }
    var logo = (window.__resources && window.__resources.logoMarkWhite) || 'assets/logo-mark-white.svg';
    var NAV = [
      { id: 'art', label: 'Art', icon: 'scribble' },
      { id: 'image', label: 'Image', icon: 'image' },
      { id: 'video', label: 'Video', icon: 'panelRight' },
      { id: 'anim', label: 'Anim', icon: 'grid' },
    ];
    /* bottom utility cluster (moved off the tool rail): Export · Assets quick · assistant dock */
    var exportRef = useRef(null), assetsRef = useRef(null);
    var exS = useState(false); var exportOpen = exS[0], setExportOpen = exS[1];
    var exR = useState(null); var exportRect = exR[0], setExportRect = exR[1];
    var asR = useState(null); var assetsRect = asR[0], setAssetsRect = asR[1];
    function toggleExport() {
      if (!exportOpen && exportRef.current) setExportRect(exportRef.current.getBoundingClientRect());
      if (props.assetsOpen) props.onToggleAssets();
      setExportOpen(!exportOpen);
    }
    function toggleAssets() {
      if (!props.assetsOpen && assetsRef.current) setAssetsRect(assetsRef.current.getBoundingClientRect());
      setExportOpen(false);
      props.onToggleAssets();
    }
    return (
      <React.Fragment>
        <div style={{ width: 56, flexShrink: 0, background: 'var(--a2ui-cool-950)',
          borderRight: '1px solid var(--pxs-border-subtle)', display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '12px 0', gap: 4, overflow: 'hidden', zIndex: 30 }}>
          {/* Pixcel X — anchors the top of the primary nav */}
          <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
            <img src={logo} alt="Pixcel" style={{ height: 20, width: 'auto' }}
              onError={function (e) { e.target.style.display = 'none'; }} />
          </div>
          <div style={{ width: 26, height: 1, background: 'var(--pxs-border-subtle)', margin: '2px 0 6px', flexShrink: 0 }} />
          {NAV.map(function (it) {
            return <PrimaryNavBtn key={it.id} item={it} active={active === it.id} onClick={function () { selectSection(it.id); }} />;
          })}
          <div style={{ flex: 1 }} />
          {/* bottom cluster — Export · Assets quick view · assistant dock toggle */}
          <div style={{ width: 26, height: 1, background: 'var(--pxs-border-subtle)', margin: '6px 0', flexShrink: 0 }} />
          <PrimaryNavBtn item={{ id: 'export', label: 'Export', icon: 'export' }} util btnRef={exportRef} active={exportOpen} onClick={toggleExport} />
          <PrimaryNavBtn item={{ id: 'assets', label: 'Assets', icon: 'image' }} util btnRef={assetsRef} active={props.assetsOpen} onClick={toggleAssets} />
          {props.onToggleAgent && <PrimaryNavBtn item={{ id: 'agent', label: 'Assistant', icon: 'panelRight', title: props.agentOpen ? 'Hide assistant' : 'Show assistant' }}
            util active={props.agentOpen} onClick={props.onToggleAgent} />}
        </div>
        {exportOpen && exportRect &&
          <RailPopover rect={exportRect} anchorEl={exportRef.current} width={272} onClose={function () { setExportOpen(false); }}>
            {window.IDEExportQuick ? <window.IDEExportQuick onClose={function () { setExportOpen(false); }} /> : null}
          </RailPopover>}
        {props.assetsOpen && assetsRect &&
          <RailPopover rect={assetsRect} anchorEl={assetsRef.current} width={332} onClose={props.onToggleAssets}>
            {window.IDEAssetsQuick ? <window.IDEAssetsQuick onClose={props.onToggleAssets} onOpenFull={props.onOpenFullAssets} /> : null}
          </RailPopover>}
      </React.Fragment>
    );
  }
  function PrimaryNavBtn(props) {
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var it = props.item, util = props.util, active = props.active;
    return (
      <button ref={props.btnRef} onClick={props.onClick} title={it.title || it.label}
        onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        style={{ position: 'relative', width: 40, height: 40, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 2, flexShrink: 0,
          background: active ? 'var(--a2ui-bg-active)' : hover ? 'var(--a2ui-bg-hover)' : 'transparent',
          color: active ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)', border: 'none',
          borderRadius: 9, cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease' }}>
        {active && !util && <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)',
          width: 2.5, height: 20, borderRadius: 9999, background: 'var(--pxs-accent-focus)' }} />}
        <IDEIcon name={it.icon} size={18} />
        <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.02em' }}>{it.label}</span>
      </button>
    );
  }

  function ProviderDot(props) {
    var s = props.size || 18, box = props.box || 24;
    return (
      <span style={{ width: box, height: box, borderRadius: 6, flexShrink: 0, overflow: 'hidden',
        background: 'var(--a2ui-bg-elevated)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={(window.__resources && window.__resources['pi_' + props.provider]) || ('assets/provider-icons/' + props.provider + '.ico')} alt="" width={s} height={s}
          style={{ objectFit: 'contain' }} onError={function (e) { e.target.style.display = 'none'; }} />
      </span>
    );
  }

  /* ───────────────── left tool rail ───────────────── */
  /* tools grouped by intent; edit tools open the selected frame into Focus. */
  var TOOL_GROUPS = [
    [{ id: 'move', name: 'move', label: 'Move & pan', key: 'V' }],
    [{ id: 'crop', name: 'crop', label: 'Crop & frame', key: 'C', edit: true },
     { id: 'mask', name: 'aperture', label: 'Mask region', key: 'M', edit: true },
     { id: 'inpaint', name: 'brush', label: 'Inpaint', key: 'B', edit: true }],
    [{ id: 'adjust', name: 'sliders', label: 'Adjust', key: 'A', edit: true },
     { id: 'tone', name: 'contrast', label: 'Tone curve', key: 'T', edit: true }],
  ];
  function Rail(props) {
    var st = CanvasStore.use();
    var labeled = !!props.labeled;
    function pick(t) {
      CanvasStore.set({ tool: t.id });
      if (t.edit && st.mode === 'view') CanvasStore.set({ mode: 'focus' });
    }
    /* keyboard shortcuts */
    useEffect(function () {
      function onKey(e) {
        if (e.metaKey || e.ctrlKey || e.altKey) return;
        var tag = (e.target && e.target.tagName) || '';
        if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target && e.target.isContentEditable)) return;
        var all = []; TOOL_GROUPS.forEach(function (g) { g.forEach(function (t) { all.push(t); }); });
        var hit = all.filter(function (t) { return t.key.toLowerCase() === e.key.toLowerCase(); })[0];
        if (hit) { e.preventDefault(); CanvasStore.set({ tool: hit.id }); if (hit.edit && CanvasStore.get().mode === 'view') CanvasStore.set({ mode: 'focus' }); }
      }
      window.addEventListener('keydown', onKey);
      return function () { window.removeEventListener('keydown', onKey); };
    }, []);

    var items = [];
    TOOL_GROUPS.forEach(function (grp, gi) {
      if (gi > 0) items.push(<div key={'div' + gi} style={{ width: labeled ? 30 : 22, height: 1, background: 'var(--pxs-border-subtle)', margin: '7px 0' }} />);
      grp.forEach(function (t) {
        items.push(
          <RailBtn key={t.id} active={st.tool === t.id} label={t.label} hint={t.key} labeled={labeled} onClick={function () { pick(t); }}>
            <IDEIcon name={t.name} size={18} />
          </RailBtn>
        );
      });
    });
    return (
      <div style={{ width: labeled ? 64 : 52, flexShrink: 0, background: 'var(--a2ui-cool-900)',
        borderRight: '1px solid var(--pxs-border-subtle)', display: 'flex', flexDirection: 'column',
        alignItems: 'center', padding: '10px 0', gap: labeled ? 1 : 2 }}>
        {items}
      </div>
    );
  }

  /* anchored glass popover that hangs off a rail button (escapes the rail's overflow) */
  function RailPopover(props) {
    var ref = useRef(null);
    useEffect(function () {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target) && !(props.anchorEl && props.anchorEl.contains(e.target))) props.onClose(); }
      function onKey(e) { if (e.key === 'Escape') props.onClose(); }
      document.addEventListener('mousedown', onDoc);
      document.addEventListener('keydown', onKey);
      return function () { document.removeEventListener('mousedown', onDoc); document.removeEventListener('keydown', onKey); };
    }, []);
    var r = props.rect, w = props.width || 300;
    var left = r.right + 10;
    var maxW = window.innerWidth - left - 12;
    if (w > maxW) w = Math.max(240, maxW);
    var bottom = Math.max(12, window.innerHeight - r.bottom);
    return (
      <div ref={ref} style={{ position: 'fixed', left: left, bottom: bottom, zIndex: 200, width: w,
        maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column',
        background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--pxs-glass-border)', borderRadius: 14, boxShadow: 'var(--a2ui-shadow-lg)', overflow: 'hidden' }}>
        {props.children}
      </div>
    );
  }
  function RailBtn(props) {
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var labeled = props.labeled;
    return (
      <button onClick={props.onClick} ref={props.btnRef} title={props.hint ? props.label + '  (' + props.hint + ')' : props.label}
        onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        style={{ width: labeled ? 56 : 36, height: labeled ? 46 : 36, display: 'flex', flexDirection: labeled ? 'column' : 'row',
          alignItems: 'center', justifyContent: 'center', gap: labeled ? 3 : 0, position: 'relative',
          background: props.active ? 'var(--a2ui-bg-active)' : hover ? 'var(--a2ui-bg-hover)' : 'transparent',
          color: props.active ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)',
          border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'background 150ms ease, color 150ms ease' }}>
        {/* active edge marker */}
        {props.active && <span style={{ position: 'absolute', left: -10, top: '50%', transform: 'translateY(-50%)',
          width: 3, height: 18, borderRadius: 9999, background: 'var(--pxs-accent-text)' }} />}
        {props.children}
        {labeled && <span style={{ fontSize: 9, fontWeight: 500, letterSpacing: '0.01em', lineHeight: 1,
          color: props.active ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-dim)' }}>{props.label.split(' ')[0]}</span>}
      </button>
    );
  }

  /* ───────────────── top bar (global chrome — history, save state, export, agent) ───────────────── */
  function TopBar(props) {
    return (
      <div style={{ height: 48, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, overflow: 'hidden',
        padding: '0 12px', borderBottom: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)' }}>
        <div style={{ flex: 1, minWidth: 8 }} />

        {/* document history + save state */}
        <div style={{ display: 'inline-flex', gap: 2, flexShrink: 0 }}>
          <button title="Undo" style={iconBtn()}><IDEIcon name="undo" size={16} /></button>
          <button title="Redo" style={iconBtn(true)}><IDEIcon name="redo" size={16} /></button>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--a2ui-text-tertiary)', flexShrink: 0, margin: '0 2px 0 6px' }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--a2ui-success)' }} />Saved
        </span>
        <div style={{ width: 1, height: 20, background: 'var(--pxs-border-subtle)', margin: '0 6px', flexShrink: 0 }} />
        <IDESaveExport />
        <div style={{ width: 1, height: 20, background: 'var(--pxs-border-subtle)', margin: '0 6px', flexShrink: 0 }} />
        <button title={props.agentOpen ? 'Hide agent' : 'Show agent'} onClick={props.onToggleAgent}
          style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            background: props.agentOpen ? 'var(--a2ui-bg-active)' : 'transparent',
            color: props.agentOpen ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-secondary)',
            border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }}>
          <IDEIcon name="panelRight" size={17} />
        </button>
      </div>
    );
  }

  /* ───────────────── canvas — sheet grid ↔ focus editor ───────────────── */
  var VIEWS = [
    { id: 'front', label: 'Front' }, { id: 'tq-left', label: '3/4 left' },
    { id: 'profile', label: 'Profile' }, { id: 'back', label: 'Back' },
    { id: 'bust-front', label: 'Bust · front' }, { id: 'bust-tq', label: 'Bust · 3/4' },
    { id: 'bust-prof', label: 'Bust · profile' }, { id: 'bust-low', label: 'Low angle' },
  ];
  var DOT_BG = 'radial-gradient(circle at 1px 1px, rgba(255,255,255,0.025) 1px, transparent 0)';

  function Canvas(props) {
    var st = CanvasStore.use();
    var cols = props.cols || 4;
    var scrollRef = useRef(null);
    var pan = useRef(null);
    var view = VIEWS.filter(function (v) { return v.id === st.selected; })[0] || VIEWS[0];

    function setZoom(z) { CanvasStore.set({ zoom: Math.max(0.25, Math.min(3, Math.round(z * 100) / 100)) }); }

    /* ctrl/cmd + wheel zoom */
    useEffect(function () {
      var el = scrollRef.current; if (!el) return;
      function onWheel(e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(CanvasStore.get().zoom * (e.deltaY < 0 ? 1.08 : 0.93)); } }
      el.addEventListener('wheel', onWheel, { passive: false });
      return function () { el.removeEventListener('wheel', onWheel); };
    }, [st.mode]);

    /* drag-to-pan when Move tool active */
    function onDown(e) {
      if (st.tool !== 'move' || e.button !== 0) return;
      var el = scrollRef.current; if (!el) return;
      pan.current = { x: e.clientX, y: e.clientY, l: el.scrollLeft, t: el.scrollTop, moved: false };
    }
    function onMove(e) {
      if (!pan.current) return; var el = scrollRef.current; if (!el) return;
      pan.current.moved = true;
      el.scrollLeft = pan.current.l - (e.clientX - pan.current.x);
      el.scrollTop = pan.current.t - (e.clientY - pan.current.y);
    }
    function onUp() { pan.current = null; }
    var cursor = st.mode === 'sheet'
      ? (st.tool === 'move' ? 'grab' : 'default')
      : (st.tool === 'move' ? 'grab' : 'default');

    return (
      <div style={{ flex: 1, position: 'relative', minWidth: 0, background: 'var(--pxs-bg-canvas)',
        backgroundImage: DOT_BG, backgroundSize: '22px 22px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>

        {st.mode === 'sheet' ? <SheetHeader /> : <FocusHeader view={view} tool={st.tool} />}

        <div ref={scrollRef} className="ide-scroll" onMouseDown={onDown} onMouseMove={onMove} onMouseUp={onUp} onMouseLeave={onUp}
          style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative',
            padding: st.mode === 'sheet' ? '6px 24px 150px' : '0', cursor: cursor }}>
          {st.mode === 'sheet'
            ? <div style={{ width: Math.round(880 * st.zoom), maxWidth: 'none', margin: '0 auto', display: 'grid',
                gridTemplateColumns: 'repeat(' + cols + ', 1fr)', gap: Math.round(14 * st.zoom) }}>
                {VIEWS.map(function (v) {
                  return <Frame key={v.id} view={v} selected={st.selected === v.id}
                    onSelect={function () { if (!pan.current || !pan.current.moved) CanvasStore.set({ selected: v.id }); }}
                    onOpen={function () { CanvasStore.set({ selected: v.id, mode: 'focus' }); }} />;
                })}
              </div>
            : <FocusStage view={view} zoom={st.zoom} tool={st.tool} brush={st.brush} />}
        </div>

        {st.mode === 'focus' && (st.tool === 'adjust' || st.tool === 'tone') && <AdjustPanel tool={st.tool} />}
        {st.mode === 'focus' && (st.tool === 'mask' || st.tool === 'inpaint') && <BrushBar />}

        <CanvasToolbar st={st} setZoom={setZoom} view={view} />
      </div>
    );
  }

  function SheetHeader() {
    return (
      <div style={{ flexShrink: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 18px 10px' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600,
            color: 'var(--a2ui-text-primary)' }}>
            <IDEIcon name="layers" size={15} />Character reference sheet
          </span>
          <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)' }}>“Jonny&nbsp;1” · 8 views</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--a2ui-text-tertiary)',
            background: 'var(--a2ui-success-bg)', padding: '3px 9px', borderRadius: 9999 }}>
            <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--a2ui-success)' }} />consistent asset
          </span>
        </div>
        <div style={{ padding: '0 18px 4px', fontSize: 11.5, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.4 }}>
          A reusable, multi-angle asset — train once, generate any pose. Each view inherits the prompt above.
        </div>
      </div>
    );
  }

  function FocusHeader(props) {
    var v = props.view;
    var TOOL_LABEL = { move: 'Move & pan', crop: 'Crop & frame', mask: 'Mask region', inpaint: 'Inpaint', adjust: 'Adjust', tone: 'Tone curve' };
    return (
      <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '12px 18px 11px',
        borderBottom: '1px solid var(--pxs-border-subtle)' }}>
        <button title="Back to canvas" onClick={function () { CanvasStore.set({ mode: 'view', tool: 'move' }); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 10px 0 7px',
            background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 8,
            cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500 }}
          onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-elevated)'; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-tertiary)'; }}>
          <IDEIcon name="chevronLeft" size={15} />Back
        </button>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>
          <IDEIcon name="image" size={15} />{v.label}
        </span>
        <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)' }}>{props.title || ''}</span>
        <div style={{ flex: 1 }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11.5, fontWeight: 500,
          color: 'var(--pxs-accent-text)', background: 'var(--pxs-accent-subtle)', padding: '4px 10px', borderRadius: 9999 }}>
          <IDEIcon name="target" size={13} />{TOOL_LABEL[props.tool] || 'Edit'}
        </span>
      </div>
    );
  }

  function Frame(props) {
    var v = props.view, selected = props.selected;
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    return (
      <div onClick={props.onSelect} onDoubleClick={props.onOpen}
        onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
          aspectRatio: '3 / 4', background: 'var(--a2ui-cool-800)',
          boxShadow: selected ? '0 0 0 2px var(--pxs-accent-focus)' : '0 0 0 1px var(--pxs-border-subtle)',
          transition: 'box-shadow 150ms ease' }}>
        <image-slot id={'ide-turn-' + v.id} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
          shape="rect" placeholder="Drop frame" fit="cover"></image-slot>

        <div style={{ position: 'absolute', left: 8, top: 8, fontSize: 10.5, fontWeight: 500,
          color: 'var(--a2ui-text-secondary)', background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)', border: '1px solid var(--pxs-glass-border)', borderRadius: 9999,
          padding: '3px 9px', pointerEvents: 'none' }}>{v.label}</div>

        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          gap: 6, padding: 10, opacity: hover ? 1 : 0, transition: 'opacity 200ms ease', pointerEvents: hover ? 'auto' : 'none',
          background: 'linear-gradient(180deg, transparent 40%, rgba(0,0,0,0.6) 100%)' }}>
          <FrameAction label="Edit in Studio" wide onClick={props.onOpen}><IDEIcon name="pencil" size={13} /></FrameAction>
          <FrameAction label="Variations"><IDEIcon name="sparkles" size={13} /></FrameAction>
        </div>
      </div>
    );
  }
  function FrameAction(props) {
    return (
      <button title={props.label} onClick={function (e) { e.stopPropagation(); if (props.onClick) props.onClick(); }}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: props.wide ? '0 11px' : '0 9px',
          background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
          border: '1px solid var(--pxs-glass-border)', borderRadius: 8, cursor: 'pointer', color: 'var(--a2ui-text-primary)',
          fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>
        {props.children}{props.wide && props.label}
      </button>
    );
  }

  /* ───── focus editor stage ───── */
  function FocusStage(props) {
    var v = props.view, zoom = props.zoom, tool = props.tool, brush = props.brush;
    var ps = useState(null); var p = ps[0], setP = ps[1];
    var brushy = tool === 'mask' || tool === 'inpaint';
    function onMove(e) {
      if (!brushy) { if (p) setP(null); return; }
      var r = e.currentTarget.getBoundingClientRect();
      setP({ x: e.clientX - r.left, y: e.clientY - r.top });
    }
    var w = Math.round(360 * zoom);
    return (
      <div style={{ minHeight: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '52px 40px 150px' }}>
        <div onMouseMove={onMove} onMouseLeave={function () { setP(null); }}
          style={{ position: 'relative', width: w, aspectRatio: '3 / 4', borderRadius: 14, overflow: 'hidden',
            background: 'var(--a2ui-cool-800)', boxShadow: '0 0 0 1px var(--pxs-border-subtle), var(--a2ui-shadow-lg)',
            cursor: brushy ? 'none' : tool === 'crop' ? 'crosshair' : 'default' }}>
          <image-slot id={'ide-turn-' + v.id} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}
            shape="rect" placeholder="Drop frame" fit="cover"></image-slot>

          <div style={{ position: 'absolute', left: 10, top: 10, fontSize: 11, fontWeight: 500, color: 'var(--a2ui-text-secondary)',
            background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
            border: '1px solid var(--pxs-glass-border)', borderRadius: 9999, padding: '3px 10px', pointerEvents: 'none' }}>{v.label}</div>

          {tool === 'crop' && <CropOverlay />}
          {tool === 'mask' && <MaskOverlay />}
          {brushy && p && <span style={{ position: 'absolute', left: p.x, top: p.y, width: brush, height: brush,
            transform: 'translate(-50%, -50%)', borderRadius: 9999, pointerEvents: 'none',
            border: '1.5px solid var(--pxs-accent-focus)', background: 'rgba(138,180,248,0.14)',
            boxShadow: '0 0 0 1px rgba(0,0,0,0.4)' }} />}
        </div>
      </div>
    );
  }

  function CropOverlay() {
    var handles = [['nw', 0, 0], ['ne', 1, 0], ['sw', 0, 1], ['se', 1, 1]];
    return (
      <div style={{ position: 'absolute', inset: '8%', pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', inset: 0, border: '1px solid rgba(255,255,255,0.9)',
          boxShadow: '0 0 0 9999px rgba(0,0,0,0.42)' }} />
        {/* rule-of-thirds */}
        {[33.33, 66.66].map(function (o, i) { return <div key={'v' + i} style={{ position: 'absolute', top: 0, bottom: 0, left: o + '%', width: 1, background: 'rgba(255,255,255,0.25)' }} />; })}
        {[33.33, 66.66].map(function (o, i) { return <div key={'h' + i} style={{ position: 'absolute', left: 0, right: 0, top: o + '%', height: 1, background: 'rgba(255,255,255,0.25)' }} />; })}
        {handles.map(function (hd) {
          return <span key={hd[0]} style={{ position: 'absolute', width: 12, height: 12, borderRadius: 3, background: 'var(--pxs-accent-focus)',
            left: hd[1] ? 'auto' : -6, right: hd[1] ? -6 : 'auto', top: hd[2] ? 'auto' : -6, bottom: hd[2] ? -6 : 'auto',
            boxShadow: '0 0 0 2px rgba(0,0,0,0.4)' }} />;
        })}
      </div>
    );
  }
  function MaskOverlay() {
    return (
      <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', left: '24%', top: '14%', width: '52%', height: '46%', borderRadius: '50% 50% 48% 52%',
          border: '1.5px dashed var(--pxs-accent-focus)', background: 'rgba(138,180,248,0.18)' }} />
        <span style={{ position: 'absolute', left: '50%', top: '11%', transform: 'translate(-50%,-100%)', whiteSpace: 'nowrap',
          fontSize: 10.5, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--pxs-accent-text)',
          background: 'var(--a2ui-glass-dark)', border: '1px solid var(--pxs-glass-border)', borderRadius: 9999, padding: '2px 8px' }}>mask · head</span>
      </div>
    );
  }

  /* adjust / tone floating control card */
  function AdjustPanel(props) {
    var SETS = {
      adjust: [['Exposure', 12], ['Contrast', -6], ['Saturation', 20]],
      tone: [['Temperature', -14], ['Tint', 4], ['Highlights', -22]],
    };
    var rows = SETS[props.tool] || SETS.adjust;
    return (
      <div style={{ position: 'absolute', left: 18, top: 64, zIndex: 20, width: 224, padding: 14,
        background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--pxs-glass-border)', borderRadius: 12, boxShadow: 'var(--a2ui-shadow-lg)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 12 }}>
          <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)' }}><IDEIcon name={props.tool === 'tone' ? 'contrast' : 'sliders'} size={14} /></span>
          <span style={{ fontSize: 12, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{props.tool === 'tone' ? 'Tone curve' : 'Adjust'}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10.5, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)' }}>non-destructive</span>
        </div>
        {rows.map(function (r) { return <AdjustSlider key={r[0]} label={r[0]} initial={r[1]} />; })}
      </div>
    );
  }
  function AdjustSlider(props) {
    var vs = useState(props.initial); var val = vs[0], setVal = vs[1];
    return (
      <div style={{ marginBottom: 11 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
          <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-secondary)' }}>{props.label}</span>
          <span style={{ fontSize: 11, fontFamily: 'var(--a2ui-font-mono)', color: val === 0 ? 'var(--a2ui-text-dim)' : 'var(--pxs-accent-text)' }}>{val > 0 ? '+' + val : val}</span>
        </div>
        <input type="range" min={-50} max={50} value={val} onChange={function (e) { setVal(parseInt(e.target.value, 10)); }}
          style={{ width: '100%', accentColor: 'var(--a2ui-accent)', height: 4, cursor: 'pointer' }} />
      </div>
    );
  }

  /* brush-size pill for mask / inpaint */
  function BrushBar() {
    var st = CanvasStore.use();
    return (
      <div style={{ position: 'absolute', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 12, padding: '8px 14px', background: 'var(--a2ui-glass-menu)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--pxs-glass-border)',
        borderRadius: 9999, boxShadow: 'var(--a2ui-shadow-lg)' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 11.5, fontWeight: 500, color: 'var(--a2ui-text-secondary)' }}>
          <IDEIcon name="brush" size={14} />Brush
        </span>
        <input type="range" min={16} max={140} value={st.brush} onChange={function (e) { CanvasStore.set({ brush: parseInt(e.target.value, 10) }); }}
          style={{ width: 120, accentColor: 'var(--a2ui-accent)', height: 4, cursor: 'pointer' }} />
        <span style={{ fontSize: 11, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-dim)', width: 30, textAlign: 'right' }}>{st.brush}px</span>
      </div>
    );
  }

  /* floating glass toolbar — zoom + frame info */
  function CanvasToolbar(props) {
    var st = props.st, setZoom = props.setZoom;
    var pct = Math.round(st.zoom * 100);
    return (
      <div style={{ position: 'absolute', right: 18, top: 12, zIndex: 20,
        display: 'flex', alignItems: 'center', gap: 4, padding: 5, background: 'var(--a2ui-glass-dark)',
        backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--pxs-glass-border)',
        borderRadius: 12, boxShadow: 'var(--a2ui-shadow-lg)' }}>
        {st.mode === 'sheet' && <TbChip icon="sparkles">Max</TbChip>}
        {st.mode === 'sheet' && <TbChip icon="grid">Auto</TbChip>}
        {st.mode === 'sheet' && <div style={{ width: 1, height: 18, background: 'var(--pxs-border-subtle)', margin: '0 2px' }} />}

        {/* zoom cluster */}
        <button title="Zoom out" style={iconBtn()} onClick={function () { setZoom(st.zoom - 0.12); }}><IDEIcon name="minus" size={15} /></button>
        <button title="Reset zoom" onClick={function () { setZoom(1); }}
          style={{ minWidth: 50, height: 30, padding: '0 6px', background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer',
            fontFamily: 'var(--a2ui-font-mono)', fontSize: 12, color: 'var(--a2ui-text-secondary)' }}
          onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}>{pct}%</button>
        <button title="Zoom in" style={iconBtn()} onClick={function () { setZoom(st.zoom + 0.12); }}><IDEIcon name="plus" size={15} /></button>
        <div style={{ width: 1, height: 18, background: 'var(--pxs-border-subtle)', margin: '0 2px' }} />
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '0 8px', fontSize: 12,
          fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-secondary)' }}>
          1376<span style={{ color: 'var(--a2ui-text-dim)' }}>×</span>768
          <span style={{ color: 'var(--a2ui-text-dim)', display: 'inline-flex' }}><IDEIcon name="lock" size={12} /></span>
        </span>
        <button title="Fit to view" style={iconBtn()} onClick={function () { setZoom(1); }}><IDEIcon name="maximize" size={15} /></button>
      </div>
    );
  }
  function TbChip(props) {
    return (
      <button style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 30, padding: '0 11px',
        background: 'transparent', border: 'none', borderRadius: 8, cursor: 'pointer', color: 'var(--a2ui-text-secondary)',
        fontFamily: 'inherit', fontSize: 12, fontWeight: 500 }}
        onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
        onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}>
        <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)' }}><IDEIcon name={props.icon} size={14} /></span>
        {props.children}
      </button>
    );
  }

  /* ───── standalone focus editor (used by the response canvas for any frame) ───── */
  function FocusEditor(props) {
    var st = CanvasStore.use();
    var frames = props.frames || VIEWS;
    var view = frames.filter(function (v) { return v.id === st.selected; })[0] || frames[0];
    var scrollRef = useRef(null);
    function setZoom(z) { CanvasStore.set({ zoom: Math.max(0.25, Math.min(3, Math.round(z * 100) / 100)) }); }
    useEffect(function () {
      var el = scrollRef.current; if (!el) return;
      function onWheel(e) { if (e.ctrlKey || e.metaKey) { e.preventDefault(); setZoom(CanvasStore.get().zoom * (e.deltaY < 0 ? 1.08 : 0.93)); } }
      el.addEventListener('wheel', onWheel, { passive: false });
      return function () { el.removeEventListener('wheel', onWheel); };
    }, []);
    return (
      <div style={{ flex: 1, position: 'relative', minWidth: 0, background: 'var(--pxs-bg-canvas)',
        backgroundImage: DOT_BG, backgroundSize: '22px 22px', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <FocusHeader view={view} tool={st.tool} title={props.title} />
        <div ref={scrollRef} className="ide-scroll" style={{ flex: 1, minHeight: 0, overflow: 'auto', position: 'relative' }}>
          <FocusStage view={view} zoom={st.zoom} tool={st.tool} brush={st.brush} />
        </div>
        {(st.tool === 'adjust' || st.tool === 'tone') && <AdjustPanel tool={st.tool} />}
        {(st.tool === 'mask' || st.tool === 'inpaint') && <BrushBar />}
        <CanvasToolbar st={st} setZoom={setZoom} view={view} />
      </div>
    );
  }

  function iconBtn(muted) {
    return { width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: muted ? 'var(--a2ui-text-disabled)' : 'var(--a2ui-text-secondary)',
      border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 };
  }

  Object.assign(window, { IDEIcon: IDEIcon, IDEMediaPVIcon: MediaPVIcon, IDEPrimaryNav: PrimaryNav, IDEProviderDot: ProviderDot, IDERail: Rail, IDETopBar: TopBar, IDECanvas: Canvas, IDECanvasStore: CanvasStore,
    IDEFocusEditor: FocusEditor, IDEFrame: Frame, IDESheetHeader: SheetHeader, IDECanvasToolbar: CanvasToolbar, IDEVIEWS: VIEWS, IDEDotBg: DOT_BG });
})();

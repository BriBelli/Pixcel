/* global React, ReactDOM, PXART, PXARTStudio */
/* Pixcel Art Studio — app shell: nav rail + top bar + the active layout direction,
   responsive (desktop → mobile), theme, and a Tweaks panel. */
(function () {
  'use strict';
  var useState = React.useState, useEffect = React.useEffect;
  var ArtStore = PXART.ArtStore, Ic = PXART.Ic;
  var S = PXARTStudio;

  var LS = 'pxart.prefs.v1';
  function loadPrefs() { try { return JSON.parse(localStorage.getItem(LS)) || {}; } catch (e) { return {}; } }
  function savePrefs(p) { try { localStorage.setItem(LS, JSON.stringify(p)); } catch (e) { } }

  var GLOWS = {
    Blue: { ink: 'rgba(174,203,250,0.95)', ink2: 'rgba(138,180,248,0.62)', dim: 'rgba(138,180,248,0.13)', glow: 'rgba(138,180,248,0.55)' },
    Cyan: { ink: 'rgba(160,224,240,0.95)', ink2: 'rgba(110,200,225,0.62)', dim: 'rgba(110,200,225,0.13)', glow: 'rgba(110,200,225,0.55)' },
    Lavender: { ink: 'rgba(206,194,250,0.95)', ink2: 'rgba(176,160,245,0.62)', dim: 'rgba(176,160,245,0.13)', glow: 'rgba(176,160,245,0.55)' },
  };

  function App() {
    var st = ArtStore.use();
    var width = S.useWidth();
    var compact = width < 860;
    var p0 = loadPrefs();
    var dz = useState(p0.dir || 'easel'); var dir = dz[0], setDir = dz[1];
    var tz = useState(p0.theme || 'dark'); var theme = tz[0], setTheme = tz[1];
    var rz = useState(p0.rulers !== false); var rulers = rz[0], setRulers = rz[1];
    var lz = useState(p0.ledger !== false); var ledger = lz[0], setLedger = lz[1];
    var csz = useState('matrix'); var cstyle = csz[0], setCStyle = csz[1];
    var gz = useState(p0.glow || 'Blue'); var glow = gz[0], setGlow = gz[1];
    var twz = useState(false); var tweaksOpen = twz[0], setTweaksOpen = twz[1];

    // persist + apply theme/glow
    useEffect(function () { document.documentElement.setAttribute('data-theme', theme); }, [theme]);
    useEffect(function () { ArtStore.patch({ canvasStyle: cstyle }); }, [cstyle]);
    useEffect(function () {
      var g = GLOWS[glow] || GLOWS.Blue, r = document.documentElement.style;
      r.setProperty('--pxart-ink', g.ink); r.setProperty('--pxart-ink-2', g.ink2);
      r.setProperty('--pxart-dim', g.dim); r.setProperty('--pxart-glow', g.glow);
    }, [glow]);
    useEffect(function () { savePrefs({ dir: dir, theme: theme, rulers: rulers, ledger: ledger, glow: glow }); }, [dir, theme, rulers, ledger, glow, cstyle]);

    var effDir = compact ? 'atelier' : dir; // mobile uses the bottom dock

    return (
      <div style={{ height: '100%', display: 'flex', background: 'var(--a2ui-bg-app)' }}>
        {!compact && <S.NavRail savedCount={st.savedCount} onTweaks={function () { setTweaksOpen(!tweaksOpen); }} tweaksOpen={tweaksOpen} />}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
          <S.TopBar st={st} dir={dir} onDir={setDir} compact={compact} theme={theme} cstyle={cstyle} onCanvas={setCStyle}
            canUndo={st.phase === 'done' || st.phase === 'saved'} onUndo={function () { ArtStore.cancel(); }}
            canRedo={st.phase === 'idle' && !!st.prompt} onRedo={function () { ArtStore.start(st.prompt); }}
            onTheme={function () { setTheme(theme === 'dark' ? 'light' : 'dark'); }} />
          {effDir === 'easel'
            ? <S.EaselLayout st={st} rulers={rulers} ledger={ledger} canvasStyle={cstyle} />
            : <S.AtelierLayout st={st} rulers={rulers} compact={compact} canvasStyle={cstyle} />}
        </div>

        {compact &&
          <button onClick={function () { setTweaksOpen(!tweaksOpen); }} title="Tweaks"
            style={{ position: 'fixed', left: 12, top: 54, zIndex: 40, width: 36, height: 36, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(10px)', border: '1px solid var(--pxs-glass-border)', borderRadius: 9, color: 'var(--a2ui-text-secondary)', cursor: 'pointer' }}>
            <Ic name="sliders" size={16} />
          </button>}

        {tweaksOpen &&
          <TweaksPanel st={st} compact={compact} onClose={function () { setTweaksOpen(false); }}
            dir={dir} setDir={setDir} rulers={rulers} setRulers={setRulers} ledger={ledger} setLedger={setLedger}
            glow={glow} setGlow={setGlow} cstyle={cstyle} setCStyle={setCStyle} />}
      </div>
    );
  }

  /* ───────────────── Tweaks ───────────────── */
  function TweaksPanel(props) {
    var st = props.st;
    return (
      <div style={{ position: 'fixed', left: props.compact ? 12 : 64, bottom: props.compact ? 'auto' : 14, top: props.compact ? 96 : 'auto', zIndex: 60, width: 270,
        background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid var(--pxs-glass-border)', borderRadius: 14, boxShadow: 'var(--a2ui-shadow-xl)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <Ic name="sliders" size={15} />
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Tweaks</span>
          <div style={{ flex: 1 }} />
          <button onClick={props.onClose} style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--a2ui-text-tertiary)', cursor: 'pointer', borderRadius: 7 }}><Ic name="x" size={14} /></button>
        </div>
        <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {props.compact &&
            <TwRow label="Layout"><Seg value={props.dir} onChange={props.setDir} opts={[['easel', 'Easel'], ['atelier', 'Atelier']]} /></TwRow>}
          <TwRow label="Glow">
            <div style={{ display: 'flex', gap: 7 }}>
              {Object.keys(GLOWS).map(function (g) {
                var on = props.glow === g, c = GLOWS[g].glow;
                return <button key={g} title={g} onClick={function () { props.setGlow(g); }}
                  style={{ width: 26, height: 26, borderRadius: 8, cursor: 'pointer', background: c.replace('0.55', '0.9'),
                    border: on ? '2px solid var(--a2ui-text-primary)' : '2px solid transparent', boxShadow: '0 0 8px ' + c }} />;
              })}
            </div>
          </TwRow>
          <TwSlider label="Speed" value={st.speed} min={0.5} max={2.5} step={0.1} suffix="×" onChange={function (v) { ArtStore.patch({ speed: v }); }} />
          <TwSlider label="Char density" value={st.density} min={0} max={1.5} step={0.1} onChange={function (v) { ArtStore.patch({ density: v }); }} />
          <TwToggle label="Drafting rulers" value={props.rulers} onChange={props.setRulers} />
          {!props.compact && <TwToggle label="Live data ledger" value={props.ledger} onChange={props.setLedger} />}
        </div>
      </div>
    );
  }
  function TwRow(props) {
    return <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <span style={{ width: 86, flexShrink: 0, fontSize: 11, color: 'var(--a2ui-text-secondary)' }}>{props.label}</span>
      <div style={{ flex: 1 }}>{props.children}</div>
    </div>;
  }
  function TwSlider(props) {
    return (
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-secondary)' }}>{props.label}</span>
          <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 11, color: 'var(--pxs-accent-text)' }}>{props.value.toFixed(props.step < 1 ? 1 : 0)}{props.suffix || ''}</span>
        </div>
        <input type="range" min={props.min} max={props.max} step={props.step} value={props.value}
          onChange={function (e) { props.onChange(parseFloat(e.target.value)); }}
          style={{ width: '100%', accentColor: 'var(--a2ui-accent)', height: 4, cursor: 'pointer' }} />
      </div>
    );
  }
  function TwToggle(props) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <span style={{ flex: 1, fontSize: 11, color: 'var(--a2ui-text-secondary)' }}>{props.label}</span>
        <button onClick={function () { props.onChange(!props.value); }}
          style={{ width: 38, height: 22, borderRadius: 9999, border: 'none', cursor: 'pointer', position: 'relative', padding: 0,
            background: props.value ? 'var(--a2ui-accent)' : 'var(--a2ui-bg-elevated)', transition: 'background 150ms ease' }}>
          <span style={{ position: 'absolute', top: 2, left: props.value ? 18 : 2, width: 18, height: 18, borderRadius: 9999, background: '#fff', transition: 'left 150ms ease' }} />
        </button>
      </div>
    );
  }
  function Seg(props) {
    return <div style={{ display: 'inline-flex', background: 'var(--a2ui-bg-tertiary)', borderRadius: 8, padding: 2, gap: 2 }}>
      {props.opts.map(function (o) {
        var on = props.value === o[0];
        return <button key={o[0]} onClick={function () { props.onChange(o[0]); }} style={{ height: 24, padding: '0 10px', fontSize: 11, fontFamily: 'inherit',
          background: on ? 'var(--a2ui-bg-elevated)' : 'transparent', color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 6, cursor: 'pointer' }}>{o[1]}</button>;
      })}
    </div>;
  }

  ReactDOM.createRoot(document.getElementById('root')).render(<App />);
})();

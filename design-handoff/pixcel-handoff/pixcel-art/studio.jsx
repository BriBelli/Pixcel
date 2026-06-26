/* global React, PXART */
/* Pixcel Art Studio — chrome (nav rail, top bar), the agent (Pixcel AI), and the
   two layout directions: A "Drafting easel" (agent right rail) and
   B "Immersive atelier" (agent bottom dock). */
(function () {
  'use strict';
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;
  var Ic = PXART.Ic, ArtStore = PXART.ArtStore, CharMapTable = PXART.CharMapTable, STAGES = PXART.STAGES;

  var SUGGEST = ['owl', 'octopus girl', 'cactus', 'golden star', 'mushroom', 'dragon'];
  var RES = [16, 24, 32, 48, 64];

  function useWidth() {
    var w = useState(window.innerWidth); 
    useEffect(function () { var f = function () { w[1](window.innerWidth); }; window.addEventListener('resize', f); return function () { window.removeEventListener('resize', f); }; }, []);
    return w[0];
  }
  function fmtTime(s) { s = Math.floor(s); var m = Math.floor(s / 60); return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0'); }

  /* ───────────────── nav rail (the app-feature switcher) ───────────────── */
  function NavRail(props) {
    var logo = (window.__resources && window.__resources.logoMarkWhite) || 'assets/logo-mark-white.svg';
    var FEATURES = [
      { id: 'art', label: 'Art', icon: 'scribble', active: true },
      { id: 'image', label: 'Image', icon: 'image' },
      { id: 'video', label: 'Video', icon: 'panelRight' },
      { id: 'anim', label: 'Anim', icon: 'grid' },
    ];
    return (
      <div style={{ width: 56, flexShrink: 0, background: 'var(--a2ui-cool-950)', borderRight: '1px solid var(--pxs-border-subtle)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 4, zIndex: 30 }}>
        <div style={{ height: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
          <img src={logo} alt="Pixcel" style={{ height: 20, width: 'auto' }} onError={function (e) { e.target.style.display = 'none'; }} />
        </div>
        <div style={{ width: 26, height: 1, background: 'var(--pxs-border-subtle)', margin: '2px 0 6px' }} />
        {FEATURES.map(function (f) { return <NavBtn key={f.id} f={f} />; })}
        <div style={{ flex: 1 }} />
        <NavBtn f={{ id: 'assets', label: 'Assets · ' + props.savedCount, icon: 'layers' }} />
        <NavBtn f={{ id: 'tweaks', label: 'Tweaks', icon: 'sliders' }} onClick={props.onTweaks} on={props.tweaksOpen} />
      </div>
    );
  }
  function NavBtn(props) {
    var hv = useState(false); var f = props.f;
    var active = f.active || props.on;
    return (
      <button title={f.label} onClick={props.onClick}
        onMouseEnter={function () { hv[1](true); }} onMouseLeave={function () { hv[1](false); }}
        style={{ position: 'relative', width: 40, height: 40, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2,
          background: active ? 'var(--a2ui-bg-active)' : hv[0] ? 'var(--a2ui-bg-hover)' : 'transparent',
          color: active ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 9, cursor: 'pointer',
          transition: 'background 150ms ease, color 150ms ease' }}>
        {f.active && <span style={{ position: 'absolute', left: -8, top: '50%', transform: 'translateY(-50%)', width: 2.5, height: 20, borderRadius: 9999, background: 'var(--pxs-accent-focus)' }} />}
        <Ic name={f.icon} size={18} />
        <span style={{ fontSize: 8, fontWeight: 600, letterSpacing: '0.02em' }}>{f.label.split(' ')[0]}</span>
      </button>
    );
  }

  /* ───────────────── top bar ───────────────── */
  function TopBar(props) {
    var st = props.st;
    var saved = st.phase === 'saved';
    return (
      <div style={{ height: 46, flexShrink: 0, display: 'flex', alignItems: 'center', gap: 10, padding: '0 14px',
        borderBottom: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)', zIndex: 20 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)', whiteSpace: 'nowrap' }}>Pixcel Art</span>
        <span style={{ fontSize: 12, color: 'var(--a2ui-text-tertiary)', whiteSpace: 'nowrap' }}>Studio</span>
        <div style={{ width: 1, height: 20, background: 'var(--pxs-border-subtle)', margin: '0 4px' }} />
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 2 }}>
          <button title="Undo" disabled={!props.canUndo} onClick={props.onUndo} style={histBtn(props.canUndo)}><Ic name="undo" size={16} /></button>
          <button title="Redo" disabled={!props.canRedo} onClick={props.onRedo} style={histBtn(props.canRedo)}><Ic name="redo" size={16} /></button>
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--a2ui-text-tertiary)', marginLeft: 4, whiteSpace: 'nowrap' }}>
          <span style={{ width: 6, height: 6, borderRadius: 9999, background: saved ? 'var(--a2ui-success)' : 'var(--a2ui-text-disabled)' }} />
          {saved ? 'Saved to Assets' : st.running ? 'Working…' : 'Not saved yet'}
        </span>
        <div style={{ flex: 1 }} />
        {/* direction toggle — the layout comparison */}
        {!props.compact &&
          <Segmented value={props.dir} onChange={props.onDir} options={[{ id: 'easel', label: 'Easel' }, { id: 'atelier', label: 'Atelier' }]} />}
        <button title={props.theme === 'light' ? 'Switch to dark theme' : 'Switch to light theme'} onClick={props.onTheme} style={iconBtn()}><Ic name={props.theme === 'light' ? 'sun' : 'moon'} size={16} /></button>
      </div>
    );
  }
  function Segmented(props) {
    return (
      <div style={{ display: 'inline-flex', background: 'var(--a2ui-bg-tertiary)', borderRadius: 9, padding: 2, gap: 2 }}>
        {props.options.map(function (o) {
          var on = props.value === o.id;
          return <button key={o.id} onClick={function () { props.onChange(o.id); }}
            style={{ height: 28, padding: '0 13px', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
              background: on ? 'var(--a2ui-bg-elevated)' : 'transparent', color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-secondary)',
              border: 'none', borderRadius: 7, cursor: 'pointer', boxShadow: on ? 'var(--a2ui-shadow-sm)' : 'none', transition: 'all 150ms ease' }}>{o.label}</button>;
        })}
      </div>
    );
  }
  function iconBtn() { return { width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }; }
  function histBtn(on) { return { width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: on ? 'var(--a2ui-text-secondary)' : 'var(--a2ui-text-disabled)', border: 'none', borderRadius: 8, cursor: on ? 'pointer' : 'default', padding: 0, transition: 'color 150ms ease' }; }

  /* ───────────────── shared agent pieces ───────────────── */
  function PhaseBreadcrumb(props) {
    var st = props.st;
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        {STAGES.map(function (sname, i) {
          var done = st.stagesDone.indexOf(sname) >= 0, active = st.stageIdx === i;
          return (
            <React.Fragment key={sname}>
              {i > 0 && <Ic name="chevronRight" size={12} />}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontFamily: 'var(--a2ui-font-mono)', fontSize: 10.5, letterSpacing: '0.04em', fontWeight: 600,
                padding: '3px 8px', borderRadius: 6,
                background: active ? 'var(--pxs-accent-subtle)' : 'transparent',
                color: active ? 'var(--pxs-accent-text)' : done ? 'var(--a2ui-success)' : 'var(--a2ui-text-dim)' }}>
                {done && <Ic name="check" size={10} />}{sname}
              </span>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  function PhaseLine(props) {
    var st = props.st;
    var color = st.phase === 'done' || st.phase === 'saved' ? 'var(--a2ui-success)' : 'var(--pxs-accent-text)';
    var label = st.phase === 'designing' ? 'VISION' : st.phase === 'shaping' ? 'SHAPE · pass 1' : st.phase === 'refining' ? ('REFINE · pass ' + st.pass) : st.phase === 'resolving' ? 'QA' : st.phase === 'done' ? 'resolved' : st.phase === 'saved' ? 'saved to Assets' : '';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--a2ui-font-mono)', fontSize: 11.5, color: color, whiteSpace: 'nowrap' }}>
        <span className="pxart-pulse" style={{ width: 7, height: 7, borderRadius: 9999, background: 'currentColor' }} />
        <span style={{ fontWeight: 600 }}>{label}</span>
        <span style={{ color: 'var(--a2ui-text-tertiary)' }}>· {fmtTime(st.elapsed)}</span>
        {st.cost > 0 && <span style={{ color: 'var(--a2ui-text-tertiary)' }}>· ${st.cost.toFixed(2)}</span>}
        {(st.phase === 'done' || st.phase === 'saved') && <span style={{ color: 'var(--a2ui-text-tertiary)' }}>· {st.lastCells} cells</span>}
      </div>
    );
  }

  function Controls(props) {
    var st = props.st;
    if (st.running) {
      return (
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn kind="ghost" icon="pause" onClick={function () { }}>Pause</Btn>
          <Btn kind="danger" icon="x" onClick={function () { ArtStore.cancel(); }}>Cancel</Btn>
        </div>
      );
    }
    if (st.phase === 'done') {
      return (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <Btn kind="primary" icon="save" onClick={function () { ArtStore.save(); }}>Save</Btn>
          <Btn kind="ghost" icon="iterate" onClick={function () { ArtStore.iterate(); }}>Iterate</Btn>
          <Btn kind="ghost" icon="redo" onClick={function () { ArtStore.start(st.prompt); }}>Redo</Btn>
          <Btn kind="ghost" icon="x" onClick={function () { ArtStore.cancel(); }}>Cancel</Btn>
        </div>
      );
    }
    if (st.phase === 'saved') {
      return (
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--a2ui-success)' }}><Ic name="check" size={14} />Saved to Assets</span>
          <Btn kind="ghost" icon="sparkles" onClick={function () { ArtStore.patch({ phase: 'idle', label: 'READY', status: '' }); if (ArtStore.get) ; }}>New piece</Btn>
        </div>
      );
    }
    return null;
  }
  function Btn(props) {
    var hv = useState(false);
    var base = { display: 'inline-flex', alignItems: 'center', gap: 6, height: 32, padding: '0 12px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, border: 'none', borderRadius: 8, cursor: 'pointer', transition: 'all 150ms ease', whiteSpace: 'nowrap' };
    var sty;
    if (props.kind === 'primary') sty = { background: hv[0] ? 'var(--a2ui-accent-hover)' : 'var(--a2ui-accent)', color: 'var(--a2ui-text-inverse)' };
    else if (props.kind === 'danger') sty = { background: hv[0] ? 'var(--a2ui-error-bg)' : 'transparent', color: 'var(--a2ui-error)' };
    else sty = { background: hv[0] ? 'var(--a2ui-bg-hover)' : 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-primary)' };
    return (
      <button onClick={props.onClick} onMouseEnter={function () { hv[1](true); }} onMouseLeave={function () { hv[1](false); }} style={Object.assign({}, base, sty)}>
        {props.icon && <Ic name={props.icon} size={14} />}{props.children}
      </button>
    );
  }

  function CommissionInput(props) {
    var st = props.st;
    var tz = useState(st.prompt); var text = tz[0], setText = tz[1];
    useEffect(function () { if (st.phase === 'idle' || st.phase === 'saved') setText(st.prompt); }, [st.phase]);
    var ph = st.running ? 'Send live feedback to the artist… (e.g. “make the eyes bigger”)' : st.phase === 'done' ? 'Tell the artist a change to make to THIS piece…' : 'Describe a piece to sculpt live…';
    function go() {
      var v = (text || '').trim();
      if (st.running || st.phase === 'done') { /* feedback — flash, keep running */ return; }
      ArtStore.start(v || 'owl');
    }
    var idle = !st.running && st.phase !== 'done';
    return (
      <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, background: 'var(--a2ui-bg-input)', border: '1px solid var(--a2ui-border-default)',
        borderRadius: 12, padding: 8, transition: 'border-color 150ms ease' }}
        onFocusCapture={function (e) { e.currentTarget.style.borderColor = 'var(--a2ui-accent)'; e.currentTarget.style.boxShadow = '0 0 0 3px var(--a2ui-accent-subtle)'; }}
        onBlurCapture={function (e) { e.currentTarget.style.borderColor = 'var(--a2ui-border-default)'; e.currentTarget.style.boxShadow = 'none'; }}>
        <textarea value={text} onChange={function (e) { setText(e.target.value); if (idle) ArtStore.setPrompt(e.target.value); }}
          onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); go(); } }}
          rows={props.rows || 1} placeholder={ph}
          style={{ flex: 1, resize: 'none', background: 'transparent', border: 'none', outline: 'none', color: 'var(--a2ui-text-primary)',
            fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, padding: '5px 4px', maxHeight: 120 }} />
        <button onClick={go} title={idle ? 'Sculpt it' : 'Send'} style={{ width: 34, height: 34, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: 'var(--a2ui-accent)', color: 'var(--a2ui-text-inverse)', border: 'none', borderRadius: 9, cursor: 'pointer' }}>
          <Ic name={idle ? 'sparkles' : 'send'} size={16} />
        </button>
      </div>
    );
  }

  function Suggestions(props) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
        {SUGGEST.map(function (s) {
          return <button key={s} onClick={function () { ArtStore.setPrompt(s); ArtStore.start(s); }}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px', background: 'var(--a2ui-bg-tertiary)',
              color: 'var(--a2ui-text-secondary)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 9999, cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 12 }}
            onMouseEnter={function (e) { e.currentTarget.style.borderColor = 'var(--a2ui-border-strong)'; e.currentTarget.style.color = 'var(--a2ui-text-primary)'; }}
            onMouseLeave={function (e) { e.currentTarget.style.borderColor = 'var(--pxs-border-subtle)'; e.currentTarget.style.color = 'var(--a2ui-text-secondary)'; }}>
            <Ic name="sparkles" size={12} />{s}
          </button>;
        })}
      </div>
    );
  }

  function Settings(props) {
    var st = props.st, locked = st.running;
    function Row(p) {
      return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, opacity: locked ? 0.5 : 1, pointerEvents: locked ? 'none' : 'auto' }}>
          <span style={{ width: 92, flexShrink: 0, fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a2ui-text-tertiary)' }}>{p.label}</span>
          {p.children}
        </div>
      );
    }
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11 }}>
        <Row label="Resolution">
          <div style={{ display: 'inline-flex', gap: 3 }}>
            {RES.map(function (r) {
              var on = st.res === r;
              return <button key={r} onClick={function () { ArtStore.patch({ res: r }); }}
                style={{ minWidth: 30, height: 26, padding: '0 6px', fontFamily: 'var(--a2ui-font-mono)', fontSize: 11.5,
                  background: on ? 'var(--pxs-accent-subtle)' : 'transparent', color: on ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-secondary)',
                  border: '1px solid ' + (on ? 'var(--pxs-accent-focus)' : 'var(--pxs-border-subtle)'), borderRadius: 7, cursor: 'pointer' }}>{r}</button>;
            })}
          </div>
        </Row>
        <Row label="Aspect ratio"><Pill>{st.aspect}</Pill></Row>
        <Row label="Max revisions"><Pill mono>{st.maxRev}</Pill></Row>
        <Row label="Model">
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, height: 28, padding: '0 10px 0 7px', background: 'var(--a2ui-bg-tertiary)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 9999, fontSize: 12, color: 'var(--a2ui-text-primary)' }}>
            <ProviderDot provider="anthropic" />{st.model}<Ic name="chevronDown" size={13} />
          </span>
        </Row>
      </div>
    );
  }
  function Pill(props) {
    return <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 12px', background: 'var(--a2ui-bg-tertiary)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 9999, fontSize: 12, color: 'var(--a2ui-text-primary)', fontFamily: props.mono ? 'var(--a2ui-font-mono)' : 'inherit' }}>{props.children}</span>;
  }
  function ProviderDot(props) {
    return (
      <span style={{ width: 20, height: 20, borderRadius: 5, flexShrink: 0, overflow: 'hidden', background: 'var(--a2ui-bg-elevated)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={(window.__resources && window.__resources['pi_' + props.provider]) || ('assets/provider-icons/' + props.provider + '.ico')} alt="" width={14} height={14} style={{ objectFit: 'contain' }} onError={function (e) { e.target.style.display = 'none'; }} />
      </span>
    );
  }

  function BriefCard(props) {
    var st = props.st;
    var oz = useState(false); var open = oz[0], setOpen = oz[1];
    if (!st.brief) return null;
    return (
      <div style={{ border: '1px solid var(--pxs-border-subtle)', borderRadius: 10, background: 'var(--a2ui-bg-primary)', overflow: 'hidden' }}>
        <button onClick={function () { setOpen(!open); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '10px 12px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--a2ui-text-primary)' }}>
          <span style={{ color: 'var(--pxs-accent-text)', display: 'inline-flex' }}><Ic name="feather" size={14} /></span>
          <span style={{ fontSize: 12, fontWeight: 600 }}>Design brief</span>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>the committed vision</span>
          <div style={{ flex: 1 }} />
          <span style={{ color: 'var(--a2ui-text-tertiary)', transform: open ? 'rotate(0)' : 'rotate(-90deg)', transition: 'transform 150ms ease' }}><Ic name="chevronDown" size={14} /></span>
        </button>
        {open && <div style={{ padding: '0 12px 12px', fontFamily: 'var(--a2ui-font-mono)', fontSize: 11, lineHeight: 1.65, color: 'var(--a2ui-text-secondary)', whiteSpace: 'pre-wrap' }}>{st.brief}</div>}
      </div>
    );
  }

  function ThinkingPanel(props) {
    var st = props.st;
    var ref = useRef(null);
    useEffect(function () { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [st.thinking]);
    if (!st.thinking && !st.running) return null;
    return (
      <div style={{ border: '1px solid var(--pxs-border-subtle)', borderRadius: 10, background: 'var(--a2ui-bg-primary)', padding: '11px 13px', maxHeight: props.max || 132, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
          <span className="pxart-pulse" style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--pxs-accent-focus)' }} />
          <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', color: 'var(--a2ui-text-tertiary)' }}>THINKING</span>
        </div>
        <div ref={ref} className="ide-scroll" style={{ maxHeight: (props.max || 132) - 36, overflow: 'auto', fontSize: 12, fontStyle: 'italic', lineHeight: 1.6, color: 'var(--a2ui-text-secondary)' }}>
          {st.thinking}{st.running && <span className="pxart-cursor" />}
        </div>
      </div>
    );
  }

  function LiveLedger(props) {
    var st = props.st;
    var ref = useRef(null);
    var resolved = st.phase === 'done' || st.phase === 'saved';
    var hz = useState(false); var hovered = hz[0], setHovered = hz[1];
    useEffect(function () { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [st.log.length]);
    var dimmed = resolved && !hovered;
    return (
      <div onMouseEnter={function () { setHovered(true); }} onMouseLeave={function () { setHovered(false); }}
        style={{ position: 'absolute', top: 46, right: 14, bottom: 14, width: 188, display: 'flex', flexDirection: 'column',
        background: 'rgba(10,11,14,0.55)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 8, padding: '9px 10px', zIndex: 4,
        backdropFilter: 'blur(4px)', opacity: dimmed ? 0.18 : 1, transition: 'opacity 300ms cubic-bezier(0.22,1,0.36,1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ width: 5, height: 5, borderRadius: 9999, background: 'var(--a2ui-success)' }} />
          <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--a2ui-text-tertiary)' }}>LIVE · DATA</span>
        </div>
        <div ref={ref} className="ide-scroll" style={{ flex: 1, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
          {st.log.length === 0 && <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 10, color: 'var(--a2ui-text-dim)' }}>awaiting commission…</span>}
          {st.log.map(function (l, i) {
            var col = l.kind === 'ok' ? 'var(--a2ui-success)' : l.kind === 'note' ? 'var(--a2ui-warning)' : 'var(--pxs-accent-text)';
            return <div key={i} style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9.5, lineHeight: 1.5, color: col, display: 'flex', gap: 5 }}>
              <span style={{ opacity: 0.7 }}>◆</span><span>{l.text}</span>
            </div>;
          })}
        </div>
      </div>
    );
  }

  function RailLedger(props) {
    var st = props.st;
    var ref = useRef(null);
    useEffect(function () { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [st.log.length]);
    return (
      <div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 9 }}>
          <span className="pxart-pulse" style={{ width: 5, height: 5, borderRadius: 9999, background: 'var(--a2ui-success)' }} />
          <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9.5, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--a2ui-text-tertiary)' }}>LIVE · DATA</span>
        </div>
        <div ref={ref} className="ide-scroll" style={{ maxHeight: 168, overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 7 }}>
          {st.log.map(function (l, i) {
            var col = l.kind === 'ok' ? 'var(--a2ui-success)' : l.kind === 'note' ? 'var(--a2ui-warning)' : 'var(--pxs-accent-text)';
            return <div key={i} style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9.5, lineHeight: 1.5, color: col, display: 'flex', gap: 5 }}>
              <span style={{ opacity: 0.7 }}>◆</span><span>{l.text}</span>
            </div>;
          })}
        </div>
      </div>
    );
  }

  function StatusLine(props) {
    var st = props.st; if (!st.status) return null;
    var col = st.phase === 'done' ? 'var(--a2ui-success)' : st.phase === 'saved' ? 'var(--a2ui-success)' : 'var(--pxs-accent-text)';
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '12px 16px', fontFamily: 'var(--a2ui-font-mono)', fontSize: 12.5 }}>
        <span className="pxart-pulse" style={{ width: 7, height: 7, borderRadius: 9999, background: col }} />
        <span style={{ color: col }}>{st.status}</span>
        {(st.phase === 'done') && <Ic name="chevronRight" size={14} />}
      </div>
    );
  }

  /* ───────────────── Direction A · Drafting easel (agent right rail) ───────────────── */
  function EaselLayout(props) {
    var st = props.st;
    return (
      <div style={{ flex: 1, minWidth: 0, display: 'flex' }}>
        {/* center column */}
        <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', background: 'var(--pxs-bg-host)' }}>
          <CharMapTable rulers={props.rulers} maxCell={22} canvasStyle={props.canvasStyle} showCost></CharMapTable>
        </div>
        {/* agent rail */}
        <AgentRail st={st} ledger={props.ledger} />
      </div>
    );
  }

  function RequestTurn(props) {
    var st = props.st;
    var resolved = st.phase === 'done' || st.phase === 'saved';
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
        {/* the user's commission — chat history */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--a2ui-text-tertiary)' }}>You requested</span>
          <div style={{ maxWidth: '88%', background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-primary)',
            borderRadius: '13px 13px 4px 13px', padding: '9px 13px', fontSize: 13.5, lineHeight: 1.5, wordBreak: 'break-word' }}>
            {st.prompt}
          </div>
        </div>
        {/* the artisan's reply */}
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start' }}>
          <span style={{ marginTop: 1, color: 'var(--pxs-accent-text)', flexShrink: 0, display: 'inline-flex' }}><Ic name="sparkles" size={15} /></span>
          <div style={{ fontSize: 12.5, color: 'var(--a2ui-text-secondary)', lineHeight: 1.5 }}>
            {resolved
              ? 'Here’s your ' + st.prompt + ' — keep it, or tell me a change to make.'
              : 'On it — committing the vision, then sculpting it live on the table.' + (st.running ? ' Steer me anytime below.' : '')}
          </div>
        </div>
      </div>
    );
  }

  function AgentRail(props) {
    var st = props.st;
    var idle = st.phase === 'idle';
    var ledgerOn = props.ledger && !idle && st.log.length > 0;
    return (
      <div style={{ width: 348, flexShrink: 0, borderLeft: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)',
        display: 'flex', flexDirection: 'column', zIndex: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '14px 16px', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <span style={{ color: 'var(--pxs-accent-text)', display: 'inline-flex' }}><Ic name="sparkles" size={16} /></span>
          <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Pixcel AI</span>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>autonomous artisan</span>
        </div>

        <div className="ide-scroll" style={{ flex: 1, overflow: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 16 }}>
          {idle ? (
            <React.Fragment>
              <div>
                <div style={{ fontSize: 15, fontWeight: 600, color: 'var(--a2ui-text-primary)', marginBottom: 4 }}>Commission a piece</div>
                <div style={{ fontSize: 12.5, color: 'var(--a2ui-text-secondary)', lineHeight: 1.55 }}>Describe it — one word or a full brief. The artisan works out how to make it, then sculpts it live on the table.</div>
              </div>
              <CommissionInput st={st} rows={3} />
              <div>
                <div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a2ui-text-tertiary)', marginBottom: 9 }}>Try</div>
                <Suggestions />
              </div>
              <div style={{ height: 1, background: 'var(--pxs-border-subtle)' }} />
              <Settings st={st} />
            </React.Fragment>
          ) : (
            <React.Fragment>
              <RequestTurn st={st} />
              <PhaseLine st={st} />
              <Controls st={st} />
              <PhaseBreadcrumb st={st} />
              <BriefCard st={st} />
              <div style={{ height: 1, background: 'var(--pxs-border-subtle)' }} />
              <Settings st={st} />
            </React.Fragment>
          )}
        </div>

        {!idle &&
          <div style={{ padding: 14, borderTop: '1px solid var(--pxs-border-subtle)' }}>
            <CommissionInput st={st} rows={1} />
          </div>}
      </div>
    );
  }

  /* ───────────────── Direction B · Immersive atelier (agent bottom dock) ───────────────── */
  function AtelierLayout(props) {
    var st = props.st;
    var idle = st.phase === 'idle';
    var floats = !props.compact;
    return (
      <div style={{ flex: 1, minWidth: 0, position: 'relative', background: 'var(--pxs-bg-host)', display: 'flex', flexDirection: 'column' }}>
        <CharMapTable rulers={props.rulers} maxCell={26} canvasStyle={props.canvasStyle} compact={props.compact} slotMeta bottomInset={props.compact ? 132 : 162} showCost>
          {/* floating HUD telemetry */}
          {!idle && st.phase !== 'done' && st.phase !== 'saved' &&
            <div style={{ position: 'absolute', top: 14, left: '50%', transform: 'translateX(-50%)', zIndex: 5,
              background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--pxs-glass-border)', borderRadius: 10, padding: '8px 12px' }}>
              <PhaseBreadcrumb st={st} />
            </div>}
          {floats && st.running && st.thinking && props.canvasStyle !== 'matrix' &&
            <div style={{ position: 'absolute', left: 16, bottom: 16, width: 320, maxWidth: '40%', zIndex: 5,
              background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)',
              border: '1px solid var(--pxs-glass-border)', borderRadius: 12, padding: 0, overflow: 'hidden' }}>
              <ThinkingPanel st={st} max={150} />
            </div>}
          {floats && st.running && st.log.length > 0 && props.canvasStyle !== 'matrix' &&
            <div style={{ position: 'absolute', right: 16, bottom: 16, width: 210, zIndex: 5 }}>
              <LedgerFloat st={st} />
            </div>}
        </CharMapTable>

        {/* commission dock */}
        <CommissionDock st={st} />
      </div>
    );
  }
  function LedgerFloat(props) {
    var st = props.st;
    var last = st.log.slice(-3);
    return (
      <div style={{ background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid var(--pxs-glass-border)', borderRadius: 12, padding: '10px 12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 7 }}>
          <span style={{ width: 5, height: 5, borderRadius: 9999, background: 'var(--a2ui-success)' }} />
          <span style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9, fontWeight: 600, letterSpacing: '0.1em', color: 'var(--a2ui-text-tertiary)' }}>LIVE · DATA</span>
        </div>
        {last.map(function (l, i) {
          var col = l.kind === 'ok' ? 'var(--a2ui-success)' : l.kind === 'note' ? 'var(--a2ui-warning)' : 'var(--pxs-accent-text)';
          return <div key={i} style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 9.5, lineHeight: 1.5, color: col, marginBottom: 4 }}>◆ {l.text}</div>;
        })}
      </div>
    );
  }
  function CommissionDock(props) {
    var st = props.st;
    var idle = st.phase === 'idle';
    var done = st.phase === 'done';
    var saved = st.phase === 'saved';
    var ez = useState(false); var exp = ez[0], setExp = ez[1];
    var shell = { background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
      border: '1px solid var(--pxs-glass-border)', boxShadow: 'var(--a2ui-shadow-lg)' };
    return (
      <div style={{ position: 'absolute', left: '50%', bottom: 20, transform: 'translateX(-50%)', width: 'min(640px, calc(100% - 40px))', zIndex: 15, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {/* expandable panel (brief / settings / try) */}
        {exp &&
          <div style={Object.assign({ borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }, shell)}>
            {idle ? <React.Fragment><div style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.05em', textTransform: 'uppercase', color: 'var(--a2ui-text-tertiary)' }}>Try</div><Suggestions /><div style={{ height: 1, background: 'var(--pxs-border-subtle)' }} /><Settings st={st} /></React.Fragment>
              : <React.Fragment><BriefCard st={st} /><Settings st={st} /></React.Fragment>}
          </div>}

        {/* end-of-run actions — appear ONLY when the piece is finished */}
        {done &&
          <div style={Object.assign({ borderRadius: 14, padding: 10, display: 'flex', alignItems: 'center', gap: 8 }, shell)}>
            <Btn kind="primary" icon="save" onClick={function () { ArtStore.save(); }}>Save to Assets</Btn>
            <Btn kind="ghost" icon="iterate" onClick={function () { ArtStore.iterate(); }}>Iterate</Btn>
            <Btn kind="ghost" icon="redo" onClick={function () { ArtStore.start(st.prompt); }}>Redo</Btn>
            <div style={{ flex: 1 }} />
            <button onClick={function () { ArtStore.cancel(); }} title="Dismiss" style={{ width: 32, height: 32, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 8, cursor: 'pointer' }}><Ic name="x" size={16} /></button>
          </div>}

        {/* saved confirmation */}
        {saved &&
          <div style={Object.assign({ borderRadius: 14, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }, shell)}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--a2ui-success)' }}><Ic name="check" size={15} />Saved to Assets</span>
            <div style={{ flex: 1 }} />
            <Btn kind="ghost" icon="sparkles" onClick={function () { ArtStore.patch({ phase: 'idle', label: 'READY', status: '' }); }}>New piece</Btn>
          </div>}

        {/* the prompt bar — minimal: a thin status strip + the input */}
        <div style={Object.assign({ borderRadius: 16, padding: 12, boxShadow: 'var(--a2ui-shadow-xl)' }, shell)}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 9 }}>
            {idle
              ? <React.Fragment>
                  <span style={{ color: 'var(--pxs-accent-text)', display: 'inline-flex' }}><Ic name="sparkles" size={15} /></span>
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Pixcel AI</span>
                  <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-tertiary)' }}>autonomous artisan</span>
                </React.Fragment>
              : <React.Fragment>
                  <PhaseLineCompact st={st} />
                  <span title={st.prompt} style={{ fontSize: 12, color: 'var(--a2ui-text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 200 }}>“{st.prompt}”</span>
                </React.Fragment>}
            <div style={{ flex: 1 }} />
            {st.running &&
              <button onClick={function () { ArtStore.cancel(); }} title="Stop" style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 11px', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, background: 'transparent', color: 'var(--a2ui-error)', border: 'none', borderRadius: 8, cursor: 'pointer' }}><Ic name="x" size={14} />Stop</button>}
            <button onClick={function () { setExp(!exp); }} title={exp ? 'Collapse' : 'Brief & settings'} style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: exp ? 'var(--a2ui-bg-active)' : 'transparent', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer' }}>
              <Ic name={exp ? 'chevronDown' : 'sliders'} size={15} />
            </button>
          </div>
          <CommissionInput st={st} rows={1} />
        </div>
      </div>
    );
  }
  function PhaseLineCompact(props) {
    var st = props.st;
    var color = st.phase === 'done' || st.phase === 'saved' ? 'var(--a2ui-success)' : 'var(--pxs-accent-text)';
    var label = st.phase === 'designing' ? 'VISION' : st.phase === 'shaping' ? 'SHAPE' : st.phase === 'refining' ? ('REFINE p' + st.pass) : st.phase === 'resolving' ? 'QA' : st.phase === 'done' ? 'done' : 'kept';
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7, fontFamily: 'var(--a2ui-font-mono)', fontSize: 11, color: color, marginLeft: 4 }}>
        <span className="pxart-pulse" style={{ width: 6, height: 6, borderRadius: 9999, background: 'currentColor' }} />
        {label}<span style={{ color: 'var(--a2ui-text-tertiary)' }}>· {fmtTime(st.elapsed)}{st.cost > 0 ? ' · $' + st.cost.toFixed(2) : ''}</span>
      </span>
    );
  }

  window.PXARTStudio = {
    NavRail: NavRail, TopBar: TopBar, EaselLayout: EaselLayout, AtelierLayout: AtelierLayout,
    AgentRail: AgentRail, useWidth: useWidth, CommissionInput: CommissionInput, Suggestions: Suggestions,
    PhaseLine: PhaseLine, Controls: Controls, PhaseBreadcrumb: PhaseBreadcrumb, Settings: Settings,
    ThinkingPanel: ThinkingPanel, StatusLine: StatusLine,
  };
})();

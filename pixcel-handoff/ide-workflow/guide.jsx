/* global React, IDEIcon, PGIcon, IDEProviderDot */
/* Pixcel · Image IDE — Prompt Guide (model REFLECTION) + History panels */
(function () {
  'use strict';
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* color-coded formula template: [Subject] + [Action] + … */
  function FormulaLine(props) {
    return (
      <div style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 12, lineHeight: 1.7 }}>
        {props.parts.map(function (p, i) {
          return (
            <React.Fragment key={p.id}>
              {i > 0 && <span style={{ color: 'var(--a2ui-text-disabled)' }}> + </span>}
              <span style={{ color: p.color }}>[{p.label}]</span>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  /* ════════════ PROMPT GUIDE PANEL — reflects the selected model ════════════ */
  function GuidePanel(props) {
    var model = props.model, a = props.analysis;
    function sFor(id) { return a.parts.find(function (s) { return s.id === id; }); }
    return (
      <div className="ide-scroll" style={{ height: '100%', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>

        {/* model card */}
        <div style={card()}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <IDEProviderDot provider={model.provider} size={20} box={30} />
            <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3 }}>
              <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{model.name}</span>
              <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>{model.vendor} · {model.kind}</span>
            </div>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--a2ui-text-tertiary)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--a2ui-success)' }} />live
            </span>
          </div>
          <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--a2ui-text-secondary)' }}>{model.tagline}</p>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {model.specs.map(function (s, i) {
              return <span key={i} style={{ fontSize: 11, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-secondary)',
                background: 'var(--a2ui-bg-tertiary)', borderRadius: 9999, padding: '3px 10px', whiteSpace: 'nowrap' }}>{s}</span>;
            })}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 7, marginTop: 2 }}>
            {model.strengths.map(function (st, i) {
              return (
                <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--a2ui-success)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><IDEIcon name="check" size={13} /></span>
                  <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--a2ui-text-secondary)' }}>{st}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* the five-part formula it rewards */}
        <div style={card()}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>The five-part formula</span>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-secondary)' }}>{model.intro}</p>
          </div>
          <FormulaLine parts={model.parts} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2, marginTop: 2 }}>
            {model.parts.map(function (p) { return <PartRow key={p.id} part={p} s={sFor(p.id)} note={a.notes[p.id]} />; })}
          </div>
        </div>

        {/* live read on the current build */}
        <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '12px 13px', borderRadius: 12,
          background: 'var(--a2ui-accent-subtle)' }}>
          <span style={{ color: 'var(--pxs-accent-text)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><IDEIcon name="wand" size={15} /></span>
          <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-primary)' }}>
            {liveTip(a)}
          </p>
        </div>

        <p style={{ margin: 0, fontSize: 10.5, color: 'var(--a2ui-text-dim)', textAlign: 'center' }}>{model.source}</p>
      </div>
    );
  }

  function liveTip(a) {
    var missing = a.parts.filter(function (s) { return !s.present; });
    if (a.overall === 0) return 'Reflecting ' + a.componentsTotal + ' parts. Fill them in Build and each lights up here with a live read.';
    if (missing.length) {
      var names = missing.map(function (s) { return s.label.toLowerCase(); });
      return 'You\u2019re missing ' + listJoin(names) + '. Adding ' + (missing.length > 1 ? 'them' : 'it') + ' is your biggest lift before you spend a run.';
    }
    var weakest = a.parts.slice().sort(function (x, y) { return x.score - y.score; })[0];
    return 'All five parts present. Your ' + weakest.label.toLowerCase() + ' is the thinnest — sharpen it for a cleaner result.';
  }
  function listJoin(arr) {
    if (arr.length === 1) return arr[0];
    if (arr.length === 2) return arr[0] + ' and ' + arr[1];
    return arr.slice(0, -1).join(', ') + ', and ' + arr[arr.length - 1];
  }

  function PartRow(props) {
    var p = props.part, s = props.s;
    var op = useState(false); var open = op[0], setOpen = op[1];
    return (
      <div>
        <button onClick={function () { setOpen(!open); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px',
            background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
          <span style={{ color: p.color, display: 'inline-flex', flexShrink: 0 }}><PGIcon name={p.icon} size={17} /></span>
          <span style={{ flex: 1, minWidth: 0 }}>
            <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--a2ui-text-primary)' }}>{p.label}</span>
            {!open && <span style={{ display: 'block', fontSize: 11.5, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.4, marginTop: 1,
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.def}</span>}
          </span>
          <ReflectPill s={s} />
          <span style={{ color: 'var(--a2ui-text-tertiary)', display: 'inline-flex', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
            <IDEIcon name="chevronDown" size={15} />
          </span>
        </button>
        {open &&
          <div style={{ padding: '0 4px 14px 29px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.55, color: 'var(--a2ui-text-secondary)' }}>{p.blurb}</p>
            {/* live binding — the user's actual input for this part */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 600, letterSpacing: '0.5px',
                textTransform: 'uppercase', color: 'var(--a2ui-text-dim)' }}>
                <span style={{ width: 5, height: 5, borderRadius: 9999, background: s.present ? p.color : 'var(--a2ui-border-strong)' }} />Your input
              </span>
              <div style={{ fontSize: 12, fontFamily: 'var(--a2ui-font-mono)', lineHeight: 1.5, borderRadius: 8, padding: '9px 11px',
                background: s.present ? 'var(--a2ui-cool-950)' : 'transparent',
                color: s.present ? p.color : 'var(--a2ui-text-tertiary)',
                border: s.present ? '1px solid transparent' : '1px dashed var(--a2ui-border-default)', fontStyle: s.present ? 'normal' : 'italic' }}>
                {s.present ? s.value : 'Not added yet — fill it in Build'}
              </div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--a2ui-text-dim)' }}>Reference example</span>
              <div style={{ fontSize: 11.5, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-tertiary)', background: 'var(--a2ui-cool-950)',
                borderRadius: 8, padding: '9px 11px', lineHeight: 1.5 }}>{p.example}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
              background: s.present ? 'var(--a2ui-success-bg)' : 'var(--a2ui-warning-bg)' }}>
              <span style={{ color: s.present ? 'var(--a2ui-success)' : 'var(--a2ui-warning)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}>
                <IDEIcon name={s.present ? 'sparkles' : 'info'} size={14} />
              </span>
              <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-primary)' }}>{props.note}</span>
            </div>
          </div>}
      </div>
    );
  }
  function ReflectPill(props) {
    var s = props.s;
    if (!s.present) return <span style={pillStyle('var(--a2ui-warning)', 'var(--a2ui-warning-bg)')}>Missing</span>;
    if (s.score >= 18) return <span style={pillStyle('var(--a2ui-success)', 'var(--a2ui-success-bg)')}>Strong</span>;
    return <span style={pillStyle('var(--a2ui-warning)', 'var(--a2ui-warning-bg)')}>Thin</span>;
  }
  function pillStyle(c, b) {
    return { fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, color: c, background: b,
      textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' };
  }

  /* ════════════ HISTORY PANEL — versions + edit composer ════════════ */
  function HistoryPanel(props) {
    var versions = [
      { id: 'v3', label: 'Lower the visor, cooler grade', time: '3:58 PM', active: true },
      { id: 'v2', label: 'Add 3/4 + back views', time: '3:54 PM' },
      { id: 'v1', label: 'Initial · Nano Banana Pro', time: '3:50 PM' },
    ];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        <div className="ide-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <span style={{ fontSize: 10.5, fontWeight: 600, color: 'var(--a2ui-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Versions</span>
          {versions.map(function (v) {
            return (
              <button key={v.id} style={{ display: 'flex', alignItems: 'center', gap: 11, padding: 9, textAlign: 'left',
                background: v.active ? 'var(--a2ui-accent-subtle)' : 'transparent', border: '1px solid ' + (v.active ? 'transparent' : 'var(--pxs-border-subtle)'),
                borderRadius: 10, cursor: 'pointer', fontFamily: 'inherit' }}
                onMouseEnter={function (e) { if (!v.active) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
                onMouseLeave={function (e) { if (!v.active) e.currentTarget.style.background = 'transparent'; }}>
                <span style={{ width: 38, height: 38, borderRadius: 7, flexShrink: 0, background: 'var(--a2ui-cool-800)',
                  display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: 'var(--a2ui-text-dim)' }}>
                  <IDEIcon name="image" size={16} />
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--a2ui-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{v.label}</span>
                  <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', fontFamily: 'var(--a2ui-font-mono)' }}>{v.id} · {v.time}</span>
                </span>
                {v.active && <span style={{ color: 'var(--pxs-accent-text)', display: 'inline-flex' }}><IDEIcon name="check" size={15} /></span>}
              </button>
            );
          })}
        </div>
        <EditComposer />
      </div>
    );
  }

  function EditComposer() {
    var mo = useState('Agent'); var mode = mo[0], setMode = mo[1];
    var tx = useState(''); var val = tx[0], setVal = tx[1];
    var ref = useRef(null);
    useEffect(function () { var el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(110, el.scrollHeight) + 'px'; }, [val]);
    return (
      <div style={{ flexShrink: 0, padding: 12, borderTop: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)' }}>
        <div style={{ background: 'var(--a2ui-bg-input)', border: '1px solid var(--a2ui-border-default)', borderRadius: 12, padding: 8 }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6 }}>
            <button style={composerIcon()}><IDEIcon name="paperclip" size={16} /></button>
            <textarea ref={ref} value={val} rows={1} placeholder={mode === 'Agent' ? 'Describe an edit — “lower the visor, cool the grade”' : 'Ask about this image…'}
              onChange={function (e) { setVal(e.target.value); }}
              style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', resize: 'none', fontFamily: 'inherit',
                fontSize: 13, lineHeight: 1.5, color: 'var(--a2ui-text-primary)', padding: '6px 2px', maxHeight: 110 }} />
            <button title="Send" style={{ width: 32, height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              borderRadius: 9, border: 'none', cursor: 'pointer', background: val.trim() ? 'var(--a2ui-accent)' : 'var(--a2ui-bg-elevated)',
              color: val.trim() ? 'var(--a2ui-text-inverse)' : 'var(--a2ui-text-tertiary)', transition: 'background 150ms ease' }}>
              <IDEIcon name="send" size={15} />
            </button>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6 }}>
            <div style={{ display: 'inline-flex', background: 'var(--a2ui-cool-950)', borderRadius: 9999, padding: 2, gap: 2 }}>
              {['Ask', 'Agent'].map(function (m) {
                var on = mode === m;
                return (
                  <button key={m} onClick={function () { setMode(m); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '4px 11px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500, background: on ? 'var(--a2ui-bg-elevated)' : 'transparent',
                      color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)', transition: 'all 150ms ease' }}>
                    <IDEIcon name={m === 'Agent' ? 'bot' : 'message'} size={13} />{m}
                  </button>
                );
              })}
            </div>
            <div style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--a2ui-text-dim)' }}>Edits the selected frame</span>
          </div>
        </div>
      </div>
    );
  }
  function composerIcon() {
    return { width: 32, height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: 'transparent', color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 9, cursor: 'pointer', padding: 0 };
  }

  function card() {
    return { background: 'var(--a2ui-bg-primary)', borderRadius: 14, padding: 16, display: 'flex', flexDirection: 'column', gap: 12 };
  }

  Object.assign(window, { IDEGuidePanel: GuidePanel, IDEHistoryPanel: HistoryPanel });
})();

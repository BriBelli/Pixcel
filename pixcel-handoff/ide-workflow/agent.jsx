/* global React, IDEIcon, IDEProviderDot, PG */
/* Pixcel · Image IDE — IDE-level Agent dock (Cursor / Copilot pattern).
   A level ABOVE the focused image prompt: it reads the whole project — the
   reference sheet, every view, the canonical prompt, the model set — and runs
   trivial→advanced Ask (Q&A) and Agent (multi-step, tool-using) requests. */
(function () {
  'use strict';
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* reasoning models that can drive the agent (distinct from image models) */
  var BRAINS = [
    { id: 'claude', name: 'Claude Opus 4.6', provider: 'anthropic', vendor: 'Anthropic' },
    { id: 'gemini3', name: 'Gemini 3 Pro', provider: 'gemini', vendor: 'Google' },
    { id: 'gpt', name: 'GPT-5.1', provider: 'gpt', vendor: 'OpenAI' },
  ];

  /* ─────────── small pieces ─────────── */
  function Spinner(props) {
    return <span className="pxs-spin" style={{ display: 'inline-flex', color: props.color || 'var(--pxs-accent-text)' }}><IDEIcon name="loader" size={props.size || 14} /></span>;
  }

  function ContextChip(props) {
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, height: 24, padding: '0 8px 0 7px',
        background: 'var(--a2ui-bg-tertiary)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 9999,
        fontSize: 11, color: 'var(--a2ui-text-secondary)', whiteSpace: 'nowrap', maxWidth: 168 }}>
        <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', flexShrink: 0 }}>{props.icon}</span>
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{props.children}</span>
        {props.removable &&
          <button style={{ display: 'inline-flex', background: 'transparent', border: 'none', color: 'var(--a2ui-text-tertiary)',
            cursor: 'pointer', padding: 0, opacity: 0.7, flexShrink: 0 }}><IDEIcon name="x" size={11} /></button>}
      </span>
    );
  }

  /* ─────────── thread blocks ─────────── */
  function UserMsg(props) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, alignItems: 'flex-end' }}>
        <div style={{ maxWidth: '92%', background: 'var(--a2ui-bg-tertiary)', borderRadius: 12, borderBottomRightRadius: 5,
          padding: '9px 12px', fontSize: 13, lineHeight: 1.5, color: 'var(--a2ui-text-primary)' }}>
          {props.children}
          {props.context &&
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 8 }}>{props.context}</div>}
        </div>
      </div>
    );
  }

  function AsstHead(props) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <IDEProviderDot provider={props.brain.provider} size={14} box={22} />
        <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{props.brain.name.split(' ')[0]}</span>
        <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
          color: props.mode === 'Agent' ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)',
          background: props.mode === 'Agent' ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-bg-elevated)',
          padding: '2px 7px', borderRadius: 9999 }}>{props.mode}</span>
        <div style={{ flex: 1 }} />
        <span style={{ fontSize: 11, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)' }}>{props.time}</span>
      </div>
    );
  }

  function Para(props) {
    return <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--a2ui-text-secondary)' }}>{props.children}</p>;
  }

  /* multi-step agent plan — pending / running / done rows */
  function Plan(props) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', borderRadius: 11, border: '1px solid var(--pxs-border-subtle)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '8px 12px', background: 'var(--a2ui-cool-900)', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)' }}><IDEIcon name="target" size={13} /></span>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a2ui-text-secondary)' }}>Plan</span>
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10.5, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)' }}>{props.done}/{props.steps.length}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {props.steps.map(function (s, i) {
            var running = s.state === 'run';
            return (
              <div key={i} style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '9px 12px',
                background: running ? 'var(--a2ui-bg-tertiary)' : 'transparent', borderTop: i ? '1px solid var(--pxs-border-subtle)' : 'none' }}>
                <span style={{ display: 'inline-flex', flexShrink: 0, marginTop: 1,
                  color: s.state === 'done' ? 'var(--a2ui-success)' : running ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-disabled)' }}>
                  {s.state === 'done' ? <IDEIcon name="check" size={15} /> : running ? <Spinner size={14} /> : <IDEIcon name="circle" size={14} />}
                </span>
                <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                  <span style={{ fontSize: 12.5, color: s.state === 'pending' ? 'var(--a2ui-text-tertiary)' : 'var(--a2ui-text-primary)' }}>{s.title}</span>
                  {s.sub && <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.4 }}>{s.sub}</span>}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  /* collapsible tool call */
  function ToolRow(props) {
    var op = useState(!!props.open); var open = op[0], setOpen = op[1];
    var running = props.running;
    return (
      <div style={{ borderRadius: 10, border: '1px solid var(--pxs-border-subtle)', overflow: 'hidden', background: 'var(--a2ui-bg-primary)' }}>
        <button onClick={function () { setOpen(!open); }}
          style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 11px', background: 'transparent',
            border: 'none', cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left' }}>
          <span style={{ display: 'inline-flex', flexShrink: 0, color: running ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)' }}>
            {running ? <Spinner size={14} /> : <IDEIcon name={props.icon || 'code'} size={14} />}
          </span>
          <span style={{ fontSize: 12, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-primary)' }}>{props.name}</span>
          {props.arg && <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{props.arg}</span>}
          <div style={{ flex: 1 }} />
          <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.3px', textTransform: 'uppercase', color: running ? 'var(--pxs-accent-text)' : 'var(--a2ui-success)' }}>{running ? 'running' : 'done'}</span>
          <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', transform: open ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}><IDEIcon name="chevronDown" size={14} /></span>
        </button>
        {open &&
          <div style={{ padding: '0 11px 11px', display: 'flex', flexDirection: 'column', gap: 9 }}>
            {props.input &&
              <pre style={{ margin: 0, fontFamily: 'var(--a2ui-font-mono)', fontSize: 11, lineHeight: 1.6, color: 'var(--a2ui-text-secondary)',
                background: 'var(--a2ui-cool-950)', borderRadius: 8, padding: '9px 11px', whiteSpace: 'pre-wrap', overflowX: 'auto' }}>{props.input}</pre>}
            {props.children}
          </div>}
      </div>
    );
  }

  /* generated-result tiles (the agent extended the sheet) */
  function ResultGrid(props) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 7 }}>
        {props.tiles.map(function (t, i) {
          return (
            <div key={i} style={{ position: 'relative', aspectRatio: '3 / 4', borderRadius: 8, overflow: 'hidden',
              background: 'var(--a2ui-cool-800)', boxShadow: '0 0 0 1px var(--pxs-border-subtle)',
              display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: 'var(--a2ui-text-dim)', display: 'inline-flex' }}><IDEIcon name="image" size={16} /></span>
              <span style={{ position: 'absolute', left: 5, bottom: 5, fontSize: 9.5, fontWeight: 500, color: 'var(--a2ui-text-secondary)',
                background: 'var(--a2ui-glass-dark)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)',
                border: '1px solid var(--pxs-glass-border)', borderRadius: 9999, padding: '2px 7px' }}>{t}</span>
              <span style={{ position: 'absolute', right: 5, top: 5, color: 'var(--a2ui-success)', display: 'inline-flex' }}><IDEIcon name="check" size={12} /></span>
            </div>
          );
        })}
      </div>
    );
  }

  function StreamLine(props) {
    return (
      <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6, color: 'var(--a2ui-text-secondary)' }}>
        {props.children}<span className="pxs-cursor" />
      </p>
    );
  }

  function nowTime() {
    var d = new Date(), hr = d.getHours(), mn = d.getMinutes(), ap = hr < 12 ? 'AM' : 'PM';
    hr = hr % 12 || 12;
    return hr + ':' + (mn < 10 ? '0' + mn : mn) + ' ' + ap;
  }
  function asstReply(mode) {
    return mode === 'Agent'
      ? 'Opened the prompt builder with a starting character prompt. Refine the subject and anchors, then generate the sheet.'
      : 'The project has one reference sheet and a populated prompt. Nano Banana Pro is set as the primary model for consistency.';
  }

  /* ═══════════ the agent brain picker ═══════════ */
  function BrainPicker(props) {
    var op = useState(false); var open = op[0], setOpen = op[1];
    var ref = useRef(null);
    useEffect(function () {
      if (!open) return;
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
      document.addEventListener('mousedown', onDoc);
      return function () { document.removeEventListener('mousedown', onDoc); };
    }, [open]);
    var cur = props.value;
    return (
      <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
        <button onClick={function () { setOpen(!open); }}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, height: 28, padding: '0 8px', background: 'transparent',
            border: 'none', borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit', color: 'var(--a2ui-text-secondary)' }}
          onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}>
          <IDEProviderDot provider={cur.provider} size={13} box={18} />
          <span style={{ fontSize: 11.5, fontWeight: 500, whiteSpace: 'nowrap' }}>{cur.name.split(' ')[0]}</span>
          <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-dim)' }}><IDEIcon name="chevronDown" size={12} /></span>
        </button>
        {open &&
          <div style={{ position: 'absolute', bottom: '100%', left: 0, marginBottom: 6, width: 192, zIndex: 90,
            background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
            border: '1px solid var(--pxs-glass-border)', borderRadius: 12, boxShadow: 'var(--a2ui-shadow-lg)', padding: 5 }}>
            {BRAINS.map(function (b) {
              var on = b.id === cur.id;
              return (
                <button key={b.id} onClick={function () { props.onChange(b); setOpen(false); }}
                  style={{ display: 'flex', alignItems: 'center', gap: 9, width: '100%', padding: '7px 8px', borderRadius: 8, border: 'none',
                    cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left', background: on ? 'var(--a2ui-accent-subtle)' : 'transparent' }}
                  onMouseEnter={function (e) { if (!on) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
                  onMouseLeave={function (e) { if (!on) e.currentTarget.style.background = 'transparent'; }}>
                  <IDEProviderDot provider={b.provider} size={15} box={24} />
                  <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                    <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--a2ui-text-primary)', whiteSpace: 'nowrap' }}>{b.name}</span>
                    <span style={{ fontSize: 10.5, color: 'var(--a2ui-text-tertiary)' }}>{b.vendor}</span>
                  </span>
                  {on && <span style={{ color: 'var(--pxs-accent-text)', display: 'inline-flex' }}><IDEIcon name="check" size={14} /></span>}
                </button>
              );
            })}
          </div>}
      </span>
    );
  }

  /* ═══════════ intro state — empty greeting + suggested asks ═══════════ */
  var SUGGESTIONS = [
    { mode: 'Agent', icon: 'layers', text: 'Build a consistent character across several poses' },
    { mode: 'Ask', icon: 'message', text: 'Which model is best for keeping a subject consistent?' },
    { mode: 'Agent', icon: 'contrast', text: 'Restyle a set toward a cooler grade' },
  ];
  function SuggestRow(props) {
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var s = props.item;
    return (
      <button onClick={function () { props.onPick(s); }}
        onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%', padding: '9px 11px', borderRadius: 10,
          textAlign: 'left', cursor: 'pointer', fontFamily: 'inherit',
          background: hover ? 'var(--a2ui-bg-secondary)' : 'var(--a2ui-bg-tertiary)',
          border: '1px solid ' + (hover ? 'var(--a2ui-border-default)' : 'transparent'),
          transition: 'background 150ms ease, border-color 150ms ease' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 26, height: 26, flexShrink: 0, borderRadius: 7,
          background: hover ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-bg-elevated)',
          color: hover ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)', transition: 'background 150ms ease, color 150ms ease' }}>
          <IDEIcon name={s.icon} size={14} />
        </span>
        <span style={{ flex: 1, minWidth: 0, fontSize: 12.5, lineHeight: 1.4, color: 'var(--a2ui-text-secondary)' }}>{s.text}</span>
        <span style={{ flexShrink: 0, fontSize: 9, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
          color: s.mode === 'Agent' ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-dim)' }}>{s.mode}</span>
      </button>
    );
  }
  function Intro(props) {
    return (
      <div className="ide-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', padding: '24px 16px', textAlign: 'center' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 52, height: 52, borderRadius: 14,
          background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-tertiary)' }}><IDEIcon name="bot" size={26} /></span>
        <p style={{ margin: '15px 0 0', fontSize: 14, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>How can I help with this project?</p>
        <p style={{ margin: '6px 0 0', fontSize: 12.5, lineHeight: 1.55, color: 'var(--a2ui-text-tertiary)', maxWidth: 270 }}>
          Ask about the work, or hand off a task — I read the whole project.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 20, width: '100%', maxWidth: 300 }}>
          {SUGGESTIONS.map(function (s, i) { return <SuggestRow key={i} item={s} onPick={props.onPick} />; })}
        </div>
      </div>
    );
  }

  /* ═══════════ composer ═══════════ */
  function Composer(props) {
    var mode = props.mode, setMode = props.onMode;
    var val = props.value, setVal = props.onChange;
    var br = useState(BRAINS[0]); var brain = br[0], setBrain = br[1];
    var ref = useRef(null);
    useEffect(function () { var el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(130, Math.max(40, el.scrollHeight)) + 'px'; }, [val]);
    function fire() { if (val.trim() && props.onSubmit) props.onSubmit(); }

    return (
      <div style={{ flexShrink: 0, padding: 12, borderTop: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)' }}>
        <div style={{ background: 'var(--a2ui-bg-input)', border: '1px solid var(--a2ui-border-default)', borderRadius: 12, padding: 9 }}>
          {/* @context row */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginBottom: 8 }}>
            <button style={{ display: 'inline-flex', alignItems: 'center', gap: 4, height: 24, padding: '0 8px', background: 'transparent',
              border: '1px dashed var(--a2ui-border-default)', borderRadius: 9999, color: 'var(--a2ui-text-tertiary)', cursor: 'pointer',
              fontFamily: 'inherit', fontSize: 11 }}>
              <IDEIcon name="atSign" size={12} />Add context
            </button>
          </div>

          <textarea ref={ref} value={val} rows={1}
            placeholder={mode === 'Agent' ? 'Ask the agent to act on the whole project…' : 'Ask anything about this project…'}
            onChange={function (e) { setVal(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); fire(); } }}
            style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none', resize: 'none',
              fontFamily: 'inherit', fontSize: 13, lineHeight: 1.5, color: 'var(--a2ui-text-primary)', padding: '2px 2px 0', maxHeight: 130 }} />

          {/* controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
            <div style={{ display: 'inline-flex', background: 'var(--a2ui-cool-950)', borderRadius: 9999, padding: 2, gap: 2 }}>
              {['Ask', 'Agent'].map(function (m) {
                var on = mode === m;
                return (
                  <button key={m} onClick={function () { setMode(m); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 5, padding: '5px 11px', borderRadius: 9999, border: 'none', cursor: 'pointer',
                      fontFamily: 'inherit', fontSize: 11.5, fontWeight: 500, transition: 'all 150ms ease',
                      background: on ? 'var(--a2ui-bg-elevated)' : 'transparent', color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)' }}>
                    <IDEIcon name={m === 'Agent' ? 'bot' : 'message'} size={13} />{m}
                  </button>
                );
              })}
            </div>
            <BrainPicker value={brain} onChange={setBrain} />
            <div style={{ flex: 1 }} />
            <button title="Send" disabled={!val.trim()} onClick={fire}
              style={{ width: 32, height: 32, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', borderRadius: 9,
                border: 'none', cursor: val.trim() ? 'pointer' : 'default', transition: 'background 150ms ease',
                background: val.trim() ? 'var(--a2ui-accent)' : 'var(--a2ui-bg-elevated)', color: val.trim() ? 'var(--a2ui-text-inverse)' : 'var(--a2ui-text-tertiary)' }}>
              <IDEIcon name="send" size={15} />
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 8, fontSize: 10.5, color: 'var(--a2ui-text-dim)' }}>
          <IDEIcon name="info" size={11} />
          {mode === 'Agent' ? 'Agent can edit the prompt, generate views & restyle the sheet' : 'Ask reads the project — it won’t change anything'}
        </div>
      </div>
    );
  }

  /* ═══════════ panel ═══════════ */
  function AgentPanel(props) {
    var brain = BRAINS[0];
    var model = props.model;
    var vt = useState(''); var val = vt[0], setVal = vt[1];
    var mt = useState('Agent'); var mode = mt[0], setMode = mt[1];
    var thr = useState([]); var thread = thr[0], setThread = thr[1];
    var scrollRef = useRef(null);
    useEffect(function () { var el = scrollRef.current; if (el) el.scrollTop = el.scrollHeight; }, [thread]);
    function submit(text, m) {
      var clean = (text || '').replace(/\s+/g, ' ').trim();
      if (!clean) return;
      var useMode = m || mode;
      setVal('');
      if (props.onSubmit) props.onSubmit();
      setThread(function (t) { return t.concat([{ role: 'user', text: clean }]); });
      setTimeout(function () {
        setThread(function (t) { return t.concat([{ role: 'asst', text: '', mode: useMode, time: nowTime(), streaming: true }]); });
      }, 440);
      setTimeout(function () {
        setThread(function (t) {
          var n = t.slice();
          for (var i = n.length - 1; i >= 0; i--) { if (n[i].role === 'asst') { n[i] = Object.assign({}, n[i], { text: asstReply(useMode), streaming: false }); break; } }
          return n;
        });
      }, 1700);
    }
    function pickSuggestion(s) { setMode(s.mode); submit(s.text, s.mode); }

    /* collapsed → slim docked rail (not a floating bubble) */
    if (!props.open) {
      return (
        <aside style={{ width: 48, flexShrink: 0, height: '100%', background: 'var(--a2ui-cool-900)',
          borderLeft: '1px solid var(--pxs-border-subtle)', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '10px 0', gap: 10 }}>
          <button title="Open agent" onClick={function () { props.setOpen(true); }}
            style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 9, cursor: 'pointer' }}>
            <IDEIcon name="chevronLeft" size={16} />
          </button>
          <button title="Open agent" onClick={function () { props.setOpen(true); }}
            style={{ width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
              background: 'transparent', color: 'var(--pxs-accent-text)', border: 'none', borderRadius: 9, cursor: 'pointer' }}>
            <IDEIcon name="bot" size={18} />
            <span style={{ position: 'absolute', top: 5, right: 6, width: 6, height: 6, borderRadius: 9999, background: 'var(--a2ui-accent)' }} />
          </button>
          <span style={{ writingMode: 'vertical-rl', fontSize: 11, fontWeight: 600, letterSpacing: '0.5px', color: 'var(--a2ui-text-tertiary)', marginTop: 2 }}>Agent</span>
        </aside>
      );
    }

    return (
      <aside style={{ width: props.width || 376, flexShrink: 0, height: '100%', background: 'var(--a2ui-bg-app)',
        borderLeft: '1px solid var(--a2ui-border-default)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        {/* header */}
        <div style={{ flexShrink: 0, borderBottom: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '11px 12px 9px' }}>
            <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)' }}><IDEIcon name="bot" size={17} /></span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Agent</span>
            <div style={{ flex: 1 }} />
            <button title="History" style={hdrBtn()}><IDEIcon name="history" size={15} /></button>
            <button title="New chat" style={hdrBtn()}><IDEIcon name="plus" size={16} /></button>
            <button title="Collapse" onClick={function () { props.setOpen(false); }} style={hdrBtn()}><IDEIcon name="chevronRight" size={16} /></button>
          </div>
          {/* scope strip — what the agent sees */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '0 12px 10px' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--a2ui-text-secondary)',
              background: 'var(--a2ui-bg-tertiary)', borderRadius: 9999, padding: '3px 9px 3px 8px' }}>
              <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)' }}><IDEIcon name="target" size={12} /></span>
              Whole project
            </span>
            <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', fontFamily: 'var(--a2ui-font-mono)' }}>New session</span>
            <div style={{ flex: 1 }} />
            <IDEProviderDot provider={model.provider} size={13} box={19} />
          </div>
        </div>

        {thread.length === 0
          ? <Intro onPick={pickSuggestion} />
          : <div ref={scrollRef} className="ide-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', display: 'flex',
              flexDirection: 'column', gap: 18, padding: '18px 16px 8px' }}>
              {thread.map(function (msg, i) {
                if (msg.role === 'user') return <UserMsg key={i}>{msg.text}</UserMsg>;
                return (
                  <div key={i} className="pxs-thread-in" style={{ display: 'flex', flexDirection: 'column', gap: 9,
                    animation: 'pxs-thread-in 320ms cubic-bezier(0.22, 1, 0.36, 1) both' }}>
                    <AsstHead brain={brain} mode={msg.mode} time={msg.time} />
                    {msg.streaming ? <StreamLine>{msg.text}</StreamLine> : <Para>{msg.text}</Para>}
                  </div>
                );
              })}
            </div>}

        <Composer model={model} value={val} onChange={setVal} mode={mode} onMode={setMode}
          onSubmit={function () { submit(val, mode); }} />
      </aside>
    );
  }

  function hdrBtn() {
    return { width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent',
      color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 };
  }

  Object.assign(window, { IDEAgentPanel: AgentPanel });
})();

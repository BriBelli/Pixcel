/* global React, PGDonut, IDEIcon, PG */
/* Pixcel · Image IDE — field analyzer + Prompt Builder panel (INTAKE) */
(function () {
  'use strict';
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* ── analyze the structured fields directly (we know which field is which part) ── */
  function tokens(s) { return (s || '').split(/[,\n]+/).map(function (x) { return x.trim(); }).filter(Boolean); }
  function analyzeFields(fields, model) {
    var parts = model.parts;
    var raw = {
      subject: [fields.subject].concat(fields.anchors || []).filter(Boolean).join(', '),
      action: fields.action || '',
      context: fields.context || '',
      composition: fields.composition || '',
      style: (fields.style || []).join(', '),
    };
    var scored = parts.map(function (p) {
      var v = raw[p.id] || '';
      var present = !!v.trim();
      var n = p.id === 'subject'
        ? (present ? tokens(fields.subject).length + (fields.anchors || []).length + (/[a-z]+\s+[a-z]+/i.test(fields.subject || '') ? 1 : 0) : 0)
        : tokens(v).length;
      if (present && n < 1) n = 1;
      var score = present ? Math.min(20, 12 + Math.min(7, (n - 1) * 2 + 1)) : 0;
      return { id: p.id, label: p.label, color: p.color, present: present, value: v,
        score: score, max: 20, rating: Math.round((score / 20) * 10) / 2 };
    });
    var used = scored.filter(function (s) { return s.present; }).length;
    var totalW = parts.reduce(function (a, p) { return a + p.weight; }, 0), weighted = 0;
    parts.forEach(function (p, i) { weighted += (scored[i].score / 20) * p.weight; });
    var overall = Math.round((weighted / totalW) * 100);
    var allText = Object.keys(raw).map(function (k) { return raw[k]; }).join(' ');
    var words = allText.trim().split(/\s+/).filter(Boolean).length;
    var band = overall >= 85 ? 'Excellent' : overall >= 70 ? 'Strong' : overall >= 50 ? 'Developing' : overall >= 25 ? 'Weak' : 'Empty';
    var notes = {};
    parts.forEach(function (p, i) {
      var ps = scored[i];
      notes[p.id] = !ps.present ? ('Add a ' + p.label.toLowerCase() + ' — ' + p.tip.toLowerCase() + ' Biggest single lift.')
        : ps.score >= 18 ? ('Strong. ' + p.tip) : ps.score >= 14 ? ('Good but thin — ' + p.tip.toLowerCase()) : ('Present but vague. ' + p.tip);
    });
    return {
      overall: overall, band: band, componentsUsed: used, componentsTotal: parts.length, words: words,
      parts: scored, notes: notes,
      segments: scored.map(function (s) { return { id: s.id, label: s.label, color: s.color, value: s.score }; }),
    };
  }

  function assemble(fields) {
    var subj = [fields.subject].concat((fields.anchors || []).map(function (a) { return a; })).filter(Boolean).join(', ');
    var bits = [subj, fields.action, fields.context, fields.composition, (fields.style || []).join(', ')].filter(function (b) { return b && b.trim(); });
    return bits.join('. ').replace(/\.\s*\./g, '.') + (bits.length ? '.' : '');
  }

  /* ── status pill per field ── */
  function StatusPill(props) {
    var s = props.s;
    if (!s.present) return <Pill tone="warn">Missing</Pill>;
    if (s.score >= 18) return <Pill tone="good">Strong</Pill>;
    if (s.score >= 14) return <Pill tone="accent">Good</Pill>;
    return <Pill tone="warn">Thin</Pill>;
  }
  function Pill(props) {
    var map = {
      good: { c: 'var(--a2ui-success)', b: 'var(--a2ui-success-bg)' },
      accent: { c: 'var(--pxs-accent-text)', b: 'var(--a2ui-accent-subtle)' },
      warn: { c: 'var(--a2ui-warning)', b: 'var(--a2ui-warning-bg)' },
    }[props.tone];
    return (
      <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 9999, color: map.c,
        background: map.b, textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap' }}>{props.children}</span>
    );
  }

  /* ── shared input chrome ── */
  function fieldShell(color, focused) {
    return { background: 'var(--a2ui-bg-input)', border: '1px solid ' + (focused ? color : 'var(--a2ui-border-default)'),
      borderRadius: 8, transition: 'border-color 150ms ease',
      boxShadow: focused ? '0 0 0 3px ' + hexA(color, 0.16) : 'none' };
  }
  function hexA(hex, a) {
    if (hex.indexOf('#') !== 0) return 'rgba(138,180,248,' + a + ')';
    var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function TextField(props) {
    var fc = useState(false); var focused = fc[0], setFocused = fc[1];
    var ref = useRef(null);
    useEffect(function () { var el = ref.current; if (!el) return; el.style.height = 'auto'; el.style.height = Math.min(120, Math.max(38, el.scrollHeight)) + 'px'; }, [props.value]);
    return (
      <div style={fieldShell(props.color, focused)}>
        <textarea ref={ref} value={props.value} rows={1} placeholder={props.placeholder}
          onFocus={function () { setFocused(true); }} onBlur={function () { setFocused(false); }}
          onChange={function (e) { props.onChange(e.target.value); }}
          style={{ width: '100%', boxSizing: 'border-box', background: 'transparent', border: 'none', outline: 'none',
            resize: 'none', fontFamily: 'var(--a2ui-font-family)', fontSize: 13, lineHeight: 1.5,
            color: 'var(--a2ui-text-primary)', padding: '9px 11px' }} />
      </div>
    );
  }

  /* anchors — chips that strengthen the subject (consistency anchors) */
  function Anchors(props) {
    var draft = useState(''); var d = draft[0], setD = draft[1];
    function add() { var v = d.trim(); if (!v) return; props.onAdd(v); setD(''); }
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
        {(props.anchors || []).map(function (a, i) {
          return (
            <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11.5, fontWeight: 500,
              color: 'var(--pxs-accent-text)', background: 'var(--a2ui-accent-subtle)', borderRadius: 9999, padding: '4px 6px 4px 10px' }}>
              {a}
              <button onClick={function () { props.onRemove(i); }} style={{ display: 'inline-flex', background: 'transparent', border: 'none',
                color: 'inherit', cursor: 'pointer', padding: 0, opacity: 0.7 }}><IDEIcon name="x" size={12} /></button>
            </span>
          );
        })}
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}>
          <input value={d} placeholder="Add anchor (e.g. ember on cheek)"
            onChange={function (e) { setD(e.target.value); }}
            onKeyDown={function (e) { if (e.key === 'Enter') { e.preventDefault(); add(); } }}
            style={{ width: 168, background: 'transparent', border: '1px dashed var(--a2ui-border-default)', borderRadius: 9999,
              outline: 'none', fontFamily: 'inherit', fontSize: 11.5, color: 'var(--a2ui-text-primary)', padding: '5px 11px' }} />
          <button onClick={add} disabled={!d.trim()} title="Add anchor"
            style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              background: d.trim() ? 'var(--a2ui-accent-subtle)' : 'transparent', color: d.trim() ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-disabled)',
              border: 'none', borderRadius: 9999, cursor: d.trim() ? 'pointer' : 'default', padding: 0 }}>
            <IDEIcon name="plus" size={14} />
          </button>
        </span>
      </div>
    );
  }

  /* enum picker — quick chips (composition) */
  function EnumField(props) {
    var cur = (props.value || '').toLowerCase();
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {props.options.map(function (o, i) {
          var on = o.toLowerCase() === cur;
          return (
            <button key={i} onClick={function () { props.onChange(on ? '' : o); }}
              style={chip(props.color, on)}>{o}</button>
          );
        })}
      </div>
    );
  }
  /* tag picker — multi (style) */
  function TagField(props) {
    var sel = props.value || [], lower = sel.map(function (x) { return x.toLowerCase(); });
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {props.options.map(function (o, i) {
          var on = lower.indexOf(o.toLowerCase()) !== -1;
          return (
            <button key={i} onClick={function () {
              var next = sel.slice(), idx = lower.indexOf(o.toLowerCase());
              if (idx === -1) next.push(o); else next.splice(idx, 1);
              props.onChange(next);
            }} style={chip(props.color, on)}>{o}</button>
          );
        })}
      </div>
    );
  }
  function chip(color, on) {
    return { fontFamily: 'var(--a2ui-font-family)', fontSize: 11.5, fontWeight: 500, padding: '5px 11px',
      borderRadius: 9999, cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 120ms ease',
      background: on ? color : 'var(--a2ui-bg-input)', color: on ? '#10131a' : 'var(--a2ui-text-secondary)',
      border: '1px solid ' + (on ? color : 'var(--a2ui-border-default)') };
  }

  /* ── one field block ── */
  function FieldBlock(props) {
    var p = props.part, s = props.s;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, padding: '14px 0',
        borderTop: props.first ? 'none' : '1px solid var(--pxs-border-subtle)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ width: 7, height: 7, borderRadius: 2, background: p.color, flexShrink: 0 }} />
          <span style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{p.builderLabel || p.label}</span>
          <StatusPill s={s} />
        </div>
        <p style={{ margin: 0, fontSize: 11.5, lineHeight: 1.45, color: 'var(--a2ui-text-tertiary)' }}>{p.def}</p>
        {props.children}
      </div>
    );
  }

  /* ════════════ PROMPT BUILDER PANEL ════════════ */
  function BuilderPanel(props) {
    var model = props.model, fields = props.fields, set = props.setField, a = props.analysis;
    var cp = useState(false); var copied = cp[0], setCopied = cp[1];
    function partFor(id) { return model.parts.find(function (p) { return p.id === id; }); }
    function sFor(id) { return a.parts.find(function (s) { return s.id === id; }); }
    function copy() { try { navigator.clipboard.writeText(assemble(fields)); } catch (e) {} setCopied(true); setTimeout(function () { setCopied(false); }, 1400); }

    var bandTone = a.overall >= 85 ? 'var(--a2ui-success)' : a.overall >= 70 ? 'var(--pxs-accent-text)' : a.overall >= 50 ? 'var(--a2ui-warning)' : 'var(--a2ui-text-tertiary)';
    var empty = a.overall === 0;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
        {/* generate header — the single source of score + action */}
        <div style={{ flexShrink: 0, padding: '14px 16px', borderBottom: '1px solid var(--pxs-border-subtle)',
          display: 'flex', alignItems: 'center', gap: 14, background: 'var(--a2ui-cool-900)' }}>
          <div style={{ position: 'relative', flexShrink: 0 }}>
            <PGDonut segments={empty ? [{ id: 'x', color: 'var(--a2ui-bg-elevated)', value: 1 }] : a.segments}
              size={56} stroke={7} center={{ top: a.overall, bottom: null }} />
          </div>
          <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Prompt quality</span>
            <span style={{ fontSize: 11.5, color: bandTone }}>{empty ? 'Start building below' : a.band + ' · ' + a.componentsUsed + '/' + a.componentsTotal + ' parts'}</span>
          </div>
          <button onClick={copy} title="Copy prompt" style={ghostBtn()}><IDEIcon name={copied ? 'check' : 'copy'} size={15} /></button>
          <button onClick={props.onGenerate} disabled={empty}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '9px 15px', borderRadius: 9,
              border: 'none', cursor: empty ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 13, fontWeight: 600,
              background: empty ? 'var(--a2ui-bg-tertiary)' : 'var(--a2ui-accent)',
              color: empty ? 'var(--a2ui-text-disabled)' : 'var(--a2ui-text-inverse)', transition: 'background 150ms ease' }}>
            <IDEIcon name="sparkles" size={15} />Generate
          </button>
        </div>

        {/* the intake form */}
        <div className="ide-scroll" style={{ flex: 1, overflowY: 'auto', padding: '4px 16px 20px' }}>
          <p style={{ margin: '14px 0 2px', fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-secondary)' }}>
            Each part maps to what <b style={{ color: 'var(--a2ui-text-primary)', fontWeight: 600 }}>{model.name}</b> rewards.
            Open <b style={{ color: 'var(--pxs-accent-text)', fontWeight: 600 }}>Guide</b> to see why.
          </p>

          <FieldBlock part={partFor('subject')} s={sFor('subject')} first>
            <TextField color={PG.C.blue} value={fields.subject} placeholder={partFor('subject').placeholder}
              onChange={function (v) { set('subject', v); }} />
            <Anchors anchors={fields.anchors}
              onAdd={function (v) { set('anchors', (fields.anchors || []).concat([v])); }}
              onRemove={function (i) { var n = (fields.anchors || []).slice(); n.splice(i, 1); set('anchors', n); }} />
          </FieldBlock>

          <FieldBlock part={partFor('action')} s={sFor('action')}>
            <TextField color={PG.C.green} value={fields.action} placeholder={partFor('action').placeholder}
              onChange={function (v) { set('action', v); }} />
          </FieldBlock>

          <FieldBlock part={partFor('context')} s={sFor('context')}>
            <TextField color={PG.C.coral} value={fields.context} placeholder={partFor('context').placeholder}
              onChange={function (v) { set('context', v); }} />
          </FieldBlock>

          <FieldBlock part={partFor('composition')} s={sFor('composition')}>
            <EnumField color={PG.C.gold} value={fields.composition} options={partFor('composition').options}
              onChange={function (v) { set('composition', v); }} />
          </FieldBlock>

          <FieldBlock part={partFor('style')} s={sFor('style')}>
            <TagField color={PG.C.purple} value={fields.style} options={partFor('style').options}
              onChange={function (v) { set('style', v); }} />
          </FieldBlock>
        </div>
      </div>
    );
  }

  function ghostBtn() {
    return { width: 34, height: 34, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
      background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 };
  }

  Object.assign(window, { IDEAnalyzeFields: analyzeFields, IDEAssemble: assemble, IDEBuilderPanel: BuilderPanel });
})();

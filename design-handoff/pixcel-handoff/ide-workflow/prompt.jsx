/* global React, IDEIcon, IDEProviderDot, PG, IDEModelTrigger */
/* Pixcel · Image IDE — Floating prompt bar. The CANONICAL prompt.
   Two-way bound: editing here writes back to fields; editing panels updates here. */
(function () {
  'use strict';
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* ── an inline, editable colored run bound to one text field ── */
  function EditRun(props) {
    var ref = useRef(null);
    useEffect(function () {
      var el = ref.current; if (!el) return;
      if (document.activeElement !== el) {
        var txt = props.value || '';
        if (el.textContent !== txt) el.textContent = txt;
      }
    }, [props.value]);
    return (
      <span ref={ref} contentEditable suppressContentEditableWarning
        className="pxs-seg" data-empty={props.value ? 'false' : 'true'} data-ph={props.placeholder}
        spellCheck={false}
        onInput={function (e) { props.onChange(e.currentTarget.textContent); }}
        onBlur={function (e) { props.onChange(e.currentTarget.textContent.replace(/\s+/g, ' ').trim()); }}
        style={{ color: (props.tint === false ? 'var(--a2ui-text-primary)' : props.color), outline: 'none', borderRadius: 4, padding: '0 1px',
          cursor: 'text', whiteSpace: 'pre-wrap' }} />
    );
  }
  /* ── a colored chip-set run (anchors / style) — read here, edit in Build ── */
  function ChipRun(props) {
    var c = props.tint === false ? 'var(--a2ui-text-primary)' : props.color;
    if (!props.items || !props.items.length) {
      return <span className="pxs-seg" data-empty="true" data-ph={props.placeholder}
        onClick={props.onJump} style={{ color: props.color, cursor: 'pointer', borderRadius: 4, padding: '0 1px' }} />;
    }
    return (
      <span onClick={props.onJump} title="Edit in Build" style={{ cursor: 'pointer' }}>
        {props.items.map(function (it, i) {
          return <span key={i} style={{ color: c }}>{(i ? ', ' : '') + it}</span>;
        })}
      </span>
    );
  }
  /* ── a single-value colored run (composition) — click jumps to Build ── */
  function PickRun(props) {
    var c = props.tint === false ? 'var(--a2ui-text-primary)' : props.color;
    if (!props.value) {
      return <span className="pxs-seg" data-empty="true" data-ph={props.placeholder}
        onClick={props.onJump} style={{ color: props.color, cursor: 'pointer', borderRadius: 4, padding: '0 1px' }} />;
    }
    return <span onClick={props.onJump} title="Edit in Build" style={{ color: c, cursor: 'pointer' }}>{props.value}</span>;
  }
  function Dot(props) {
    if (props.tint === false) return <span>{' '}</span>;
    return <span style={{ color: 'var(--a2ui-text-disabled)' }}>{' · '}</span>;
  }

  function FloatingPrompt(props) {
    var f = props.fields, set = props.setField, model = props.model, a = props.analysis;
    var ex = useState(false); var expanded = ex[0], setExpanded = ex[1];
    var cp = useState(false); var copied = cp[0], setCopied = cp[1];
    function jump() { props.onJump('build'); }

    var score = a.overall;
    var tone = score >= 85 ? 'var(--a2ui-success)' : score >= 70 ? 'var(--pxs-accent-text)' : score >= 50 ? 'var(--a2ui-warning)' : 'var(--a2ui-text-tertiary)';
    var empty = score === 0;

    function copy() { try { navigator.clipboard.writeText(props.assembled); } catch (e) {} setCopied(true); setTimeout(function () { setCopied(false); }, 1300); }
    var dec = props.picker ? props.picker.decision : null;
    var nModels = props.picker ? props.picker.selected.length : 1;
    var routeMode = dec ? PG.ROUTE_MODE[dec.mode].label : '';

    return (
      <div style={{ position: 'absolute', left: '50%', bottom: 22, transform: 'translateX(-50%)', zIndex: 40,
        width: 'min(720px, calc(100% - 64px))' }}>
        <div style={{ background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(22px)', WebkitBackdropFilter: 'blur(22px)',
          border: '1px solid var(--pxs-glass-border)', borderRadius: 16, boxShadow: 'var(--a2ui-shadow-lg)', overflow: 'hidden' }}>

          {dec && nModels > 1 &&
            <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '7px 14px', background: 'var(--a2ui-accent-subtle)',
              borderBottom: '1px solid var(--pxs-border-subtle)' }}>
              <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)', flexShrink: 0 }}><IDEIcon name="layers" size={13} /></span>
              <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-secondary)', lineHeight: 1.4 }}>
                <b style={{ color: 'var(--a2ui-text-primary)', fontWeight: 600 }}>{routeMode}</b> · {dec.images} × {nModels} models = {dec.runs} images · Build reflects {model.name}
              </span>
            </div>}

          {/* the live, editable, colored prompt */}
          <div style={{ padding: '12px 14px', fontSize: 14, lineHeight: 1.6, color: 'var(--a2ui-text-primary)',
            maxHeight: 132, overflowY: 'auto', fontFamily: 'var(--a2ui-font-family)' }} className="ide-scroll">
            {empty &&
              <span style={{ color: 'var(--a2ui-text-tertiary)' }}>Describe what to create, or fill the parts in Build — they assemble here.</span>}
            {!empty &&
              <React.Fragment>
                <EditRun value={f.subject} placeholder="subject" color={PG.C.blue} tint={expanded} onChange={function (v) { set('subject', v); }} />
                {(f.anchors && f.anchors.length) ? <React.Fragment><span style={{ color: expanded ? PG.C.blue : 'var(--a2ui-text-primary)' }}>, </span><ChipRun items={f.anchors} color={PG.C.blue} tint={expanded} onJump={jump} /></React.Fragment> : null}
                {f.action ? <React.Fragment><Dot tint={expanded} /><EditRun value={f.action} placeholder="action" color={PG.C.green} tint={expanded} onChange={function (v) { set('action', v); }} /></React.Fragment> : null}
                {f.context ? <React.Fragment><Dot tint={expanded} /><EditRun value={f.context} placeholder="context" color={PG.C.coral} tint={expanded} onChange={function (v) { set('context', v); }} /></React.Fragment> : null}
                {f.composition ? <React.Fragment><Dot tint={expanded} /><PickRun value={f.composition} color={PG.C.gold} tint={expanded} onJump={jump} /></React.Fragment> : null}
                {(f.style && f.style.length) ? <React.Fragment><Dot tint={expanded} /><ChipRun items={f.style} color={PG.C.purple} tint={expanded} onJump={jump} /></React.Fragment> : null}
                <span style={{ color: 'var(--a2ui-text-tertiary)' }}>.</span>
              </React.Fragment>}
          </div>

          {/* legend (expandable) */}
          {expanded &&
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', padding: '0 14px 11px' }}>
              {[['Subject', PG.C.blue], ['Action', PG.C.green], ['Context', PG.C.coral], ['Composition', PG.C.gold], ['Style', PG.C.purple]].map(function (p) {
                return (
                  <span key={p[0]} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>
                    <span style={{ width: 8, height: 8, borderRadius: 2, background: p[1] }} />{p[0]}
                  </span>
                );
              })}
              <span style={{ fontSize: 11, color: 'var(--a2ui-text-dim)' }}>Click colored text to edit · chips edit in Build</span>
            </div>}

          {/* footer: model(s) + score, mirrors panels */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px',
            borderTop: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-glass-dark)' }}>
            {props.picker
              ? <IDEModelTrigger picker={props.picker} anchor="up" align="left" compact />
              : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 7 }}>
                  <IDEProviderDot provider={model.provider} size={14} box={20} />
                  <span style={{ fontSize: 12, color: 'var(--a2ui-text-secondary)' }}>{model.name}</span>
                </span>}
            <span style={{ fontSize: 11.5, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)', flexShrink: 1, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{a.words} words</span>
            <div style={{ flex: 1, minWidth: 4 }} />
            {/* copy + legend — relocated from the (removed) header, sit left of the score */}
            <button onClick={copy} title="Copy prompt" style={miniBtn()}><IDEIcon name={copied ? 'check' : 'copy'} size={14} /></button>
            <button onClick={function () { setExpanded(!expanded); }} title="Legend" style={miniBtn(expanded)}><IDEIcon name="info" size={14} /></button>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: tone, flexShrink: 0, marginLeft: 2,
              background: 'var(--a2ui-bg-tertiary)', borderRadius: 9999, padding: '4px 11px' }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: tone }} />{score}%
            </span>
            <button onClick={props.onGenerate} disabled={empty}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 9, border: 'none', flexShrink: 0, whiteSpace: 'nowrap',
                cursor: empty ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12.5, fontWeight: 600,
                background: empty ? 'var(--a2ui-bg-tertiary)' : 'var(--a2ui-accent)', color: empty ? 'var(--a2ui-text-disabled)' : 'var(--a2ui-text-inverse)' }}>
              <IDEIcon name="sparkles" size={14} />Generate{nModels > 1 ? ' ×' + nModels : ''}
            </button>
          </div>
        </div>
      </div>
    );
  }

  function miniBtn(on) {
    return { width: 28, height: 28, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      background: on ? 'var(--a2ui-bg-active)' : 'transparent', color: on ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-tertiary)',
      border: 'none', borderRadius: 7, cursor: 'pointer', padding: 0 };
  }

  Object.assign(window, { IDEFloatingPrompt: FloatingPrompt });
})();

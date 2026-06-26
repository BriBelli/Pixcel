/* global React, PGIcon, PGDonut, PGStars, PGBadge, PGEditableField, PG */
/* Pixcel · Prompt Guide — the docked panel (READ + POST states) */
(function () {
  'use strict';
  var useState = React.useState, useEffect = React.useEffect;

  function hexA(hex, a) { var n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ',' + (n >> 8 & 255) + ',' + (n & 255) + ',' + a + ')'; }

  /* ── shells ── */
  function Card(props) {
    return (
      <div style={Object.assign({ background: 'var(--a2ui-bg-primary)', borderRadius: 14,
        padding: props.pad || 18, display: 'flex', flexDirection: 'column', gap: props.gap || 14 }, props.style)}>
        {props.children}
      </div>
    );
  }
  function Title(props) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ flex: 1, fontSize: 15, fontWeight: 600, color: 'var(--a2ui-text-primary)', lineHeight: 1.3, minWidth: 0 }}>{props.title}</div>
          {props.right}
        </div>
        {props.sub && <div style={{ fontSize: 12.5, color: 'var(--a2ui-text-secondary)', lineHeight: 1.5 }}>{props.sub}</div>}
      </div>
    );
  }

  /* ── color-coded formula template: [Subject] + [Action] + … ── */
  function FormulaLine(props) {
    var parts = props.parts, muted = props.muted;
    return (
      <div style={{ fontFamily: 'var(--a2ui-font-mono)', fontSize: 12, lineHeight: 1.7, color: 'var(--a2ui-text-tertiary)' }}>
        {parts.map(function (p, i) {
          return (
            <React.Fragment key={p.id}>
              {i > 0 && <span style={{ color: 'var(--a2ui-text-disabled)' }}>, </span>}
              <span style={{ color: muted ? 'var(--a2ui-text-tertiary)' : p.color }}>[{p.label}]</span>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  /* ── stacked stat row (vertical, matches reference) ── */
  function Stat(props) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ flex: 1, fontSize: 12.5, color: 'var(--a2ui-text-secondary)' }}>{props.label}</span>
          {props.badge}
        </div>
        <div style={{ fontSize: 26, fontWeight: 700, color: 'var(--a2ui-text-primary)', lineHeight: 1.1, fontVariantNumeric: 'tabular-nums' }}>{props.value}</div>
        {props.sub && <div style={{ fontSize: 11.5, color: 'var(--a2ui-text-tertiary)' }}>{props.sub}</div>}
      </div>
    );
  }

  /* ── the five-part accordion (teaches in READ, coaches in POST) ── */
  function Formula(props) {
    var parts = props.parts, scored = props.scored, notes = props.notes, mode = props.mode;
    var op = useState(null); var openId = op[0], setOpen = op[1];
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {parts.map(function (p, i) {
          var s = scored ? scored[i] : null;
          var isOpen = openId === p.id;
          return (
            <div key={p.id}>
              <button onClick={function () { setOpen(isOpen ? null : p.id); }}
                style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '10px 2px',
                  background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit' }}>
                <span style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', color: p.color }}>
                  <PGIcon name={p.icon} size={18} />
                </span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <span style={{ fontSize: 13.5, fontWeight: 500, color: 'var(--a2ui-text-primary)' }}>{p.label}</span>
                  {mode === 'read' && <span style={{ display: 'block', fontSize: 12, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.4, marginTop: 1 }}>{p.def}</span>}
                </span>
                {s && <ScorePill score={s.score} present={s.present} max={s.max} />}
                <span style={{ color: 'var(--a2ui-text-tertiary)', display: 'inline-flex', transform: isOpen ? 'rotate(180deg)' : 'none', transition: 'transform 200ms ease' }}>
                  <PGIcon name="chevronDown" size={16} />
                </span>
              </button>
              {isOpen &&
                <div style={{ padding: '0 4px 14px 30px', display: 'flex', flexDirection: 'column', gap: 10 }}>
                  <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--a2ui-text-secondary)' }}>{p.blurb}</p>
                  <div style={{ fontSize: 12, fontFamily: 'var(--a2ui-font-mono)', color: p.color, background: 'var(--a2ui-cool-950)',
                    borderRadius: 8, padding: '9px 11px', lineHeight: 1.55 }}>{p.example}</div>
                  {mode === 'post' && s &&
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <PGStars value={s.rating} size={13} />
                        <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', fontFamily: 'var(--a2ui-font-mono)' }}>{s.score}/{s.max}</span>
                      </div>
                      <div style={{ display: 'flex', gap: 8, padding: '10px 12px', borderRadius: 8,
                        background: s.present ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-warning-bg)' }}>
                        <span style={{ color: s.present ? 'var(--a2ui-accent)' : 'var(--a2ui-warning)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}>
                          <PGIcon name={s.present ? 'sparkles' : 'info'} size={14} />
                        </span>
                        <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-primary)' }}>{notes[p.id]}</span>
                      </div>
                    </div>}
                </div>}
            </div>
          );
        })}
      </div>
    );
  }

  function ScorePill(props) {
    if (!props.present) {
      return <span style={{ fontSize: 10, fontWeight: 600, padding: '2px 7px', borderRadius: 9999, color: 'var(--a2ui-warning)',
        background: 'var(--a2ui-warning-bg)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Missing</span>;
    }
    return <span style={{ fontSize: 11, fontWeight: 600, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-secondary)' }}>{props.score}/{props.max}</span>;
  }

  /* ── reassembled, color-coded prompt (bracketed, in formula order) ── */
  function Assembled(props) {
    var present = props.scored.filter(function (s) { return s.present && s.value; });
    if (!present.length) return null;
    return (
      <div style={{ background: 'var(--a2ui-cool-950)', borderRadius: 10, padding: '13px 14px', fontSize: 13, lineHeight: 1.75 }}>
        {present.map(function (s, i) {
          return (
            <React.Fragment key={s.id}>
              {i > 0 && ' '}
              <span style={{ color: s.color }}>[{s.value}]</span>
            </React.Fragment>
          );
        })}
      </div>
    );
  }

  /* ════════════════════════ PANEL ════════════════════════ */
  function PromptGuidePanel(props) {
    var model = props.model, models = props.models, prompt = props.prompt, tweaks = props.tweaks || {};
    var a = props.analysis, edits = props.edits, setEdit = props.setEdit, clearPart = props.clearPart;
    var mode = (prompt || '').trim().length ? 'post' : 'read';
    var ed = useState(null); var editId = ed[0], setEditId = ed[1];
    var df = useState(false); var showDiff = df[0], setShowDiff = df[1];
    var cp = useState(false); var didCopy = cp[0], setCopied = cp[1];
    var md = useState(false); var mdlOpen = md[0], setMdlOpen = md[1];

    var baseScored = a ? a.parts : model.parts.map(function (p) { return { id: p.id, label: p.label, color: p.color, present: false, value: '', score: 0, max: 20, rating: 0 }; });
    var scored = baseScored.map(function (s) {
      if (edits[s.id] !== undefined) {
        var v = edits[s.id], present = !!v, sc = present ? Math.max(s.score, 16) : 0;
        return Object.assign({}, s, { value: v, present: present, score: sc, rating: Math.round((sc / 20) * 10) / 2 });
      }
      return s;
    });

    function copyOpt() { try { navigator.clipboard.writeText(a.optimized); } catch (e) {} setCopied(true); setTimeout(function () { setCopied(false); }, 1500); }

    return (
      <aside style={{ width: tweaks.width || 388, flexShrink: 0, height: '100%', background: 'var(--a2ui-bg-app)',
        borderLeft: '1px solid var(--a2ui-border-default)', display: 'flex', flexDirection: 'column', position: 'relative' }}>

        {/* header */}
        <div style={{ flexShrink: 0, padding: '14px 16px', borderBottom: '1px solid var(--a2ui-border-subtle)', display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--a2ui-accent)', display: 'inline-flex' }}><PGIcon name="wand" size={17} /></span>
            <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--a2ui-text-primary)', flex: 1, letterSpacing: '-0.01em' }}>Prompt guide</h2>
            <button onClick={props.onClose} title="Close panel" style={ghostIcon()}><PGIcon name="x" size={16} /></button>
          </div>
          <div style={{ position: 'relative' }}>
            <button onClick={function () { setMdlOpen(!mdlOpen); }} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9,
              padding: '8px 10px', background: 'var(--a2ui-bg-input)', border: '1px solid var(--a2ui-border-default)', borderRadius: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
              <ProviderDot provider={model.provider} />
              <div style={{ flex: 1, textAlign: 'left', display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{model.name}</span>
                <span style={{ fontSize: 10.5, color: 'var(--a2ui-text-tertiary)' }}>{model.vendor} · {model.kind}</span>
              </div>
              <span style={{ color: 'var(--a2ui-text-secondary)', display: 'inline-flex' }}><PGIcon name="chevronDown" size={15} /></span>
            </button>
            {mdlOpen && <ModelMenu models={models} current={model} onPick={function (m) { props.onModel(m); setMdlOpen(false); }} />}
          </div>
        </div>

        {/* body */}
        <div className="pg-scroll" style={{ flex: 1, overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {mode === 'read'
            ? <ReadState model={model} onTryExample={props.onTryExample} />
            : (a ? <PostState model={model} a={a} scored={scored} setEdit={setEdit} clearPart={clearPart} editId={editId} setEditId={setEditId} tweaks={tweaks} />
                 : <Analyzing model={model} />)}
        </div>

        {/* footer */}
        {mode === 'post' && a &&
          <div style={{ flexShrink: 0, padding: 14, borderTop: '1px solid var(--a2ui-border-default)', background: 'var(--a2ui-bg-app)', display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', gap: 8 }}>
              <button onClick={function () { props.onApply('replace', a.optimized); }} style={primaryBtn()}><PGIcon name="wand" size={14} />Replace my prompt</button>
              <button onClick={function () { setShowDiff(true); }} title="Compare" style={secondaryBtn()}><PGIcon name="arrowLeftRight" size={14} /></button>
              <button onClick={copyOpt} title="Copy optimized" style={secondaryBtn()}><PGIcon name={didCopy ? 'check' : 'copy'} size={14} /></button>
            </div>
            <p style={{ margin: 0, fontSize: 10.5, color: 'var(--a2ui-text-tertiary)', textAlign: 'center', lineHeight: 1.4 }}>
              Written to your prompt, filtered for {model.name} policy compliance.
            </p>
          </div>}

        {showDiff && a && <DiffModal original={prompt} optimized={a.optimized} model={model}
          onClose={function () { setShowDiff(false); }} onApply={function () { props.onApply('replace', a.optimized); setShowDiff(false); }} />}
      </aside>
    );
  }

  /* ── analyzing ── */
  function Analyzing(props) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14, padding: '60px 24px', textAlign: 'center' }}>
        <span className="pg-spin" style={{ color: 'var(--a2ui-accent)', display: 'inline-flex' }}><PGIcon name="sparkles" size={26} /></span>
        <p style={{ margin: 0, fontSize: 13, color: 'var(--a2ui-text-secondary)' }}>{props.model.name} agent is reading your prompt…</p>
      </div>
    );
  }

  /* ════════ READ ════════ */
  function ReadState(props) {
    var model = props.model;
    var ex = useState(false); var exOpen = ex[0], setExOpen = ex[1];
    return (
      <React.Fragment>
        {/* slim model context */}
        <Card gap={12}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: 'var(--a2ui-success)', display: 'inline-flex' }}><PGIcon name="sparkles" size={15} /></span>
            <span style={{ flex: 1, fontSize: 13.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{model.name}</span>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 10.5, color: 'var(--a2ui-text-tertiary)' }}>
              <span style={{ width: 6, height: 6, borderRadius: 9999, background: 'var(--a2ui-success)' }} />live
            </span>
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--a2ui-text-secondary)', lineHeight: 1.5 }}>{model.tagline}</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {model.specs.map(function (s, i) {
              return <span key={i} style={{ fontSize: 11, fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-secondary)',
                background: 'var(--a2ui-bg-tertiary)', borderRadius: 9999, padding: '3px 10px' }}>{s}</span>;
            })}
          </div>
        </Card>

        {/* education hero */}
        <Card>
          <Title title="The five-part formula" sub={model.intro} />
          <FormulaLine parts={model.parts} />
          <Formula parts={model.parts} mode="read" />
          <div style={{ display: 'flex', gap: 9, alignItems: 'flex-start', padding: '11px 12px', borderRadius: 10, background: 'var(--a2ui-accent-subtle)' }}>
            <span style={{ color: 'var(--a2ui-accent)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><PGIcon name="wand" size={15} /></span>
            <p style={{ margin: 0, fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-primary)' }}>
              <b>Start typing</b> and the agent scores each part live — so you fix the prompt before you spend the run.
            </p>
          </div>
        </Card>

        {/* example */}
        <Card>
          <Title title="Example prompt" right={<PGBadge tone="good">92% · Excellent</PGBadge>} />
          <div style={{ display: 'flex', gap: 9, padding: '12px 13px', borderRadius: 10, background: 'var(--a2ui-success-bg)' }}>
            <span style={{ color: 'var(--a2ui-success)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><PGIcon name="check" size={15} /></span>
            <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.6, color: 'var(--a2ui-text-primary)' }}>{model.example}</p>
          </div>
          <button onClick={function () { setExOpen(!exOpen); }} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent',
            border: 'none', cursor: 'pointer', color: 'var(--a2ui-text-secondary)', fontSize: 12, fontWeight: 500, fontFamily: 'inherit', padding: '2px 0' }}>
            <span style={{ display: 'inline-flex', transform: exOpen ? 'rotate(90deg)' : 'none', transition: 'transform 200ms ease' }}><PGIcon name="chevronRight" size={14} /></span>
            {exOpen ? 'Hide breakdown' : 'See why it scores'}
          </button>
          {exOpen && <ExampleTable />}
        </Card>

        <button onClick={props.onTryExample} style={Object.assign(secondaryBtn(), { width: '100%', justifyContent: 'center', padding: '11px 14px' })}>
          <PGIcon name="sparkles" size={14} />Use this example as a starting point
        </button>
      </React.Fragment>
    );
  }

  function ExampleTable() {
    return (
      <div style={{ display: 'flex', flexDirection: 'column' }}>
        {PG.EXAMPLE_BREAKDOWN.map(function (r, i) {
          return (
            <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderTop: i ? '1px solid var(--a2ui-border-subtle)' : 'none' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--a2ui-text-primary)' }}>{r.label}</span>
                <span style={{ fontSize: 11, color: 'var(--a2ui-text-secondary)' }}>{r.value}</span>
              </div>
              <PGStars value={r.rating} size={12} />
            </div>
          );
        })}
      </div>
    );
  }

  /* ════════ POST ════════ */
  function PostState(props) {
    var model = props.model, a = props.a, scored = props.scored, tweaks = props.tweaks;
    var setEdit = props.setEdit, clearPart = props.clearPart, editId = props.editId, setEditId = props.setEditId;
    var bandTone = a.overall >= 85 ? 'good' : a.overall >= 70 ? 'accent' : a.overall >= 50 ? 'warn' : 'bad';
    var compTone = a.componentsUsed === a.componentsTotal ? 'good' : a.componentsUsed >= 3 ? 'warn' : 'bad';
    var clarityDelta = (a.clarity - 4).toFixed(1);
    var clarityTone = a.clarity >= 4 ? 'good' : a.clarity >= 3 ? 'warn' : 'bad';

    return (
      <React.Fragment>
        {/* effectiveness score */}
        <Card gap={16}>
          <Title title="Prompt effectiveness score" sub="A structured prompt yields consistent, high-quality results." />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <Stat label="Overall score" value={a.overall + '%'} badge={<PGBadge tone={bandTone}>{a.band}</PGBadge>} sub={scoreSub(a.overall)} />
            <Stat label="Components used" value={a.componentsUsed + ' / ' + a.componentsTotal}
              badge={<PGBadge tone={compTone} icon={false}>{a.componentsUsed === a.componentsTotal ? 'Complete' : 'Partial'}</PGBadge>}
              sub={a.componentsUsed === a.componentsTotal ? 'All formula parts present' : (a.componentsTotal - a.componentsUsed) + ' part' + (a.componentsTotal - a.componentsUsed > 1 ? 's' : '') + ' missing'} />
            <Stat label="Clarity rating" value={a.clarity + ' / 5'}
              badge={<PGBadge tone={clarityTone}>{(clarityDelta >= 0 ? '+' : '') + clarityDelta + ' vs avg'}</PGBadge>}
              sub="Clear and specific language" />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, paddingTop: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Prompt score breakdown</span>
            {tweaks.scoreViz === 'bars'
              ? <PartBars scored={scored} />
              : <div style={{ display: 'flex', justifyContent: 'center', padding: '2px 0 6px' }}>
                  <PGDonut segments={a.segments} size={168} stroke={26} center={{ top: a.overall + '%', bottom: a.band }} />
                </div>}
            {tweaks.showLegend !== false && <Legend scored={scored} />}
          </div>
        </Card>

        {/* formula breakdown — editable */}
        <Card>
          <Title title="Prompt formula breakdown" sub={<FormulaLine parts={model.parts} muted={true} />} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
            {model.parts.map(function (p, i) {
              var s = scored[i];
              return (
                <div key={p.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
                  <span style={{ width: 100, flexShrink: 0, paddingTop: 9, fontSize: 11.5, fontWeight: 600, color: p.color, lineHeight: 1.3 }}>[{p.label}]</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <PGEditableField part={p} value={s.value} present={s.present} editing={editId === p.id} setEditing={setEditId}
                      onChange={function (v) { setEdit(p.id, v); }} onClear={s.present ? function () { clearPart(p.id); } : null} />
                  </div>
                </div>
              );
            })}
          </div>
          <Assembled scored={scored} />
        </Card>

        {/* coaching */}
        <Card>
          <Title title="The five-part formula" sub="Each component contributes to prompt quality. Expand for the theory." />
          <Formula parts={model.parts} scored={scored} notes={a.notes} mode="post" />
        </Card>

        {/* optimized */}
        <Card>
          <Title title={'Optimized for ' + model.name}
            sub={a.inserted.length ? 'Filled ' + a.inserted.length + ' missing part' + (a.inserted.length > 1 ? 's' : '') + ' and reshaped to the model\u2019s order.' : 'Reshaped to the model\u2019s preferred order.'} />
          <div style={{ background: 'var(--a2ui-cool-950)', borderRadius: 10, padding: '12px 13px', fontSize: 12.5, lineHeight: 1.7, color: 'var(--a2ui-text-primary)' }}>{a.optimized}</div>
        </Card>
      </React.Fragment>
    );
  }

  function PartBars(props) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {props.scored.map(function (s) {
          return (
            <div key={s.id} style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11.5 }}>
                <span style={{ color: 'var(--a2ui-text-secondary)' }}>{s.label}</span>
                <span style={{ color: 'var(--a2ui-text-tertiary)', fontFamily: 'var(--a2ui-font-mono)' }}>{s.score}/20</span>
              </div>
              <div style={{ height: 7, background: 'var(--a2ui-bg-elevated)', borderRadius: 9999, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: (s.score / 20 * 100) + '%', background: s.color, borderRadius: 9999, transition: 'width 500ms cubic-bezier(0.22,1,0.36,1)' }} />
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  function Legend(props) {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px 14px', justifyContent: 'center' }}>
        {props.scored.map(function (s) {
          return (
            <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11,
              color: s.present ? 'var(--a2ui-text-secondary)' : 'var(--a2ui-text-tertiary)', opacity: s.present ? 1 : 0.55 }}>
              <span style={{ width: 9, height: 9, borderRadius: 3, background: s.present ? s.color : 'var(--a2ui-bg-elevated)' }} />
              {s.label}
            </span>
          );
        })}
      </div>
    );
  }

  /* ── model menu ── */
  function ModelMenu(props) {
    return (
      <div style={{ position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, zIndex: 100,
        background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)', WebkitBackdropFilter: 'blur(20px)',
        border: '1px solid rgba(255,255,255,0.08)', borderRadius: 12, boxShadow: 'var(--a2ui-shadow-lg)', padding: 6, maxHeight: 320, overflowY: 'auto' }}>
        {['Image', 'Video'].map(function (kind) {
          var list = props.models.filter(function (m) { return m.kind === kind; });
          if (!list.length) return null;
          return (
            <div key={kind}>
              <div style={{ fontSize: 10, fontWeight: 600, color: 'var(--a2ui-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.5px', padding: '8px 10px 4px' }}>{kind} models</div>
              {list.map(function (m) {
                var active = m.id === props.current.id;
                return (
                  <button key={m.id} onClick={function () { if (m.live) props.onPick(m); }} disabled={!m.live}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 9, padding: '8px 10px',
                      background: active ? 'var(--a2ui-accent-subtle)' : 'transparent', border: 'none', borderRadius: 8,
                      cursor: m.live ? 'pointer' : 'not-allowed', fontFamily: 'inherit', textAlign: 'left', opacity: m.live ? 1 : 0.5 }}
                    onMouseEnter={function (e) { if (m.live && !active) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
                    onMouseLeave={function (e) { if (!active) e.currentTarget.style.background = 'transparent'; }}>
                    <ProviderDot provider={m.provider} />
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
                      <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--a2ui-text-primary)' }}>{m.name}</span>
                      <span style={{ fontSize: 10.5, color: 'var(--a2ui-text-tertiary)' }}>{m.vendor}</span>
                    </div>
                    {active && <span style={{ color: 'var(--a2ui-accent)', display: 'inline-flex' }}><PGIcon name="check" size={15} /></span>}
                    {!m.live && <span style={{ fontSize: 9.5, fontWeight: 600, color: 'var(--a2ui-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>Soon</span>}
                  </button>
                );
              })}
            </div>
          );
        })}
      </div>
    );
  }

  /* ── diff modal ── */
  function DiffModal(props) {
    return (
      <div onClick={props.onClose} style={{ position: 'fixed', inset: 0, zIndex: 300, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(2px)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
        <div onClick={function (e) { e.stopPropagation(); }} style={{ width: 'min(720px, 100%)', maxHeight: '80vh', background: 'var(--a2ui-bg-primary)',
          borderRadius: 16, border: '1px solid var(--a2ui-border-default)', boxShadow: 'var(--a2ui-shadow-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
          <div style={{ padding: '16px 18px', borderBottom: '1px solid var(--a2ui-border-subtle)', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--a2ui-accent)', display: 'inline-flex' }}><PGIcon name="arrowLeftRight" size={17} /></span>
            <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600, flex: 1 }}>Compare — your prompt vs optimized</h3>
            <button onClick={props.onClose} style={ghostIcon()}><PGIcon name="x" size={16} /></button>
          </div>
          <div style={{ flex: 1, overflowY: 'auto', display: 'grid', gridTemplateColumns: '1fr 1fr' }}>
            <DiffCol title="Your prompt" text={props.original} color="var(--a2ui-text-secondary)" hi={false} />
            <DiffCol title={'Optimized for ' + props.model.name} text={props.optimized} color="var(--a2ui-accent)" hi={true} />
          </div>
          <div style={{ padding: 14, borderTop: '1px solid var(--a2ui-border-subtle)', display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button onClick={props.onClose} style={secondaryBtn()}>Keep mine</button>
            <button onClick={props.onApply} style={primaryBtn()}><PGIcon name="check" size={14} />Use optimized</button>
          </div>
        </div>
      </div>
    );
  }
  function DiffCol(props) {
    return (
      <div style={{ padding: 18, borderLeft: props.hi ? '1px solid var(--a2ui-border-subtle)' : 'none', display: 'flex', flexDirection: 'column', gap: 10, background: props.hi ? 'var(--a2ui-accent-subtle)' : 'transparent' }}>
        <div style={{ fontSize: 11, fontWeight: 600, color: props.color, textTransform: 'uppercase', letterSpacing: '0.4px' }}>{props.title}</div>
        <p style={{ margin: 0, fontSize: 13.5, lineHeight: 1.65, color: 'var(--a2ui-text-primary)' }}>{props.text || <em style={{ color: 'var(--a2ui-text-tertiary)' }}>empty</em>}</p>
      </div>
    );
  }

  /* ── shared ── */
  function ProviderDot(props) {
    return (
      <span style={{ width: 26, height: 26, borderRadius: 7, flexShrink: 0, overflow: 'hidden', background: 'var(--a2ui-bg-elevated)', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}>
        <img src={'assets/provider-icons/' + props.provider + '.ico'} alt="" width={18} height={18} style={{ objectFit: 'contain' }} onError={function (e) { e.target.style.display = 'none'; }} />
      </span>
    );
  }
  function scoreSub(o) {
    return o >= 85 ? 'High-quality structured prompt' : o >= 70 ? 'Solid — a couple parts could be sharper'
      : o >= 50 ? 'Developing — missing parts cost you control' : o > 0 ? 'Bare idea — add structure before you spend a run' : 'Empty';
  }
  function ghostIcon() { return { width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent', color: 'var(--a2ui-text-secondary)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }; }
  function primaryBtn() { return { flex: 1, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 14px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', borderRadius: 9, background: 'var(--a2ui-accent)', color: 'var(--a2ui-text-inverse)', border: 'none', cursor: 'pointer' }; }
  function secondaryBtn() { return { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, padding: '10px 13px', fontSize: 13, fontWeight: 500, fontFamily: 'inherit', borderRadius: 9, background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-primary)', border: 'none', cursor: 'pointer' }; }

  window.PromptGuidePanel = PromptGuidePanel;
})();

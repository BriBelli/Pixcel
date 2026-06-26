/* global React, PG, IDEIcon, IDEProviderDot */
/* Pixcel · Image IDE — Routing Console.
   The picker doesn't choose A model — it resolves a PLAN: pins claim slots,
   Auto fills + rescues the rest from the Gate-1-eligible / Gate-2-ranked roster.
   Tri-state (Full auto · Safety net · Strict) is legible from the prompt bar. */
(function () {
  'use strict';
  var useState = React.useState, useRef = React.useRef, useEffect = React.useEffect;

  /* skeleton avatar — an AUTO-filled slot (model assumed, not user-chosen) */
  function AutoDot(props) {
    var box = props.box || 22, size = props.size || 14;
    return <span style={{ width: box, height: box, borderRadius: Math.round(box * 0.3), flexShrink: 0, display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center', background: 'var(--a2ui-bg-elevated)',
      border: '1px dashed var(--a2ui-border-strong)', color: 'var(--a2ui-text-dim)' }}>
      <IDEIcon name="sparkles" size={size - 2} /></span>;
  }

  /* overlapping avatars — provider logo for pins, skeleton for auto slots */
  function Stack(props) {
    var pool = props.pool || [], box = props.box || 22, size = props.size || 14;
    if (!pool.length) {
      return <span style={{ width: box, height: box, borderRadius: 7, display: 'inline-flex', alignItems: 'center',
        justifyContent: 'center', border: '1px dashed var(--a2ui-border-strong)', color: 'var(--a2ui-text-dim)' }}>
        <IDEIcon name="slots" size={size - 2} /></span>;
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center' }}>
        {pool.map(function (p, i) {
          return (
            <span key={p.id} style={{ marginLeft: i ? -8 : 0, borderRadius: 7, display: 'inline-flex', position: 'relative',
              zIndex: pool.length - i, boxShadow: '0 0 0 2px var(--a2ui-cool-900)' }}>
              {p.source === 'pin'
                ? <IDEProviderDot provider={p.model.provider} size={size} box={box} />
                : <AutoDot size={size} box={box} />}
            </span>
          );
        })}
      </span>
    );
  }

  function tag(c, b) {
    return { fontSize: 9.5, fontWeight: 600, padding: '1.5px 7px', borderRadius: 9999, color: c, background: b,
      textTransform: 'uppercase', letterSpacing: '0.4px', whiteSpace: 'nowrap', lineHeight: 1.5 };
  }
  var MODE_COLOR = {
    auto:   { c: 'var(--a2ui-success)',  b: 'var(--a2ui-success-bg)', icon: 'shield' },
    strict: { c: 'var(--a2ui-warning)',  b: 'var(--a2ui-warning-bg)', icon: 'lock' },
  };

  /* ── small switch ── */
  function Switch(props) {
    return (
      <button onClick={function () { props.onChange(!props.on); }}
        style={{ width: 36, height: 21, flexShrink: 0, borderRadius: 9999, border: 'none', cursor: 'pointer', padding: 2,
          background: props.on ? 'var(--a2ui-accent)' : 'var(--a2ui-bg-elevated)', transition: 'background 150ms ease',
          display: 'inline-flex', justifyContent: props.on ? 'flex-end' : 'flex-start', alignItems: 'center' }}>
        <span style={{ width: 17, height: 17, borderRadius: 9999, background: props.on ? 'var(--a2ui-text-inverse)' : 'var(--a2ui-text-tertiary)',
          transition: 'all 150ms ease', boxShadow: '0 1px 2px rgba(0,0,0,0.3)' }} />
      </button>
    );
  }

  /* ── stepper (wide = fill its column, label-left value-right) ── */
  function Stepper(props) {
    var dim = props.disabled;
    function btn(dir, dis, icon) {
      dis = dis || dim;
      return (
        <button disabled={dis} onClick={function () { if (!dim) props.onChange(props.value + dir); }}
          style={{ width: 26, height: 26, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', border: 'none',
            borderRadius: 7, cursor: dis ? 'default' : 'pointer', background: 'transparent',
            color: dis ? 'var(--a2ui-text-disabled)' : 'var(--a2ui-text-secondary)' }}
          onMouseEnter={function (e) { if (!dis) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = 'transparent'; }}>
          <IDEIcon name={icon} size={14} /></button>
      );
    }
    return (
      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 1, background: 'var(--a2ui-cool-950)', borderRadius: 9,
        border: '1px solid var(--pxs-border-subtle)', padding: 1, opacity: dim ? 0.45 : 1 }}>
        {btn(-1, props.value <= props.min, 'minus')}
        <span style={{ minWidth: 18, textAlign: 'center', fontSize: 12.5, fontWeight: 600, fontFamily: 'var(--a2ui-font-mono)',
          color: 'var(--a2ui-text-primary)' }}>{props.value}</span>
        {btn(1, props.value >= props.max, 'plus')}
      </span>
    );
  }

  /* labelled stepper field for the controls row */
  function StepField(props) {
    return (
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8,
        padding: '7px 9px 7px 11px', background: 'var(--a2ui-cool-950)', borderRadius: 10,
        border: '1px solid var(--pxs-border-subtle)', opacity: props.dim ? 0.55 : 1 }}>
        <span style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.2 }}>
          <span style={{ fontSize: 11.5, fontWeight: 600, color: 'var(--a2ui-text-secondary)' }}>{props.label}</span>
          <span style={{ fontSize: 10, color: 'var(--a2ui-text-dim)' }}>{props.sub}</span>
        </span>
        {props.children}
      </div>
    );
  }

  /* ── one resolved slot in the plan ── */
  function PlanRow(props) {
    var p = props.p, i = props.i;
    var pinned = p.source === 'pin';
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 9, padding: '6px 4px' }}>
        <span style={{ width: 17, flexShrink: 0, textAlign: 'center', fontSize: 11, fontWeight: 600,
          fontFamily: 'var(--a2ui-font-mono)', color: 'var(--a2ui-text-dim)' }}>{i + 1}</span>
        {p.source === 'pin'
          ? <IDEProviderDot provider={p.model.provider} size={15} box={24} />
          : <AutoDot size={15} box={24} />}
        <span style={{ flex: 1, minWidth: 0, display: 'inline-flex', alignItems: 'center', gap: 7 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--a2ui-text-primary)', whiteSpace: 'nowrap',
            overflow: 'hidden', textOverflow: 'ellipsis' }}>{p.model.name}</span>
          {props.primary && <span style={tag('var(--pxs-accent-text)', 'var(--a2ui-accent-subtle)')}>drives build</span>}
        </span>
        {pinned
          ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 11, color: 'var(--a2ui-text-secondary)', flexShrink: 0 }}>
              <IDEIcon name="pin" size={12} />pinned</span>
          : <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', fontFamily: 'var(--a2ui-font-mono)', flexShrink: 0 }}>auto · #{p.rank}</span>}
      </div>
    );
  }

  /* ── one roster row (eligible = pinnable, dropped = reason chip) ── */
  function RosterRow(props) {
    var m = props.m, pinned = props.pinned, dropped = props.dropped;
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var drop = dropped ? PG.ROUTE_DROPS[m.gate1.reason] : null;
    return (
      <div onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        onClick={dropped ? undefined : function () { props.onPin(m.id); }}
        style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '7px 9px', borderRadius: 9,
          cursor: dropped ? 'default' : 'pointer', opacity: dropped ? 0.62 : 1, transition: 'background 120ms ease',
          background: pinned ? 'var(--a2ui-accent-subtle)' : (hover && !dropped ? 'var(--a2ui-bg-hover)' : 'transparent') }}>
        <span style={{ width: 16, display: 'inline-flex', justifyContent: 'center', flexShrink: 0,
          color: pinned ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-dim)' }}>
          {dropped
            ? <IDEIcon name="x" size={14} />
            : pinned
              ? <IDEIcon name="pin" size={15} />
              : <span style={{ width: 13, height: 13, borderRadius: 4, border: '1.5px solid var(--a2ui-border-strong)' }} />}
        </span>
        <IDEProviderDot provider={m.provider} size={16} box={26} />
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.3, gap: 1 }}>
          <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--a2ui-text-primary)', display: 'inline-flex', alignItems: 'center', gap: 7, whiteSpace: 'nowrap' }}>
            {m.name}
            {m.flag && <span style={tag('var(--a2ui-text-tertiary)', 'var(--a2ui-bg-elevated)')}>{m.flag}</span>}
          </span>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {dropped ? (m.vendor + ' · ' + (drop ? drop.detail : '')) : (m.brief || (m.vendor + ' · ' + m.kind))}</span>
        </span>
        {dropped
          ? <span title={drop ? drop.detail : ''} style={Object.assign(tag('var(--a2ui-warning)', 'var(--a2ui-warning-bg)'), { fontFamily: 'var(--a2ui-font-mono)', textTransform: 'none', letterSpacing: 0 })}>{m.gate1.reason}</span>
          : pinned
            ? <span style={tag('var(--pxs-accent-text)', 'transparent')}>slot {props.slot}</span>
            : <span style={{ fontSize: 11, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)', flexShrink: 0 }}>#{m.rank}</span>}
      </div>
    );
  }

  function SectionLabel(props) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, padding: '10px 8px 5px' }}>
        <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--a2ui-text-dim)' }}>{props.children}</span>
        {props.note && <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: 10, color: props.ok ? 'var(--a2ui-success)' : 'var(--a2ui-text-dim)' }}>
          {props.ok && <IDEIcon name="check" size={11} />}{props.note}</span>}
        <div style={{ flex: 1 }} />
        {props.right}
      </div>
    );
  }

  /* ════════════ the routing console (floating glass) ════════════ */
  function RoutingConsole(props) {
    var ref = useRef(null);
    useEffect(function () {
      function onDoc(e) { if (ref.current && !ref.current.contains(e.target) && !(props.anchorEl && props.anchorEl.contains(e.target))) props.onClose(); }
      document.addEventListener('mousedown', onDoc);
      return function () { document.removeEventListener('mousedown', onDoc); };
    }, []);

    var d = props.decision, mode = d.mode, mc = MODE_COLOR[mode];
    var modeInfo = PG.ROUTE_MODE[mode];
    var r = props.rect || { top: 0, bottom: 0, left: 0, right: 0 };
    var w = props.width || 372;
    var pos = { position: 'fixed', zIndex: 200, width: w, maxHeight: 'calc(100vh - 24px)', display: 'flex', flexDirection: 'column' };
    if (props.anchor === 'up') pos.bottom = Math.max(12, window.innerHeight - r.top + 8); else pos.top = r.bottom + 8;
    if (props.align === 'right') pos.right = Math.max(12, window.innerWidth - r.right); else pos.left = Math.min(r.left, window.innerWidth - w - 12);

    return (
      <div ref={ref} style={Object.assign(pos, { background: 'var(--a2ui-glass-menu)', backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)', border: '1px solid var(--pxs-glass-border)', borderRadius: 14,
        boxShadow: 'var(--a2ui-shadow-lg)', overflow: 'hidden' })}>

        {/* header */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '11px 14px 10px', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)' }}><IDEIcon name="target" size={15} /></span>
          <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Routing</span>
          <div style={{ flex: 1 }} />
          <span style={Object.assign(tag(mc.c, mc.b), { display: 'inline-flex', alignItems: 'center', gap: 4 })}>
            <IDEIcon name={mc.icon} size={11} />{modeInfo.label}</span>
        </div>

        {/* Auto toggle + Slots/Images steppers */}
        <div style={{ flexShrink: 0, padding: '11px 14px', borderBottom: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-glass-dark)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <Switch on={d.auto} onChange={props.setAuto} />
            <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', lineHeight: 1.25 }}>
              <span style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Auto routing</span>
              <span style={{ fontSize: 10.5, color: 'var(--a2ui-text-dim)' }}>{d.auto ? 'fills open slots + reruns on failure' : 'off — only pinned models run'}</span>
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 11 }}>
            <StepField label="Slots" sub={d.auto ? 'models to run' : 'pins only'} dim={!d.auto}>
              <Stepper value={d.auto ? d.slots : d.pins.length} min={Math.max(1, d.pins.length)} max={8}
                disabled={!d.auto} onChange={props.setSlots} />
            </StepField>
            <StepField label="Images" sub="per model">
              <Stepper value={d.images} min={1} max={8} onChange={props.setImages} />
            </StepField>
          </div>
          <p style={{ margin: '10px 0 0', fontSize: 11.5, lineHeight: 1.45, color: 'var(--a2ui-text-secondary)' }}>{modeInfo.line}</p>
        </div>

        {/* the plan (RoutingDecision preview) */}
        <div style={{ flexShrink: 0, padding: '9px 14px 11px', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <SectionLabel right={<span style={{ fontSize: 10.5, color: 'var(--a2ui-text-dim)', fontFamily: 'var(--a2ui-font-mono)' }}>{d.pool.length} slot{d.pool.length === 1 ? '' : 's'}</span>}>The plan</SectionLabel>
          {d.pool.length === 0
            ? <div style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '9px 10px', borderRadius: 9, background: 'var(--a2ui-warning-bg)' }}>
                <span style={{ color: 'var(--a2ui-warning)', display: 'inline-flex', flexShrink: 0 }}><IDEIcon name="info" size={14} /></span>
                <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--a2ui-text-primary)' }}>Pin at least one model, or turn Auto on.</span>
              </div>
            : <React.Fragment>
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {d.pool.map(function (p, i) { return <PlanRow key={p.id} p={p} i={i} primary={p.id === d.primaryId} />; })}
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginTop: 6, paddingTop: 9, borderTop: '1px solid var(--pxs-border-subtle)' }}>
                  <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', flexShrink: 0 }}><IDEIcon name="layers" size={13} /></span>
                  <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.4 }}>
                    {d.images} {d.images === 1 ? 'image' : 'images'} × {d.pool.length} {d.pool.length === 1 ? 'model' : 'models'} = <b style={{ color: 'var(--a2ui-text-secondary)', fontWeight: 600 }}>{d.runs} {d.runs === 1 ? 'image' : 'images'}</b>
                    <span style={{ color: 'var(--a2ui-text-dim)' }}>{d.cascade ? ' · reruns on fail' : ' · no fallback'}</span>
                  </span>
                </div>
              </React.Fragment>}
        </div>

        {/* roster — Gate 1 split */}
        <div className="ide-scroll" style={{ flex: 1, minHeight: 60, overflowY: 'auto', padding: '2px 8px 6px' }}>
          <SectionLabel note="Gate 1" ok>Eligible</SectionLabel>
          {d.eligible.map(function (m) {
            var pinned = d.pins.indexOf(m.id) !== -1;
            return <RosterRow key={m.id} m={m} pinned={pinned} slot={pinned ? d.pins.indexOf(m.id) + 1 : 0} onPin={props.togglePin} />;
          })}
          {d.dropped.length > 0 && <SectionLabel note="Gate 1">Dropped</SectionLabel>}
          {d.dropped.map(function (m) { return <RosterRow key={m.id} m={m} dropped onPin={props.togglePin} />; })}
        </div>

        {/* footer note */}
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '9px 14px', borderTop: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-glass-dark)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', flexShrink: 0 }}><IDEIcon name="info" size={13} /></span>
          <span style={{ fontSize: 10.5, color: 'var(--a2ui-text-tertiary)', lineHeight: 1.4 }}>
            <b style={{ color: 'var(--a2ui-text-secondary)', fontWeight: 600 }}>Gate 1</b> filters eligibility · <b style={{ color: 'var(--a2ui-text-secondary)', fontWeight: 600 }}>Gate 2</b> ranks the survivors for this prompt.
          </span>
        </div>
      </div>
    );
  }

  /* the trigger — stacked avatars + label + chevron */
  function ModelTrigger(props) {
    var op = useState(false); var open = op[0], setOpen = op[1];
    var rs = useState(null); var rect = rs[0], setRect = rs[1];
    var btnRef = useRef(null);
    var p = props.picker, d = p.decision, compact = props.compact;
    var pool = p.selected;
    var label = pool.length === 0 ? 'No models' : pool.length === 1 ? pool[0].name : pool.length + ' models';
    function toggle() {
      if (open) { setOpen(false); return; }
      if (btnRef.current) setRect(btnRef.current.getBoundingClientRect());
      setOpen(true);
    }
    return (
      <span style={{ position: 'relative', display: 'inline-flex' }}>
        <button ref={btnRef} onClick={toggle}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, height: compact ? 30 : 34, padding: compact ? '0 9px 0 7px' : '0 11px 0 8px',
            background: open ? 'var(--a2ui-bg-active)' : 'transparent', border: '1px solid ' + (open ? 'var(--a2ui-border-strong)' : 'var(--a2ui-border-default)'),
            borderRadius: 9999, cursor: 'pointer', fontFamily: 'inherit', transition: 'all 150ms ease' }}
          onMouseEnter={function (e) { if (!open) e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
          onMouseLeave={function (e) { if (!open) e.currentTarget.style.background = 'transparent'; }}>
          <Stack pool={d.pool.slice(0, 4)} size={compact ? 13 : 14} box={compact ? 20 : 22} />
          <span style={{ fontSize: compact ? 12 : 13, fontWeight: 500, color: 'var(--a2ui-text-secondary)', whiteSpace: 'nowrap' }}>{label}</span>
          <span style={Object.assign(tag(MODE_COLOR[d.mode].c, MODE_COLOR[d.mode].b), { display: compact ? 'none' : 'inline-block' })}>{PG.ROUTE_MODE[d.mode].label}</span>
          <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-dim)' }}><IDEIcon name="chevronDown" size={13} /></span>
        </button>
        {open && rect &&
          <RoutingConsole decision={d} pins={p.pins} auto={p.auto} slots={p.slots}
            togglePin={p.togglePin} setAuto={p.setAuto} setSlots={p.setSlots} setImages={p.setImages}
            anchor={props.anchor || 'down'} align={props.align || 'left'}
            rect={rect} anchorEl={btnRef.current} onClose={function () { setOpen(false); }} />}
      </span>
    );
  }

  Object.assign(window, { IDEModelTrigger: ModelTrigger, IDEModelStack: Stack });
})();

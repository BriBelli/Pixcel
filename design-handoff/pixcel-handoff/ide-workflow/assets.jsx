/* global React, PG, IDEIcon */
/* Pixcel · Image IDE — Assets, rebuilt as a clean reference TREE.
   The asset you're editing is the root; everything it pulls in hangs off it,
   and the branch label (Style / Backdrop / Material …) IS the tag connection.
   Two surfaces share the tree: a compact quick-view (off the rail) and the
   full library page. No pill rows, no stacked sub-labels — just the spine. */
(function () {
  'use strict';
  var useState = React.useState;

  function meta(t) { return PG.ASSET_TYPES[t] || PG.ASSET_TYPES.frame; }
  var DEP_ORDER = ['style', 'backdrop', 'material', 'pose'];

  function groups() {
    var all = PG.ASSETS;
    var root = all.filter(function (a) { return a.self; })[0];
    var deps = all.filter(function (a) { return !a.self && a.type !== 'frame'; })
      .sort(function (a, b) { return DEP_ORDER.indexOf(a.type) - DEP_ORDER.indexOf(b.type); });
    var frames = all.filter(function (a) { return a.type === 'frame'; });
    return { root: root, deps: deps, frames: frames };
  }

  /* L-shaped tree connector — vertical spine + a short stub into the row */
  function Connector(props) {
    return (
      <span style={{ position: 'relative', width: 18, alignSelf: 'stretch', flexShrink: 0 }}>
        <span style={{ position: 'absolute', left: 9, top: 0, height: props.last ? '50%' : '100%', width: 1, background: 'var(--pxs-border-subtle)' }} />
        <span style={{ position: 'absolute', left: 9, top: '50%', width: 7, height: 1, background: 'var(--pxs-border-subtle)' }} />
      </span>
    );
  }

  /* one node — @name (its @ tinted by type), type label, reference count */
  function Leaf(props) {
    var a = props.asset, m = meta(a.type), root = props.root;
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    return (
      <button onClick={props.onClick} onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        style={{ width: '100%', display: 'flex', alignItems: 'stretch', border: 'none', background: 'transparent',
          cursor: props.onClick ? 'pointer' : 'default', textAlign: 'left', fontFamily: 'inherit', padding: 0 }}>
        {props.connector && <Connector last={props.last} />}
        <span style={{ flex: 1, minWidth: 0, display: 'flex', alignItems: 'center', gap: 9, padding: root ? '9px 10px' : '7px 10px', borderRadius: 9,
          background: props.selected ? 'var(--a2ui-bg-active)' : hover ? 'var(--a2ui-bg-hover)' : 'transparent', transition: 'background 120ms ease' }}>
          <span style={{ flex: 1, minWidth: 0, fontFamily: 'var(--a2ui-font-mono)', fontSize: root ? 13.5 : 13,
            fontWeight: root ? 600 : 400, color: 'var(--a2ui-text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            <span style={{ color: m.color }}>@</span>{a.name}
            {a.self && <span style={{ marginLeft: 8, fontFamily: 'var(--a2ui-font-sans, inherit)', fontSize: 9, fontWeight: 600, letterSpacing: '0.4px',
              padding: '1.5px 6px', borderRadius: 9999, color: 'var(--pxs-accent-text)', background: 'var(--a2ui-accent-subtle)', verticalAlign: 'middle' }}>EDITING</span>}
          </span>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)', flexShrink: 0 }}>{m.label}</span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, minWidth: 28, justifyContent: 'flex-end', flexShrink: 0,
            fontFamily: 'var(--a2ui-font-mono)', fontSize: 11, color: a.refs ? 'var(--a2ui-text-secondary)' : 'var(--a2ui-text-dim)' }}>
            <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-dim)' }}><IDEIcon name="layers" size={12} /></span>{a.refs}
          </span>
        </span>
      </button>
    );
  }

  function SectionLabel(props) {
    return <span style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', color: 'var(--a2ui-text-dim)' }}>{props.children}</span>;
  }

  /* inline detail (full page only) — where it's used + swap re-resolves referrers */
  function Detail(props) {
    var a = props.asset, m = meta(a.type);
    var rs = useState(null); var resolved = rs[0], setResolved = rs[1];
    return (
      <div style={{ margin: '1px 0 6px 18px', padding: '10px 12px', borderRadius: 10, background: 'var(--a2ui-cool-950)',
        border: '1px solid var(--pxs-border-subtle)', display: 'flex', flexDirection: 'column', gap: 9 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
          <SectionLabel>Referenced by {a.refs}</SectionLabel>
          {(a.usedIn || []).map(function (u, i) {
            return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12, color: 'var(--a2ui-text-secondary)' }}>
              <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', flexShrink: 0 }}><IDEIcon name="chevronRight" size={12} /></span>{u}
            </div>;
          })}
        </div>
        {resolved &&
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 8, padding: '9px 10px', borderRadius: 9, background: 'var(--a2ui-success-bg)' }}>
            <span style={{ color: 'var(--a2ui-success)', display: 'inline-flex', flexShrink: 0, marginTop: 1 }}><IDEIcon name="check" size={14} /></span>
            <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--a2ui-text-primary)' }}>
              Re-resolved <b style={{ fontWeight: 600 }}>{a.refs} referrers</b> to <span style={{ fontFamily: 'var(--a2ui-font-mono)', color: m.color }}>@{resolved}</span>.
            </span>
          </div>}
        {a.alts && !resolved &&
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <SectionLabel>Swap reference</SectionLabel>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
              {a.alts.map(function (alt) {
                return <button key={alt} onClick={function () { setResolved(alt); }}
                  style={{ display: 'inline-flex', alignItems: 'center', height: 28, padding: '0 11px', cursor: 'pointer', fontFamily: 'var(--a2ui-font-mono)',
                    fontSize: 11.5, color: 'var(--a2ui-text-secondary)', background: 'var(--a2ui-bg-tertiary)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 9999 }}
                  onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
                  onMouseLeave={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-tertiary)'; }}>
                  <span style={{ color: m.color }}>@</span>{alt}
                </button>;
              })}
            </div>
          </div>}
      </div>
    );
  }

  /* the tree itself — shared by both surfaces */
  function Tree(props) {
    var g = groups();
    var ql = (props.query || '').trim().toLowerCase();

    if (ql) {
      var list = PG.ASSETS.filter(function (a) {
        return (a.name + ' ' + a.type + ' ' + a.tags.join(' ')).toLowerCase().indexOf(ql) !== -1;
      });
      if (!list.length) return <div style={{ padding: '26px 12px', textAlign: 'center', color: 'var(--a2ui-text-tertiary)', fontSize: 12.5 }}>Nothing matches “{props.query}”.</div>;
      return <div style={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
        {list.map(function (a) { return <Leaf key={a.id} asset={a} />; })}
      </div>;
    }

    return (
      <div>
        <Leaf asset={g.root} root onClick={props.full ? function () { props.onSelect(props.selected === g.root.id ? null : g.root.id); } : null} selected={props.selected === g.root.id} />
        <div style={{ marginLeft: 11 }}>
          {g.deps.map(function (a, i) {
            var sel = props.selected === a.id;
            return (
              <React.Fragment key={a.id}>
                <Leaf asset={a} connector last={i === g.deps.length - 1}
                  onClick={props.full ? function () { props.onSelect(sel ? null : a.id); } : null} selected={sel} />
                {props.full && sel && (a.usedIn || a.alts) && <Detail asset={a} />}
              </React.Fragment>
            );
          })}
        </div>

        <div style={{ marginTop: 11, paddingTop: 11, borderTop: '1px solid var(--pxs-border-subtle)' }}>
          <div style={{ padding: '0 2px', whiteSpace: 'nowrap' }}>
            <SectionLabel>Frames · {g.frames.length} outputs</SectionLabel>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
            {g.frames.map(function (f) {
              return <span key={f.id} style={{ display: 'inline-flex', alignItems: 'center', height: 26, padding: '0 10px', fontFamily: 'var(--a2ui-font-mono)',
                fontSize: 11.5, color: 'var(--a2ui-text-secondary)', background: 'var(--a2ui-bg-tertiary)', border: '1px solid var(--pxs-border-subtle)', borderRadius: 9999, whiteSpace: 'nowrap' }}>
                <span style={{ color: meta('frame').color }}>@</span>{f.name}</span>;
            })}
          </div>
        </div>
      </div>
    );
  }

  function SearchBar(props) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 11px', height: 36,
        background: 'var(--a2ui-bg-input)', border: '1px solid var(--a2ui-border-default)', borderRadius: 9 }}>
        <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)', flexShrink: 0 }}><IDEIcon name="aperture" size={14} /></span>
        <input value={props.value} onChange={function (e) { props.onChange(e.target.value); }} placeholder="Search assets & tags…"
          style={{ flex: 1, minWidth: 0, background: 'transparent', border: 'none', outline: 'none', fontFamily: 'var(--a2ui-font-mono)', fontSize: 12, color: 'var(--a2ui-text-primary)' }} />
        {props.value && <button onClick={function () { props.onChange(''); }} style={{ display: 'inline-flex', background: 'transparent', border: 'none', color: 'var(--a2ui-text-tertiary)', cursor: 'pointer', padding: 0 }}><IDEIcon name="x" size={13} /></button>}
      </div>
    );
  }

  /* ════════ quick view — hangs off the rail; links out to the full library ════════ */
  function AssetsQuick(props) {
    var q = useState(''); var query = q[0], setQuery = q[1];
    return (
      <React.Fragment>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 9, padding: '12px 14px 11px', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)' }}><IDEIcon name="image" size={16} /></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Assets</span>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>in this project</span>
        </div>
        <div style={{ padding: '11px 12px 0' }}><SearchBar value={query} onChange={setQuery} /></div>
        <div className="ide-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '10px 10px 6px' }}>
          <Tree query={query} full={false} />
        </div>
        <button onClick={props.onOpenFull}
          style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '11px 14px', cursor: 'pointer',
            fontFamily: 'inherit', fontSize: 12.5, fontWeight: 500, color: 'var(--a2ui-text-primary)', background: 'var(--a2ui-glass-dark)',
            border: 'none', borderTop: '1px solid var(--pxs-border-subtle)', textAlign: 'left' }}
          onMouseEnter={function (e) { e.currentTarget.style.background = 'var(--a2ui-bg-hover)'; }}
          onMouseLeave={function (e) { e.currentTarget.style.background = 'var(--a2ui-glass-dark)'; }}>
          <span style={{ flex: 1 }}>Open full library</span>
          <span style={{ display: 'inline-flex', color: 'var(--a2ui-text-tertiary)' }}><IDEIcon name="chevronRight" size={15} /></span>
        </button>
      </React.Fragment>
    );
  }

  /* ════════ full library page — same tree, with inline detail + swap ════════ */
  function AssetsPanel(props) {
    var q = useState(''); var query = q[0], setQuery = q[1];
    var sl = useState('noir-grade'); var selected = sl[0], setSelected = sl[1];
    return (
      <aside style={{ width: props.width || 340, flexShrink: 0, height: '100%', background: 'var(--a2ui-bg-app)',
        borderRight: '1px solid var(--a2ui-border-default)', display: 'flex', flexDirection: 'column', minHeight: 0 }}>

        <div style={{ flexShrink: 0, padding: '12px 12px 11px', borderBottom: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
            <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)' }}><IDEIcon name="image" size={17} /></span>
            <span style={{ fontSize: 13.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Assets library</span>
            <div style={{ flex: 1 }} />
            <button title="Close" onClick={props.onClose}
              style={{ width: 30, height: 30, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'transparent',
                color: 'var(--a2ui-text-tertiary)', border: 'none', borderRadius: 8, cursor: 'pointer', padding: 0 }}>
              <IDEIcon name="chevronLeft" size={16} />
            </button>
          </div>
          <div style={{ marginTop: 10 }}><SearchBar value={query} onChange={setQuery} /></div>
        </div>

        <div className="ide-scroll" style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '12px 10px' }}>
          <Tree query={query} full selected={selected} onSelect={setSelected} />
        </div>

        <div style={{ flexShrink: 0, padding: '10px 12px', borderTop: '1px solid var(--pxs-border-subtle)', background: 'var(--a2ui-cool-900)',
          display: 'flex', alignItems: 'center', gap: 9 }}>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>Swap any reference to re-resolve every frame that points at it.</span>
          <div style={{ flex: 1 }} />
          <button style={{ display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 12px', borderRadius: 8, cursor: 'pointer', fontFamily: 'inherit',
            fontSize: 12, fontWeight: 600, background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-primary)', border: '1px solid var(--a2ui-border-default)', flexShrink: 0 }}>
            <IDEIcon name="plus" size={14} />Deposit
          </button>
        </div>
      </aside>
    );
  }

  Object.assign(window, { IDEAssetsQuick: AssetsQuick, IDEAssetsPanel: AssetsPanel });
})();

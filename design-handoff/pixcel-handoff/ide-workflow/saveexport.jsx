/* global React, IDEIcon */
/* Pixcel · Image IDE — Export quick popover (hangs off the rail's Export button).
   Deliberately small + non-technical: pick what to export, pick a format, done.
   Saving is automatic, so there is no separate "Save" surface anymore. */
(function () {
  'use strict';
  var useState = React.useState;

  /* friendly, human formats — no SVG/JSON engineer clutter */
  var FORMATS = [
    { id: 'png', name: 'PNG image', sub: 'Best quality', icon: 'image' },
    { id: 'jpg', name: 'JPEG image', sub: 'Smaller file', icon: 'image' },
    { id: 'pxc', name: 'Project file', sub: 'Keep editing later', icon: 'file', accent: true },
  ];

  function ScopeToggle(props) {
    var opts = [['frame', 'This frame'], ['sheet', 'Whole sheet']];
    return (
      <div style={{ display: 'inline-flex', width: '100%', background: 'var(--a2ui-cool-950)', borderRadius: 9, padding: 2, gap: 2 }}>
        {opts.map(function (o) {
          var on = props.value === o[0];
          return <button key={o[0]} onClick={function () { props.onChange(o[0]); }}
            style={{ flex: 1, padding: '7px 4px', borderRadius: 7, border: 'none', cursor: 'pointer', fontFamily: 'inherit',
              fontSize: 12, fontWeight: 500, transition: 'all 150ms ease',
              background: on ? 'var(--a2ui-bg-elevated)' : 'transparent', color: on ? 'var(--a2ui-text-primary)' : 'var(--a2ui-text-tertiary)' }}>{o[1]}</button>;
        })}
      </div>
    );
  }

  function ExportRow(props) {
    var f = props.f;
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    return (
      <button onClick={props.onClick} onMouseEnter={function () { setHover(true); }} onMouseLeave={function () { setHover(false); }}
        style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '9px 10px', borderRadius: 10, border: 'none',
          cursor: 'pointer', textAlign: 'left', fontFamily: 'inherit', background: hover ? 'var(--a2ui-bg-hover)' : 'transparent', transition: 'background 120ms ease' }}>
        <span style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          background: f.accent ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-bg-tertiary)', color: f.accent ? 'var(--pxs-accent-text)' : 'var(--a2ui-text-secondary)' }}>
          <IDEIcon name={props.done ? 'check' : f.icon} size={16} />
        </span>
        <span style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 2 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--a2ui-text-primary)' }}>{props.done ? 'Exported' : f.name}</span>
          <span style={{ fontSize: 11, color: 'var(--a2ui-text-tertiary)' }}>{f.sub}</span>
        </span>
        <span style={{ display: 'inline-flex', color: hover ? 'var(--a2ui-text-secondary)' : 'var(--a2ui-text-dim)' }}>
          <IDEIcon name={props.done ? 'check' : 'export'} size={15} />
        </span>
      </button>
    );
  }

  function ExportQuick(props) {
    var sc = useState('sheet'); var scope = sc[0], setScope = sc[1];
    var dn = useState(null); var done = dn[0], setDone = dn[1];
    function run(f) {
      setDone(f.id);
      setTimeout(function () { setDone(null); if (props.onClose) props.onClose(); }, 850);
    }
    return (
      <React.Fragment>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 8, padding: '12px 14px 11px', borderBottom: '1px solid var(--pxs-border-subtle)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)' }}><IDEIcon name="export" size={16} /></span>
          <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Export</span>
        </div>

        <div style={{ padding: '12px 12px 6px' }}>
          <ScopeToggle value={scope} onChange={setScope} />
        </div>

        <div style={{ padding: '2px 6px 6px' }}>
          {FORMATS.map(function (f) { return <ExportRow key={f.id} f={f} done={done === f.id} onClick={function () { run(f); }} />; })}
        </div>
      </React.Fragment>
    );
  }

  Object.assign(window, { IDEExportQuick: ExportQuick });
})();

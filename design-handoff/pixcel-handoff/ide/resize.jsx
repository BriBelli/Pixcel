/* global React */
/* Pixcel · Image IDE — draggable panel divider.
   A thin strip that sits on the seam between two flex panels. Drag to resize,
   double-click to reset. side = which side the RESIZED panel sits on:
     'left'  → panel is to the left of the handle  (drag right grows it)
     'right' → panel is to the right of the handle (drag right shrinks it) */
(function () {
  'use strict';
  var useState = React.useState;

  function ResizeHandle(props) {
    var hv = useState(false); var hover = hv[0], setHover = hv[1];
    var ac = useState(false); var active = ac[0], setActive = ac[1];

    function onDown(e) {
      e.preventDefault();
      var startX = e.clientX, startW = props.width;
      setActive(true);
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      function move(ev) {
        var dx = ev.clientX - startX;
        var raw = props.side === 'right' ? startW - dx : startW + dx;
        props.onResize(Math.max(props.min, Math.min(props.max, raw)));
      }
      function up() {
        setActive(false);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
      }
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    }

    var show = hover || active;
    return React.createElement('div', {
      onPointerDown: onDown,
      onDoubleClick: props.onReset,
      onMouseEnter: function () { setHover(true); },
      onMouseLeave: function () { setHover(false); },
      title: 'Drag to resize · double-click to reset',
      style: { position: 'relative', width: 7, flexShrink: 0, alignSelf: 'stretch',
        marginLeft: -3.5, marginRight: -3.5, cursor: 'col-resize', zIndex: 50, background: 'transparent' },
    },
      // the seam line, lit on hover/drag
      React.createElement('div', { style: { position: 'absolute', top: 0, bottom: 0, left: '50%',
        transform: 'translateX(-50%)', width: active ? 2 : show ? 1.5 : 1,
        background: show ? 'var(--a2ui-accent)' : 'transparent', transition: 'background 120ms ease, width 120ms ease' } }),
      // grip pill
      React.createElement('div', { style: { position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)', width: 4, height: 32, borderRadius: 9999,
        background: show ? 'var(--a2ui-accent)' : 'var(--a2ui-border-strong)',
        opacity: show ? 1 : 0, transition: 'opacity 120ms ease',
        boxShadow: '0 0 0 3px var(--pxs-bg-host)' } })
    );
  }

  Object.assign(window, { IDEResizeHandle: ResizeHandle });
})();

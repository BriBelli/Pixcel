/* global React, IDEIcon, IDEProviderDot, PG */
/* Pixcel · Image IDE — Suggestions panel. Live, model-aware prompt autocomplete.
   Reads the current build, proposes the next clause; Apply writes straight to the fields. */
(function () {
  'use strict';
  var useState = React.useState;

  /* curated, model-flavored example clauses per part (the "AI formula" output) */
  var IDEAS = {
    subject: ['a weathered bronze automaton with exposed brass gears', 'a lone astronaut in a worn pressure suit'],
    action: ['mid-stride, cloak caught in the wind', 'reaching toward the camera, fingers splayed'],
    context: ['in a fog-filled cathedral lit by a single shaft of light', 'against a dusk skyline of distant neon towers'],
    composition: ['Low-angle shot', 'Shallow depth of field (f/1.8)'],
    style: ['Chiaroscuro', 'Medium-format analog film', 'Muted teal tones'],
  };

  function buildSuggestions(fields, a, model) {
    var out = [];
    var byId = {};
    a.parts.forEach(function (p) { byId[p.id] = p; });

    // 1) fill missing parts — highest leverage, ordered by model weight
    var missing = model.parts.filter(function (p) { return !byId[p.id].present; });
    missing.forEach(function (p) {
      out.push(makeIdea(p, fields, 'add'));
    });

    // 2) sharpen thin-but-present parts
    model.parts.forEach(function (p) {
      var s = byId[p.id];
      if (s.present && s.score < 18) out.push(makeIdea(p, fields, 'sharpen'));
    });

    // 3) once strong, offer a model-specific elevate
    if (a.overall >= 70) {
      out.push({ kind: 'elevate', partId: 'style', color: PG.C.purple, icon: 'aperture',
        title: 'Lock consistency for the reference sheet',
        text: 'Repeat the exact wardrobe + ' + (fields.anchors && fields.anchors[0] ? '“' + fields.anchors[0] + '”' : 'key anchors') + ' in every view so ' + model.name + ' keeps the character identical across angles.',
        apply: null });
    }
    return out;
  }

  function makeIdea(part, fields, kind) {
    var pool = IDEAS[part.id] || [part.placeholder || ''];
    var pick = pool[0];
    var meta = {
      kind: kind, partId: part.id, color: part.color, icon: part.icon || 'sparkles',
      title: (kind === 'add' ? 'Add ' : 'Sharpen ') + part.label.toLowerCase(),
    };
    if (part.id === 'composition') {
      meta.text = pick; meta.apply = { field: 'composition', value: pick, mode: 'set' };
    } else if (part.id === 'style') {
      meta.text = '+ ' + pick; meta.apply = { field: 'style', value: pick, mode: 'addTag' };
    } else if (kind === 'sharpen') {
      meta.text = '“' + (fields[part.id] || '') + '” → ' + (fields[part.id] || '') + ', ' + secondClause(part.id);
      meta.apply = { field: part.id, value: (fields[part.id] || '') + ', ' + secondClause(part.id), mode: 'set' };
    } else {
      meta.text = pick; meta.apply = { field: part.id, value: pick, mode: 'set' };
    }
    return meta;
  }
  function secondClause(id) {
    return { subject: 'fine surface scratches catching the light', action: 'weight settled onto the back foot',
      context: 'soft volumetric haze in the background', composition: 'centered framing', style: 'cinematic grade' }[id] || 'with rich detail';
  }

  function SuggestionsPanel(props) {
    var model = props.model, fields = props.fields, a = props.analysis;
    var ideas = buildSuggestions(fields, a, model);
    var applied = useState({}); var done = applied[0], setDone = applied[1];

    function apply(idx, idea) {
      if (!idea.apply) { setDone(Object.assign({}, done, { ['x' + idx]: true })); return; }
      var ap = idea.apply;
      if (ap.mode === 'addTag') {
        var cur = fields.style || [];
        if (cur.map(function (s) { return s.toLowerCase(); }).indexOf(ap.value.toLowerCase()) === -1) props.setField('style', cur.concat([ap.value]));
      } else {
        props.setField(ap.field, ap.value);
      }
      setDone(Object.assign({}, done, { ['x' + idx]: true }));
    }

    return (
      <div className="ide-scroll" style={{ height: '100%', overflowY: 'auto', padding: 16, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* header */}
        <div style={{ display: 'flex', gap: 11, alignItems: 'flex-start', padding: '12px 13px', borderRadius: 12,
          background: 'var(--a2ui-accent-subtle)' }}>
          <span style={{ display: 'inline-flex', color: 'var(--pxs-accent-text)', flexShrink: 0, marginTop: 1 }}><IDEIcon name="sparkles" size={16} /></span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>Live suggestions</span>
            <span style={{ fontSize: 12, lineHeight: 1.5, color: 'var(--a2ui-text-secondary)' }}>
              The {model.name} agent reads your prompt and proposes the next clause. Apply to write it straight into the build.
            </span>
          </div>
        </div>

        {ideas.length === 0 &&
          <div style={{ textAlign: 'center', padding: '40px 16px', color: 'var(--a2ui-text-tertiary)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
            <IDEIcon name="check" size={36} />
            <span style={{ fontSize: 13 }}>All five parts are strong. Nothing to add.</span>
          </div>}

        {ideas.map(function (idea, i) {
          var isDone = done['x' + i];
          return (
            <div key={i} style={{ borderRadius: 12, background: 'var(--a2ui-bg-primary)', padding: 14,
              display: 'flex', flexDirection: 'column', gap: 10, opacity: isDone ? 0.55 : 1, transition: 'opacity 200ms ease' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ width: 7, height: 7, borderRadius: 2, background: idea.color, flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12.5, fontWeight: 600, color: 'var(--a2ui-text-primary)' }}>{idea.title}</span>
                <span style={{ fontSize: 9.5, fontWeight: 600, letterSpacing: '0.4px', textTransform: 'uppercase',
                  color: idea.kind === 'add' ? 'var(--a2ui-warning)' : idea.kind === 'sharpen' ? 'var(--pxs-accent-text)' : 'var(--a2ui-success)',
                  background: idea.kind === 'add' ? 'var(--a2ui-warning-bg)' : idea.kind === 'sharpen' ? 'var(--a2ui-accent-subtle)' : 'var(--a2ui-success-bg)',
                  padding: '2px 8px', borderRadius: 9999 }}>{idea.kind}</span>
              </div>
              <p style={{ margin: 0, fontSize: 12.5, lineHeight: 1.5, color: 'var(--a2ui-text-secondary)' }}>{idea.text}</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={function () { apply(i, idea); }} disabled={isDone}
                  style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8, border: 'none',
                    cursor: isDone ? 'default' : 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                    background: isDone ? 'var(--a2ui-success-bg)' : 'var(--a2ui-accent)', color: isDone ? 'var(--a2ui-success)' : 'var(--a2ui-text-inverse)' }}>
                  <IDEIcon name={isDone ? 'check' : 'plus'} size={13} />{isDone ? 'Applied' : idea.apply ? 'Apply' : 'Note'}
                </button>
                {idea.apply &&
                  <button onClick={function () { props.onJump('build'); }}
                    style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 8,
                      border: 'none', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 500,
                      background: 'var(--a2ui-bg-tertiary)', color: 'var(--a2ui-text-secondary)' }}>
                    Open in Build
                  </button>}
              </div>
            </div>
          );
        })}

        <p style={{ margin: '2px 0 0', fontSize: 10.5, color: 'var(--a2ui-text-dim)', textAlign: 'center' }}>{model.source}</p>
      </div>
    );
  }

  Object.assign(window, { IDESuggestionsPanel: SuggestionsPanel });
})();

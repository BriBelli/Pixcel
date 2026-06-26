/* global React, ReactDOM, PG, PGRail, PGTopBar, PGPromptBar, PGChatArea, PromptGuidePanel, useTweaks, TweaksPanel, TweakSection, TweakRadio, TweakToggle */
/* Pixcel · Prompt Guide — root app wiring */
(function () {
  'use strict';
  var h = React.createElement;
  var useState = React.useState, useEffect = React.useEffect, useRef = React.useRef;

  var TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "scoreViz": "donut",
    "density": "regular",
    "showLegend": true
  }/*EDITMODE-END*/;

  function App() {
    var tw = useTweaks(TWEAK_DEFAULTS); var t = tw[0], setTweak = tw[1];
    var modelState = useState(PG.MODELS[0]); var model = modelState[0], setModel = modelState[1];
    var promptState = useState(''); var prompt = promptState[0], setPrompt = promptState[1];
    var analysisState = useState(null); var analysis = analysisState[0], setAnalysis = analysisState[1];
    var modeState = useState('Image'); var mode = modeState[0], setMode = modeState[1];
    var toolsState = useState({ promptGuide: true }); var tools = toolsState[0], setTools = toolsState[1];
    var editsState = useState({}); var edits = editsState[0], setEdits = editsState[1];
    var debounceRef = useRef(null);

    var tweaks = {
      scoreViz: t.scoreViz, showLegend: t.showLegend,
      width: t.density === 'compact' ? 348 : 388,
      pad: t.density === 'compact' ? 14 : 18,
    };

    // debounced live analysis as the user types
    useEffect(function () {
      clearTimeout(debounceRef.current);
      if (!prompt.trim()) { setAnalysis(null); return; }
      debounceRef.current = setTimeout(function () {
        setAnalysis(PG.analyze(prompt, model));
      }, 240);
      return function () { clearTimeout(debounceRef.current); };
    }, [prompt, model]);

    useEffect(function () { setEdits({}); }, [model]);
    useEffect(function () { if (!prompt.trim()) setEdits({}); }, [prompt]);

    function toggleTool(id) { setTools(function (s) { var n = Object.assign({}, s); n[id] = !n[id]; return n; }); }
    function setEdit(partId, value) { setEdits(function (e) { var n = Object.assign({}, e); n[partId] = value; return n; }); }
    function clearPart(partId) { setEdits(function (e) { var n = Object.assign({}, e); n[partId] = ''; return n; }); }
    function applyAction(kind, text) { if (kind === 'replace') { setPrompt(text); setEdits({}); } }
    function tryExample() { setPrompt(model.example); }

    var guideOn = !!tools.promptGuide;

    return h('div', { style: { position: 'fixed', inset: 0, display: 'flex', background: 'var(--a2ui-bg-app)' } },
      h(PGRail, { onCollapse: function () {} }),
      h('div', { style: { flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 } },
        h(PGTopBar, { tools: tools, onToggleTool: toggleTool }),
        h(PGChatArea, { value: prompt, onChange: setPrompt, model: model }),
        h(PGPromptBar, { value: prompt, onChange: setPrompt, mode: mode, setMode: setMode,
          model: model, tools: tools, guideScore: analysis ? analysis.overall : null,
          onReopenGuide: function () { if (!guideOn) toggleTool('promptGuide'); } })),
      guideOn && h(PromptGuidePanel, {
        model: model, models: PG.MODELS, prompt: prompt, analysis: analysis,
        onModel: setModel, onClose: function () { toggleTool('promptGuide'); }, onApply: applyAction,
        edits: edits, setEdit: setEdit, clearPart: clearPart, onTryExample: tryExample, tweaks: tweaks,
      }),

      h(TweaksPanel, null,
        h(TweakSection, { label: 'Score visualization' }),
        h(TweakRadio, { label: 'Breakdown', value: t.scoreViz, options: ['donut', 'bars'],
          onChange: function (v) { setTweak('scoreViz', v); } }),
        h(TweakToggle, { label: 'Show legend', value: t.showLegend, onChange: function (v) { setTweak('showLegend', v); } }),
        h(TweakSection, { label: 'Layout' }),
        h(TweakRadio, { label: 'Density', value: t.density, options: ['regular', 'compact'],
          onChange: function (v) { setTweak('density', v); } })));
  }

  ReactDOM.createRoot(document.getElementById('root')).render(h(App));
})();

/* DEV SCRATCH — not product. Option-1 proof: the "perfect medium" painter —
 * a FEW coarse→fine PASSES, each a BATCH of edits (multi-gesture), eyes-open between passes,
 * full effort, true-scale perception, no persona, no exemplars, bounded cost. Proves the medium
 * hits the bar cheaply before it's wired into product (lib/live-jobs.ts) + the SSE live show.
 * Run:  node --env-file=packages/pxs-studio/.env.local packages/pxs-studio/painter-harness.mjs [subject]
 */
import zlib from 'zlib';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import Anthropic from '@anthropic-ai/sdk';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MODEL = 'claude-opus-4-8';
const SIZE = 32;
const SUBJECT = process.argv[2] || 'an owl';
const MAX_PASSES = 8;            // default ~6 passes; hard ceiling 8 (keep-best + read-level gate converge fast, no churn)
const COST_CAP = 3;             // hard ceiling (no-churn target lands well under)
// STATUE PHASES (corrected). SHAPE = masses/form, DEFER fine detail → POLISH = complete the deferred
// details ON TOP of the LOCKED shape (auditor ACCEPTS the shape, never re-opens it; judge at READ
// level, not sub-pixel) → QA = whole-piece read-level check. keep-best ships the last APPROVED state,
// never a churned one. Tight reject caps + read-level judging = no churn, ~6 passes.
const PHASES = [
  { key:'shape', cap:3,
    drawer:'block the whole figure — silhouette, masses, and form (base + one shadow + one highlight), filling the canvas as a deliberate FULL composition. Place features as simple BLOCKS so it reads (a plain eye blob is fine) — do NOT render fine detail yet; that is the polish phase',
    bar:'the masses, silhouette, form and composition are right and the figure reads as the subject in BLOCK form (features placed as simple blocks is fine). Foundational SHAPE only — do NOT demand finished eyes / texture / fine detail yet (that is polish). Approve once the SHAPE is loved.' },
  { key:'polish', cap:2,
    drawer:'PHASE: POLISH — the shape is LOCKED and loved; do NOT reshape, move, or re-block anything. Look INWARD and COMPLETE the deferred details ON TOP: render the eyes properly per the brief, add texture / feather / identity touches. After each detail, re-look at THAT spot and fix it locally',
    bar:'ACCEPT the locked shape — do NOT re-evaluate the silhouette / composition / proportions (that is settled and loved). Judge ONLY the interior DETAIL added on top: do the eyes / texture / identity touches READ well per the brief? Approve once the details READ well.' },
  { key:'qa', cap:2,
    drawer:'PHASE: QA — reply DONE to request the final read-level sweep; if the art director flags a real blemish, fix EXACTLY it with a micro edit (no reshaping), then reply DONE again',
    bar:'FINAL QA: step back and read the WHOLE piece at true display scale. Does it INSTANTLY read as the subject (child test), full form, clean, grounded, at the 96% hero bar? Approve on a clean READ-level pass; flag ONLY a real blemish that genuinely breaks the read.' },
];
const BG = '#0d1117';
const OUT = path.join(__dirname, 'painter-out');
fs.mkdirSync(OUT, { recursive: true });

const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('No ANTHROPIC_API_KEY (use --env-file)'); process.exit(1); }
const client = new Anthropic({ apiKey });

// ---- correct Opus 4.8 pricing ($5/$25; cache write 6.25, read 0.5) ----
const PRICE = { in: 5, cacheWrite: 6.25, cacheRead: 0.5, out: 25 };
let spent = 0;
function addCost(u = {}) {
  spent += ((u.input_tokens || 0) * PRICE.in + (u.cache_creation_input_tokens || 0) * PRICE.cacheWrite +
    (u.cache_read_input_tokens || 0) * PRICE.cacheRead + (u.output_tokens || 0) * PRICE.out) / 1e6;
}

// ---- minimal PNG (true-scale render the model perceives) ----
function crc32(b){let c=~0;for(let i=0;i<b.length;i++){c^=b[i];for(let k=0;k<8;k++)c=(c>>>1)^(0xedb88320&-(c&1));}return ~c>>>0;}
function chunk(t,d){const l=Buffer.alloc(4);l.writeUInt32BE(d.length,0);const ty=Buffer.from(t);const cr=Buffer.alloc(4);cr.writeUInt32BE(crc32(Buffer.concat([ty,d])),0);return Buffer.concat([l,ty,d,cr]);}
function png(w,h,rgb){const s=Buffer.from([137,80,78,71,13,10,26,10]);const ih=Buffer.alloc(13);ih.writeUInt32BE(w,0);ih.writeUInt32BE(h,4);ih[8]=8;ih[9]=2;const raw=Buffer.alloc((w*3+1)*h);for(let y=0;y<h;y++){raw[y*(w*3+1)]=0;rgb.copy(raw,y*(w*3+1)+1,y*w*3,(y+1)*w*3);}return Buffer.concat([s,chunk('IHDR',ih),chunk('IDAT',zlib.deflateSync(raw)),chunk('IEND',Buffer.alloc(0))]);}
function hex(h){h=h.replace('#','');return [parseInt(h.slice(0,2),16),parseInt(h.slice(2,4),16),parseInt(h.slice(4,6),16)];}
function renderPng(canvas, scale = 16) {
  const { cols, rows, palette, grid } = canvas;
  const W = cols*scale, H = rows*scale, rgb = Buffer.alloc(W*H*3);
  const pal = {}; for (const k in palette) pal[k] = hex(palette[k]); pal['.'] = hex(BG);
  for (let y=0;y<rows;y++) for (let x=0;x<cols;x++){ const c = pal[grid[y][x]] || pal['.'];
    for (let dy=0;dy<scale;dy++) for (let dx=0;dx<scale;dx++){ const i=((y*scale+dy)*W+(x*scale+dx))*3; rgb[i]=c[0];rgb[i+1]=c[1];rgb[i+2]=c[2]; } }
  return png(W,H,rgb).toString('base64');
}
function asciiView(c){const head='   '+Array.from({length:c.cols},(_,x)=>(x%10)).join('');return head+'\n'+c.grid.map((r,y)=>`${String(y).padStart(2,' ')} ${r.join('')}`).join('\n');}

const SETUP_TOOL = { name:'setup', description:'Set up the canvas ONCE before painting: title, dimensions, palette. Call first.',
  input_schema:{ type:'object', additionalProperties:false, properties:{ title:{type:'string'}, cols:{type:'integer'}, rows:{type:'integer'}, palette:{type:'object', additionalProperties:{type:'string'}} }, required:['title','cols','rows','palette'] } };
const PAINT_TOOL = { name:'paint', description:'Apply ONE coarse→fine PASS as a BATCH of cell edits (many cells — a whole stage like the silhouette, the shading, or the identity details), NOT one lonely cell and NOT the whole finished image blind. Use "." to ERASE. After each pass you SEE the re-rendered canvas at true scale.',
  input_schema:{ type:'object', additionalProperties:false, properties:{ note:{type:'string',description:'one short phrase: what this pass does'}, edits:{type:'array', items:{type:'object', additionalProperties:false, properties:{ x:{type:'integer'}, y:{type:'integer'}, c:{type:'string'} }, required:['x','y','c']}} }, required:['edits'] } };

const SYSTEM = `You are Pixcel's pixel-art composer. You make small, iconic pixel art by REASONING about a grid — never by quantizing a photo. Small pixel art is a structured-data problem.

Stay Pure: exactly one solid color per cell — NO gradients, anti-aliasing, dithering, or hue-shift. Background is ${BG}. Lowercase hex.

THE most important decision (before a pixel): fit the design to the size. At 32² draw the FULL figure with real form. Lead with the ONE silhouette/feature that names the subject. Fill the canvas deliberately — no floating in dead space; centered or balanced; fill ≠ distort (reach the edges by framing, never by warping proportions). Build form with a base + one shadow + one highlight; shadow the far side for depth. Give creatures life (eyes with a 1px highlight, a mouth). Clean: no stray cells; symmetric where it should be. Squint test: a few big light/dark masses must still read as the subject. NEVER imitate a reference — invent it.

HOW YOU WORK — a FEW coarse→fine PASSES on a persistent, erasable canvas, seeing it re-rendered after EACH pass:
1. Call \`setup\` ONCE: dimensions + a deliberate 4–6 color palette (base, shadow, highlight, plus feature colors; "." is background).
2. Then PAINT in PASSES with \`paint\` — each call is ONE coarse→fine STAGE as a BATCH of edits (many cells at once), NOT a single cell and NOT the whole finished image blind:
   • Pass 1: block the WHOLE silhouette so it fills the canvas and reads at a glance.
   • Pass 2: major forms + shadow/highlight (volume, not a flat blob).
   • Pass 3: the identity-defining details (the cues that name the subject; expression).
   • Pass 4+: clean up and fix exactly what you SEE.
3. LOOK at each render cold, like a stranger, against your bar at true scale (the render is ground truth, not your intent). If the SILHOUETTE is wrong, ERASE and re-block it — do NOT polish a wrong shape.
4. Work to a 96% bar: ship when it clears — don't chase 100% ("better than perfect makes it worse"), and don't invent flaws (a clean early finish is good).
5. Reply DONE (single word, no tool call) the moment it clears the bar.`;

async function call(messages) {
  const s = client.messages.stream({
    model: MODEL, max_tokens: 32000, thinking: { type:'adaptive', display:'summarized' }, output_config: { effort:'high' },
    system: [{ type:'text', text: SYSTEM, cache_control:{type:'ephemeral'} }],
    tools: [SETUP_TOOL, { ...PAINT_TOOL, cache_control:{type:'ephemeral'} }],
    messages,
  });
  const msg = await s.finalMessage();
  addCost(msg.usage || {});
  return msg;
}

// ---- the recovered AUDITOR (independent art director: steamroller rigor + specific issues, bar-anchored) ----
const AUDIT_MODEL = 'claude-opus-4-8'; // same key; swap to Fable 5 / cross-vendor for more independence
const REF_FILES = { 'an owl': 'ab-results/ref-owl.png', 'a t-rex': 'ab-results/ref-t-rex.png' };
let REF_B64 = null;
try { const rf = REF_FILES[SUBJECT]; if (rf && fs.existsSync(path.join(__dirname, rf))) REF_B64 = fs.readFileSync(path.join(__dirname, rf)).toString('base64'); } catch {}
let DESIGN_SPEC = ''; // the Michelangelo step — the committed iconic design brief; the drawer executes it, the auditor judges fidelity to it (kills per-run gamble + detail oscillation)
const AUDIT_SCHEMA = { type:'object', additionalProperties:false, properties:{ approved:{type:'boolean'}, issues:{type:'array', items:{type:'string'}} }, required:['approved','issues'] };
// (the auditor's system prompt is built per-phase inside audit())
async function audit(candB64, phaseKey, phaseBar) {
  const sys = `You are an exacting but FAIR, INDEPENDENT pixel-art art director judging the "${phaseKey.toUpperCase()}" phase of "${SUBJECT}". You did NOT draw it. The piece must realize this COMMITTED DESIGN BRIEF (judge fidelity to IT; do NOT invent new preferences mid-way):\n${DESIGN_SPEC}\n\n${REF_B64?'You are also shown a REFERENCE for the quality bar, then the CANDIDATE':'Judge the CANDIDATE'}, at true display scale.\nTHE BAR FOR THIS PHASE: ${phaseBar}\nJUDGE AT THE READ LEVEL for a 32×32 grid: features are only a few pixels — do NOT demand sub-pixel perfection or perfect symmetry, and do NOT churn on tiny nitpicks that don't change how it reads ("better than perfect makes it worse"). Approve as soon as this phase's bar genuinely READS as met; withhold approval only for a REAL flaw, and then list specific, fixable issues (most important first).`;
  const content = [];
  if (REF_B64) { content.push({type:'text',text:'REFERENCE (the hero bar):'}); content.push({type:'image',source:{type:'base64',media_type:'image/png',data:REF_B64}}); }
  content.push({type:'text',text:'CANDIDATE (judge this for the current phase):'}); content.push({type:'image',source:{type:'base64',media_type:'image/png',data:candB64}});
  content.push({type:'text',text:'Judge the CANDIDATE for the current phase. Return approved + the specific issues.'});
  try {
    const s = client.messages.stream({ model:AUDIT_MODEL, max_tokens:1500, system:sys, output_config:{ format:{type:'json_schema', schema:AUDIT_SCHEMA} }, messages:[{role:'user',content}] });
    const msg = await s.finalMessage(); addCost(msg.usage||{});
    const raw = msg.content.filter(b=>b.type==='text').map(b=>b.text).join('');
    const p = JSON.parse(raw); return { approved: !!p.approved, issues: Array.isArray(p.issues)?p.issues.slice(0,5):[] };
  } catch(e){ return { approved:false, issues:[`auditor error: ${e.message}`] }; }
}

// ---- THE MICHELANGELO STEP: commit the iconic design BEFORE carving (reduces the per-run gamble) ----
async function designVision(subject) {
  const sys = `You are Pixcel's lead pixel-art designer. For a ${SIZE}×${SIZE} grid, design the ONE most ICONIC, instantly-recognizable Pixcel version of the subject — the definitive blend a 3-year-old names at a glance. Decide it FULLY and decisively (NO options, NO hedging): the composition/pose (a FULL figure filling the canvas, grounded), the silhouette, a deliberate 4–6 color palette (name each color + its role: base/shadow/highlight/features), and the SPECIFIC identity-defining features (and how each reads at this size). This is the COMMITTED design — the artist executes it EXACTLY and the art director judges fidelity to it. Invent the definitive design from principles; do NOT imitate any reference. Output a tight design brief (8–14 short lines).`;
  const s = client.messages.stream({ model: MODEL, max_tokens: 2000, thinking:{type:'adaptive',display:'summarized'}, output_config:{effort:'high'}, system: sys, messages:[{ role:'user', content:`Design the iconic Pixcel "${subject}" for a ${SIZE}×${SIZE} grid. Output the committed design brief.` }] });
  const msg = await s.finalMessage(); addCost(msg.usage||{});
  return msg.content.filter(b=>b.type==='text').map(b=>b.text).join('').trim();
}

const blank = (cols, rows) => Array.from({length:rows}, () => Array.from({length:cols}, () => '.'));
const cloneCanvas = (c) => ({ title:c.title, cols:c.cols, rows:c.rows, palette:{...c.palette}, grid:c.grid.map(r=>[...r]) });

async function run() {
  const traj = { subject: SUBJECT, size: SIZE, model: MODEL, passes: [] };
  console.log(`[$${spent.toFixed(2)}] VISION — designing the iconic Pixcel "${SUBJECT}" (the Michelangelo step)…`);
  DESIGN_SPEC = await designVision(SUBJECT);
  traj.spec = DESIGN_SPEC;
  console.log(`[$${spent.toFixed(2)}] committed design brief:\n${DESIGN_SPEC.split('\n').map(l=>'   '+l).join('\n')}\n`);
  const messages = [{ role:'user', content: `Paint a ${SIZE}x${SIZE} pixel-art "${SUBJECT}", executing this COMMITTED design brief EXACTLY — do NOT improvise a different design:\n\n${DESIGN_SPEC}\n\nCall setup first (use the brief's palette), then paint in coarse→fine passes — silhouette → form → the brief's identity details — looking at the render after each pass. Reply DONE when the SHAPE matches the brief.` }];
  let canvas = null, passes = 0, phaseIdx = 0, phaseRejects = 0, bestCanvas = null, finished = false;
  console.log(`[$${spent.toFixed(2)}] carving @${SIZE}² (cap $${COST_CAP}, ≤${MAX_PASSES} passes)`);

  for (let turn = 0; turn < MAX_PASSES + 4; turn++) {
    if (spent >= COST_CAP) { console.log(`[$${spent.toFixed(2)}] COST CAP — pausing (below bar, your call)`); break; }
    const m = messages.length ? messages.map((b,i)=> i===messages.length-1 && Array.isArray(b.content)? {...b, content: b.content.map((bl,j)=> j===b.content.length-1?{...bl,cache_control:{type:'ephemeral'}}:bl)}:b) : messages;
    const msg = await call(m);
    messages.push({ role:'assistant', content: msg.content });
    const tool = msg.content.find(b => b.type === 'tool_use');
    if (!tool) {
      if (!canvas) { messages.push({role:'user', content:'Use setup first, then paint.'}); continue; }
      const ph = PHASES[phaseIdx];
      const verdict = await audit(renderPng(canvas), ph.key, ph.bar);
      (traj.audits = traj.audits || []).push({ phase: ph.key, afterPass: passes, approved: verdict.approved, issues: verdict.issues });
      if (verdict.approved) {
        bestCanvas = cloneCanvas(canvas); // keep-best: snapshot every APPROVED state
        console.log(`[$${spent.toFixed(2)}] ${ph.key.toUpperCase()} approved ✓ (after ${passes} passes)`);
        if (phaseIdx >= PHASES.length - 1) { finished = true; console.log(`[$${spent.toFixed(2)}] FINAL DONE — shape→polish→QA all passed`); break; }
        phaseIdx++; phaseRejects = 0;
        const next = PHASES[phaseIdx];
        messages.push({ role:'user', content:[
          { type:'image', source:{ type:'base64', media_type:'image/png', data: renderPng(canvas) }},
          { type:'text', text: `✅ The ${ph.key.toUpperCase()} phase is APPROVED and LOCKED.\n\nNow → ${next.drawer}.\nWork in batches with the paint tool; reply DONE when this phase is complete.` }
        ] });
        continue;
      }
      phaseRejects++;
      if (phaseRejects > ph.cap) {
        console.log(`[$${spent.toFixed(2)}] ${ph.key} review cap — advancing (residual: ${(verdict.issues[0]||'').slice(0,50)})`);
        if (phaseIdx >= PHASES.length - 1) break;
        phaseIdx++; phaseRejects = 0;
        messages.push({ role:'user', content:[{ type:'text', text: `Moving on. Now → ${PHASES[phaseIdx].drawer}. Reply DONE when complete.` }] });
        continue;
      }
      console.log(`[$${spent.toFixed(2)}] ${ph.key} review #${phaseRejects}: ${verdict.issues.slice(0,2).join('; ')}`);
      messages.push({ role:'user', content:[
        { type:'image', source:{ type:'base64', media_type:'image/png', data: renderPng(canvas) }},
        { type:'text', text: `ART DIRECTOR — ${ph.key.toUpperCase()} phase NOT approved. Fix exactly these, then reply DONE:\n- ${verdict.issues.join('\n- ')}` }
      ] });
      continue;
    }

    if (tool.name === 'setup') {
      const inp = tool.input; const cols = Math.min(64,Math.max(8,Math.round(inp.cols))), rows = Math.min(64,Math.max(8,Math.round(inp.rows)));
      const palette = { '.': BG };
      for (const [k,v] of Object.entries(inp.palette||{})) if (k.length===1 && /^#[0-9a-f]{6}$/.test(String(v).toLowerCase())) palette[k]=String(v).toLowerCase();
      canvas = { title: inp.title||'piece', cols, rows, palette, grid: blank(cols,rows) };
      console.log(`[$${spent.toFixed(2)}] setup ${cols}×${rows} · palette ${Object.keys(palette).length-1} colors`);
      messages.push({ role:'user', content:[{ type:'tool_result', tool_use_id:tool.id, content:`Canvas ready ${cols}×${rows}, all background. Palette: ${Object.entries(palette).filter(([k])=>k!=='.').map(([k,v])=>`${k}=${v}`).join(', ')}.\n\nNow PASS 1: block the WHOLE silhouette as one batch so it fills the canvas and reads at a glance.` }] });
      continue;
    }
    if (tool.name === 'paint') {
      if (!canvas) { messages.push({role:'user', content:[{type:'tool_result',tool_use_id:tool.id,content:'Call setup first.'}]}); continue; }
      let applied=0; const issues=[];
      for (const e of tool.input.edits||[]) {
        if (!Number.isInteger(e.x)||!Number.isInteger(e.y)||e.x<0||e.x>=canvas.cols||e.y<0||e.y>=canvas.rows){ if(issues.length<3)issues.push(`(${e.x},${e.y}) OOB`); continue; }
        if (e.c!=='.' && !(e.c in canvas.palette)){ if(issues.length<3)issues.push(`"${e.c}" not in palette`); continue; }
        canvas.grid[e.y][e.x]=e.c; applied++;
      }
      passes++;
      const b64 = renderPng(canvas);
      traj.passes.push({ pass: passes, note: tool.input.note||'', applied, costSoFar: +spent.toFixed(3) });
      fs.writeFileSync(path.join(OUT, `pass-${passes}.png`), Buffer.from(b64,'base64'));
      console.log(`[$${spent.toFixed(2)}] pass ${passes}: ${tool.input.note||''} (${applied} cells)`);
      const overBudget = passes >= MAX_PASSES;
      messages.push({ role:'user', content:[{ type:'tool_result', tool_use_id:tool.id, content:[
        { type:'image', source:{ type:'base64', media_type:'image/png', data:b64 } },
        { type:'text', text: `Pass ${passes}: applied ${applied} edit(s)${issues.length?`; skipped — ${issues.join('; ')}`:''}.\nCanvas now (${canvas.cols}×${canvas.rows}):\n${asciiView(canvas)}\n\nLOOK at the render cold, against your bar at true scale. If the silhouette is wrong, ERASE and re-block it (don't polish a wrong shape). Otherwise paint the next coarse→fine pass — fix exactly what you SEE, raise the WHOLE piece. Reply DONE only when it clears your 96% bar (don't chase 100%, don't invent flaws).${overBudget?'\n\nNOTE: converge and finish (reply DONE) soon.':''}` }
      ] }] });
      if (overBudget) { /* one more look then stop */ }
      continue;
    }
    messages.push({ role:'user', content:[{type:'tool_result',tool_use_id:tool.id,content:'Use setup or paint.'}] });
  }

  if (canvas) {
    if (!finished && bestCanvas) { canvas = bestCanvas; console.log(`[$${spent.toFixed(2)}] keep-best: shipping the last APPROVED state, not the churned latest`); }
    fs.writeFileSync(path.join(OUT, 'final.png'), Buffer.from(renderPng(canvas),'base64'));
    fs.writeFileSync(path.join(OUT, 'final-canvas.json'), JSON.stringify({ cols:canvas.cols, rows:canvas.rows, palette:canvas.palette, grid:canvas.grid.map(r=>r.join('')) }, null, 2));
    traj.final = { title: canvas.title, passes, lastPhase: PHASES[phaseIdx].key, costUsd: +spent.toFixed(3) };
    fs.writeFileSync(path.join(OUT, 'trajectory.json'), JSON.stringify(traj, null, 2));
    console.log(`\nDONE. ${passes} passes · $${spent.toFixed(2)} · → painter-out/final.png`);
  } else {
    console.log('No canvas produced.');
  }
}
run().catch(e => { console.error('ERR', e.message); process.exit(1); });

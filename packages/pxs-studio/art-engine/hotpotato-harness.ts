/* DEV SCRATCH — headless validation of the Quality Engine (the hot-potato model in
 * src/lib/live-jobs.ts). Bundled with esbuild and run with node so it exercises the REAL
 * product engine TS (not a re-implementation). Saves the final render + a per-pass log.
 *
 *   ./art-engine/run-hotpotato.sh "a tennis player swinging a racket" 32
 *
 * Flags every spend itself only by being explicit in output; the caller decides to run it.
 */
import fs from 'fs';
import path from 'path';
import { startLiveJob, getLiveJob } from '../src/lib/live-jobs';
import { frameToPngBase64 } from '../src/lib/render-frame';

const subject = process.argv[2] || 'an owl';
const size = parseInt(process.argv[3] || '32', 10);
const apiKey = process.env.ANTHROPIC_API_KEY;
if (!apiKey) { console.error('No ANTHROPIC_API_KEY (use --env-file)'); process.exit(1); }

const slug = subject.replace(/[^a-z0-9]+/gi, '-').replace(/^-|-$/g, '').slice(0, 40).toLowerCase();
const OUT = path.join(__dirname, 'hotpotato-runs', slug);
fs.mkdirSync(OUT, { recursive: true });

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

async function main() {
  console.log(`\n=== HOT-POTATO ENGINE · "${subject}" @ ${size}² ===`);
  const id = startLiveJob({ prompt: subject, size, model: 'claude-opus-4-8', apiKey });
  let lastSeq = -1;
  for (let tick = 0; tick < 12000; tick++) {
    const job = getLiveJob(id);
    if (!job) { console.error('job vanished'); break; }
    for (const ev of job.events.filter((e) => e.seq > lastSeq)) {
      lastSeq = ev.seq;
      const c = `[$${(ev.costUsd ?? 0).toFixed(2)}]`;
      switch (ev.type) {
        case 'vision.committed':
          console.log(`${c} VISION committed · complexity=${(ev as any).complexity ?? '?'}`);
          console.log((String((ev as any).brief || '')).split('\n').map((l) => '    ' + l).join('\n'));
          break;
        case 'stage.enter': console.log(`${c} → ${(ev as any).goal}`); break;
        case 'pass.done': console.log(`${c} pass ${(ev as any).pass}: ${(ev as any).note} (${(ev as any).cellsApplied} cells)`); break;
        case 'audit.verdict':
          console.log(`${c}   judge: ${(ev as any).approved ? 'APPROVED ✓' : 'fix → ' + ((ev as any).issues || []).join('; ')}`);
          break;
        case 'stage.approved': console.log(`${c} ✓ APPROVED — converged`); break;
        case 'keepbest.shipped': console.log(`${c} keep-best shipped (${(ev as any).fromStage}) — ${(ev as any).reason}`); break;
        case 'job.done': console.log(`${c} DONE · ${(ev as any).passes} passes · ${(((ev as any).durationMs ?? 0) / 1000).toFixed(0)}s`); break;
        case 'job.error': console.log(`${c} ERROR: ${(ev as any).message}`); break;
      }
    }
    if (job.status !== 'running') {
      if (job.frame) {
        fs.writeFileSync(path.join(OUT, 'final.png'), Buffer.from(frameToPngBase64(job.frame), 'base64'));
        fs.writeFileSync(path.join(OUT, 'final.json'), JSON.stringify(job.frame));
      }
      console.log(`\nRESULT: status=${job.status} · passes=${job.gestures} · complexity=${job.complexity} · $${(job.costUsd ?? 0).toFixed(2)} · → ${path.relative(process.cwd(), OUT)}/final.png\n`);
      break;
    }
    await sleep(500);
  }
}
main().catch((e) => { console.error('HARNESS ERR', e); process.exit(1); });

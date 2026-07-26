/**
 * Dev runner — trigger a Model-agent warm-up from the CLI and print the report.
 *
 *   node --env-file=.env.local --import tsx scripts/model-agent-warmup.ts
 *
 * Mirrors what the app does on init: pings every keyed provider, writes state/health.json + the
 * provider knowledge shards, and prints the up/down table. No spend (list-models GETs only).
 */

import { warmUp, syncProviderKnowledge } from '../src/lib/agents/model-agent/warmup';
import { modalitySurfaces } from '../src/lib/engine/media-registry';
import '../src/lib/engine/adapters'; // registers every provider adapter
import { readyProviders } from '../src/lib/engine/executor';

const ICON: Record<string, string> = {
  ready: '✓ ready    ',
  unhealthy: '✗ unhealthy',
  unverified: '· unverified',
  'no-key': '· no-key   ',
  dropped: '– dropped  ',
};

async function main() {
  const shards = syncProviderKnowledge();
  const state = await warmUp(true);

  const line = '─'.repeat(78);
  console.log(`\nModel agent — warming up …\n${line}`);
  for (const p of state.providers) {
    const tag = ICON[p.status] ?? p.status;
    const lat = p.latencyMs != null ? `${String(p.latencyMs).padStart(4)}ms` : '      ';
    const reason = p.reason ? `  ${p.reason}` : '';
    console.log(`  ${tag}  ${p.id.padEnd(11)} ${lat}  [${p.modalities.join(',')}]${reason}`);
  }
  console.log(line);
  const s = state.summary;
  console.log(
    `  STATUS: ${state.status.toUpperCase()}  ·  ${s.ready} ready · ${s.unhealthy} unhealthy · ` +
      `${s.unverified} unverified · ${s.noKey} no-key · ${s.dropped} dropped  ·  ${state.durationMs}ms`,
  );
  console.log(`\n  SURFACES (union registry — DM is the derived multimodal view):`);
  console.log('   ' + modalitySurfaces().map((s) => `${s.label} ${s.count}`).join('  ·  '));
  console.log(`\n  EXECUTABLE adapters (key-configured + wired to generate):`);
  console.log('   ' + (readyProviders().join(', ') || '(none)'));
  console.log(`\n  state  → src/lib/agents/model-agent/state/health.json`);
  console.log(`  knowledge → ${shards.length} provider shards in src/lib/agents/model-agent/knowledge/providers/\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});

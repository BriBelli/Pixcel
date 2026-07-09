#!/usr/bin/env node
/**
 * with-node24 — guarantee the Next.js server runs on Node >= 24.
 *
 * WHY: the dev DB uses `node:sqlite`, which only exists on Node >= 24. On older Node, getDb()
 * SILENTLY falls back to an in-memory store — chat works, but every restart wipes threads / gallery
 * / usage. Relying on the human to `nvm use` first is a footgun ("assets are the backbone"). This
 * wrapper makes `npm run studio:dev` (and `:start`) run on 24 no matter what `node` is on PATH:
 *
 *   • already on Node >= 24 → run the command as-is.
 *   • otherwise → find an installed Node >= 24 (nvm, or $PXS_NODE24) and re-run the command with
 *     that node's bin dir FIRST on PATH, so `next`'s `#!/usr/bin/env node` shebang resolves to 24.
 *   • none installed → FAIL LOUD with install guidance (never silently degrade to no-persistence).
 *
 * Usage (from an nx run-commands target, cwd = the studio package):
 *   node ../../scripts/with-node24.cjs next dev
 */

'use strict';

const { spawn } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const MIN_MAJOR = 24;
const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('[with-node24] no command given (usage: with-node24.cjs <cmd> [args...])');
  process.exit(1);
}

const currentMajor = Number(process.versions.node.split('.')[0]);

/** Read directory entries, tolerating a missing directory. */
function safeReaddir(dir) {
  try {
    return fs.readdirSync(dir);
  } catch {
    return [];
  }
}

/**
 * Locate a `bin` directory containing a Node >= MIN_MAJOR. Prefers the current process if it already
 * qualifies, then an explicit $PXS_NODE24, then the highest nvm-installed version. Returns null if none.
 */
function findNode24Bin() {
  if (currentMajor >= MIN_MAJOR) return path.dirname(process.execPath);

  // Explicit escape hatch: point PXS_NODE24 at a node binary or its bin dir.
  const override = process.env.PXS_NODE24;
  if (override) {
    const binDir = override.endsWith('node') ? path.dirname(override) : override;
    if (fs.existsSync(path.join(binDir, 'node'))) return binDir;
  }

  // nvm: ~/.nvm/versions/node/vXX.Y.Z/bin/node — pick the highest version that satisfies the floor.
  const nvmRoot = path.join(os.homedir(), '.nvm', 'versions', 'node');
  const candidates = safeReaddir(nvmRoot)
    .map((name) => {
      const m = /^v(\d+)\.(\d+)\.(\d+)/.exec(name);
      return m ? { name, major: +m[1], minor: +m[2], patch: +m[3] } : null;
    })
    .filter((c) => c && c.major >= MIN_MAJOR)
    // highest version first
    .sort((a, b) => b.major - a.major || b.minor - a.minor || b.patch - a.patch);

  for (const c of candidates) {
    const binDir = path.join(nvmRoot, c.name, 'bin');
    if (fs.existsSync(path.join(binDir, 'node'))) return binDir;
  }
  return null;
}

const binDir = findNode24Bin();
if (!binDir) {
  console.error(
    `\n[with-node24] Pixcel studio needs Node >= ${MIN_MAJOR} (node:sqlite for the dev DB), but this\n` +
      `             shell is on Node ${process.versions.node} and no Node >= ${MIN_MAJOR} is installed.\n` +
      `             Install it:  nvm install ${MIN_MAJOR}   (the repo .nvmrc already pins ${MIN_MAJOR})\n` +
      `             Or point PXS_NODE24 at a Node >= ${MIN_MAJOR} binary.\n`
  );
  process.exit(1);
}

// Put the chosen Node first on PATH so `next` (env-node shebang) and any child processes use it.
const env = { ...process.env, PATH: `${binDir}${path.delimiter}${process.env.PATH || ''}` };
if (currentMajor < MIN_MAJOR) {
  console.log(`[with-node24] Node ${process.versions.node} → using Node 24 from ${binDir}`);
}

// shell:true so the command resolves via node_modules/.bin (next, etc.), exactly like the raw target.
const child = spawn(args.join(' '), { stdio: 'inherit', shell: true, env });
child.on('exit', (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  else process.exit(code ?? 0);
});
child.on('error', (err) => {
  console.error(`[with-node24] failed to launch: ${err.message}`);
  process.exit(1);
});

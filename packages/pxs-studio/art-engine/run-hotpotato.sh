#!/usr/bin/env bash
# Bundle the REAL engine TS (src/lib/live-jobs.ts + deps) into one ESM file and run it headless.
# @anthropic-ai/sdk stays external (resolved from node_modules). Usage:
#   ./art-engine/run-hotpotato.sh "a tennis player swinging a racket" 32
set -euo pipefail
cd "$(dirname "$0")/.."   # packages/pxs-studio
mkdir -p art-engine/hotpotato-runs
# esbuild is hoisted to the monorepo root in this Nx workspace.
ESBUILD="../../node_modules/.bin/esbuild"
[ -x "$ESBUILD" ] || ESBUILD="node_modules/.bin/esbuild"
"$ESBUILD" art-engine/hotpotato-harness.ts \
  --bundle --platform=node --format=esm --target=node20 \
  --packages=external \
  --outfile=art-engine/hotpotato-harness.mjs
node --env-file=.env.local art-engine/hotpotato-harness.mjs "$@"

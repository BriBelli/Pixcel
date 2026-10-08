/**
 * THE CHAIN PANEL — proposing, watching and controlling a sequence of shots.
 *
 * No video model here has a timeline, so "still, then launches, then flames on the upshift" cannot
 * be staged in one render; the beats get averaged into a single motion. The fix is one clip per
 * beat, each opening on the still the previous one ended with — and this is where the user sees it,
 * prices it, approves it, and watches it happen.
 *
 * THREE STATES, one component, because they are one continuous thing from the user's side:
 *
 *   PROPOSED   the agent split the brief into beats. Shown with the PRICE and an explicit approve.
 *              N beats is N renders, and nothing is spent until this is clicked.
 *   RUNNING    a chain takes minutes. Every beat reports where it is and each clip appears the
 *              moment it lands, because a silent ten-minute wait is indistinguishable from a hang.
 *   STOPPED    done, cancelled, failed or interrupted. In all four cases the clips already produced
 *              are shown, because they were paid for. Only `interrupted` offers Resume.
 *
 * The work lives in a JOB on the server, so closing this panel — or the tab — does not stop or lose
 * anything. Re-open it and the job is still there.
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '../ui';
import { MEDIA_MODELS } from '../../lib/engine/media-registry';
import { downloadAsset } from '../../lib/download-asset';

const CSS = `
.pxch { display: flex; flex-direction: column; gap: var(--a2ui-space-3); }
.pxch-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--a2ui-space-3); }
.pxch-title { font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-semibold); text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--a2ui-text-tertiary); }
.pxch-why { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary); line-height: 1.6; }

/* One beat. Numbered because ORDER is the entire point of chaining. */
.pxch-beat { display: flex; gap: var(--a2ui-space-3); padding: var(--a2ui-space-3);
  border: 1px solid var(--pxc-border-subtle); border-radius: var(--a2ui-radius-md);
  background: var(--pxc-bg-glass-frost); }
.pxch-beat[data-state="running"] { border-color: var(--a2ui-accent); }
.pxch-beat[data-state="done"] { opacity: 0.85; }
.pxch-n { flex-shrink: 0; width: 22px; height: 22px; border-radius: var(--a2ui-radius-full, 999px);
  display: flex; align-items: center; justify-content: center; font-size: 11px;
  font-weight: var(--a2ui-font-semibold); background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary); }
.pxch-beat[data-state="running"] .pxch-n { background: var(--a2ui-accent); color: #fff; }
.pxch-beat[data-state="done"] .pxch-n { background: var(--a2ui-success, #3fb950); color: #fff; }
.pxch-beat-body { min-width: 0; flex: 1; }
.pxch-beat-text { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-primary); line-height: 1.55; }
.pxch-beat-meta { margin-top: 3px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }

/* The bridge between beats — the thing that makes it a chain rather than three unrelated clips. */
.pxch-bridge { display: flex; align-items: center; gap: 6px; padding-left: 11px;
  font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }

.pxch-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-3);
  padding-top: var(--a2ui-space-1); }
.pxch-price { font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary); }
.pxch-price b { color: var(--a2ui-text-primary); font-weight: var(--a2ui-font-semibold); }
.pxch-note { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); line-height: 1.5; }

.pxch-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; cursor: pointer;
  border-radius: var(--a2ui-radius-md); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm);
  font-weight: var(--a2ui-font-medium); border: 1px solid transparent; white-space: nowrap;
  transition: background var(--a2ui-transition-fast), border-color var(--a2ui-transition-fast); }
.pxch-btn[data-kind="go"] { background: var(--a2ui-accent); color: #fff; }
.pxch-btn[data-kind="go"]:hover { filter: brightness(1.08); }
.pxch-btn[data-kind="quiet"] { background: none; color: var(--a2ui-text-secondary); border-color: var(--a2ui-border-default); }
.pxch-btn[data-kind="quiet"]:hover { color: var(--a2ui-text-primary); border-color: var(--a2ui-text-tertiary); }
.pxch-btn:disabled { opacity: 0.55; cursor: default; }

/* Clips land here as they finish — never held back until the whole chain completes. */
.pxch-clips { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: var(--a2ui-space-2); }
.pxch-clip { border-radius: var(--a2ui-radius-md); overflow: hidden; background: var(--a2ui-bg-tertiary);
  box-shadow: 0 0 0 1px var(--pxs-border-subtle); }
.pxch-clip video { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #000; }
.pxch-clip-cap { padding: 5px 8px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary);
  display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.pxch-dl { background: none; border: none; cursor: pointer; padding: 0; color: var(--a2ui-text-tertiary);
  display: inline-flex; align-items: center; }
.pxch-dl:hover { color: var(--a2ui-text-primary); }
/* The finished scene — the thing the whole sequence was for. */
.pxch-scene { display: flex; flex-direction: column; gap: var(--a2ui-space-2); padding: var(--a2ui-space-3);
  border: 1px solid var(--a2ui-accent); border-radius: var(--a2ui-radius-md); background: var(--pxc-bg-glass-frost); }
.pxch-scene video { width: 100%; border-radius: var(--a2ui-radius-sm); background: #000; }

.pxch-status { display: flex; align-items: center; gap: 8px; font-size: var(--a2ui-text-sm); color: var(--a2ui-text-secondary); }
.pxch-spin { width: 13px; height: 13px; border-radius: 50%; border: 2px solid var(--a2ui-border-default);
  border-top-color: var(--a2ui-accent); animation: pxch-rot 0.8s linear infinite; }
@keyframes pxch-rot { to { transform: rotate(360deg); } }
.pxch-alert { padding: var(--a2ui-space-3); border-radius: var(--a2ui-radius-md); font-size: var(--a2ui-text-sm);
  line-height: 1.6; background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary); }
`;

export interface ChainBeatInput {
  prompt: string;
  durationSec?: number;
}

interface JobClip {
  assetId: string;
  url: string;
  index?: number;
  durationSec?: number;
  hasAudio?: boolean;
  thumbnailUrl?: string;
}

interface JobState {
  id: string;
  status: 'queued' | 'running' | 'done' | 'failed' | 'cancelled' | 'interrupted';
  progress: { beatIndex: number; totalBeats: number; stage?: string };
  costUsd: number;
  error?: string;
  resumable?: boolean;
  remainingBeats?: number;
  clips: JobClip[];
}

export interface ChainPanelProps {
  /** The agent's proposed beats. */
  beats: ChainBeatInput[];
  modelId: string;
  resolution?: string;
  aspectRatio?: string;
  audio?: boolean;
  startFrame?: string;
  /** Images guiding the LOOK of beat 1 without being the frame it opens on. */
  references?: string[];
  threadId?: string;
  /** An existing job to attach to (re-opening a chain already in flight). */
  jobId?: string;
  onJobStarted?: (jobId: string) => void;
}

/** Worst-case price for the whole chain, from the same per-second figures the server prices with. */
function estimateUsd(beats: ChainBeatInput[], modelId: string, resolution = '720p', fallbackSec = 5): number {
  const model = MEDIA_MODELS.find((m) => m.id === modelId);
  const perSec =
    model?.video?.costPerSecondByResolution?.[resolution] ?? model?.video?.costPerSecondUsd?.[1] ?? 0.2;
  const seconds = beats.reduce((t, b) => t + (b.durationSec ?? fallbackSec), 0);
  return Number((perSec * seconds).toFixed(2));
}

export function ChainPanel({
  beats,
  modelId,
  resolution,
  aspectRatio,
  audio,
  startFrame,
  references,
  threadId,
  jobId: existingJobId,
  onJobStarted,
}: ChainPanelProps) {
  const [jobId, setJobId] = useState<string | undefined>(existingJobId);
  const [job, setJob] = useState<JobState | null>(null);
  const [starting, setStarting] = useState(false);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState<string | undefined>();
  /** The assembled scene — the whole sequence as one file. */
  const [scene, setScene] = useState<{ url: string; durationSec?: number } | null>(null);
  const [assembling, setAssembling] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const price = estimateUsd(beats, modelId, resolution);
  const live = job?.status === 'running' || job?.status === 'queued';

  /**
   * Poll while the work is live.
   *
   * Every 3s: fast enough that a clip landing feels immediate, slow enough that a ten-minute chain
   * is not thousands of requests. Polling stops the moment the job reaches a terminal state.
   */
  useEffect(() => {
    if (!jobId) return;
    let cancelled = false;

    const tick = async () => {
      try {
        const res = await fetch(`/api/jobs/${jobId}`, { cache: 'no-store' });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const next = (await res.json()) as JobState;
        if (cancelled) return;
        setJob(next);
        if (next.status === 'running' || next.status === 'queued') {
          timer.current = setTimeout(tick, 3000);
        }
      } catch {
        // A dropped poll is not a failed render — the job is on the server either way. Try again.
        if (!cancelled) timer.current = setTimeout(tick, 5000);
      }
    };
    void tick();

    return () => {
      cancelled = true;
      if (timer.current) clearTimeout(timer.current);
    };
  }, [jobId]);

  const start = useCallback(async () => {
    setStarting(true);
    setError(undefined);
    try {
      const res = await fetch('/api/jobs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ beats, modelId, resolution, aspectRatio, audio, startFrame, references, thread_id: threadId }),
      });
      const data = (await res.json()) as { jobId?: string; error?: string };
      if (!res.ok || !data.jobId) throw new Error(data.error || `HTTP ${res.status}`);
      setJobId(data.jobId);
      onJobStarted?.(data.jobId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start the sequence.');
    } finally {
      setStarting(false);
    }
  }, [beats, modelId, resolution, aspectRatio, audio, startFrame, references, threadId, onJobStarted]);

  const act = useCallback(
    async (action: 'cancel' | 'resume') => {
      if (!jobId) return;
      setActing(true);
      setError(undefined);
      try {
        const res = await fetch(`/api/jobs/${jobId}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json()) as { error?: string };
        if (!res.ok) throw new Error(data.error || `HTTP ${res.status}`);
        // Resuming makes the job live again, so polling has to restart.
        if (action === 'resume') setJob((j) => (j ? { ...j, status: 'running' } : j));
      } catch (err) {
        setError(err instanceof Error ? err.message : `Could not ${action} the sequence.`);
      } finally {
        setActing(false);
      }
    },
    [jobId],
  );

  const shown = job?.clips ?? [];
  const doneCount = shown.length;
  // Assembly is only meaningful once the sequence is FINISHED and has more than one clip — joining
  // a half-rendered chain would produce a scene that is missing its ending.
  const canAssemble = !live && doneCount > 1 && !scene;

  const assemble = useCallback(async () => {
    setAssembling(true);
    setError(undefined);
    try {
      const res = await fetch('/api/sequences/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipAssetIds: shown.map((c) => c.assetId), thread_id: threadId }),
      });
      const data = (await res.json()) as { asset?: { url: string; durationSec?: number }; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || `HTTP ${res.status}`);
      setScene(data.asset);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assemble the sequence.');
    } finally {
      setAssembling(false);
    }
  }, [shown, threadId]);

  return (
    <div className="pxch">
      <style>{CSS}</style>

      <div className="pxch-head">
        <span className="pxch-title">Sequence · {beats.length} beats</span>
        {job ? <span className="pxch-note">${job.costUsd.toFixed(2)} spent</span> : null}
      </div>

      {!job ? (
        <p className="pxch-why">
          This model has no timeline, so these events would blur together in one render. Each beat is
          rendered separately and opens on the still the one before it ended with.
        </p>
      ) : null}

      {/* THE BEATS. Numbered, because the order is the entire point. */}
      <div className="pxch">
        {beats.map((b, i) => {
          const state = i < doneCount ? 'done' : live && i === doneCount ? 'running' : 'idle';
          return (
            <div key={i}>
              {i > 0 ? (
                <div className="pxch-bridge">
                  <Icon name="arrow-right" size={12} /> opens on the previous frame
                </div>
              ) : null}
              <div className="pxch-beat" data-state={state}>
                <span className="pxch-n">{state === 'done' ? '✓' : i + 1}</span>
                <div className="pxch-beat-body">
                  <div className="pxch-beat-text">{b.prompt}</div>
                  <div className="pxch-beat-meta">
                    {b.durationSec ?? 5}s
                    {state === 'running' && job?.progress.stage ? ` · ${job.progress.stage}` : ''}
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Clips appear the moment each one lands — never held back until the chain finishes. */}
      {shown.length > 0 ? (
        <div className="pxch-clips">
          {shown.map((c) => (
            <div key={c.assetId} className="pxch-clip">
              <video src={c.url} poster={c.thumbnailUrl} controls playsInline preload="metadata" />
              <div className="pxch-clip-cap">
                <span>
                  Beat {(c.index ?? 0) + 1}
                  {c.durationSec ? ` · ${c.durationSec}s` : ''}
                  {c.hasAudio ? ' · sound' : ''}
                </span>
                <button
                  type="button"
                  className="pxch-dl"
                  title="Download this clip"
                  onClick={() => void downloadAsset({ url: c.url, kind: 'video', title: `beat-${(c.index ?? 0) + 1}`, assetId: c.assetId })}
                >
                  <Icon name="download" size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      {/* THE SCENE — what the sequence was for. Shown above the errors because it is the result. */}
      {scene ? (
        <div className="pxch-scene">
          <video src={scene.url} controls playsInline preload="metadata" />
          <div className="pxch-foot">
            <span className="pxch-note">
              Scene assembled{scene.durationSec ? ` · ${scene.durationSec}s` : ''} · saved to Assets
            </span>
            <button
              type="button"
              className="pxch-btn"
              data-kind="go"
              onClick={() => void downloadAsset({ url: scene.url, kind: 'video', title: 'scene' })}
            >
              <Icon name="download" size={15} /> Download
            </button>
          </div>
        </div>
      ) : null}

      {canAssemble ? (
        <div className="pxch-foot">
          <span className="pxch-note">{doneCount} clips — join them into one scene</span>
          <button type="button" className="pxch-btn" data-kind="go" onClick={() => void assemble()} disabled={assembling}>
            <Icon name="sparkles" size={15} /> {assembling ? 'Assembling…' : 'Assemble scene'}
          </button>
        </div>
      ) : null}

      {error ? <div className="pxch-alert">{error}</div> : null}
      {job?.error ? <div className="pxch-alert">{job.error}</div> : null}

      {/* ── CONTROLS ─────────────────────────────────────────────────────────────────────────── */}
      {!job ? (
        // Nothing has been spent yet. The price is stated before the button that spends it.
        <div className="pxch-foot">
          <span className="pxch-price">
            <b>${price.toFixed(2)}</b> for {beats.length} renders
          </span>
          <button type="button" className="pxch-btn" data-kind="go" onClick={() => void start()} disabled={starting}>
            <Icon name="sparkles" size={15} />
            {starting ? 'Starting…' : `Render ${beats.length} beats`}
          </button>
        </div>
      ) : live ? (
        <div className="pxch-foot">
          <span className="pxch-status">
            <span className="pxch-spin" />
            {job.progress.stage ?? 'Working…'}
          </span>
          <button type="button" className="pxch-btn" data-kind="quiet" onClick={() => void act('cancel')} disabled={acting}>
            {acting ? 'Stopping…' : 'Stop'}
          </button>
        </div>
      ) : job.resumable ? (
        // Finishing spends money, so it stays a decision — the job simply waits until asked.
        <div className="pxch-foot">
          <span className="pxch-price">
            <b>${estimateUsd(beats.slice(doneCount), modelId, resolution).toFixed(2)}</b> to finish the last{' '}
            {job.remainingBeats ?? beats.length - doneCount}
          </span>
          <button type="button" className="pxch-btn" data-kind="go" onClick={() => void act('resume')} disabled={acting}>
            <Icon name="sparkles" size={15} />
            {acting ? 'Resuming…' : 'Resume'}
          </button>
        </div>
      ) : (
        <div className="pxch-foot">
          <span className="pxch-note">
            {job.status === 'done'
              ? `${doneCount} of ${beats.length} beats rendered · $${job.costUsd.toFixed(2)}`
              : job.status === 'cancelled'
                ? `Stopped after ${doneCount} beats. What rendered is saved.`
                : `Stopped after ${doneCount} beats.`}
          </span>
        </div>
      )}

      {/* Said once, at the bottom, where it answers the question the wait provokes. */}
      {live ? (
        <p className="pxch-note">
          Each beat is a separate render, so this takes a few minutes. You can close this — it keeps
          going, and the clips are saved as they land.
        </p>
      ) : null}
    </div>
  );
}

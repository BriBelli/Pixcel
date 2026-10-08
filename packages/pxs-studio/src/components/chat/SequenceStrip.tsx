/**
 * THE SEQUENCE STRIP — the cut.
 *
 * The Video workspace's left panel was a hardcoded placeholder ("Shot 1 · establishing") while the
 * engine underneath could already chain beats, bridge them by frame, and merge them into a scene.
 * This is that engine made visible: your clips, in the order they will play, and the one button that
 * turns them into a finished file.
 *
 * WHY A STRIP RATHER THAN A TIMELINE. A timeline's core gesture is dragging an edge to trim — it
 * assumes the footage exists and the work is arranging it. Here the footage is GENERATED: you do not
 * trim a beat, you re-prompt it and wait two minutes. Pretending otherwise would put a scrub handle
 * on something that cannot be scrubbed. Cards say what this medium actually is.
 *
 * CARD WIDTH TRACKS DURATION, though, because the one honest thing a timeline gives you is that time
 * is visible — a 2-second beat and a 10-second beat should not look identical.
 *
 * THE DISTINCTION THAT RUNS THROUGH THIS FILE: operations that COST A RENDER (minutes, dollars,
 * irreversible) must never look like operations that are free (reorder, remove, assemble). If they
 * look the same, every edit feels expensive and you stop touching anything. Reordering is free, and
 * this version only does free things.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from '../ui';
import { downloadAsset } from '../../lib/download-asset';

const CSS = `
.pxsq { display: flex; flex-direction: column; gap: var(--a2ui-space-3); min-height: 0; }
.pxsq-head { display: flex; align-items: baseline; justify-content: space-between; gap: var(--a2ui-space-3); }
.pxsq-title { font-size: var(--a2ui-text-xs); font-weight: var(--a2ui-font-semibold); text-transform: uppercase;
  letter-spacing: 0.05em; color: var(--a2ui-text-tertiary); }
.pxsq-sub { font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }

.pxsq-row { display: flex; align-items: stretch; gap: 0; overflow-x: auto; padding-bottom: var(--a2ui-space-2); }
.pxsq-row::-webkit-scrollbar { height: 6px; }
.pxsq-row::-webkit-scrollbar-thumb { background: var(--a2ui-border-default); border-radius: 3px; }

.pxsq-card { flex: 0 0 auto; display: flex; flex-direction: column; border-radius: var(--a2ui-radius-md);
  overflow: hidden; background: var(--a2ui-bg-tertiary); box-shadow: 0 0 0 1px var(--pxs-border-subtle);
  transition: box-shadow var(--a2ui-transition-fast), opacity var(--a2ui-transition-fast); }
.pxsq-card[data-in="false"] { opacity: 0.4; }
.pxsq-card video { display: block; width: 100%; aspect-ratio: 16 / 9; object-fit: cover; background: #000; }
.pxsq-card-bar { display: flex; align-items: center; gap: 6px; padding: 5px 7px; font-size: var(--a2ui-text-xs);
  color: var(--a2ui-text-tertiary); }
.pxsq-n { width: 17px; height: 17px; border-radius: var(--a2ui-radius-full, 999px); display: flex;
  align-items: center; justify-content: center; font-size: 10px; font-weight: var(--a2ui-font-semibold);
  background: var(--a2ui-accent); color: #fff; flex-shrink: 0; }
.pxsq-ico { background: none; border: none; cursor: pointer; padding: 0 1px; color: var(--a2ui-text-tertiary);
  display: inline-flex; align-items: center; }
.pxsq-ico:hover { color: var(--a2ui-text-primary); }
.pxsq-ico:disabled { opacity: 0.3; cursor: default; }
.pxsq-spacer { flex: 1; }

/* The join between two shots. A CUT is free and instant — it is not a render, and it should never
   look like one. */
.pxsq-join { flex: 0 0 auto; display: flex; align-items: center; justify-content: center; width: 26px;
  color: var(--a2ui-text-tertiary); align-self: center; }

.pxsq-foot { display: flex; align-items: center; justify-content: space-between; gap: var(--a2ui-space-3); }
.pxsq-btn { display: inline-flex; align-items: center; gap: 7px; padding: 9px 15px; cursor: pointer;
  border-radius: var(--a2ui-radius-md); font-family: var(--a2ui-font-family); font-size: var(--a2ui-text-sm);
  font-weight: var(--a2ui-font-medium); border: 1px solid transparent; white-space: nowrap; }
.pxsq-btn[data-kind="go"] { background: var(--a2ui-accent); color: #fff; }
.pxsq-btn[data-kind="go"]:hover { filter: brightness(1.08); }
.pxsq-btn[data-kind="quiet"] { background: none; color: var(--a2ui-text-secondary); border: 1px solid var(--a2ui-border-default); }
.pxsq-btn:disabled { opacity: 0.55; cursor: default; }

.pxsq-scene { display: flex; flex-direction: column; gap: var(--a2ui-space-2); padding: var(--a2ui-space-3);
  border: 1px solid var(--a2ui-accent); border-radius: var(--a2ui-radius-md); background: var(--pxc-bg-glass-frost); }
.pxsq-scene video { width: 100%; border-radius: var(--a2ui-radius-sm); background: #000; }
.pxsq-empty { padding: var(--a2ui-space-6) var(--a2ui-space-4); text-align: center; font-size: var(--a2ui-text-sm);
  color: var(--a2ui-text-tertiary); line-height: 1.6; }
.pxsq-alert { padding: var(--a2ui-space-3); border-radius: var(--a2ui-radius-md); font-size: var(--a2ui-text-sm);
  background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary); }
`;

interface Clip {
  assetId: string;
  url: string;
  durationSec?: number;
  hasAudio?: boolean;
  thumbnailUrl?: string;
  prompt?: string;
}

interface SceneAsset extends Clip {
  fromClips?: string[];
}

export interface SequenceStripProps {
  threadId?: string | null;
  /** Bumped by the caller when a render finishes, so the strip picks up new clips. */
  refreshKey?: number;
}

/** Card width follows duration — the one honest thing a timeline gives you. */
function widthFor(durationSec?: number): number {
  const s = Math.max(1, durationSec ?? 4);
  return Math.round(Math.min(260, Math.max(120, 96 + s * 16)));
}

export function SequenceStrip({ threadId, refreshKey }: SequenceStripProps) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [scenes, setScenes] = useState<SceneAsset[]>([]);
  /** The cut: clip ids in play order. Starts as "everything, as made". */
  const [order, setOrder] = useState<string[]>([]);
  const [excluded, setExcluded] = useState<Set<string>>(new Set());
  const [assembling, setAssembling] = useState(false);
  const [error, setError] = useState<string | undefined>();

  useEffect(() => {
    if (!threadId) return;
    let cancelled = false;
    fetch(`/api/sequences/clips?thread_id=${encodeURIComponent(threadId)}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { clips?: Clip[]; scenes?: SceneAsset[] } | null) => {
        if (cancelled || !d) return;
        const list = d.clips ?? [];
        setClips(list);
        setScenes(d.scenes ?? []);
        // Preserve any ordering already made; append whatever is new.
        setOrder((prev) => {
          const known = new Set(prev);
          const kept = prev.filter((id) => list.some((c) => c.assetId === id));
          return [...kept, ...list.map((c) => c.assetId).filter((id) => !known.has(id))];
        });
      })
      .catch(() => {
        /* the strip is never worth an error toast */
      });
    return () => {
      cancelled = true;
    };
  }, [threadId, refreshKey]);

  const move = useCallback((id: string, delta: number) => {
    setOrder((prev) => {
      const i = prev.indexOf(id);
      const j = i + delta;
      if (i < 0 || j < 0 || j >= prev.length) return prev;
      const next = [...prev];
      [next[i], next[j]] = [next[j]!, next[i]!];
      return next;
    });
  }, []);

  const toggle = useCallback((id: string) => {
    setExcluded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const inCut = order.filter((id) => !excluded.has(id));

  const assemble = useCallback(async () => {
    setAssembling(true);
    setError(undefined);
    try {
      const res = await fetch('/api/sequences/assemble', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clipAssetIds: inCut, thread_id: threadId }),
      });
      const data = (await res.json()) as { asset?: SceneAsset; error?: string };
      if (!res.ok || !data.asset) throw new Error(data.error || `HTTP ${res.status}`);
      setScenes((prev) => [...prev, data.asset!]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not assemble the sequence.');
    } finally {
      setAssembling(false);
    }
  }, [inCut, threadId]);

  const byId = new Map(clips.map((c) => [c.assetId, c]));
  const totalSec = inCut.reduce((t, id) => t + (byId.get(id)?.durationSec ?? 0), 0);

  if (!threadId || clips.length === 0) {
    return (
      <div className="pxsq">
        <style>{CSS}</style>
        <div className="pxsq-head">
          <span className="pxsq-title">Sequence</span>
        </div>
        <div className="pxsq-empty">
          Clips you render land here, in order.
          <br />
          Join them into one scene when the sequence is right.
        </div>
      </div>
    );
  }

  return (
    <div className="pxsq">
      <style>{CSS}</style>

      <div className="pxsq-head">
        <span className="pxsq-title">Sequence</span>
        <span className="pxsq-sub">
          {inCut.length} of {clips.length} clips · {totalSec}s
        </span>
      </div>

      <div className="pxsq-row">
        {order.map((id, i) => {
          const c = byId.get(id);
          if (!c) return null;
          const included = !excluded.has(id);
          return (
            <div key={id} style={{ display: 'flex', alignItems: 'stretch' }}>
              {i > 0 ? (
                // A cut. Free, instant, not a render — and drawn so it never reads like one.
                <div className="pxsq-join" title="Cut">
                  <Icon name="arrow-right" size={13} />
                </div>
              ) : null}
              <div className="pxsq-card" data-in={included ? 'true' : 'false'} style={{ width: widthFor(c.durationSec) }}>
                <video src={c.url} poster={c.thumbnailUrl} muted playsInline preload="metadata" />
                <div className="pxsq-card-bar">
                  <span className="pxsq-n">{included ? inCut.indexOf(id) + 1 : '–'}</span>
                  <span>
                    {c.durationSec ? `${c.durationSec}s` : ''}
                    {c.hasAudio ? ' · sound' : ''}
                  </span>
                  <span className="pxsq-spacer" />
                  <button type="button" className="pxsq-ico" title="Move earlier" disabled={i === 0} onClick={() => move(id, -1)}>
                    <Icon name="chevron-down" size={12} />
                  </button>
                  <button
                    type="button"
                    className="pxsq-ico"
                    title="Move later"
                    disabled={i === order.length - 1}
                    onClick={() => move(id, 1)}
                  >
                    <Icon name="chevron-down" size={12} />
                  </button>
                  <button type="button" className="pxsq-ico" title={included ? 'Leave out of the cut' : 'Put back in'} onClick={() => toggle(id)}>
                    <Icon name={included ? 'eye' : 'plus'} size={12} />
                  </button>
                  <button
                    type="button"
                    className="pxsq-ico"
                    title="Download this clip"
                    onClick={() => void downloadAsset({ url: c.url, kind: 'video', prompt: c.prompt, assetId: c.assetId })}
                  >
                    <Icon name="download" size={12} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {error ? <div className="pxsq-alert">{error}</div> : null}

      <div className="pxsq-foot">
        <span className="pxsq-sub">
          {inCut.length < 2 ? 'Two or more clips make a scene' : 'Reordering is free — nothing re-renders'}
        </span>
        <button
          type="button"
          className="pxsq-btn"
          data-kind="go"
          disabled={inCut.length < 2 || assembling}
          onClick={() => void assemble()}
        >
          <Icon name="sparkles" size={15} /> {assembling ? 'Assembling…' : 'Assemble scene'}
        </button>
      </div>

      {/* Finished scenes. Kept BELOW the strip: the strip is the work, these are the results. */}
      {scenes.map((s) => (
        <div key={s.assetId} className="pxsq-scene">
          <video src={s.url} controls playsInline preload="metadata" />
          <div className="pxsq-foot">
            <span className="pxsq-sub">
              Scene{s.durationSec ? ` · ${s.durationSec}s` : ''}
              {s.fromClips?.length ? ` · from ${s.fromClips.length} clips` : ''} · saved to Assets
            </span>
            <button
              type="button"
              className="pxsq-btn"
              data-kind="quiet"
              onClick={() => void downloadAsset({ url: s.url, kind: 'video', title: 'scene', assetId: s.assetId })}
            >
              <Icon name="download" size={15} /> Download
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * "NEWER MODELS EXIST" — the surface the succession sweep never had.
 *
 * The detector was fixed to tell the truth and still reported into a JSON response nobody read, so
 * the catalog sat two generations behind on OpenAI while the sweep said "checked, found nothing".
 * Being right is not the job; being SEEN is the job.
 *
 * Deliberately quiet. This is a standing fact ("there is a newer FLUX"), not an event, so it reads
 * as a line of text rather than a toast that interrupts and vanishes. It is dismissible per finding,
 * because a model you have decided against should not nag — but something NEWER than the one you
 * dismissed is news again.
 */

'use client';

import { useCallback, useEffect, useState } from 'react';
import { Icon } from './ui';

const CSS = `
.pxmw { display: flex; align-items: flex-start; gap: var(--a2ui-space-3); padding: var(--a2ui-space-3) var(--a2ui-space-4);
  border: 1px solid var(--pxc-border-subtle); border-radius: var(--a2ui-radius-md);
  background: var(--pxc-bg-glass-frost); }
.pxmw-ico { flex-shrink: 0; margin-top: 1px; color: var(--a2ui-accent); }
.pxmw-body { flex: 1; min-width: 0; }
.pxmw-title { font-size: var(--a2ui-text-sm); font-weight: var(--a2ui-font-medium); color: var(--a2ui-text-primary); }
.pxmw-list { margin: 6px 0 0; padding: 0; list-style: none; display: flex; flex-direction: column; gap: 4px; }
.pxmw-row { display: flex; align-items: baseline; gap: 8px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-secondary); }
.pxmw-from { color: var(--a2ui-text-tertiary); }
.pxmw-to { color: var(--a2ui-text-primary); font-family: var(--a2ui-font-mono, monospace); }
.pxmw-x { margin-left: auto; background: none; border: none; cursor: pointer; padding: 0 2px;
  color: var(--a2ui-text-tertiary); font-size: var(--a2ui-text-xs); }
.pxmw-x:hover { color: var(--a2ui-text-primary); }
.pxmw-foot { margin-top: 7px; font-size: var(--a2ui-text-xs); color: var(--a2ui-text-tertiary); }
.pxmw-warn { color: var(--a2ui-warning, #d29922); }
`;

interface BehindOn {
  currentId: string;
  currentVersion: string;
  successorId: string;
  successorVersion: string;
  foundOn: string;
}

interface WatchResponse {
  behind: BehindOn[];
  checkedAt: number | null;
  failedHosts: string[];
  neverRun: boolean;
}

function ago(ts: number): string {
  const h = Math.floor((Date.now() - ts) / 3_600_000);
  if (h < 1) return 'just now';
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export function ModelWatchNotice() {
  const [data, setData] = useState<WatchResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Reads the LAST scheduled check rather than running one — a page load must not trigger work.
    fetch('/api/models/behind', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!cancelled && d) setData(d as WatchResponse);
      })
      .catch(() => {
        /* the notice is never worth an error */
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const dismiss = useCallback(async (successorId: string) => {
    // Optimistic: the point of a dismiss is that it feels instant.
    setData((d) => (d ? { ...d, behind: d.behind.filter((b) => b.successorId !== successorId) } : d));
    await fetch('/api/models/behind', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledge: successorId }),
    }).catch(() => {
      /* a failed dismiss reappears on the next load, which is the safe direction */
    });
  }, []);

  if (!data) return null;

  const hasFindings = data.behind.length > 0;
  const hasFailures = data.failedHosts.length > 0;
  // Nothing to say is the common case, and the common case should be silent.
  if (!hasFindings && !hasFailures) return null;

  return (
    <div className="pxmw">
      <style>{CSS}</style>
      <span className="pxmw-ico">
        <Icon name="info" size={15} />
      </span>
      <div className="pxmw-body">
        {hasFindings ? (
          <>
            <div className="pxmw-title">
              {data.behind.length} newer model{data.behind.length === 1 ? '' : 's'} available
            </div>
            <ul className="pxmw-list">
              {data.behind.map((b) => (
                <li key={b.successorId} className="pxmw-row">
                  <span className="pxmw-from">
                    {b.currentId} {b.currentVersion}
                  </span>
                  <Icon name="arrow-right" size={11} />
                  <span className="pxmw-to">{b.successorId}</span>
                  <span className="pxmw-from">on {b.foundOn}</span>
                  <button type="button" className="pxmw-x" onClick={() => void dismiss(b.successorId)} title="Dismiss">
                    ✕
                  </button>
                </li>
              ))}
            </ul>
          </>
        ) : null}

        {/* "We could not look" must never read as "nothing is newer" — that conflation is the
            original bug, and it stays visible even when there are no findings to report. */}
        {hasFailures ? (
          <div className="pxmw-foot pxmw-warn">
            Couldn&apos;t check {data.failedHosts.join(', ')} — so this list may be incomplete.
          </div>
        ) : null}

        {data.checkedAt ? <div className="pxmw-foot">Checked {ago(data.checkedAt)}</div> : null}
      </div>
    </div>
  );
}

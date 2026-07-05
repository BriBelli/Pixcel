'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * SourcesRow — an EMPTY scaffold for citations / sources.
 *
 * PR-4a has no sources in the view-model, so this renders null. It exists as the
 * structured placeholder the orchestrator will fill later (grounded answers with
 * cited sources). Kept minimal on purpose — tokens-only when it lands.
 * ───────────────────────────────────────────────────────────────────────────── */

export interface Source {
  title: string;
  url?: string;
}

export interface SourcesRowProps {
  sources?: Source[];
}

export function SourcesRow({ sources }: SourcesRowProps) {
  if (!sources || sources.length === 0) return null;
  // Structured placeholder — real citation chips land with the orchestrator.
  return (
    <div
      className="flex flex-wrap"
      style={{ gap: 'var(--a2ui-space-2)', marginTop: 'var(--a2ui-space-3)' }}
    >
      {sources.map((src, i) => (
        <span
          key={i}
          style={{
            fontSize: 'var(--a2ui-text-sm)',
            color: 'var(--a2ui-text-tertiary)',
          }}
        >
          {src.title}
        </span>
      ))}
    </div>
  );
}

export default SourcesRow;

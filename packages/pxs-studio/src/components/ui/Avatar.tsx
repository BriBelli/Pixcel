'use client';

/* ─────────────────────────────────────────────────────────────────────────────
 * Avatar — round, image or initial/glyph fallback. Mirrors NavRail's UserAvatar.
 *   • round (--a2ui-radius-full), 1px --a2ui-border-default; hover → border-strong
 *   • fallback: initial (from name) else a Lucide `user` glyph
 * `interactive` makes it a focusable button-like avatar (7 interactive states).
 * ───────────────────────────────────────────────────────────────────────────── */

import { Icon } from './Icon';

export interface AvatarProps extends React.HTMLAttributes<HTMLSpanElement> {
  src?: string | null;
  name?: string;
  size?: number;
  interactive?: boolean;
}

const CSS = `
.a2-avatar {
  display: inline-flex; align-items: center; justify-content: center; flex-shrink: 0; overflow: hidden;
  border-radius: var(--a2ui-radius-full); border: 1px solid var(--a2ui-border-default);
  background: var(--a2ui-bg-tertiary); color: var(--a2ui-text-secondary);
  transition: border-color var(--a2ui-transition-fast), box-shadow var(--a2ui-transition-fast); padding: 0;
}
.a2-avatar img { width: 100%; height: 100%; object-fit: cover; display: block; }
.a2-avatar__fallback { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center;
  font-family: var(--a2ui-font-family); font-weight: var(--a2ui-font-medium); text-transform: uppercase;
  line-height: 1; }
.a2-avatar--interactive { cursor: pointer; }
.a2-avatar--interactive:hover { border-color: var(--a2ui-border-strong); }
.a2-avatar--interactive:active { border-color: var(--a2ui-border-strong); background: var(--a2ui-bg-elevated); }
.a2-avatar--interactive:focus-visible { outline: none; box-shadow: 0 0 0 2px var(--a2ui-accent-subtle); }
`;

export function Avatar({ src, name, size = 34, interactive = false, className, style, ...rest }: AvatarProps) {
  const initial = (name || '').trim().charAt(0);
  const cls = ['a2-avatar', interactive ? 'a2-avatar--interactive' : '', className || ''].filter(Boolean).join(' ');
  const fontSize = Math.max(11, Math.round(size * 0.42));

  return (
    <>
      <style>{CSS}</style>
      <span
        className={cls}
        style={{ width: size, height: size, ...style }}
        tabIndex={interactive ? 0 : undefined}
        role={interactive ? 'button' : undefined}
        {...rest}
      >
        {src ? (
          <img src={src} alt={name || ''} />
        ) : (
          <span className="a2-avatar__fallback" style={{ fontSize }}>
            {initial ? initial : <Icon name="user" size={Math.round(size * 0.5)} />}
          </span>
        )}
      </span>
    </>
  );
}

export default Avatar;

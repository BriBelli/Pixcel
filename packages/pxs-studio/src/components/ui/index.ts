/* ─────────────────────────────────────────────────────────────────────────────
 * Pixcel UI primitives — the shared, token-driven component library.
 * Built to the Claude Design handoff (dark-first, alpha borders, focus-halo,
 * no scale-pop, glass only on float chrome). ADDITIVE: not yet wired into the app.
 * See /preview for the full state matrix.
 * ───────────────────────────────────────────────────────────────────────────── */

export { Icon } from './Icon';
export type { IconName, IconProps } from './Icon';

export { PixcelMark } from './PixcelMark';
export type { PixcelMarkProps } from './PixcelMark';

export { Button } from './Button';
export type { ButtonProps, ButtonVariant } from './Button';

export { Input } from './Input';
export type { InputProps } from './Input';

export { Card } from './Card';
export type { CardProps } from './Card';

export { Chip } from './Chip';
export type { ChipProps } from './Chip';

export { IconButton } from './IconButton';
export type { IconButtonProps, IconButtonVariant } from './IconButton';

export { Avatar } from './Avatar';
export type { AvatarProps } from './Avatar';

export { Tooltip } from './Tooltip';
export type { TooltipProps, TooltipSide } from './Tooltip';

export { Composer } from './Composer';
export type { ComposerProps } from './Composer';

export const COLORS = {
  primary: 'var(--color-primary)',
  success: 'var(--color-success)',
  warning: 'var(--color-warning)',
  error: 'var(--color-error)',
  neutral: 'var(--color-neutral)',
} as const;

export const SPACING = {
  0: 'var(--space-0)',
  1: 'var(--space-1)',
  2: 'var(--space-2)',
  3: 'var(--space-3)',
  4: 'var(--space-4)',
  6: 'var(--space-6)',
  8: 'var(--space-8)',
  12: 'var(--space-12)',
  16: 'var(--space-16)',
} as const;

export const RADIUS = {
  sm: 'var(--radius-sm)',
  md: 'var(--radius-md)',
  lg: 'var(--radius-lg)',
} as const;

export const DURATIONS = {
  fast: 150,
  standard: 300,
  slow: 500,
} as const;

export type ColorKey = keyof typeof COLORS;
export type SpacingKey = keyof typeof SPACING;

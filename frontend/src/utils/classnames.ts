export function classnames(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classnames(...classes);
}

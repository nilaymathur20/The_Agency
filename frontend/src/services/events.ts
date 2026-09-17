import type { StreamEvent } from '../types/events';

export function parseEvent(raw: string): StreamEvent | null {
  try { return JSON.parse(raw) as StreamEvent; } catch { return null; }
}

export function formatEventType(type: string): string {
  return type.replace('.', ' · ').replace(/_/g, ' ');
}

export const EVENT_ICONS: Record<string, string> = {
  'project.created': '📁',
  'task.created': '📝',
  'task.assigned': '👤',
  'task.started': '⚡',
  'task.completed': '✅',
  'task.failed': '❌',
  'task.retry': '🔄',
  'agent.thinking': '💭',
  'tool.execution.completed': '🔧',
  'tool.execution.failed': '⚠️',
  'approval.requested': '🔒',
};

export const EVENT_COLORS: Record<string, string> = {
  'project.created': 'var(--color-primary)',
  'task.completed': 'var(--color-success)',
  'task.failed': 'var(--color-error)',
  'tool.execution.completed': 'var(--color-neutral)',
};

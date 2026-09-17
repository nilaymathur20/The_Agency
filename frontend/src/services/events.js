export function parseEvent(raw) {
    try {
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
export function formatEventType(type) {
    return type.replace('.', ' · ').replace(/_/g, ' ');
}
export const EVENT_ICONS = {
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
export const EVENT_COLORS = {
    'project.created': 'var(--color-primary)',
    'task.completed': 'var(--color-success)',
    'task.failed': 'var(--color-error)',
    'tool.execution.completed': 'var(--color-neutral)',
};

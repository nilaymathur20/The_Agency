export function getAriaLabelForStatus(status) {
    const map = {
        pending: 'Pending',
        queued: 'Queued',
        running: 'Running',
        completed: 'Completed',
        failed: 'Failed',
        blocked: 'Blocked',
        waiting: 'Waiting for approval',
    };
    return map[status] || status;
}
export function announceToScreenReader(message, priority = 'polite') {
    const el = document.createElement('div');
    el.setAttribute('role', 'status');
    el.setAttribute('aria-live', priority);
    el.setAttribute('aria-atomic', 'true');
    el.style.position = 'absolute';
    el.style.left = '-10000px';
    el.style.width = '1px';
    el.style.height = '1px';
    el.style.overflow = 'hidden';
    el.textContent = message;
    document.body.appendChild(el);
    setTimeout(() => el.remove(), 1000);
}

export function formatDate(iso) {
    try {
        return new Date(iso).toLocaleString();
    }
    catch {
        return iso;
    }
}
export function formatDuration(ms) {
    if (ms < 1000)
        return `${ms}ms`;
    const s = ms / 1000;
    if (s < 60)
        return `${s.toFixed(1)}s`;
    return `${(s / 60).toFixed(1)}m`;
}
export function formatRelative(iso) {
    const diff = Date.now() - new Date(iso).getTime();
    const s = Math.floor(diff / 1000);
    if (s < 60)
        return `${s}s ago`;
    const m = Math.floor(s / 60);
    if (m < 60)
        return `${m}m ago`;
    const h = Math.floor(m / 60);
    if (h < 24)
        return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
}
export function truncate(str, len) {
    if (str.length <= len)
        return str;
    return str.slice(0, len) + '…';
}
export function formatTaskStatus(status) {
    return status.charAt(0).toUpperCase() + status.slice(1);
}

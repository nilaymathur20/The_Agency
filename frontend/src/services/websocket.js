export function getWsUrl(projectId) {
    const envUrl = import.meta.env?.VITE_WS_URL;
    if (envUrl)
        return envUrl;
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    if (projectId)
        return `${proto}//${location.host}/api/ws/projects/${projectId}`;
    return `${proto}//${location.host}/api/ws/projects/default`;
}
export function getProjectWsUrl(projectId) {
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/api/ws/projects/${projectId}`;
}
export function getApiBase() {
    return import.meta.env?.VITE_API_URL || '';
}

const BASE = '';
async function req(path, opts) {
    const r = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
    if (!r.ok) {
        const text = await r.text();
        throw new Error(text || `${r.status} ${r.statusText}`);
    }
    return r.json();
}
export const api = {
    // Projects
    listProjects: () => req('/api/projects'),
    getProject: (id) => req(`/api/projects/${id}`),
    createProject: (data) => req('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
    runProject: (id) => req(`/api/projects/${id}/run`, { method: 'POST' }),
    pauseProject: (id) => req(`/api/projects/${id}/pause`, { method: 'POST' }),
    resumeProject: (id) => req(`/api/projects/${id}/resume`, { method: 'POST' }),
    cancelProject: (id) => req(`/api/projects/${id}/cancel`, { method: 'POST' }),
    // Tasks
    listTasks: (projectId) => req(`/api/projects/${projectId}/tasks`),
    getTask: (taskId) => req(`/api/tasks/${taskId}`),
    retryTask: (taskId) => req(`/api/tasks/${taskId}/retry`, { method: 'POST' }),
    createTask: (projectId, data) => req(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),
    // Agents
    listAgents: () => req('/api/agents'),
    getAgent: (id) => req(`/api/agents/${id}`),
    // Misc
    getHealth: () => req(`/api/health`),
    listCheckpoints: (projectId) => req(`/api/projects/${projectId}/checkpoints`),
    listApprovals: () => req('/api/approvals'),
    approve: (id) => req(`/api/approvals/${id}/approve`, { method: 'POST' }),
    deny: (id) => req(`/api/approvals/${id}/deny`, { method: 'POST' }),
    // Files
    getFile: (projectId, path) => req(`/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`),
    listFiles: (projectId) => req(`/api/projects/${projectId}/files/list`),
};

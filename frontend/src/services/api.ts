import type { Project, Task, Agent, Checkpoint, Approval } from '../types/api';

const BASE = '';

async function req<T>(path: string, opts?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, { headers: { 'Content-Type': 'application/json' }, ...opts });
  if (!r.ok) {
    const text = await r.text();
    throw new Error(text || `${r.status} ${r.statusText}`);
  }
  return r.json();
}

export const api = {
  // Projects
  listProjects: () => req<Project[]>('/api/projects'),
  getProject: (id: string) => req<Project>(`/api/projects/${id}`),
  createProject: (data: { name: string; description?: string; requirements?: string }) =>
    req<Project>('/api/projects', { method: 'POST', body: JSON.stringify(data) }),
  runProject: (id: string) => req<{status:string}>(`/api/projects/${id}/run`, { method: 'POST' }),
  pauseProject: (id: string) => req<any>(`/api/projects/${id}/pause`, { method: 'POST' }),
  resumeProject: (id: string) => req<any>(`/api/projects/${id}/resume`, { method: 'POST' }),
  cancelProject: (id: string) => req<any>(`/api/projects/${id}/cancel`, { method: 'POST' }),

  // Tasks
  listTasks: (projectId: string) => req<Task[]>(`/api/projects/${projectId}/tasks`),
  getTask: (taskId: string) => req<Task>(`/api/tasks/${taskId}`),
  retryTask: (taskId: string) => req<any>(`/api/tasks/${taskId}/retry`, { method: 'POST' }),
  createTask: (projectId: string, data: any) => req<Task>(`/api/projects/${projectId}/tasks`, { method: 'POST', body: JSON.stringify(data) }),

  // Agents
  listAgents: () => req<Agent[]>('/api/agents'),
  getAgent: (id: string) => req<Agent>(`/api/agents/${id}`),

  // Misc
  getHealth: () => req<{status:string; provider:string}>(`/api/health`),
  listCheckpoints: (projectId: string) => req<Checkpoint[]>(`/api/projects/${projectId}/checkpoints`),
  listApprovals: () => req<Approval[]>('/api/approvals'),
  approve: (id: string) => req<any>(`/api/approvals/${id}/approve`, { method: 'POST' }),
  deny: (id: string) => req<any>(`/api/approvals/${id}/deny`, { method: 'POST' }),

  // Files
  getFile: (projectId: string, path: string) => req<{content:string}>(`/api/projects/${projectId}/files?path=${encodeURIComponent(path)}`),
  listFiles: (projectId: string) => req<string[]>(`/api/projects/${projectId}/files/list`),
};

export function getWsUrl(projectId?: string): string {
  const envUrl = (import.meta as any).env?.VITE_WS_URL as string | undefined;
  if (envUrl) return envUrl;
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  if (projectId) return `${proto}//${location.host}/api/ws/projects/${projectId}`;
  return `${proto}//${location.host}/api/ws/projects/default`;
}

export function getProjectWsUrl(projectId: string): string {
  const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${proto}//${location.host}/api/ws/projects/${projectId}`;
}

export function getApiBase(): string {
  return (import.meta as any).env?.VITE_API_URL || '';
}

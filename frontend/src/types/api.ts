export interface Project {
  id: string;
  name: string;
  description?: string;
  requirements?: string;
  workspace_path: string;
  status: 'created' | 'running' | 'completed' | 'failed' | 'paused';
  created_at: string;
  updated_at: string;
  tasks_count?: number;
  tasks_by_status?: Record<string, number>;
  workspace_files?: string[];
  checkpoints?: Checkpoint[];
}

export interface Task {
  id: string;
  project_id: string;
  title: string;
  description?: string;
  owner_agent_id?: string;
  owner_role?: string;
  status: 'queued' | 'running' | 'completed' | 'failed' | 'blocked' | 'waiting';
  priority: 'low' | 'medium' | 'high' | 'critical';
  acceptance_criteria?: string[];
  dependencies?: string[];
  retry_count: number;
  files_changed?: string[];
  report?: TaskReport;
  error?: string;
  created_at: string;
  updated_at?: string;
  started_at?: string;
  completed_at?: string;
  agency_chain_phase?: string;
  instructor?: string;
  assistant?: string;
}

export interface TaskReport {
  summary: string;
  files_changed?: string[];
  tests?: { status: string };
  agent_id?: string;
  model?: string;
  phase?: string;
}

export interface Agent {
  id: string;
  role: string;
  skills?: string[];
  tools?: string[];
  status: 'dormant' | 'ready' | 'working' | 'blocked' | 'waiting';
  current_task_id?: string;
  model_policy?: string;
}

export interface Checkpoint {
  id: string;
  project_id: string;
  git_commit: string;
  description: string;
  created_at: string;
}

export interface Approval {
  id: string;
  project_id: string;
  task_id?: string;
  operation: string;
  status: 'pending' | 'approved' | 'denied';
  reason?: string;
}

export interface KPI {
  successRate: number;
  avgDuration: number;
  tasksCompleted: number;
  toolCalls: number;
  projects: number;
  activeAgents: number;
}

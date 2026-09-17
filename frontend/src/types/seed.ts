/* AI Agency Operations Interface — Seed Data Types */

export type AgentStatus = 'READY' | 'WORKING' | 'WAITING' | 'FAILED' | 'DORMANT' | 'OFFLINE';

export type TaskStatus = 'QUEUED' | 'WORKING' | 'WAITING' | 'WAITING_FOR_DEPENDENCY' | 'FAILED' | 'CANCELLED' | 'COMPLETED';

export type TaskPriority = 'low' | 'medium' | 'high' | 'critical';

export interface Agent {
  id: string;
  name: string;
  team: string;
  status: AgentStatus;
  currentTaskId: string | null;
  utilizationPct: number;
  lastHeartbeat: string;
  version: string;
}

export interface Task {
  id: string;
  title: string;
  assignedAgentId: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  createdAt: string;
  startedAt: string | null;
  duration: string | null;
  dependsOnTaskId: string | null;
  retries: number;
}

export interface Team {
  name: string;
  lead: string;
  agentCount: number;
  capacity: number;
  utilizationPct: number;
}

export interface AuditActor {
  name: string;
  role: string;
}

export interface AuditEvent {
  timestamp: string;
  actor: AuditActor;
  action: string;
  targetId: string;
  targetLabel: string;
  result: 'success' | 'failure' | 'pending';
  details: string;
}

export interface TaskOutcomeDay {
  date: string;
  completed: number;
  failed: number;
  cancelled: number;
}

export interface DashboardExceptions {
  failedTasks24h: Task[];
  waitingLong: Task[];
  staleAgents: Agent[];
}
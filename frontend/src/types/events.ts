export interface StreamEvent {
  type: string;
  payload: Record<string, any>;
  timestamp: string;
}

export type EventType =
  | 'project.created'
  | 'project.completed'
  | 'project.failed'
  | 'task.created'
  | 'task.assigned'
  | 'task.started'
  | 'task.completed'
  | 'task.failed'
  | 'task.retry'
  | 'agent.thinking'
  | 'agent.awakened'
  | 'tool.execution.completed'
  | 'tool.execution.failed'
  | 'orchestrator.deadlock'
  | 'approval.requested'
  | 'approval.approved'
  | 'pm.plan_created'
  | 'pm.agency_chain_created';

export interface TaskEventPayload {
  task_id: string;
  title?: string;
  status?: string;
  agent_id?: string;
  model?: string;
}

export interface AgentEventPayload {
  agent_id: string;
  role?: string;
  content?: string;
}

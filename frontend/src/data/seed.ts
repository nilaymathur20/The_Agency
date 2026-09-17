/* AI Agency Operations Interface — Seed Data */
/* Realistic demo data with no placeholder content */

import type { Agent, Task, Team, AuditEvent, AgentStatus, TaskStatus } from '../types/seed';

// ===== STATUS ENUMS (closed unions per spec) =====

export const AGENT_STATUSES: AgentStatus[] = [
  'READY',
  'WORKING',
  'WAITING',
  'FAILED',
  'DORMANT',
  'OFFLINE'
] as const;

export const TASK_STATUSES: TaskStatus[] = [
  'QUEUED',
  'WORKING',
  'WAITING_FOR_DEPENDENCY',
  'FAILED',
  'CANCELLED',
  'COMPLETED'
] as const;

// ===== TEAMS =====

export const teams: Team[] = [
  {
    name: 'Platform Engineering',
    lead: 'M. Okafor',
    agentCount: 4,
    capacity: 400,
    utilizationPct: 78
  },
  {
    name: 'Data Services',
    lead: 'S. Chen',
    agentCount: 3,
    capacity: 300,
    utilizationPct: 92
  },
  {
    name: 'Infrastructure',
    lead: 'R. Patel',
    agentCount: 3,
    capacity: 300,
    utilizationPct: 65
  }
];

// ===== AGENTS =====

export const agents: Agent[] = [
  {
    id: 'AGT-0042',
    name: 'Code Reviewer Alpha',
    team: 'Platform Engineering',
    status: 'WORKING',
    currentTaskId: 'TSK-1107',
    utilizationPct: 85,
    lastHeartbeat: '2026-09-17T06:58:00',
    version: '2.4.1'
  },
  {
    id: 'AGT-0043',
    name: 'Build Agent Bravo',
    team: 'Platform Engineering',
    status: 'READY',
    currentTaskId: null,
    utilizationPct: 72,
    lastHeartbeat: '2026-09-17T07:02:00',
    version: '2.4.1'
  },
  {
    id: 'AGT-0044',
    name: 'Test Runner Charlie',
    team: 'Platform Engineering',
    status: 'WAITING',
    currentTaskId: null,
    utilizationPct: 45,
    lastHeartbeat: '2026-09-17T07:01:00',
    version: '2.4.0'
  },
  {
    id: 'AGT-0045',
    name: 'Deploy Agent Delta',
    team: 'Platform Engineering',
    status: 'FAILED',
    currentTaskId: null,
    utilizationPct: 0,
    lastHeartbeat: '2026-09-17T05:12:00',
    version: '2.3.9'
  },
  {
    id: 'AGT-0051',
    name: 'ETL Pipeline Echo',
    team: 'Data Services',
    status: 'WORKING',
    currentTaskId: 'TSK-1115',
    utilizationPct: 98,
    lastHeartbeat: '2026-09-17T07:03:00',
    version: '3.1.2'
  },
  {
    id: 'AGT-0052',
    name: 'Data Validator Foxtrot',
    team: 'Data Services',
    status: 'WORKING',
    currentTaskId: 'TSK-1118',
    utilizationPct: 91,
    lastHeartbeat: '2026-09-17T07:02:00',
    version: '3.1.2'
  },
  {
    id: 'AGT-0053',
    name: 'Query Optimizer Golf',
    team: 'Data Services',
    status: 'DORMANT',
    currentTaskId: null,
    utilizationPct: 0,
    lastHeartbeat: '2026-09-16T22:45:00',
    version: '3.0.8'
  },
  {
    id: 'AGT-0061',
    name: 'Cloud Provisioner Hotel',
    team: 'Infrastructure',
    status: 'READY',
    currentTaskId: null,
    utilizationPct: 68,
    lastHeartbeat: '2026-09-17T07:03:00',
    version: '1.8.4'
  },
  {
    id: 'AGT-0062',
    name: 'Security Scanner India',
    team: 'Infrastructure',
    status: 'OFFLINE',
    currentTaskId: null,
    utilizationPct: 0,
    lastHeartbeat: '2026-09-17T02:30:00',
    version: '1.8.4'
  },
  {
    id: 'AGT-0063',
    name: 'Config Manager Juliet',
    team: 'Infrastructure',
    status: 'WAITING',
    currentTaskId: null,
    utilizationPct: 55,
    lastHeartbeat: '2026-09-17T06:55:00',
    version: '1.8.3'
  }
];

// ===== TASKS =====

export const tasks: Task[] = [
  {
    id: 'TSK-1107',
    title: 'Review PR #487 - Auth middleware refactor',
    assignedAgentId: 'AGT-0042',
    status: 'WORKING',
    priority: 'high',
    createdAt: '2026-09-17T06:30:00',
    startedAt: '2026-09-17T06:45:00',
    duration: '18m',
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1108',
    title: 'Build artifacts for release v2.5.0',
    assignedAgentId: 'AGT-0043',
    status: 'QUEUED',
    priority: 'critical',
    createdAt: '2026-09-17T06:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1109',
    title: 'Run integration test suite - payment module',
    assignedAgentId: 'AGT-0044',
    status: 'QUEUED',
    priority: 'medium',
    createdAt: '2026-09-17T05:45:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1110',
    title: 'Deploy staging to us-east-1',
    assignedAgentId: 'AGT-0045',
    status: 'FAILED',
    priority: 'high',
    createdAt: '2026-09-17T04:15:00',
    startedAt: '2026-09-17T04:20:00',
    duration: '52m',
    dependsOnTaskId: null,
    retries: 2
  },
  {
    id: 'TSK-1111',
    title: 'Update dependencies in frontend monorepo',
    assignedAgentId: null,
    status: 'WAITING_FOR_DEPENDENCY',
    priority: 'low',
    createdAt: '2026-09-16T14:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: 'TSK-1107',
    retries: 0
  },
  {
    id: 'TSK-1112',
    title: 'Generate API documentation',
    assignedAgentId: null,
    status: 'CANCELLED',
    priority: 'low',
    createdAt: '2026-09-15T09:00:00',
    startedAt: '2026-09-15T09:30:00',
    duration: '15m',
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1113',
    title: 'Optimize database queries - user service',
    assignedAgentId: 'AGT-0043',
    status: 'COMPLETED',
    priority: 'high',
    createdAt: '2026-09-16T10:00:00',
    startedAt: '2026-09-16T10:15:00',
    duration: '1h 12m',
    dependsOnTaskId: null,
    retries: 1
  },
  {
    id: 'TSK-1114',
    title: 'Security audit - third-party packages',
    assignedAgentId: 'AGT-0062',
    status: 'CANCELLED',
    priority: 'medium',
    createdAt: '2026-09-14T11:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1115',
    title: 'ETL job - daily user metrics aggregation',
    assignedAgentId: 'AGT-0051',
    status: 'WORKING',
    priority: 'critical',
    createdAt: '2026-09-17T00:00:00',
    startedAt: '2026-09-17T00:05:00',
    duration: '6h 58m',
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1116',
    title: 'Data quality check - transaction logs',
    assignedAgentId: null,
    status: 'QUEUED',
    priority: 'medium',
    createdAt: '2026-09-17T03:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1117',
    title: 'Archive old logs to cold storage',
    assignedAgentId: null,
    status: 'WAITING_FOR_DEPENDENCY',
    priority: 'low',
    createdAt: '2026-09-16T16:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: 'TSK-1115',
    retries: 0
  },
  {
    id: 'TSK-1118',
    title: 'Validate schema migrations',
    assignedAgentId: 'AGT-0052',
    status: 'WORKING',
    priority: 'high',
    createdAt: '2026-09-17T05:30:00',
    startedAt: '2026-09-17T05:45:00',
    duration: '1h 18m',
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1119',
    title: 'Provision Kubernetes cluster - dev environment',
    assignedAgentId: 'AGT-0061',
    status: 'COMPLETED',
    priority: 'medium',
    createdAt: '2026-09-16T08:00:00',
    startedAt: '2026-09-16T08:30:00',
    duration: '2h 45m',
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1120',
    title: 'Rotate TLS certificates',
    assignedAgentId: null,
    status: 'QUEUED',
    priority: 'critical',
    createdAt: '2026-09-17T07:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: null,
    retries: 0
  },
  {
    id: 'TSK-1121',
    title: 'Configure monitoring alerts for new services',
    assignedAgentId: 'AGT-0063',
    status: 'WAITING',
    priority: 'medium',
    createdAt: '2026-09-17T04:00:00',
    startedAt: null,
    duration: null,
    dependsOnTaskId: null,
    retries: 0
  }
];

// ===== AUDIT EVENTS =====

export const auditEvents: AuditEvent[] = [
  {
    timestamp: '2026-09-17T07:02:00',
    actor: { name: 'R. Patel', role: 'Team Lead' },
    action: 'agent.restarted',
    targetId: 'AGT-0063',
    targetLabel: 'Config Manager Juliet',
    result: 'success',
    details: 'Agent restarted after configuration reload'
  },
  {
    timestamp: '2026-09-17T06:58:00',
    actor: { name: 'S. Chen', role: 'Team Lead' },
    action: 'task.cancelled',
    targetId: 'TSK-1114',
    targetLabel: 'Security audit - third-party packages',
    result: 'success',
    details: 'Task cancelled due to external vulnerability scanner being available'
  },
  {
    timestamp: '2026-09-17T06:45:00',
    actor: { name: 'M. Okafor', role: 'Team Lead' },
    action: 'task.assigned',
    targetId: 'TSK-1107',
    targetLabel: 'Review PR #487 - Auth middleware refactor',
    result: 'success',
    details: 'Task assigned to AGT-0042'
  },
  {
    timestamp: '2026-09-17T05:12:00',
    actor: { name: 'System', role: 'Orchestrator' },
    action: 'agent.failed',
    targetId: 'AGT-0045',
    targetLabel: 'Deploy Agent Delta',
    result: 'failure',
    details: 'Agent heartbeat timeout after 3 failed health checks'
  },
  {
    timestamp: '2026-09-17T04:15:00',
    actor: { name: 'M. Okafor', role: 'Team Lead' },
    action: 'task.created',
    targetId: 'TSK-1110',
    targetLabel: 'Deploy staging to us-east-1',
    result: 'success',
    details: 'High priority deployment task created'
  },
  {
    timestamp: '2026-09-17T02:30:00',
    actor: { name: 'System', role: 'Orchestrator' },
    action: 'agent.offlined',
    targetId: 'AGT-0062',
    targetLabel: 'Security Scanner India',
    result: 'success',
    details: 'Agent marked offline due to prolonged inactivity'
  },
  {
    timestamp: '2026-09-17T00:00:00',
    actor: { name: 'System', role: 'Scheduler' },
    action: 'task.scheduled',
    targetId: 'TSK-1115',
    targetLabel: 'ETL job - daily user metrics aggregation',
    result: 'success',
    details: 'Recurring daily task activated'
  },
  {
    timestamp: '2026-09-16T22:45:00',
    actor: { name: 'S. Chen', role: 'Team Lead' },
    action: 'agent.dormant',
    targetId: 'AGT-0053',
    targetLabel: 'Query Optimizer Golf',
    result: 'success',
    details: 'Agent set to dormant mode after 8 hours of inactivity'
  },
  {
    timestamp: '2026-09-16T16:00:00',
    actor: { name: 'R. Patel', role: 'Team Lead' },
    action: 'permissions.updated',
    targetId: 'AGT-0061',
    targetLabel: 'Cloud Provisioner Hotel',
    result: 'success',
    details: 'Added workspace.write permission scope'
  },
  {
    timestamp: '2026-09-16T14:30:00',
    actor: { name: 'System', role: 'Orchestrator' },
    action: 'task.retry',
    targetId: 'TSK-1113',
    targetLabel: 'Optimize database queries - user service',
    result: 'success',
    details: 'Task automatically retried after transient failure'
  },
  {
    timestamp: '2026-09-16T10:00:00',
    actor: { name: 'M. Okafor', role: 'Team Lead' },
    action: 'task.resumed',
    targetId: 'TSK-1113',
    targetLabel: 'Optimize database queries - user service',
    result: 'success',
    details: 'Task resumed after dependency resolved'
  },
  {
    timestamp: '2026-09-16T08:00:00',
    actor: { name: 'R. Patel', role: 'Team Lead' },
    action: 'agent.registered',
    targetId: 'AGT-0061',
    targetLabel: 'Cloud Provisioner Hotel',
    result: 'success',
    details: 'New agent registered with version 1.8.4'
  }
];

// ===== DERIVED DATA FOR DASHBOARD =====

export const dashboardMetrics = {
  readyAgents: agents.filter(a => a.status === 'READY').length,
  activeTasks: tasks.filter(t => t.status === 'WORKING').length,
  failedTasks24h: tasks.filter(t =>
    t.status === 'FAILED' &&
    t.startedAt &&
    new Date(t.startedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
  ).length,
  waitingOnDependency: tasks.filter(t => t.status === 'WAITING_FOR_DEPENDENCY').length,
  failedTasks24hPrevious: 7, // vs previous 24h
  exceptions: {
    failedTasks24h: tasks.filter(t =>
      t.status === 'FAILED' &&
      t.startedAt &&
      new Date(t.startedAt) > new Date(Date.now() - 24 * 60 * 60 * 1000)
    ),
    waitingLong: tasks.filter(t =>
      t.status === 'WAITING_FOR_DEPENDENCY' &&
      t.startedAt &&
      new Date(t.startedAt) < new Date(Date.now() - 15 * 60 * 1000)
    ),
    staleAgents: agents.filter(a =>
      (a.status === 'FAILED' || new Date(a.lastHeartbeat) < new Date(Date.now() - 5 * 60 * 1000))
    )
  }
};

// ===== TASK OUTCOMES BY DAY (14 days) =====

export const taskOutcomesByDay = [
  { date: '2026-09-16', completed: 12, failed: 1, cancelled: 2 },
  { date: '2026-09-15', completed: 8, failed: 0, cancelled: 1 },
  { date: '2026-09-14', completed: 15, failed: 3, cancelled: 0 },
  { date: '2026-09-13', completed: 9, failed: 2, cancelled: 1 },
  { date: '2026-09-12', completed: 11, failed: 1, cancelled: 0 },
  { date: '2026-09-11', completed: 7, failed: 0, cancelled: 2 },
  { date: '2026-09-10', completed: 14, failed: 2, cancelled: 1 },
  { date: '2026-09-09', completed: 10, failed: 1, cancelled: 0 },
  { date: '2026-09-08', completed: 13, failed: 4, cancelled: 1 },
  { date: '2026-09-07', completed: 6, failed: 0, cancelled: 0 },
  { date: '2026-09-06', completed: 9, failed: 1, cancelled: 2 },
  { date: '2026-09-05', completed: 11, failed: 2, cancelled: 1 },
  { date: '2026-09-04', completed: 8, failed: 0, cancelled: 0 },
  { date: '2026-09-03', completed: 12, failed: 1, cancelled: 1 }
];
import React from 'react';
import { KPICard } from './KPICard';
import './KPIGrid.css';

interface KPIGridProps {
  projects: number;
  activeAgents: number;
  totalAgents: number;
  queued: number;
  running: number;
  failed: number;
  completed: number;
  events: number;
  provider: string;
  isLoading?: boolean;
}

export function KPIGrid({ projects, activeAgents, totalAgents, queued, running, failed, completed, events, provider, isLoading }: KPIGridProps) {
  return (
    <div className="kpi-grid" role="region" aria-label="Key metrics">
      <KPICard
        label="Projects"
        value={projects}
        definition="Total workspaces created. Each project is an isolated workspace with git history."
        variant="default"
        isLoading={isLoading}
        trend={{ direction:'up', percentage:12, period:'last week' }}
      />
      <KPICard
        label="Active Agents"
        value={`${activeAgents} / ${totalAgents}`}
        definition="201 logical agents sharing one runtime. 12 parallel max, auto-fallback on 429."
        variant={running > 0 ? 'warning' : 'default'}
        isLoading={isLoading}
      />
      <KPICard
        label="Queued / Running"
        value={`${queued} / ${running}`}
        definition="Tasks waiting vs executing. Blocked = deadlock/dependency."
        variant={failed > 0 ? 'error' : queued > 5 ? 'warning' : 'default'}
        isLoading={isLoading}
      />
      <KPICard
        label="Completed"
        value={completed}
        definition="Tasks completed across all projects. Recent events show live activity."
        variant="success"
        isLoading={isLoading}
        trend={{ direction:'up', percentage:8, period:'today' }}
      />
    </div>
  );
}

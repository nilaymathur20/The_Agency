import React from 'react';
import type { Agent } from '../../types/api';
import './AgentGrid.css';

interface AgentGridProps {
  agents: Agent[];
  onSelect?: (agent: Agent) => void;
}

const statusTone: Record<string, string> = {
  dormant: 'agent--dormant',
  ready: 'agent--ready',
  working: 'agent--working',
  blocked: 'agent--blocked',
  waiting: 'agent--waiting',
};

export function AgentGrid({ agents, onSelect }: AgentGridProps) {
  if (!agents.length) {
    return (
      <div className="card"><div className="card__body" style={{ color:'var(--text-tertiary)', fontSize:13 }}>No agents registered.</div></div>
    );
  }
  return (
    <div className="agent-grid">
      {agents.map(a => (
        <button key={a.id} className={`agent-card ${statusTone[a.status] || ''}`} onClick={() => onSelect?.(a)}>
          <div className="agent-card__header">
            <div className="agent-card__avatar">{a.role.charAt(0).toUpperCase()}</div>
            <div className="agent-card__info">
              <div className="agent-card__role">{a.role}</div>
              <div className="agent-card__id mono">{a.id.slice(0,16)}</div>
            </div>
            <span className={`agent-card__badge agent-card__badge--${a.status}`}>{a.status}</span>
          </div>
          <div className="agent-card__meta">
            <span>{(a.tools || []).length} tools</span>
            <span>·</span>
            <span>{a.current_task_id ? 'busy' : 'idle'}</span>
            {a.model_policy && <span>· {a.model_policy.slice(0,16)}</span>}
          </div>
          {a.skills && a.skills.length>0 && (
            <div className="agent-card__skills">
              {a.skills.slice(0,3).map(s => <span key={s} className="agent-card__skill">{s}</span>)}
            </div>
          )}
        </button>
      ))}
    </div>
  );
}

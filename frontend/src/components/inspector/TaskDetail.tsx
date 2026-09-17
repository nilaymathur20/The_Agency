import React from 'react';
import type { Task } from '../../types/api';
import { Button } from '../common/Button';
import { formatRelative } from '../../utils/format';
import './TaskDetail.css';

interface TaskDetailProps {
  task: Task | null;
  onRetry?: (id: string) => void;
  onClose?: () => void;
}

export function TaskDetail({ task, onRetry, onClose }: TaskDetailProps) {
  if (!task) {
    return <div className="taskdetail__empty">Select a task to see details.</div>;
  }
  return (
    <div className="taskdetail">
      <div className="taskdetail__header">
        <div>
          <div className="taskdetail__title">{task.title}</div>
          <div className="taskdetail__meta mono">{task.id} · {task.agency_chain_phase || 'agency_chain' } · {task.priority}</div>
        </div>
        <span className={`taskdetail__badge taskdetail__badge--${task.status}`}>{task.status}</span>
      </div>

      {task.description && <p className="taskdetail__desc">{task.description}</p>}

      <div className="taskdetail__grid">
        <div><span className="taskdetail__label">Agent</span><span className="taskdetail__value">{task.owner_role || task.owner_agent_id || 'PM'}</span></div>
        <div><span className="taskdetail__label">Instructors</span><span className="taskdetail__value mono" style={{ fontSize:11 }}>{task.instructor || '—'}</span></div>
        <div><span className="taskdetail__label">Assistant</span><span className="taskdetail__value mono" style={{ fontSize:11 }}>{task.assistant || '—'}</span></div>
        <div><span className="taskdetail__label">Created</span><span className="taskdetail__value">{formatRelative(task.created_at)}</span></div>
        {task.started_at && <div><span className="taskdetail__label">Started</span><span className="taskdetail__value">{formatRelative(task.started_at)}</span></div>}
        {task.completed_at && <div><span className="taskdetail__label">Completed</span><span className="taskdetail__value">{formatRelative(task.completed_at)}</span></div>}
      </div>

      {task.dependencies && task.dependencies.length > 0 && (
        <div className="taskdetail__section">
          <h4>Dependencies</h4>
          <div className="taskdetail__chips">{task.dependencies.map(d => <span key={d} className="taskdetail__chip mono">{d.slice(0,12)}</span>)}</div>
        </div>
      )}

      {task.acceptance_criteria && task.acceptance_criteria.length > 0 && (
        <div className="taskdetail__section">
          <h4>Acceptance Criteria</h4>
          <ul className="taskdetail__list">{task.acceptance_criteria.map((c,i) => <li key={i}>{c}</li>)}</ul>
        </div>
      )}

      {task.files_changed && task.files_changed.length > 0 && (
        <div className="taskdetail__section">
          <h4>Files Changed</h4>
          <div className="taskdetail__chips">{task.files_changed.map(f => <span key={f} className="taskdetail__chip mono">{f}</span>)}</div>
        </div>
      )}

      {task.report && (
        <div className="taskdetail__section">
          <h4>Report</h4>
          <pre className="taskdetail__report">{JSON.stringify(task.report, null, 2)}</pre>
        </div>
      )}

      {task.error && (
        <div className="taskdetail__error">
          <h4>Error</h4>
          <pre>{task.error}</pre>
        </div>
      )}

      <div className="taskdetail__actions">
        {(task.status==='failed' || task.status==='blocked') && onRetry && (
          <Button variant="primary" size="sm" onClick={() => onRetry(task.id)}>Retry Task</Button>
        )}
        {onClose && <Button variant="secondary" size="sm" onClick={onClose}>Close</Button>}
      </div>
    </div>
  );
}

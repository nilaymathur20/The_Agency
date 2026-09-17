import React, { useMemo, useState, useCallback } from 'react';
import dagre from 'dagre';
import { classnames } from '../../utils/classnames';
import type { Task } from '../../types/api';
import './TaskGraph.css';

interface TaskGraphProps {
  tasks: Task[];
  onSelect?: (task: Task) => void;
  selectedId?: string;
}

type DisplayTask = Task & { children?: string[] };

function buildDagre(tasks: Task[]) {
  const g = new dagre.graphlib.Graph();
  g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 48, marginx: 20, marginy: 20 });
  g.setDefaultEdgeLabel(() => ({}));

  const taskMap = new Map<string, Task>(tasks.map(t => [t.id, t]));
  tasks.forEach(t => g.setNode(t.id, { width: 200, height: 72 }));
  tasks.forEach(t => {
    (t.dependencies || []).forEach(dep => {
      if (taskMap.has(dep)) g.setEdge(dep, t.id);
    });
  });
  dagre.layout(g);
  return g;
}

const statusTone: Record<string, string> = {
  queued: 'tone--queued',
  running: 'tone--running',
  completed: 'tone--completed',
  failed: 'tone--failed',
  blocked: 'tone--blocked',
  waiting: 'tone--waiting',
};

export function TaskGraph({ tasks, onSelect, selectedId }: TaskGraphProps) {
  const [filter, setFilter] = useState<string>('all');
  const filtered = useMemo(() => {
    if (filter === 'all') return tasks;
    return tasks.filter(t => t.status === filter);
  }, [tasks, filter]);

  const graph = useMemo(() => buildDagre(filtered), [filtered]);
  const width = graph.graph().width || 400;
  const height = graph.graph().height || 300;

  if (tasks.length === 0) {
    return (
      <div className="card">
        <div className="card__header"><h3>Task Graph</h3></div>
        <div className="card__body">
          <p style={{ color:'var(--text-tertiary)', fontSize:13 }}>No tasks yet — run the project to generate the Agency Chain.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="card__header">
        <h3>Task Graph</h3>
        <div className="taskgraph__filters">
          {['all','queued','running','completed','failed','blocked'].map(s => (
            <button
              key={s}
              className={`taskgraph__chip ${filter===s ? 'taskgraph__chip--active':''}`}
              onClick={() => setFilter(s)}
              aria-pressed={filter===s}
            >
              {s}
            </button>
          ))}
        </div>
      </div>
      <div className="card__body" style={{ padding:0 }}>
        <div className="taskgraph__viewport">
          <svg width={width + 40} height={height + 40} style={{ minWidth:'100%' }}>
            {/* Edges */}
            {graph.edges().map(e => {
              const edge = graph.edge(e);
              const points = (edge.points as {x:number;y:number}[]) || [];
              const d = points.length ? `M${points[0].x},${points[0].y} ${points.slice(1).map(p=>`L${p.x},${p.y}`).join(' ')}` : '';
              return <path key={`${e.v}-${e.w}`} d={d} fill="none" stroke="#D1D5DB" strokeWidth="1.5" markerEnd="url(#arrow)" opacity={0.7} />;
            })}
            <defs>
              <marker id="arrow" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#9CA3AF" />
              </marker>
            </defs>
            {/* Nodes */}
            {filtered.map(task => {
              const n = graph.node(task.id);
              if (!n) return null;
              const x = n.x - n.width/2;
              const y = n.y - n.height/2;
              const tone = statusTone[task.status] || 'tone--queued';
              return (
                <g key={task.id} transform={`translate(${x},${y})`} onClick={() => onSelect?.(task)} style={{ cursor:'pointer' }}>
                  <rect
                    width={n.width} height={n.height} rx={8} ry={8}
                    className={classnames('taskgraph__node', tone, selectedId===task.id && 'taskgraph__node--selected')}
                    fill="white" strokeWidth={selectedId===task.id ? 2 : 1.2}
                  />
                  {/* status dot */}
                  <circle cx={12} cy={14} r={5} className={tone} />
                  <text x={22} y={14} fontSize={10} fontWeight={700} fill="var(--text-tertiary)" dominantBaseline="middle" style={{ textTransform:'uppercase', letterSpacing:'0.05em' }}>{task.status}</text>
                  <text x={12} y={34} fontSize={11} fontWeight={600} fill="var(--text-primary)" className="taskgraph__title">{(task.title || task.id).slice(0,26)}</text>
                  <text x={12} y={48} fontSize={10} fill="var(--text-tertiary)">{task.owner_role || task.owner_agent_id || 'PM'} · {task.priority}</text>
                </g>
              );
            })}
          </svg>
        </div>
      </div>
    </div>
  );
}

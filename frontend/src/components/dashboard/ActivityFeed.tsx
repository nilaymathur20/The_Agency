import React, { useMemo, useState } from 'react';
import { formatRelative } from '../../utils/format';
import './ActivityFeed.css';

export interface ActivityItem {
  id: string;
  type: string;
  title: string;
  description?: string;
  timestamp: string;
  agent?: string;
  icon?: string;
}

interface ActivityFeedProps {
  items: ActivityItem[];
  onSelectProject?: (projectId: string) => void;
  maxHeight?: number;
}

export function ActivityFeed({ items, onSelectProject, maxHeight = 480 }: ActivityFeedProps) {
  const [filter, setFilter] = useState<string>('all');
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    let out = items;
    if (filter !== 'all') out = out.filter(i => i.type === filter);
    if (query) out = out.filter(i => i.title.toLowerCase().includes(query.toLowerCase()) || i.description?.toLowerCase().includes(query.toLowerCase()));
    return out.slice().sort((a,b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
  }, [items, filter, query]);

  const types = useMemo(() => Array.from(new Set(items.map(i => i.type))).slice(0, 8), [items]);

  return (
    <div className="card activity-feed">
      <div className="card__header">
        <h3 style={{ fontSize:14 }}>Activity</h3>
        <span className="activity-feed__count">{filtered.length} events</span>
      </div>

      <div className="activity-feed__tools">
        <input className="input" placeholder="Filter events…" value={query} onChange={e => setQuery(e.target.value)} aria-label="Filter events" style={{ padding:'8px 10px', fontSize:12 }} />
        <div className="activity-feed__chips">
          <button className={`activity-feed__chip ${filter==='all'?'activity-feed__chip--active':''}`} onClick={()=>setFilter('all')}>All</button>
          {types.map(t => (
            <button key={t} className={`activity-feed__chip ${filter===t?'activity-feed__chip--active':''}`} onClick={()=>setFilter(t)}>{t.split('.')[0]}</button>
          ))}
        </div>
      </div>

      <div className="activity-feed__list" style={{ maxHeight }} role="log" aria-live="polite">
        {filtered.length === 0 && (
          <div style={{ padding:'24px', color:'var(--text-tertiary)', fontSize:13, textAlign:'center' }}>No events yet — start a project to see live updates.</div>
        )}
        {filtered.map(item => (
          <div key={item.id} className="activity-feed__item">
            <div className="activity-feed__icon">{item.icon || eventIcon(item.type)}</div>
            <div className="activity-feed__content">
              <div className="activity-feed__title">{item.title}</div>
              {item.description && <div className="activity-feed__desc">{item.description}</div>}
              <div className="activity-feed__meta">
                <span>{formatRelative(item.timestamp)}</span>
                {item.agent && <span>· {item.agent}</span>}
                <span className="activity-feed__type">{item.type}</span>
              </div>
            </div>
            <div className="activity-feed__dot" aria-hidden="true" />
          </div>
        ))}
      </div>
    </div>
  );
}

function eventIcon(type: string): string {
  if (type.includes('completed')) return '✓';
  if (type.includes('failed')) return '✗';
  if (type.includes('started')) return '⚡';
  if (type.includes('created')) return '+';
  if (type.includes('tool')) return '🔧';
  if (type.includes('approval')) return '🔒';
  return '·';
}

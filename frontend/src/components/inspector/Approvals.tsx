import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import type { Approval } from '../../types/api';
import { Button } from '../common/Button';
import './Approvals.css';

interface ApprovalsProps {
  projectId?: string;
  onUpdate?: () => void;
}

export function Approvals({ projectId, onUpdate }: ApprovalsProps) {
  const [items, setItems] = useState<Approval[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const data = await api.listApprovals();
      const filtered = projectId ? data.filter((a: Approval) => !a.project_id || a.project_id === projectId) : data;
      setItems(filtered);
    } catch { /* ignore */ } finally { setLoading(false); }
  };

  useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [projectId]);

  const handle = async (id: string, action: 'approve'|'deny') => {
    try {
      if (action === 'approve') await api.approve(id);
      else await api.deny(id);
      load(); onUpdate?.();
    } catch {}
  };

  if (loading && items.length === 0) return <div style={{ padding:12, color:'var(--text-tertiary)' }}>Loading approvals…</div>;
  if (items.length === 0) return <div style={{ padding:12, color:'var(--text-tertiary)', fontSize:13 }}>No pending approvals.</div>;

  return (
    <div className="approvals">
      {items.filter(a=>a.status==='pending').map(a => (
        <div key={a.id} className="approvals__item">
          <div className="approvals__header">
            <span className="approvals__op">{a.operation}</span>
            <span className="approvals__status approvals__status--pending">pending</span>
          </div>
          <div className="approvals__meta mono" style={{ fontSize:11, color:'var(--text-tertiary)' }}>{a.id} {a.task_id ? `· task ${a.task_id.slice(0,8)}` : ''}</div>
          <div className="approvals__actions">
            <Button variant="primary" size="sm" onClick={() => handle(a.id, 'approve')}>Approve</Button>
            <Button variant="secondary" size="sm" onClick={() => handle(a.id, 'deny')}>Deny</Button>
          </div>
        </div>
      ))}
      {items.filter(a=>a.status!=='pending').length>0 && (
        <div style={{ marginTop:12 }}>
          <div style={{ fontSize:11, fontWeight:600, color:'var(--text-tertiary)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>Recent</div>
          {items.filter(a=>a.status!=='pending').slice(0,5).map(a => (
            <div key={a.id} className="approvals__item approvals__item--muted">
              <span className="approvals__op">{a.operation}</span>
              <span className={`approvals__status approvals__status--${a.status}`}>{a.status}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

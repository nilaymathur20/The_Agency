import React, { useEffect, useState } from 'react';
import './DatabaseViewer.css';

interface DatabaseViewerProps {
  projectId: string;
}

export function DatabaseViewer({ projectId }: DatabaseViewerProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/projects/${projectId}`)
      .then(r => r.json())
      .then(j => { if (!cancelled) setData(j); })
      .catch(e => { if (!cancelled) setError((e as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId]);

  if (loading) return <div className="dbviewer__empty">Loading database…</div>;
  if (error) return <div className="dbviewer__empty">Failed: {error}</div>;
  if (!data) return <div className="dbviewer__empty">No data.</div>;

  return (
    <div className="dbviewer">
      <div className="dbviewer__header">Project Snapshot — SQLite</div>
      <div className="dbviewer__grid">
        <div className="dbviewer__card"><div className="dbviewer__card-label">Project ID</div><div className="dbviewer__card-value mono">{data.id}</div></div>
        <div className="dbviewer__card"><div className="dbviewer__card-label">Status</div><div className="dbviewer__card-value" style={{ textTransform:'capitalize' }}>{data.status}</div></div>
        <div className="dbviewer__card"><div className="dbviewer__card-label">Workspace</div><div className="dbviewer__card-value mono" style={{ fontSize:11 }}>{data.workspace_path}</div></div>
        <div className="dbviewer__card"><div className="dbviewer__card-label">Files</div><div className="dbviewer__card-value">{data.workspace_files?.length || 0}</div></div>
      </div>
      <div className="dbviewer__section">
        <h4 className="dbviewer__section-title">Tasks by status</h4>
        <div className="dbviewer__chips">
          {data.tasks_by_status ? Object.entries(data.tasks_by_status).map(([k, v]) => (
            <span key={k} className="dbviewer__chip">{k}: <strong>{String(v)}</strong></span>
          )) : <span style={{ color:'var(--text-tertiary)', fontSize:12 }}>No tasks</span>}
        </div>
      </div>
      <div className="dbviewer__section">
        <h4 className="dbviewer__section-title">Checkpoints</h4>
        {data.checkpoints?.length ? data.checkpoints.map((c:any) => (
          <div key={c.id} className="dbviewer__row">
            <span className="mono" style={{ fontSize:11 }}>{c.git_commit?.slice(0,7)}</span>
            <span style={{ fontSize:12 }}>{c.description}</span>
            <span style={{ fontSize:11, color:'var(--text-tertiary)' }}>{new Date(c.created_at).toLocaleString()}</span>
          </div>
        )) : <div style={{ color:'var(--text-tertiary)', fontSize:12 }}>No checkpoints yet.</div>}
      </div>
      <details style={{ marginTop:12 }}>
        <summary style={{ fontSize:12, cursor:'pointer', color:'var(--text-secondary)' }}>Raw JSON</summary>
        <pre style={{ fontSize:11, background:'#0B1220', color:'#E2E8F0', padding:12, borderRadius:8, overflow:'auto', marginTop:8 }}>{JSON.stringify(data, null, 2)}</pre>
      </details>
    </div>
  );
}

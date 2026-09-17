import React, { useEffect, useState } from 'react';
import { api } from '../../services/api';
import './CodeViewer.css';

interface CodeViewerProps {
  projectId: string;
  path: string;
}

export function CodeViewer({ projectId, path }: CodeViewerProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!path) return;
    let cancelled = false;
    setLoading(true); setError(null);
    api.getFile(projectId, path)
      .then(res => { if (!cancelled) setContent(res.content); })
      .catch(err => { if (!cancelled) setError((err as Error).message); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [projectId, path]);

  if (!path) {
    return <div className="codeviewer__empty">Select a file to preview its contents.</div>;
  }
  if (loading) return <div className="codeviewer__empty">Loading {path}…</div>;
  if (error) return <div className="codeviewer__error">Failed to load file: {error}</div>;

  return (
    <div className="codeviewer">
      <div className="codeviewer__bar">
        <span className="codeviewer__path mono">{path}</span>
        <button className="codeviewer__copy" onClick={() => navigator.clipboard.writeText(content)}>Copy</button>
      </div>
      <pre className="codeviewer__pre"><code>{content}</code></pre>
    </div>
  );
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import './DatabaseViewer.css';
export function DatabaseViewer({ projectId }) {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        fetch(`/api/projects/${projectId}`)
            .then(r => r.json())
            .then(j => { if (!cancelled)
            setData(j); })
            .catch(e => { if (!cancelled)
            setError(e.message); })
            .finally(() => { if (!cancelled)
            setLoading(false); });
        return () => { cancelled = true; };
    }, [projectId]);
    if (loading)
        return _jsx("div", { className: "dbviewer__empty", children: "Loading database\u2026" });
    if (error)
        return _jsxs("div", { className: "dbviewer__empty", children: ["Failed: ", error] });
    if (!data)
        return _jsx("div", { className: "dbviewer__empty", children: "No data." });
    return (_jsxs("div", { className: "dbviewer", children: [_jsx("div", { className: "dbviewer__header", children: "Project Snapshot \u2014 SQLite" }), _jsxs("div", { className: "dbviewer__grid", children: [_jsxs("div", { className: "dbviewer__card", children: [_jsx("div", { className: "dbviewer__card-label", children: "Project ID" }), _jsx("div", { className: "dbviewer__card-value mono", children: data.id })] }), _jsxs("div", { className: "dbviewer__card", children: [_jsx("div", { className: "dbviewer__card-label", children: "Status" }), _jsx("div", { className: "dbviewer__card-value", style: { textTransform: 'capitalize' }, children: data.status })] }), _jsxs("div", { className: "dbviewer__card", children: [_jsx("div", { className: "dbviewer__card-label", children: "Workspace" }), _jsx("div", { className: "dbviewer__card-value mono", style: { fontSize: 11 }, children: data.workspace_path })] }), _jsxs("div", { className: "dbviewer__card", children: [_jsx("div", { className: "dbviewer__card-label", children: "Files" }), _jsx("div", { className: "dbviewer__card-value", children: data.workspace_files?.length || 0 })] })] }), _jsxs("div", { className: "dbviewer__section", children: [_jsx("h4", { className: "dbviewer__section-title", children: "Tasks by status" }), _jsx("div", { className: "dbviewer__chips", children: data.tasks_by_status ? Object.entries(data.tasks_by_status).map(([k, v]) => (_jsxs("span", { className: "dbviewer__chip", children: [k, ": ", _jsx("strong", { children: String(v) })] }, k))) : _jsx("span", { style: { color: 'var(--text-tertiary)', fontSize: 12 }, children: "No tasks" }) })] }), _jsxs("div", { className: "dbviewer__section", children: [_jsx("h4", { className: "dbviewer__section-title", children: "Checkpoints" }), data.checkpoints?.length ? data.checkpoints.map((c) => (_jsxs("div", { className: "dbviewer__row", children: [_jsx("span", { className: "mono", style: { fontSize: 11 }, children: c.git_commit?.slice(0, 7) }), _jsx("span", { style: { fontSize: 12 }, children: c.description }), _jsx("span", { style: { fontSize: 11, color: 'var(--text-tertiary)' }, children: new Date(c.created_at).toLocaleString() })] }, c.id))) : _jsx("div", { style: { color: 'var(--text-tertiary)', fontSize: 12 }, children: "No checkpoints yet." })] }), _jsxs("details", { style: { marginTop: 12 }, children: [_jsx("summary", { style: { fontSize: 12, cursor: 'pointer', color: 'var(--text-secondary)' }, children: "Raw JSON" }), _jsx("pre", { style: { fontSize: 11, background: '#0B1220', color: '#E2E8F0', padding: 12, borderRadius: 8, overflow: 'auto', marginTop: 8 }, children: JSON.stringify(data, null, 2) })] })] }));
}

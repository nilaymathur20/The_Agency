import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from 'react';
import { api } from '../../services/api';
import { Button } from '../common/Button';
import './Approvals.css';
export function Approvals({ projectId, onUpdate }) {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(false);
    const load = async () => {
        setLoading(true);
        try {
            const data = await api.listApprovals();
            const filtered = projectId ? data.filter((a) => !a.project_id || a.project_id === projectId) : data;
            setItems(filtered);
        }
        catch { /* ignore */ }
        finally {
            setLoading(false);
        }
    };
    useEffect(() => { load(); const id = setInterval(load, 5000); return () => clearInterval(id); }, [projectId]);
    const handle = async (id, action) => {
        try {
            if (action === 'approve')
                await api.approve(id);
            else
                await api.deny(id);
            load();
            onUpdate?.();
        }
        catch { }
    };
    if (loading && items.length === 0)
        return _jsx("div", { style: { padding: 12, color: 'var(--text-tertiary)' }, children: "Loading approvals\u2026" });
    if (items.length === 0)
        return _jsx("div", { style: { padding: 12, color: 'var(--text-tertiary)', fontSize: 13 }, children: "No pending approvals." });
    return (_jsxs("div", { className: "approvals", children: [items.filter(a => a.status === 'pending').map(a => (_jsxs("div", { className: "approvals__item", children: [_jsxs("div", { className: "approvals__header", children: [_jsx("span", { className: "approvals__op", children: a.operation }), _jsx("span", { className: "approvals__status approvals__status--pending", children: "pending" })] }), _jsxs("div", { className: "approvals__meta mono", style: { fontSize: 11, color: 'var(--text-tertiary)' }, children: [a.id, " ", a.task_id ? `· task ${a.task_id.slice(0, 8)}` : ''] }), _jsxs("div", { className: "approvals__actions", children: [_jsx(Button, { variant: "primary", size: "sm", onClick: () => handle(a.id, 'approve'), children: "Approve" }), _jsx(Button, { variant: "secondary", size: "sm", onClick: () => handle(a.id, 'deny'), children: "Deny" })] })] }, a.id))), items.filter(a => a.status !== 'pending').length > 0 && (_jsxs("div", { style: { marginTop: 12 }, children: [_jsx("div", { style: { fontSize: 11, fontWeight: 600, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 8 }, children: "Recent" }), items.filter(a => a.status !== 'pending').slice(0, 5).map(a => (_jsxs("div", { className: "approvals__item approvals__item--muted", children: [_jsx("span", { className: "approvals__op", children: a.operation }), _jsx("span", { className: `approvals__status approvals__status--${a.status}`, children: a.status })] }, a.id)))] }))] }));
}

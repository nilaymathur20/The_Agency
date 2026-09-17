import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { createContext, useContext, useState, useCallback } from 'react';
const NotificationContext = createContext(undefined);
export function NotificationProvider({ children }) {
    const [state, setState] = useState({ toasts: [] });
    const notify = useCallback((toast) => {
        const id = Math.random().toString(36).slice(2);
        const t = { id, duration: 4000, ...toast };
        setState(s => ({ toasts: [...s.toasts, t] }));
        setTimeout(() => setState(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), t.duration);
    }, []);
    const dismiss = useCallback((id) => {
        setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
    }, []);
    return (_jsxs(NotificationContext.Provider, { value: { state, notify, dismiss }, children: [children, _jsx("div", { "aria-live": "polite", style: { position: 'fixed', bottom: 16, right: 16, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }, children: state.toasts.map(t => (_jsxs("div", { role: "alert", style: { background: 'var(--surface-raised)', border: '1px solid var(--border-default)', borderRadius: 'var(--radius-md)', padding: '12px 16px', boxShadow: 'var(--shadow-lg)', minWidth: 280, borderLeft: `4px solid ${t.variant === 'success' ? 'var(--color-success)' : t.variant === 'error' ? 'var(--color-error)' : t.variant === 'warning' ? 'var(--color-warning)' : 'var(--color-primary)'}` }, children: [_jsx("div", { style: { fontWeight: 600, fontSize: 13 }, children: t.title }), t.description && _jsx("div", { style: { fontSize: 12, color: 'var(--text-tertiary)' }, children: t.description })] }, t.id))) })] }));
}
export function useNotification() {
    const ctx = useContext(NotificationContext);
    if (!ctx)
        throw new Error('useNotification must be used within NotificationProvider');
    return ctx;
}

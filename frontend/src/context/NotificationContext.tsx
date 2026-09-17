import React, { createContext, useContext, useState, ReactNode, useCallback } from 'react';
import { Toast, StatusVariant } from '../types/ui';

interface NotificationState { toasts: Toast[]; }

const NotificationContext = createContext<{
  state: NotificationState;
  notify: (t: Omit<Toast, 'id'>) => void;
  dismiss: (id: string) => void;
} | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<NotificationState>({ toasts: [] });

  const notify = useCallback((toast: Omit<Toast, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    const t: Toast = { id, duration: 4000, ...toast } as Toast;
    setState(s => ({ toasts: [...s.toasts, t] }));
    setTimeout(() => setState(s => ({ toasts: s.toasts.filter(x => x.id !== id) })), t.duration);
  }, []);

  const dismiss = useCallback((id: string) => {
    setState(s => ({ toasts: s.toasts.filter(t => t.id !== id) }));
  }, []);

  return (
    <NotificationContext.Provider value={{ state, notify, dismiss }}>
      {children}
      <div aria-live="polite" style={{ position:'fixed', bottom:16, right:16, zIndex:9999, display:'flex', flexDirection:'column', gap:8 }}>
        {state.toasts.map(t => (
          <div key={t.id} role="alert" style={{ background: 'var(--surface-raised)', border:'1px solid var(--border-default)', borderRadius:'var(--radius-md)', padding:'12px 16px', boxShadow:'var(--shadow-lg)', minWidth:280, borderLeft:`4px solid ${t.variant==='success'?'var(--color-success)':t.variant==='error'?'var(--color-error)':t.variant==='warning'?'var(--color-warning)':'var(--color-primary)'}` }}>
            <div style={{ fontWeight:600, fontSize:13 }}>{t.title}</div>
            {t.description && <div style={{ fontSize:12, color:'var(--text-tertiary)' }}>{t.description}</div>}
          </div>
        ))}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotification must be used within NotificationProvider');
  return ctx;
}

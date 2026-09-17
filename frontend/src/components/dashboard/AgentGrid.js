import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import './AgentGrid.css';
const statusTone = {
    dormant: 'agent--dormant',
    ready: 'agent--ready',
    working: 'agent--working',
    blocked: 'agent--blocked',
    waiting: 'agent--waiting',
};
export function AgentGrid({ agents, onSelect }) {
    if (!agents.length) {
        return (_jsx("div", { className: "card", children: _jsx("div", { className: "card__body", style: { color: 'var(--text-tertiary)', fontSize: 13 }, children: "No agents registered." }) }));
    }
    return (_jsx("div", { className: "agent-grid", children: agents.map(a => (_jsxs("button", { className: `agent-card ${statusTone[a.status] || ''}`, onClick: () => onSelect?.(a), children: [_jsxs("div", { className: "agent-card__header", children: [_jsx("div", { className: "agent-card__avatar", children: a.role.charAt(0).toUpperCase() }), _jsxs("div", { className: "agent-card__info", children: [_jsx("div", { className: "agent-card__role", children: a.role }), _jsx("div", { className: "agent-card__id mono", children: a.id.slice(0, 16) })] }), _jsx("span", { className: `agent-card__badge agent-card__badge--${a.status}`, children: a.status })] }), _jsxs("div", { className: "agent-card__meta", children: [_jsxs("span", { children: [(a.tools || []).length, " tools"] }), _jsx("span", { children: "\u00B7" }), _jsx("span", { children: a.current_task_id ? 'busy' : 'idle' }), a.model_policy && _jsxs("span", { children: ["\u00B7 ", a.model_policy.slice(0, 16)] })] }), a.skills && a.skills.length > 0 && (_jsx("div", { className: "agent-card__skills", children: a.skills.slice(0, 3).map(s => _jsx("span", { className: "agent-card__skill", children: s }, s)) }))] }, a.id))) }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { formatRelative } from '../../utils/format';
import './ActivityFeed.css';
export function ActivityFeed({ items, onSelectProject, maxHeight = 480 }) {
    const [filter, setFilter] = useState('all');
    const [query, setQuery] = useState('');
    const filtered = useMemo(() => {
        let out = items;
        if (filter !== 'all')
            out = out.filter(i => i.type === filter);
        if (query)
            out = out.filter(i => i.title.toLowerCase().includes(query.toLowerCase()) || i.description?.toLowerCase().includes(query.toLowerCase()));
        return out.slice().sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()).slice(0, 100);
    }, [items, filter, query]);
    const types = useMemo(() => Array.from(new Set(items.map(i => i.type))).slice(0, 8), [items]);
    return (_jsxs("div", { className: "card activity-feed", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { style: { fontSize: 14 }, children: "Activity" }), _jsxs("span", { className: "activity-feed__count", children: [filtered.length, " events"] })] }), _jsxs("div", { className: "activity-feed__tools", children: [_jsx("input", { className: "input", placeholder: "Filter events\u2026", value: query, onChange: e => setQuery(e.target.value), "aria-label": "Filter events", style: { padding: '8px 10px', fontSize: 12 } }), _jsxs("div", { className: "activity-feed__chips", children: [_jsx("button", { className: `activity-feed__chip ${filter === 'all' ? 'activity-feed__chip--active' : ''}`, onClick: () => setFilter('all'), children: "All" }), types.map(t => (_jsx("button", { className: `activity-feed__chip ${filter === t ? 'activity-feed__chip--active' : ''}`, onClick: () => setFilter(t), children: t.split('.')[0] }, t)))] })] }), _jsxs("div", { className: "activity-feed__list", style: { maxHeight }, role: "log", "aria-live": "polite", children: [filtered.length === 0 && (_jsx("div", { style: { padding: '24px', color: 'var(--text-tertiary)', fontSize: 13, textAlign: 'center' }, children: "No events yet \u2014 start a project to see live updates." })), filtered.map(item => (_jsxs("div", { className: "activity-feed__item", children: [_jsx("div", { className: "activity-feed__icon", children: item.icon || eventIcon(item.type) }), _jsxs("div", { className: "activity-feed__content", children: [_jsx("div", { className: "activity-feed__title", children: item.title }), item.description && _jsx("div", { className: "activity-feed__desc", children: item.description }), _jsxs("div", { className: "activity-feed__meta", children: [_jsx("span", { children: formatRelative(item.timestamp) }), item.agent && _jsxs("span", { children: ["\u00B7 ", item.agent] }), _jsx("span", { className: "activity-feed__type", children: item.type })] })] }), _jsx("div", { className: "activity-feed__dot", "aria-hidden": "true" })] }, item.id)))] })] }));
}
function eventIcon(type) {
    if (type.includes('completed'))
        return '✓';
    if (type.includes('failed'))
        return '✗';
    if (type.includes('started'))
        return '⚡';
    if (type.includes('created'))
        return '+';
    if (type.includes('tool'))
        return '🔧';
    if (type.includes('approval'))
        return '🔒';
    return '·';
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import dagre from 'dagre';
import { classnames } from '../../utils/classnames';
import './TaskGraph.css';
function buildDagre(tasks) {
    const g = new dagre.graphlib.Graph();
    g.setGraph({ rankdir: 'TB', nodesep: 24, ranksep: 48, marginx: 20, marginy: 20 });
    g.setDefaultEdgeLabel(() => ({}));
    const taskMap = new Map(tasks.map(t => [t.id, t]));
    tasks.forEach(t => g.setNode(t.id, { width: 200, height: 72 }));
    tasks.forEach(t => {
        (t.dependencies || []).forEach(dep => {
            if (taskMap.has(dep))
                g.setEdge(dep, t.id);
        });
    });
    dagre.layout(g);
    return g;
}
const statusTone = {
    queued: 'tone--queued',
    running: 'tone--running',
    completed: 'tone--completed',
    failed: 'tone--failed',
    blocked: 'tone--blocked',
    waiting: 'tone--waiting',
};
export function TaskGraph({ tasks, onSelect, selectedId }) {
    const [filter, setFilter] = useState('all');
    const filtered = useMemo(() => {
        if (filter === 'all')
            return tasks;
        return tasks.filter(t => t.status === filter);
    }, [tasks, filter]);
    const graph = useMemo(() => buildDagre(filtered), [filtered]);
    const width = graph.graph().width || 400;
    const height = graph.graph().height || 300;
    if (tasks.length === 0) {
        return (_jsxs("div", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { children: "Task Graph" }) }), _jsx("div", { className: "card__body", children: _jsx("p", { style: { color: 'var(--text-tertiary)', fontSize: 13 }, children: "No tasks yet \u2014 run the project to generate the Agency Chain." }) })] }));
    }
    return (_jsxs("div", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { children: "Task Graph" }), _jsx("div", { className: "taskgraph__filters", children: ['all', 'queued', 'running', 'completed', 'failed', 'blocked'].map(s => (_jsx("button", { className: `taskgraph__chip ${filter === s ? 'taskgraph__chip--active' : ''}`, onClick: () => setFilter(s), "aria-pressed": filter === s, children: s }, s))) })] }), _jsx("div", { className: "card__body", style: { padding: 0 }, children: _jsx("div", { className: "taskgraph__viewport", children: _jsxs("svg", { width: width + 40, height: height + 40, style: { minWidth: '100%' }, children: [graph.edges().map(e => {
                                const edge = graph.edge(e);
                                const points = edge.points || [];
                                const d = points.length ? `M${points[0].x},${points[0].y} ${points.slice(1).map(p => `L${p.x},${p.y}`).join(' ')}` : '';
                                return _jsx("path", { d: d, fill: "none", stroke: "#D1D5DB", strokeWidth: "1.5", markerEnd: "url(#arrow)", opacity: 0.7 }, `${e.v}-${e.w}`);
                            }), _jsx("defs", { children: _jsx("marker", { id: "arrow", viewBox: "0 0 10 10", refX: "8", refY: "5", markerWidth: "6", markerHeight: "6", orient: "auto-start-reverse", children: _jsx("path", { d: "M 0 0 L 10 5 L 0 10 z", fill: "#9CA3AF" }) }) }), filtered.map(task => {
                                const n = graph.node(task.id);
                                if (!n)
                                    return null;
                                const x = n.x - n.width / 2;
                                const y = n.y - n.height / 2;
                                const tone = statusTone[task.status] || 'tone--queued';
                                return (_jsxs("g", { transform: `translate(${x},${y})`, onClick: () => onSelect?.(task), style: { cursor: 'pointer' }, children: [_jsx("rect", { width: n.width, height: n.height, rx: 8, ry: 8, className: classnames('taskgraph__node', tone, selectedId === task.id && 'taskgraph__node--selected'), fill: "white", strokeWidth: selectedId === task.id ? 2 : 1.2 }), _jsx("circle", { cx: 12, cy: 14, r: 5, className: tone }), _jsx("text", { x: 22, y: 14, fontSize: 10, fontWeight: 700, fill: "var(--text-tertiary)", dominantBaseline: "middle", style: { textTransform: 'uppercase', letterSpacing: '0.05em' }, children: task.status }), _jsx("text", { x: 12, y: 34, fontSize: 11, fontWeight: 600, fill: "var(--text-primary)", className: "taskgraph__title", children: (task.title || task.id).slice(0, 26) }), _jsxs("text", { x: 12, y: 48, fontSize: 10, fill: "var(--text-tertiary)", children: [task.owner_role || task.owner_agent_id || 'PM', " \u00B7 ", task.priority] })] }, task.id));
                            })] }) }) })] }));
}

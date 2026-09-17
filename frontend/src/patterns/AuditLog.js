import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Audit Log Pattern */
/* Reverse-chronological table: Time, Actor (name + role), Action (monospace), Target (id + label), Result badge, expandable row */
import { useState, useMemo } from 'react';
import { DataTable } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Input } from '../components/common/Input';
import { auditEvents } from '../data/seed';
import './AuditLog.css';
// Result badge mapping
function getResultBadgeVariant(result) {
    switch (result) {
        case 'success':
            return 'success';
        case 'failure':
            return 'danger';
        case 'pending':
            return 'neutral';
        default:
            return 'neutral';
    }
}
export function AuditLog() {
    const [search, setSearch] = useState('');
    const [actionFilter, setActionFilter] = useState('all');
    const [resultFilter, setResultFilter] = useState('all');
    const [expandedRow, setExpandedRow] = useState(null);
    // Filter events
    const filteredEvents = useMemo(() => {
        let result = [...auditEvents];
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(e => e.actor.name.toLowerCase().includes(searchLower) ||
                e.action.toLowerCase().includes(searchLower) ||
                e.targetId.toLowerCase().includes(searchLower) ||
                e.targetLabel.toLowerCase().includes(searchLower));
        }
        // Action filter
        if (actionFilter !== 'all') {
            result = result.filter(e => e.action === actionFilter);
        }
        // Result filter
        if (resultFilter !== 'all') {
            result = result.filter(e => e.result === resultFilter);
        }
        return result;
    }, [search, actionFilter, resultFilter]);
    const columns = [
        {
            key: 'timestamp',
            header: 'Time',
            sortable: true,
            render: (row) => (_jsx("span", { className: "mono tabular-nums", children: row.timestamp.replace('T', ' ').slice(0, 16) }))
        },
        {
            key: 'actor',
            header: 'Actor',
            render: (row) => (_jsxs("div", { children: [_jsx("span", { children: row.actor.name }), _jsx("span", { className: "audit-actor-role", children: row.actor.role })] }))
        },
        {
            key: 'action',
            header: 'Action',
            render: (row) => _jsx("span", { className: "mono", children: row.action })
        },
        {
            key: 'targetId',
            header: 'Target',
            render: (row) => (_jsxs("div", { children: [_jsx("span", { className: "mono", children: row.targetId }), _jsx("span", { className: "audit-target-label", children: row.targetLabel })] }))
        },
        {
            key: 'result',
            header: 'Result',
            render: (row) => _jsx(Badge, { variant: getResultBadgeVariant(row.result), children: row.result })
        },
        {
            key: 'expand',
            header: '',
            render: (row) => (_jsx("button", { className: "audit-expand-btn", onClick: (e) => {
                    e.stopPropagation();
                    setExpandedRow(expandedRow === row.timestamp ? null : row.timestamp);
                }, "aria-expanded": expandedRow === row.timestamp, "aria-label": expandedRow === row.timestamp ? 'Collapse details' : 'Expand details', children: expandedRow === row.timestamp ? 'Hide' : 'Details' }))
        }
    ];
    // Get unique actions for filter
    const uniqueActions = useMemo(() => {
        const actions = new Set(auditEvents.map(e => e.action));
        return Array.from(actions).sort();
    }, []);
    return (_jsxs("div", { className: "audit-log", children: [_jsxs("div", { className: "audit-log__filters", children: [_jsx("div", { className: "audit-log__search", children: _jsx(Input, { placeholder: "Search audit log...", value: search, onChange: (e) => setSearch(e.target.value) }) }), _jsxs("div", { className: "audit-log__filter-group", children: [_jsxs("select", { value: actionFilter, onChange: (e) => setActionFilter(e.target.value), className: "audit-log__select", "aria-label": "Filter by action", children: [_jsx("option", { value: "all", children: "All actions" }), uniqueActions.map(action => (_jsx("option", { value: action, children: action }, action)))] }), _jsxs("select", { value: resultFilter, onChange: (e) => setResultFilter(e.target.value), className: "audit-log__select", "aria-label": "Filter by result", children: [_jsx("option", { value: "all", children: "All results" }), _jsx("option", { value: "success", children: "Success" }), _jsx("option", { value: "failure", children: "Failure" }), _jsx("option", { value: "pending", children: "Pending" })] })] })] }), _jsx(DataTable, { columns: columns, data: filteredEvents, keyField: "timestamp", sortKey: "timestamp", sortDirection: "desc", onRowClick: (row) => setExpandedRow(expandedRow === row.timestamp ? null : row.timestamp), ariaLabel: "Audit log" }), expandedRow && (_jsx("div", { className: "audit-log__expanded", children: (() => {
                    const event = auditEvents.find(e => e.timestamp === expandedRow);
                    if (!event)
                        return null;
                    return (_jsxs(_Fragment, { children: [_jsx("h4", { className: "audit-log__expanded-title", children: "Event Details" }), _jsxs("dl", { className: "audit-log__expanded-grid", children: [_jsx("dt", { children: "Timestamp" }), _jsx("dd", { className: "mono tabular-nums", children: event.timestamp }), _jsx("dt", { children: "Actor" }), _jsxs("dd", { children: [event.actor.name, " (", event.actor.role, ")"] }), _jsx("dt", { children: "Action" }), _jsx("dd", { className: "mono", children: event.action }), _jsx("dt", { children: "Target" }), _jsxs("dd", { children: [_jsx("span", { className: "mono", children: event.targetId }), _jsxs("span", { children: [" \u2014 ", event.targetLabel] })] }), _jsx("dt", { children: "Result" }), _jsx("dd", { children: _jsx(Badge, { variant: getResultBadgeVariant(event.result), children: event.result }) }), _jsx("dt", { children: "Details" }), _jsx("dd", { children: event.details })] })] }));
                })() })), _jsxs("div", { className: "audit-log__footer", children: ["Showing ", filteredEvents.length, " of ", auditEvents.length, " events"] })] }));
}

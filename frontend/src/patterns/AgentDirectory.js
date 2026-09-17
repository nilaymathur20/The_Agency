import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Agent Directory Pattern */
/* Table columns: Agent (id + name), Team, Status, Current task, Utilization %, Last heartbeat, row actions */
import { useState, useMemo } from 'react';
import { DataTable } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Input } from '../components/common/Input';
import { Drawer } from '../components/common/Drawer';
import { agents, teams } from '../data/seed';
import './AgentDirectory.css';
// Status badge mapping
function getStatusBadgeVariant(status) {
    switch (status) {
        case 'READY':
            return 'success';
        case 'WORKING':
            return 'warning';
        case 'FAILED':
            return 'danger';
        case 'WAITING':
        case 'DORMANT':
        case 'OFFLINE':
            return 'neutral';
        default:
            return 'neutral';
    }
}
export function AgentDirectory({ onSelectAgent }) {
    const [search, setSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('all');
    const [teamFilter, setTeamFilter] = useState('all');
    const [sortKey, setSortKey] = useState('id');
    const [sortDirection, setSortDirection] = useState('asc');
    const [selectedAgent, setSelectedAgent] = useState(null);
    // Filter and sort agents
    const filteredAgents = useMemo(() => {
        let result = [...agents];
        // Search filter
        if (search) {
            const searchLower = search.toLowerCase();
            result = result.filter(a => a.id.toLowerCase().includes(searchLower) ||
                a.name.toLowerCase().includes(searchLower) ||
                a.team.toLowerCase().includes(searchLower));
        }
        // Status filter
        if (statusFilter !== 'all') {
            result = result.filter(a => a.status === statusFilter);
        }
        // Team filter
        if (teamFilter !== 'all') {
            result = result.filter(a => a.team === teamFilter);
        }
        // Sort
        result.sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];
            if (sortKey === 'lastHeartbeat') {
                aVal = new Date(a.lastHeartbeat).getTime();
                bVal = new Date(b.lastHeartbeat).getTime();
            }
            if (aVal < bVal)
                return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal)
                return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [search, statusFilter, teamFilter, sortKey, sortDirection]);
    const handleSort = (key) => {
        if (sortKey === key) {
            setSortDirection(d => d === 'asc' ? 'desc' : 'asc');
        }
        else {
            setSortKey(key);
            setSortDirection('asc');
        }
    };
    const columns = [
        {
            key: 'id',
            header: 'Agent',
            render: (row) => (_jsxs("div", { children: [_jsx("span", { className: "mono", children: row.id }), _jsx("div", { className: "agent-name", children: row.name })] }))
        },
        {
            key: 'team',
            header: 'Team',
            sortable: true,
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (row) => _jsx(Badge, { variant: getStatusBadgeVariant(row.status), children: row.status })
        },
        {
            key: 'currentTaskId',
            header: 'Current task',
            render: (row) => row.currentTaskId ? _jsx("span", { className: "mono", children: row.currentTaskId }) : _jsx("span", { className: "text-tertiary", children: "\u2014" })
        },
        {
            key: 'utilizationPct',
            header: 'Utilization',
            sortable: true,
            render: (row) => (_jsxs("div", { className: "utilization-cell", children: [_jsxs("span", { className: "utilization-value", children: [row.utilizationPct, "%"] }), _jsx("div", { className: "utilization-bar", children: _jsx("div", { className: "utilization-bar__fill", style: { width: `${row.utilizationPct}%` } }) })] }))
        },
        {
            key: 'lastHeartbeat',
            header: 'Last heartbeat',
            sortable: true,
            render: (row) => {
                const date = row.lastHeartbeat.replace('T', ' ').slice(0, 16);
                return _jsx("span", { className: "mono tabular-nums", children: date });
            }
        }
    ];
    // Status counts for filter tabs
    const statusCounts = useMemo(() => {
        const counts = { all: agents.length };
        agents.forEach(a => {
            counts[a.status] = (counts[a.status] || 0) + 1;
        });
        return counts;
    }, []);
    // Get team for selected agent
    const selectedTeam = selectedAgent ? teams.find(t => t.name === selectedAgent.team) : null;
    return (_jsxs("div", { className: "agent-directory", children: [_jsxs("div", { className: "agent-directory__filters", children: [_jsx("div", { className: "agent-directory__search", children: _jsx(Input, { placeholder: "Search agents...", value: search, onChange: (e) => setSearch(e.target.value) }) }), _jsx("div", { className: "agent-directory__filter-group", children: _jsxs("select", { value: teamFilter, onChange: (e) => setTeamFilter(e.target.value), className: "agent-directory__select", "aria-label": "Filter by team", children: [_jsx("option", { value: "all", children: "All teams" }), teams.map(t => (_jsx("option", { value: t.name, children: t.name }, t.name)))] }) })] }), _jsxs("div", { className: "agent-directory__status-tabs", role: "tablist", children: [_jsxs("button", { role: "tab", "aria-selected": statusFilter === 'all', className: `agent-directory__status-tab ${statusFilter === 'all' ? 'agent-directory__status-tab--active' : ''}`, onClick: () => setStatusFilter('all'), children: ["All ", _jsx("span", { className: "agent-directory__status-count", children: statusCounts.all })] }), ['READY', 'WORKING', 'WAITING', 'FAILED', 'DORMANT', 'OFFLINE'].map(status => (_jsxs("button", { role: "tab", "aria-selected": statusFilter === status, className: `agent-directory__status-tab ${statusFilter === status ? 'agent-directory__status-tab--active' : ''}`, onClick: () => setStatusFilter(status), children: [status, " ", _jsx("span", { className: "agent-directory__status-count", children: statusCounts[status] || 0 })] }, status)))] }), _jsx(DataTable, { columns: columns, data: filteredAgents, keyField: "id", sortKey: sortKey, sortDirection: sortDirection, onSort: handleSort, onRowClick: (row) => {
                    setSelectedAgent(row);
                    onSelectAgent(row);
                }, ariaLabel: "Agent directory", pagination: {
                    page: 1,
                    pageSize: 50,
                    total: filteredAgents.length,
                    onPageChange: () => { }
                } }), _jsxs("div", { className: "agent-directory__footer", children: ["Showing ", filteredAgents.length, " of ", agents.length, " agents"] }), _jsx(Drawer, { isOpen: !!selectedAgent, onClose: () => setSelectedAgent(null), title: selectedAgent?.name || '', id: selectedAgent?.id || '', subtitle: selectedAgent?.team, footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setSelectedAgent(null), children: "Close" }), _jsx(Button, { variant: "danger", children: "Restart agent" })] }), children: selectedAgent && (_jsxs("div", { className: "agent-drawer", children: [_jsxs("div", { className: "agent-drawer__section", children: [_jsx("h3", { className: "agent-drawer__section-title", children: "Status" }), _jsx(Badge, { variant: getStatusBadgeVariant(selectedAgent.status), children: selectedAgent.status })] }), _jsxs("div", { className: "agent-drawer__section", children: [_jsx("h3", { className: "agent-drawer__section-title", children: "Current task" }), selectedAgent.currentTaskId ? (_jsx("span", { className: "mono", children: selectedAgent.currentTaskId })) : (_jsx("span", { className: "text-tertiary", children: "None" }))] }), _jsxs("div", { className: "agent-drawer__section", children: [_jsx("h3", { className: "agent-drawer__section-title", children: "Utilization" }), _jsxs("div", { className: "utilization-cell", children: [_jsxs("span", { className: "utilization-value", children: [selectedAgent.utilizationPct, "%"] }), _jsx("div", { className: "utilization-bar", children: _jsx("div", { className: "utilization-bar__fill", style: { width: `${selectedAgent.utilizationPct}%` } }) })] })] }), _jsxs("div", { className: "agent-drawer__section", children: [_jsx("h3", { className: "agent-drawer__section-title", children: "Last heartbeat" }), _jsx("span", { className: "mono tabular-nums", children: selectedAgent.lastHeartbeat.replace('T', ' ').slice(0, 16) })] }), _jsxs("div", { className: "agent-drawer__section", children: [_jsx("h3", { className: "agent-drawer__section-title", children: "Version" }), _jsx("span", { className: "mono", children: selectedAgent.version })] }), selectedTeam && (_jsxs("div", { className: "agent-drawer__section", children: [_jsx("h3", { className: "agent-drawer__section-title", children: "Team" }), _jsx("p", { children: selectedTeam.name }), _jsxs("p", { className: "text-tertiary", children: ["Lead: ", selectedTeam.lead] })] }))] })) })] }));
}

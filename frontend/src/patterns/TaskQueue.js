import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
/* Task Queue Pattern */
/* Status filter tabs with counts, columns: Task (id + title), Assigned agent, Status, Priority, Dependency, Started, Duration */
import { useState, useMemo } from 'react';
import { DataTable } from '../components/common/DataTable';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { Modal } from '../components/common/Modal';
import { Drawer } from '../components/common/Drawer';
import { tasks, agents, TASK_STATUSES } from '../data/seed';
import './TaskQueue.css';
// Status badge mapping
function getStatusBadgeVariant(status) {
    switch (status) {
        case 'COMPLETED':
            return 'success';
        case 'WORKING':
        case 'WAITING_FOR_DEPENDENCY':
            return 'warning';
        case 'FAILED':
            return 'danger';
        case 'QUEUED':
        case 'WAITING':
        case 'CANCELLED':
            return 'neutral';
        default:
            return 'neutral';
    }
}
export function TaskQueue({ onSelectTask }) {
    const [statusFilter, setStatusFilter] = useState('all');
    const [sortKey, setSortKey] = useState('createdAt');
    const [sortDirection, setSortDirection] = useState('desc');
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedRows, setSelectedRows] = useState(new Set());
    const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
    // Filter and sort tasks
    const filteredTasks = useMemo(() => {
        let result = [...tasks];
        if (statusFilter !== 'all') {
            result = result.filter(t => t.status === statusFilter);
        }
        // Sort
        result.sort((a, b) => {
            let aVal = a[sortKey];
            let bVal = b[sortKey];
            if (sortKey === 'createdAt' || sortKey === 'startedAt') {
                aVal = aVal ? new Date(aVal).getTime() : 0;
                bVal = bVal ? new Date(bVal).getTime() : 0;
            }
            if (aVal === null)
                return 1;
            if (bVal === null)
                return -1;
            if (aVal < bVal)
                return sortDirection === 'asc' ? -1 : 1;
            if (aVal > bVal)
                return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
        return result;
    }, [statusFilter, sortKey, sortDirection]);
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
            header: 'Task',
            render: (row) => (_jsxs("div", { children: [_jsx("span", { className: "mono", children: row.id }), _jsx("div", { className: "task-title", children: row.title })] }))
        },
        {
            key: 'assignedAgentId',
            header: 'Assigned agent',
            render: (row) => row.assignedAgentId ? _jsx("span", { className: "mono", children: row.assignedAgentId }) : _jsx("span", { className: "text-tertiary", children: "Unassigned" })
        },
        {
            key: 'status',
            header: 'Status',
            sortable: true,
            render: (row) => _jsx(Badge, { variant: getStatusBadgeVariant(row.status), children: row.status.replace(/_/g, ' ') })
        },
        {
            key: 'priority',
            header: 'Priority',
            sortable: true,
        },
        {
            key: 'dependsOnTaskId',
            header: 'Dependency',
            render: (row) => row.dependsOnTaskId ? _jsx("span", { className: "mono", children: row.dependsOnTaskId }) : _jsx("span", { className: "text-tertiary", children: "\u2014" })
        },
        {
            key: 'startedAt',
            header: 'Started',
            sortable: true,
            render: (row) => row.startedAt ? _jsx("span", { className: "mono tabular-nums", children: row.startedAt.replace('T', ' ').slice(0, 16) }) : '—'
        },
        {
            key: 'duration',
            header: 'Duration',
        }
    ];
    // Status counts
    const statusCounts = useMemo(() => {
        const counts = { all: tasks.length };
        tasks.forEach(t => {
            counts[t.status] = (counts[t.status] || 0) + 1;
        });
        return counts;
    }, []);
    // Row selection
    const handleSelectRow = (key, selected) => {
        const newSelected = new Set(selectedRows);
        if (selected) {
            newSelected.add(key);
        }
        else {
            newSelected.delete(key);
        }
        setSelectedRows(newSelected);
    };
    const handleSelectAll = (selected) => {
        if (selected) {
            setSelectedRows(new Set(filteredTasks.map(t => t.id)));
        }
        else {
            setSelectedRows(new Set());
        }
    };
    // Cancel handler
    const handleCancel = () => {
        setIsCancelModalOpen(false);
        // In real app, would call API to cancel tasks
        console.log('Cancelling tasks:', Array.from(selectedRows));
        setSelectedRows(new Set());
    };
    // Get assigned agent for selected task
    const selectedTaskAgent = selectedTask?.assignedAgentId
        ? agents.find(a => a.id === selectedTask.assignedAgentId)
        : null;
    return (_jsxs("div", { className: "task-queue", children: [_jsxs("div", { className: "task-queue__status-tabs", role: "tablist", children: [_jsxs("button", { role: "tab", "aria-selected": statusFilter === 'all', className: `task-queue__status-tab ${statusFilter === 'all' ? 'task-queue__status-tab--active' : ''}`, onClick: () => setStatusFilter('all'), children: ["All ", _jsx("span", { className: "task-queue__status-count", children: statusCounts.all })] }), TASK_STATUSES.map(status => (_jsxs("button", { role: "tab", "aria-selected": statusFilter === status, className: `task-queue__status-tab ${statusFilter === status ? 'task-queue__status-tab--active' : ''}`, onClick: () => setStatusFilter(status), children: [status.replace(/_/g, ' '), " ", _jsx("span", { className: "task-queue__status-count", children: statusCounts[status] || 0 })] }, status)))] }), selectedRows.size > 0 && (_jsxs("div", { className: "task-queue__bulk-bar", children: [_jsxs("span", { children: [selectedRows.size, " selected"] }), _jsx(Button, { variant: "danger", size: "sm", onClick: () => setIsCancelModalOpen(true), children: "Cancel selected" })] })), _jsx(DataTable, { columns: columns, data: filteredTasks, keyField: "id", sortKey: sortKey, sortDirection: sortDirection, onSort: handleSort, onRowClick: (row) => {
                    setSelectedTask(row);
                    onSelectTask(row);
                }, selectedRows: selectedRows, onSelectRow: handleSelectRow, onSelectAll: handleSelectAll, showSelection: true, ariaLabel: "Task queue" }), _jsxs(Modal, { isOpen: isCancelModalOpen, onClose: () => setIsCancelModalOpen(false), title: "Cancel tasks", variant: "danger", footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setIsCancelModalOpen(false), children: "Keep tasks" }), _jsxs(Button, { variant: "danger", onClick: handleCancel, children: ["Cancel ", selectedRows.size, " tasks"] })] }), children: [_jsxs("p", { children: ["Are you sure you want to cancel ", selectedRows.size, " task", selectedRows.size > 1 ? 's' : '', "?"] }), _jsx("p", { className: "text-tertiary", children: "Cancelled tasks cannot be resumed and will be marked as CANCELLED." })] }), _jsx(Drawer, { isOpen: !!selectedTask, onClose: () => setSelectedTask(null), title: selectedTask?.title || '', id: selectedTask?.id || '', footer: _jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", onClick: () => setSelectedTask(null), children: "Close" }), selectedTask?.status !== 'CANCELLED' && selectedTask?.status !== 'COMPLETED' && (_jsx(Button, { variant: "danger", children: "Cancel task" }))] }), children: selectedTask && (_jsxs("div", { className: "task-drawer", children: [_jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Status" }), _jsx(Badge, { variant: getStatusBadgeVariant(selectedTask.status), children: selectedTask.status.replace(/_/g, ' ') })] }), _jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Priority" }), _jsx("span", { children: selectedTask.priority })] }), _jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Assigned agent" }), selectedTaskAgent ? (_jsxs("div", { children: [_jsx("span", { className: "mono", children: selectedTask.id }), _jsx("p", { className: "text-tertiary", children: selectedTaskAgent.name })] })) : (_jsx("span", { className: "text-tertiary", children: "Unassigned" }))] }), _jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Created" }), _jsx("span", { className: "mono tabular-nums", children: selectedTask.createdAt.replace('T', ' ').slice(0, 16) })] }), selectedTask.startedAt && (_jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Started" }), _jsx("span", { className: "mono tabular-nums", children: selectedTask.startedAt.replace('T', ' ').slice(0, 16) })] })), selectedTask.duration && (_jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Duration" }), _jsx("span", { children: selectedTask.duration })] })), selectedTask.dependsOnTaskId && (_jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Depends on" }), _jsx("span", { className: "mono", children: selectedTask.dependsOnTaskId })] })), selectedTask.retries > 0 && (_jsxs("div", { className: "task-drawer__section", children: [_jsx("h3", { className: "task-drawer__section-title", children: "Retries" }), _jsx("span", { children: selectedTask.retries })] }))] })) })] }));
}

import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Dashboard Pattern */
/* 4 metrics, active tasks table, exceptions panel, task outcomes chart */
import { useState } from 'react';
import { Metric } from '../components/common/Metric';
import { Badge } from '../components/common/Badge';
import { Button } from '../components/common/Button';
import { DataTable } from '../components/common/DataTable';
import { tasks, taskOutcomesByDay, dashboardMetrics } from '../data/seed';
import './Dashboard.css';
// Status badge mapping
function getStatusBadgeVariant(status) {
    switch (status) {
        case 'READY':
        case 'COMPLETED':
            return 'success';
        case 'WORKING':
        case 'WAITING_FOR_DEPENDENCY':
            return 'warning';
        case 'FAILED':
            return 'danger';
        default:
            return 'neutral';
    }
}
export function Dashboard({ onViewTasks, onSelectTask, onSelectAgent }) {
    const [showChartData, setShowChartData] = useState(false);
    // Get active tasks (top 10 by priority)
    const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    const activeTasks = tasks
        .filter(t => t.status === 'WORKING')
        .sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority])
        .slice(0, 10);
    // Exceptions
    const exceptions = dashboardMetrics.exceptions;
    // Calculate chart dimensions
    const maxValue = Math.max(...taskOutcomesByDay.map(d => d.completed + d.failed + d.cancelled));
    return (_jsxs("div", { className: "dashboard-screen", children: [_jsxs("section", { className: "dashboard-metrics", children: [_jsx(Metric, { label: "Ready agents", value: dashboardMetrics.readyAgents, timeWindow: "Current" }), _jsx(Metric, { label: "Active tasks", value: dashboardMetrics.activeTasks, timeWindow: "Current" }), _jsx(Metric, { label: "Failed tasks", value: dashboardMetrics.failedTasks24h, unit: "", timeWindow: "Last 24h", delta: {
                            value: dashboardMetrics.failedTasks24hPrevious,
                            direction: dashboardMetrics.failedTasks24h > dashboardMetrics.failedTasks24hPrevious ? 'up' : 'down',
                            comparison: 'vs previous 24h'
                        } }), _jsx(Metric, { label: "Waiting on dependency", value: dashboardMetrics.waitingOnDependency, timeWindow: "Current" })] }), _jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { className: "dashboard-section__header", children: [_jsx("h2", { className: "dashboard-section__title", children: "Active tasks" }), _jsx(Button, { variant: "tertiary", size: "sm", onClick: onViewTasks, children: "View all" })] }), _jsx(DataTable, { columns: [
                            {
                                key: 'id',
                                header: 'Task',
                                render: (row) => (_jsxs("div", { children: [_jsx("span", { className: "mono", children: row.id }), _jsx("div", { className: "dashboard-task-title", children: row.title })] }))
                            },
                            {
                                key: 'assignedAgentId',
                                header: 'Agent',
                                render: (row) => row.assignedAgentId ? _jsx("span", { className: "mono", children: row.assignedAgentId }) : _jsx("span", { className: "text-tertiary", children: "Unassigned" })
                            },
                            {
                                key: 'status',
                                header: 'Status',
                                render: (row) => _jsx(Badge, { variant: getStatusBadgeVariant(row.status), children: row.status.replace(/_/g, ' ') })
                            },
                            {
                                key: 'priority',
                                header: 'Priority',
                                sortable: true,
                            },
                            {
                                key: 'startedAt',
                                header: 'Started',
                                render: (row) => row.startedAt ? row.startedAt.replace('T', ' ').slice(0, 16) : '—'
                            },
                            {
                                key: 'duration',
                                header: 'Duration',
                            }
                        ], data: activeTasks, keyField: "id", onRowClick: onSelectTask, ariaLabel: "Active tasks" })] }), _jsxs("section", { className: "dashboard-section", children: [_jsx("h2", { className: "dashboard-section__title", children: "Exceptions" }), _jsxs("div", { className: "dashboard-exceptions", children: [exceptions.failedTasks24h.length > 0 && (_jsxs("div", { className: "dashboard-exception-group", children: [_jsx("h3", { className: "dashboard-exception-group__title", children: "Failed tasks (24h)" }), _jsx("ul", { className: "dashboard-exception-list", children: exceptions.failedTasks24h.map(task => (_jsxs("li", { className: "dashboard-exception-item", onClick: () => onSelectTask(task), children: [_jsx(Badge, { variant: "danger", children: task.status }), _jsx("span", { className: "mono", children: task.id }), _jsx("span", { className: "dashboard-exception-item__title", children: task.title })] }, task.id))) })] })), exceptions.waitingLong.length > 0 && (_jsxs("div", { className: "dashboard-exception-group", children: [_jsxs("h3", { className: "dashboard-exception-group__title", children: ["Waiting for dependency ", '>', "15m"] }), _jsx("ul", { className: "dashboard-exception-list", children: exceptions.waitingLong.map(task => (_jsxs("li", { className: "dashboard-exception-item", onClick: () => onSelectTask(task), children: [_jsx(Badge, { variant: "warning", children: task.status.replace(/_/g, ' ') }), _jsx("span", { className: "mono", children: task.id }), _jsx("span", { className: "dashboard-exception-item__title", children: task.title }), task.dependsOnTaskId && _jsxs("span", { className: "mono dashboard-exception-item__dep", children: ["blocked by ", task.dependsOnTaskId] })] }, task.id))) })] })), exceptions.staleAgents.length > 0 && (_jsxs("div", { className: "dashboard-exception-group", children: [_jsxs("h3", { className: "dashboard-exception-group__title", children: ["Agents failed or stale ", '>', "5m"] }), _jsx("ul", { className: "dashboard-exception-list", children: exceptions.staleAgents.map(agent => (_jsxs("li", { className: "dashboard-exception-item", onClick: () => onSelectAgent(agent), children: [_jsx(Badge, { variant: "danger", children: agent.status }), _jsx("span", { className: "mono", children: agent.id }), _jsx("span", { className: "dashboard-exception-item__title", children: agent.name })] }, agent.id))) })] })), exceptions.failedTasks24h.length === 0 &&
                                exceptions.waitingLong.length === 0 &&
                                exceptions.staleAgents.length === 0 && (_jsx("p", { className: "dashboard-exceptions__empty", children: "No exceptions to report" }))] })] }), _jsxs("section", { className: "dashboard-section", children: [_jsxs("div", { className: "dashboard-section__header", children: [_jsx("h2", { className: "dashboard-section__title", children: "Task outcomes by day \u2014 last 14 days" }), _jsx(Button, { variant: "tertiary", size: "sm", onClick: () => setShowChartData(!showChartData), children: showChartData ? 'Hide data' : 'View data' })] }), _jsxs("div", { className: "dashboard-chart", role: "img", "aria-label": "Task outcomes by day - stacked bar chart", children: [_jsx("div", { className: "dashboard-chart__bars", children: taskOutcomesByDay.map(day => {
                                    const completedHeight = (day.completed / maxValue) * 100;
                                    const failedHeight = (day.failed / maxValue) * 100;
                                    const cancelledHeight = (day.cancelled / maxValue) * 100;
                                    return (_jsxs("div", { className: "dashboard-chart__bar-group", children: [_jsxs("div", { className: "dashboard-chart__bar-stack", children: [_jsx("div", { className: "dashboard-chart__bar dashboard-chart__bar--completed", style: { height: `${completedHeight}%` }, title: `Completed: ${day.completed}` }), _jsx("div", { className: "dashboard-chart__bar dashboard-chart__bar--failed", style: { height: `${failedHeight}%` }, title: `Failed: ${day.failed}` }), _jsx("div", { className: "dashboard-chart__bar dashboard-chart__bar--cancelled", style: { height: `${cancelledHeight}%` }, title: `Cancelled: ${day.cancelled}` })] }), _jsx("span", { className: "dashboard-chart__label", children: day.date.slice(5) })] }, day.date));
                                }) }), _jsxs("div", { className: "dashboard-chart__legend", children: [_jsxs("span", { className: "dashboard-chart__legend-item", children: [_jsx("span", { className: "dashboard-chart__legend-color dashboard-chart__legend-color--completed" }), "Completed"] }), _jsxs("span", { className: "dashboard-chart__legend-item", children: [_jsx("span", { className: "dashboard-chart__legend-color dashboard-chart__legend-color--failed" }), "Failed"] }), _jsxs("span", { className: "dashboard-chart__legend-item", children: [_jsx("span", { className: "dashboard-chart__legend-color dashboard-chart__legend-color--cancelled" }), "Cancelled"] })] })] }), showChartData && (_jsx("div", { className: "dashboard-chart__table", children: _jsxs("table", { children: [_jsx("thead", { children: _jsxs("tr", { children: [_jsx("th", { children: "Date" }), _jsx("th", { children: "Completed" }), _jsx("th", { children: "Failed" }), _jsx("th", { children: "Cancelled" }), _jsx("th", { children: "Total" })] }) }), _jsx("tbody", { children: taskOutcomesByDay.map(day => (_jsxs("tr", { children: [_jsx("td", { className: "mono", children: day.date }), _jsx("td", { children: day.completed }), _jsx("td", { children: day.failed }), _jsx("td", { children: day.cancelled }), _jsx("td", { children: day.completed + day.failed + day.cancelled })] }, day.date))) })] }) }))] })] }));
}

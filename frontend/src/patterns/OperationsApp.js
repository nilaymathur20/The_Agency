import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
/* Operations App - Main entry point for the AI Agency Operations Interface */
import { useState } from 'react';
import { OperationsShell } from './OperationsShell';
import { Dashboard } from './Dashboard';
import { AgentDirectory } from './AgentDirectory';
import { TaskQueue } from './TaskQueue';
import { AuditLog } from './AuditLog';
import { agents, tasks } from '../data/seed';
import './OperationsApp.css';
// Icons as simple SVG components
const DashboardIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("rect", { x: "2", y: "2", width: "7", height: "7", rx: "1" }), _jsx("rect", { x: "11", y: "2", width: "7", height: "7", rx: "1" }), _jsx("rect", { x: "2", y: "11", width: "7", height: "7", rx: "1" }), _jsx("rect", { x: "11", y: "11", width: "7", height: "7", rx: "1" })] }));
const AgentsIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("circle", { cx: "10", cy: "7", r: "3" }), _jsx("path", { d: "M4 18v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" })] }));
const TasksIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("path", { d: "M3 5h14M3 10h14M3 15h10" }), _jsx("circle", { cx: "17", cy: "15", r: "2" })] }));
const AuditIcon = () => (_jsxs("svg", { width: "20", height: "20", viewBox: "0 0 20 20", fill: "none", stroke: "currentColor", strokeWidth: "1.5", children: [_jsx("circle", { cx: "10", cy: "10", r: "7" }), _jsx("path", { d: "M10 6v4M10 14v.01" })] }));
export function OperationsApp() {
    const [activeScreen, setActiveScreen] = useState('dashboard');
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedAgent, setSelectedAgent] = useState(null);
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: _jsx(DashboardIcon, {}) },
        { id: 'agents', label: 'Agents', icon: _jsx(AgentsIcon, {}), count: agents.length },
        { id: 'tasks', label: 'Task Queue', icon: _jsx(TasksIcon, {}), count: tasks.length },
        { id: 'audit', label: 'Audit Log', icon: _jsx(AuditIcon, {}) },
    ];
    const handleSelectTask = (task) => {
        setSelectedTask(task);
        setActiveScreen('tasks');
    };
    const handleSelectAgent = (agent) => {
        setSelectedAgent(agent);
        setActiveScreen('agents');
    };
    const handleViewTasks = () => {
        setActiveScreen('tasks');
    };
    const getScreenTitle = () => {
        switch (activeScreen) {
            case 'dashboard':
                return 'Dashboard';
            case 'agents':
                return 'Agent Directory';
            case 'tasks':
                return 'Task Queue';
            case 'audit':
                return 'Audit Log';
            default:
                return '';
        }
    };
    const renderScreen = () => {
        switch (activeScreen) {
            case 'dashboard':
                return (_jsx(Dashboard, { onViewTasks: handleViewTasks, onSelectTask: handleSelectTask, onSelectAgent: handleSelectAgent }));
            case 'agents':
                return (_jsx(AgentDirectory, { onSelectAgent: handleSelectAgent }));
            case 'tasks':
                return (_jsx(TaskQueue, { onSelectTask: handleSelectTask }));
            case 'audit':
                return _jsx(AuditLog, {});
            default:
                return null;
        }
    };
    return (_jsxs(OperationsShell, { activeScreen: activeScreen, onScreenChange: setActiveScreen, navItems: navItems, children: [_jsx("div", { className: "operations-header", children: _jsx("h1", { className: "operations-title", children: getScreenTitle() }) }), renderScreen()] }));
}

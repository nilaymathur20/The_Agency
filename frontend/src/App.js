import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useState, useCallback, useMemo } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { MainLayout } from './components/layout/MainLayout';
import { KPIGrid } from './components/dashboard/KPIGrid';
import { TaskGraph } from './components/dashboard/TaskGraph';
import { ActivityFeed } from './components/dashboard/ActivityFeed';
import { AgentGrid } from './components/dashboard/AgentGrid';
import { FileTree } from './components/inspector/FileTree';
import { CodeViewer } from './components/inspector/CodeViewer';
import { Approvals } from './components/inspector/Approvals';
import { DatabaseViewer } from './components/inspector/DatabaseViewer';
import { TaskDetail } from './components/inspector/TaskDetail';
import { Button } from './components/common/Button';
import { Input } from './components/common/Input';
import { Modal } from './components/common/Modal';
import { OperationsApp } from './patterns/OperationsApp';
import { api } from './services/api';
import { useEventStream } from './hooks/useEventStream';
import './styles/design-tokens.css';
import './styles/reset.css';
import './styles/typography.css';
import './styles/layout.css';
import './App.css';
function DashboardInner() {
    const { notify } = useNotification();
    const [projects, setProjects] = useState([]);
    const [selectedProject, setSelectedProject] = useState(null);
    const [tasks, setTasks] = useState([]);
    const [agents, setAgents] = useState([]);
    const [files, setFiles] = useState([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [selectedTask, setSelectedTask] = useState(null);
    const [selectedFile, setSelectedFile] = useState('');
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [newProject, setNewProject] = useState({ name: '', description: '', requirements: '' });
    const [isRunning, setIsRunning] = useState(false);
    const [activity, setActivity] = useState([]);
    const [provider, setProvider] = useState('mock');
    const [wsConnected, setWsConnected] = useState(false);
    // Load health
    useEffect(() => {
        api.getHealth().then(h => setProvider(h.provider || 'mock')).catch(() => { });
    }, []);
    const loadProjects = useCallback(async () => {
        try {
            const data = await api.listProjects();
            setProjects(data);
            if (data.length > 0 && !selectedProject) {
                setSelectedProject(data[0]);
            }
            else if (selectedProject) {
                const updated = data.find(p => p.id === selectedProject.id);
                if (updated)
                    setSelectedProject(updated);
            }
        }
        catch { }
    }, [selectedProject]);
    const loadProjectDetails = useCallback(async (projectId) => {
        try {
            const [proj, taskList, fileList] = await Promise.all([
                api.getProject(projectId),
                api.listTasks(projectId).catch(() => []),
                fetch(`/api/projects/${projectId}/files/list`).then(r => r.ok ? r.json() : []).catch(() => []),
            ]);
            setSelectedProject(proj);
            setTasks(taskList);
            // Normalize files: API returns array of strings or objects
            if (Array.isArray(fileList)) {
                setFiles(fileList);
            }
            else if (proj.workspace_files) {
                setFiles(proj.workspace_files);
            }
            // Derive activity from tasks
            const items = taskList.map(t => ({
                id: t.id,
                type: `task.${t.status}`,
                title: `${t.title} — ${t.status}`,
                description: t.report?.summary || t.description?.slice(0, 80),
                timestamp: t.updated_at || t.created_at || new Date().toISOString(),
                agent: t.owner_role || t.owner_agent_id,
            }));
            // Also push project events
            if (proj) {
                items.unshift({ id: proj.id, type: `project.${proj.status}`, title: `Project ${proj.name} — ${proj.status}`, timestamp: proj.updated_at, description: proj.description?.slice(0, 80) });
            }
            setActivity(items);
        }
        catch (e) {
            console.error(e);
        }
    }, []);
    // Initial loads
    useEffect(() => { loadProjects(); }, []);
    useEffect(() => {
        api.listAgents().then(setAgents).catch(() => { });
    }, []);
    useEffect(() => {
        if (selectedProject)
            loadProjectDetails(selectedProject.id);
    }, [selectedProject?.id]);
    // Polling fallback when WS disconnected
    useEffect(() => {
        const id = setInterval(() => {
            if (selectedProject && !wsConnected)
                loadProjectDetails(selectedProject.id);
            loadProjects();
        }, 4000);
        return () => clearInterval(id);
    }, [selectedProject?.id, wsConnected, loadProjects, loadProjectDetails]);
    // WebSocket — per-project feed, falls back to polling when disconnected
    const wsUrl = useMemo(() => {
        if (!selectedProject?.id)
            return '';
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        return `${proto}//${location.host}/api/ws/projects/${selectedProject.id}`;
    }, [selectedProject?.id]);
    const { isConnected } = useEventStream({
        url: wsUrl || 'ws://localhost:8000/_dummy',
        onEvent: (event) => {
            // Ignore dummy pings
            if (event.type === 'ping' || event.type === 'backlog') {
                if (event.type === 'backlog' && Array.isArray(event.events)) {
                    const backlog = event.events;
                    const items = backlog.slice(-50).map((ev) => ({
                        id: ev.id || `${ev.type}-${Math.random()}`,
                        type: ev.type,
                        title: formatEventTitle(ev.type, ev.payload),
                        description: ev.payload?.title || ev.payload?.summary || JSON.stringify(ev.payload || {}).slice(0, 80),
                        timestamp: ev.ts || ev.timestamp || new Date().toISOString(),
                        agent: ev.payload?.agent_id || ev.payload?.role,
                    }));
                    if (items.length)
                        setActivity(prev => [...items.reverse(), ...prev].slice(0, 200));
                }
                setWsConnected(true);
                return;
            }
            setWsConnected(true);
            const item = {
                id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
                type: event.type,
                title: formatEventTitle(event.type, event.payload),
                description: event.payload?.title || event.payload?.summary || JSON.stringify(event.payload || {}).slice(0, 80),
                timestamp: event.timestamp || event.ts || new Date().toISOString(),
                agent: event.payload?.agent_id || event.payload?.role,
            };
            setActivity(prev => [item, ...prev].slice(0, 200));
            if (event.payload?.project_id === selectedProject?.id || event.payload?.id === selectedProject?.id) {
                if (selectedProject)
                    loadProjectDetails(selectedProject.id);
            }
            if (event.type === 'project.created' || event.type === 'project.completed' || event.type === 'project.failed')
                loadProjects();
            // Task events should also refresh task list
            if (event.type.startsWith('task.')) {
                if (selectedProject)
                    loadProjectDetails(selectedProject.id);
            }
        },
        onError: () => setWsConnected(false),
    });
    useEffect(() => {
        // Don't mark connected when dummy URL
        if (!wsUrl)
            setWsConnected(false);
        else
            setWsConnected(isConnected);
    }, [isConnected, wsUrl]);
    // Derived stats
    const stats = useMemo(() => {
        const byStatus = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status] || 0) + 1; return acc; }, {});
        return {
            queued: byStatus['queued'] || 0,
            running: byStatus['running'] || 0,
            completed: byStatus['completed'] || 0,
            failed: byStatus['failed'] || 0,
            blocked: byStatus['blocked'] || 0,
            total: tasks.length,
        };
    }, [tasks]);
    const handleCreate = async (e) => {
        e.preventDefault();
        if (!newProject.name.trim())
            return;
        setIsRunning(true);
        try {
            const proj = await api.createProject({ name: newProject.name, description: newProject.description, requirements: newProject.requirements });
            notify({ title: 'Project created', description: proj.name, variant: 'success' });
            setIsCreateOpen(false);
            setNewProject({ name: '', description: '', requirements: '' });
            await loadProjects();
            setSelectedProject(proj);
            // Auto run
            try {
                await api.runProject(proj.id);
                notify({ title: 'Agency Chain started', description: 'Orchestrator is executing tasks', variant: 'info' });
            }
            catch { }
        }
        catch (err) {
            notify({ title: 'Failed to create project', description: err.message, variant: 'error' });
        }
        finally {
            setIsRunning(false);
        }
    };
    const handleRun = async () => {
        if (!selectedProject)
            return;
        setIsRunning(true);
        try {
            await api.runProject(selectedProject.id);
            notify({ title: 'Run triggered', description: 'Tasks are being executed', variant: 'success' });
            loadProjectDetails(selectedProject.id);
        }
        catch (err) {
            notify({ title: 'Run failed', description: err.message, variant: 'error' });
        }
        finally {
            setIsRunning(false);
        }
    };
    const handlePause = async () => {
        if (!selectedProject)
            return;
        try {
            await api.pauseProject(selectedProject.id);
            notify({ title: 'Project paused', variant: 'warning' });
            loadProjectDetails(selectedProject.id);
        }
        catch { }
    };
    const handleResume = async () => {
        if (!selectedProject)
            return;
        try {
            await api.resumeProject(selectedProject.id);
            notify({ title: 'Project resumed', variant: 'success' });
            loadProjectDetails(selectedProject.id);
        }
        catch { }
    };
    const handleRetry = async (taskId) => {
        try {
            await api.retryTask(taskId);
            notify({ title: 'Retrying task', variant: 'info' });
            if (selectedProject)
                loadProjectDetails(selectedProject.id);
        }
        catch (e) {
            notify({ title: 'Retry failed', description: e.message, variant: 'error' });
        }
    };
    const navItems = [
        { id: 'overview', label: 'Overview', icon: 'activity', active: activeTab === 'overview' },
        { id: 'tasks', label: 'Task Graph', icon: 'code', count: tasks.length, active: activeTab === 'tasks' },
        { id: 'agents', label: 'Agents', icon: 'users', count: agents.length, active: activeTab === 'agents' },
        { id: 'files', label: 'Workspace', icon: 'file', count: files.length, active: activeTab === 'files' },
        { id: 'approvals', label: 'Approvals', icon: 'alert', active: activeTab === 'approvals' },
        { id: 'database', label: 'Database', icon: 'database', active: activeTab === 'database' },
        { id: 'activity', label: 'Activity', icon: 'clock', active: activeTab === 'activity' },
    ];
    return (_jsxs(MainLayout, { navItems: navItems, onNavSelect: setActiveTab, isConnected: wsConnected, provider: provider, projectName: selectedProject?.name, projectStatus: selectedProject?.status, children: [_jsxs("div", { className: "dash-top", children: [_jsxs("div", { className: "dash-top__left", children: [_jsx("div", { className: "dash-top__label", children: "Project" }), _jsxs("select", { className: "dash-top__select", value: selectedProject?.id || '', onChange: e => {
                                    const p = projects.find(x => x.id === e.target.value);
                                    if (p) {
                                        setSelectedProject(p);
                                        loadProjectDetails(p.id);
                                    }
                                }, "aria-label": "Select project", children: [_jsx("option", { value: "", disabled: true, children: "Select project" }), projects.map(p => _jsxs("option", { value: p.id, children: [p.name, " \u2014 ", p.status, " (", p.tasks_count ?? '—', " tasks)"] }, p.id))] }), selectedProject && (_jsx("span", { className: `dash-top__status dash-top__status--${selectedProject.status}`, children: selectedProject.status }))] }), _jsxs("div", { className: "dash-top__actions", children: [_jsx(Button, { variant: "primary", size: "sm", onClick: () => setIsCreateOpen(true), children: "+ New Project" }), selectedProject && (_jsxs(_Fragment, { children: [_jsx(Button, { variant: "secondary", size: "sm", onClick: handleRun, isLoading: isRunning, children: "Run" }), selectedProject.status === 'running' ? (_jsx(Button, { variant: "ghost", size: "sm", onClick: handlePause, children: "Pause" })) : (_jsx(Button, { variant: "ghost", size: "sm", onClick: handleResume, children: "Resume" }))] }))] })] }), _jsx("section", { className: "section", children: _jsx(KPIGrid, { projects: projects.length, activeAgents: agents.filter(a => a.status === 'working').length, totalAgents: Math.max(agents.length, 201), queued: stats.queued, running: stats.running, failed: stats.failed, completed: stats.completed, events: activity.length, provider: provider }) }), activeTab === 'overview' && (_jsxs("div", { className: "grid", style: { gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }, children: [_jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsx(TaskGraph, { tasks: tasks, onSelect: setSelectedTask, selectedId: selectedTask?.id }), selectedTask && _jsx("div", { className: "card", children: _jsx("div", { className: "card__body", children: _jsx(TaskDetail, { task: selectedTask, onRetry: handleRetry, onClose: () => setSelectedTask(null) }) }) }), _jsxs("div", { className: "card", children: [_jsxs("div", { className: "card__header", children: [_jsx("h3", { style: { fontSize: 14 }, children: "Workspace Files" }), _jsxs("span", { style: { fontSize: 11, color: 'var(--text-tertiary)' }, children: [files.length, " files"] })] }), _jsxs("div", { className: "card__body", style: { display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, minHeight: 300 }, children: [_jsx("div", { style: { borderRight: '1px solid var(--border-divider)', paddingRight: 12 }, children: _jsx(FileTree, { files: files, onSelect: setSelectedFile, selected: selectedFile }) }), _jsx("div", { children: selectedProject && _jsx(CodeViewer, { projectId: selectedProject.id, path: selectedFile }) })] })] })] }), _jsxs("div", { style: { display: 'flex', flexDirection: 'column', gap: 24 }, children: [_jsx(ActivityFeed, { items: activity }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { style: { fontSize: 14 }, children: "Agents (201 logical)" }) }), _jsx("div", { className: "card__body", children: _jsx(AgentGrid, { agents: agents.slice(0, 12) }) })] }), _jsxs("div", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { style: { fontSize: 14 }, children: "Approvals" }) }), _jsx("div", { className: "card__body", children: _jsx(Approvals, { projectId: selectedProject?.id, onUpdate: () => selectedProject && loadProjectDetails(selectedProject.id) }) })] })] })] })), activeTab === 'tasks' && (_jsxs("section", { className: "section", children: [_jsx(TaskGraph, { tasks: tasks, onSelect: setSelectedTask, selectedId: selectedTask?.id }), selectedTask && _jsx("div", { className: "card", style: { marginTop: 16 }, children: _jsx("div", { className: "card__body", children: _jsx(TaskDetail, { task: selectedTask, onRetry: handleRetry, onClose: () => setSelectedTask(null) }) }) }), tasks.length > 0 && !selectedTask && (_jsx("div", { className: "card", style: { marginTop: 16 }, children: _jsxs("div", { className: "card__body", children: [_jsxs("h4", { style: { marginBottom: 12 }, children: ["All Tasks (", tasks.length, ")"] }), _jsx("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 12 }, children: tasks.map(t => (_jsxs("button", { onClick: () => setSelectedTask(t), style: { textAlign: 'left', background: 'var(--surface-base)', border: '1px solid var(--border-default)', borderRadius: 12, padding: 12, cursor: 'pointer' }, children: [_jsx("div", { style: { fontSize: 12, fontWeight: 700, color: 'var(--text-primary)' }, children: t.title }), _jsxs("div", { style: { fontSize: 11, color: 'var(--text-tertiary)' }, className: "mono", children: [t.id.slice(0, 10), " \u00B7 ", t.status, " \u00B7 ", t.owner_role || t.owner_agent_id] })] }, t.id))) })] }) }))] })), activeTab === 'agents' && (_jsx("section", { className: "section", children: _jsx(AgentGrid, { agents: agents }) })), activeTab === 'files' && (_jsx("section", { className: "section", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsxs("h3", { children: ["Workspace \u2014 ", selectedProject?.name || 'No project'] }) }), _jsxs("div", { className: "card__body", style: { display: 'grid', gridTemplateColumns: '300px 1fr', gap: 16, minHeight: 480 }, children: [_jsx("div", { style: { borderRight: '1px solid var(--border-divider)', paddingRight: 12 }, children: _jsx(FileTree, { files: files, onSelect: setSelectedFile, selected: selectedFile }) }), _jsx("div", { children: selectedProject ? _jsx(CodeViewer, { projectId: selectedProject.id, path: selectedFile }) : _jsx("div", { style: { color: 'var(--text-tertiary)' }, children: "Select a project" }) })] })] }) })), activeTab === 'approvals' && (_jsx("section", { className: "section", children: _jsxs("div", { className: "card", children: [_jsx("div", { className: "card__header", children: _jsx("h3", { children: "Approvals & Human-in-the-Loop" }) }), _jsx("div", { className: "card__body", children: _jsx(Approvals, { projectId: selectedProject?.id }) })] }) })), activeTab === 'database' && (_jsx("section", { className: "section", children: selectedProject ? _jsx(DatabaseViewer, { projectId: selectedProject.id }) : _jsx("div", { className: "card", children: _jsx("div", { className: "card__body", style: { color: 'var(--text-tertiary)' }, children: "Select a project to view database." }) }) })), activeTab === 'activity' && (_jsx("section", { className: "section", children: _jsx(ActivityFeed, { items: activity, maxHeight: 800 }) })), _jsx(Modal, { isOpen: isCreateOpen, onClose: () => setIsCreateOpen(false), title: "Create Project \u2014 Agency Chain", children: _jsxs("form", { onSubmit: handleCreate, style: { display: 'flex', flexDirection: 'column', gap: 16 }, children: [_jsx(Input, { label: "Project name", placeholder: "Expense Tracker", required: true, value: newProject.name, onChange: e => setNewProject({ ...newProject, name: e.target.value }) }), _jsxs("div", { className: "input-group", children: [_jsx("label", { className: "input__label", htmlFor: "desc", children: "Description" }), _jsx("textarea", { id: "desc", className: "input", rows: 2, placeholder: "Short description", value: newProject.description, onChange: e => setNewProject({ ...newProject, description: e.target.value }), style: { resize: 'vertical' } })] }), _jsxs("div", { className: "input-group", children: [_jsx("label", { className: "input__label", htmlFor: "req", children: "Requirements / Prompt (PM \u2192 Agency Chain)" }), _jsx("textarea", { id: "req", className: "input", rows: 6, placeholder: "Build a FastAPI + SQLite expense tracker with CRUD, auth, tests\u2026", required: true, value: newProject.requirements, onChange: e => setNewProject({ ...newProject, requirements: e.target.value }), style: { resize: 'vertical', fontFamily: 'var(--font-family-mono)', fontSize: 13 } }), _jsx("div", { className: "input__hint", children: "The Project Manager will atomize this into the Instruction \u2192 Task DAG and run the agency chain." })] }), _jsxs("div", { style: { display: 'flex', gap: 12, justifyContent: 'flex-end', paddingTop: 8 }, children: [_jsx(Button, { type: "button", variant: "secondary", onClick: () => setIsCreateOpen(false), children: "Cancel" }), _jsx(Button, { type: "submit", variant: "primary", isLoading: isRunning, children: "Create & Run Chain" })] })] }) }), projects.length === 0 && (_jsxs("div", { className: "card", style: { marginTop: 24, textAlign: 'center', padding: 40 }, children: [_jsx("h3", { style: { marginBottom: 8 }, children: "No projects yet" }), _jsx("p", { style: { color: 'var(--text-tertiary)', fontSize: 13, marginBottom: 16 }, children: "Create your first project to run the autonomous Agency Chain \u2014 201 agents, YAML DAG, Instructor \u2192 Assistant, parallel execution." }), _jsx(Button, { variant: "primary", onClick: () => setIsCreateOpen(true), children: "Create Project" })] }))] }));
}
function formatEventTitle(type, payload) {
    if (payload?.title)
        return `${type} — ${payload.title}`;
    if (payload?.operation)
        return `${type} — ${payload.operation}`;
    if (payload?.agent_id)
        return `${type} — ${payload.agent_id}`;
    return type;
}
export default function App() {
    const [appMode, setAppMode] = useState('operations');
    return (_jsx(NotificationProvider, { children: _jsxs(DashboardProvider, { children: [_jsxs("div", { style: { position: 'sticky', top: 0, zIndex: 1000, background: '#1F2933', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #323F4B' }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', gap: 8, color: '#F5F7FA', fontSize: 13, fontWeight: 600 }, children: _jsx("span", { children: "AI Agency Console" }) }), _jsxs("div", { style: { display: 'flex', gap: 6 }, children: [_jsx("button", { onClick: () => setAppMode('operations'), style: {
                                        padding: '4px 12px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        borderRadius: 4,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: appMode === 'operations' ? '#174A73' : '#323F4B',
                                        color: '#FFFFFF'
                                    }, children: "Operations Console" }), _jsx("button", { onClick: () => setAppMode('runtime'), style: {
                                        padding: '4px 12px',
                                        fontSize: 12,
                                        fontWeight: 600,
                                        borderRadius: 4,
                                        border: 'none',
                                        cursor: 'pointer',
                                        background: appMode === 'runtime' ? '#174A73' : '#323F4B',
                                        color: '#FFFFFF'
                                    }, children: "Live Runtime Engine" })] })] }), appMode === 'operations' ? _jsx(OperationsApp, {}) : _jsx(DashboardInner, {})] }) }));
}

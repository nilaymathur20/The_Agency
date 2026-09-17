import React, { useEffect, useState, useCallback, useMemo, useRef } from 'react';
import { DashboardProvider } from './context/DashboardContext';
import { NotificationProvider, useNotification } from './context/NotificationContext';
import { MainLayout } from './components/layout/MainLayout';
import { KPIGrid } from './components/dashboard/KPIGrid';
import { TaskGraph } from './components/dashboard/TaskGraph';
import { ActivityFeed, ActivityItem } from './components/dashboard/ActivityFeed';
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
import { getWsUrl } from './services/websocket';
import { useEventStream } from './hooks/useEventStream';
import type { Project, Task, Agent } from './types/api';
import './styles/design-tokens.css';
import './styles/reset.css';
import './styles/typography.css';
import './styles/layout.css';
import './App.css';

function DashboardInner() {
  const { notify } = useNotification();
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [files, setFiles] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedFile, setSelectedFile] = useState<string>('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newProject, setNewProject] = useState({ name: '', description: '', requirements: '' });
  const [isRunning, setIsRunning] = useState(false);
  const [activity, setActivity] = useState<ActivityItem[]>([]);
  const [provider, setProvider] = useState('mock');
  const [wsConnected, setWsConnected] = useState(false);

  // Load health
  useEffect(() => {
    api.getHealth().then(h => setProvider(h.provider || 'mock')).catch(() => {});
  }, []);

  const loadProjects = useCallback(async () => {
    try {
      const data = await api.listProjects();
      setProjects(data);
      if (data.length > 0 && !selectedProject) {
        setSelectedProject(data[0]);
      } else if (selectedProject) {
        const updated = data.find(p => p.id === selectedProject.id);
        if (updated) setSelectedProject(updated);
      }
    } catch {}
  }, [selectedProject]);

  const loadProjectDetails = useCallback(async (projectId: string) => {
    try {
      const [proj, taskList, fileList] = await Promise.all([
        api.getProject(projectId),
        api.listTasks(projectId).catch(() => [] as Task[]),
        fetch(`/api/projects/${projectId}/files/list`).then(r => r.ok ? r.json() : []).catch(() => []),
      ]);
      setSelectedProject(proj);
      setTasks(taskList);
      // Normalize files: API returns array of strings or objects
      if (Array.isArray(fileList)) {
        setFiles(fileList as string[]);
      } else if (proj.workspace_files) {
        setFiles(proj.workspace_files);
      }
      // Derive activity from tasks
      const items: ActivityItem[] = taskList.map(t => ({
        id: t.id,
        type: `task.${t.status}`,
        title: `${t.title} — ${t.status}`,
        description: t.report?.summary || t.description?.slice(0,80),
        timestamp: t.updated_at || t.created_at || new Date().toISOString(),
        agent: t.owner_role || t.owner_agent_id,
      }));
      // Also push project events
      if (proj) {
        items.unshift({ id: proj.id, type: `project.${proj.status}`, title: `Project ${proj.name} — ${proj.status}`, timestamp: proj.updated_at, description: proj.description?.slice(0,80) });
      }
      setActivity(items);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // Initial loads
  useEffect(() => { loadProjects(); }, []);
  useEffect(() => {
    api.listAgents().then(setAgents).catch(() => {});
  }, []);
  useEffect(() => {
    if (selectedProject) loadProjectDetails(selectedProject.id);
  }, [selectedProject?.id]);

  // Polling fallback when WS disconnected
  useEffect(() => {
    const id = setInterval(() => {
      if (selectedProject && !wsConnected) loadProjectDetails(selectedProject.id);
      loadProjects();
    }, 4000);
    return () => clearInterval(id);
  }, [selectedProject?.id, wsConnected, loadProjects, loadProjectDetails]);

  // WebSocket — per-project feed, falls back to polling when disconnected
  const wsUrl = useMemo(() => {
    if (!selectedProject?.id) return '';
    const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
    return `${proto}//${location.host}/api/ws/projects/${selectedProject.id}`;
  }, [selectedProject?.id]);

  const { isConnected } = useEventStream({
    url: wsUrl || 'ws://localhost:8000/_dummy',
    onEvent: (event) => {
      // Ignore dummy pings
      if (event.type === 'ping' || event.type === 'backlog') {
        if (event.type === 'backlog' && Array.isArray((event as any).events)) {
          const backlog = (event as any).events as any[];
          const items: ActivityItem[] = backlog.slice(-50).map((ev: any) => ({
            id: ev.id || `${ev.type}-${Math.random()}`,
            type: ev.type,
            title: formatEventTitle(ev.type, ev.payload),
            description: ev.payload?.title || ev.payload?.summary || JSON.stringify(ev.payload || {}).slice(0,80),
            timestamp: ev.ts || ev.timestamp || new Date().toISOString(),
            agent: ev.payload?.agent_id || ev.payload?.role,
          }));
          if (items.length) setActivity(prev => [...items.reverse(), ...prev].slice(0, 200));
        }
        setWsConnected(true);
        return;
      }
      setWsConnected(true);
      const item: ActivityItem = {
        id: `${event.type}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`,
        type: event.type,
        title: formatEventTitle(event.type, event.payload),
        description: event.payload?.title || event.payload?.summary || JSON.stringify(event.payload || {}).slice(0,80),
        timestamp: event.timestamp || (event as any).ts || new Date().toISOString(),
        agent: event.payload?.agent_id || event.payload?.role,
      };
      setActivity(prev => [item, ...prev].slice(0, 200));
      if (event.payload?.project_id === selectedProject?.id || event.payload?.id === selectedProject?.id) {
        if (selectedProject) loadProjectDetails(selectedProject.id);
      }
      if (event.type === 'project.created' || event.type === 'project.completed' || event.type === 'project.failed') loadProjects();
      // Task events should also refresh task list
      if (event.type.startsWith('task.')) {
        if (selectedProject) loadProjectDetails(selectedProject.id);
      }
    },
    onError: () => setWsConnected(false),
  });

  useEffect(() => {
    // Don't mark connected when dummy URL
    if (!wsUrl) setWsConnected(false);
    else setWsConnected(isConnected);
  }, [isConnected, wsUrl]);

  // Derived stats
  const stats = useMemo(() => {
    const byStatus = tasks.reduce((acc, t) => { acc[t.status] = (acc[t.status]||0)+1; return acc; }, {} as Record<string, number>);
    return {
      queued: byStatus['queued'] || 0,
      running: byStatus['running'] || 0,
      completed: byStatus['completed'] || 0,
      failed: byStatus['failed'] || 0,
      blocked: byStatus['blocked'] || 0,
      total: tasks.length,
    };
  }, [tasks]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.name.trim()) return;
    setIsRunning(true);
    try {
      const proj = await api.createProject({ name: newProject.name, description: newProject.description, requirements: newProject.requirements });
      notify({ title: 'Project created', description: proj.name, variant: 'success' });
      setIsCreateOpen(false);
      setNewProject({ name:'', description:'', requirements:'' });
      await loadProjects();
      setSelectedProject(proj);
      // Auto run
      try { await api.runProject(proj.id); notify({ title: 'Agency Chain started', description: 'Orchestrator is executing tasks', variant: 'info' }); } catch {}
    } catch (err: any) {
      notify({ title: 'Failed to create project', description: (err as Error).message, variant: 'error' });
    } finally { setIsRunning(false); }
  };

  const handleRun = async () => {
    if (!selectedProject) return;
    setIsRunning(true);
    try {
      await api.runProject(selectedProject.id);
      notify({ title: 'Run triggered', description: 'Tasks are being executed', variant: 'success' });
      loadProjectDetails(selectedProject.id);
    } catch (err: any) {
      notify({ title: 'Run failed', description: (err as Error).message, variant: 'error' });
    } finally { setIsRunning(false); }
  };

  const handlePause = async () => {
    if (!selectedProject) return;
    try { await api.pauseProject(selectedProject.id); notify({ title: 'Project paused', variant: 'warning' }); loadProjectDetails(selectedProject.id); } catch {}
  };
  const handleResume = async () => {
    if (!selectedProject) return;
    try { await api.resumeProject(selectedProject.id); notify({ title: 'Project resumed', variant: 'success' }); loadProjectDetails(selectedProject.id); } catch {}
  };

  const handleRetry = async (taskId: string) => {
    try { await api.retryTask(taskId); notify({ title: 'Retrying task', variant: 'info' }); if (selectedProject) loadProjectDetails(selectedProject.id); } catch (e:any) { notify({ title: 'Retry failed', description: (e as Error).message, variant: 'error' }); }
  };

  const navItems = [
    { id:'overview', label:'Overview', icon:'activity', active: activeTab==='overview' },
    { id:'tasks', label:'Task Graph', icon:'code', count: tasks.length, active: activeTab==='tasks' },
    { id:'agents', label:'Agents', icon:'users', count: agents.length, active: activeTab==='agents' },
    { id:'files', label:'Workspace', icon:'file', count: files.length, active: activeTab==='files' },
    { id:'approvals', label:'Approvals', icon:'alert', active: activeTab==='approvals' },
    { id:'database', label:'Database', icon:'database', active: activeTab==='database' },
    { id:'activity', label:'Activity', icon:'clock', active: activeTab==='activity' },
  ];

  return (
    <MainLayout
      navItems={navItems}
      onNavSelect={setActiveTab}
      isConnected={wsConnected}
      provider={provider}
      projectName={selectedProject?.name}
      projectStatus={selectedProject?.status}
    >
      {/* Top bar: project selector + actions */}
      <div className="dash-top">
        <div className="dash-top__left">
          <div className="dash-top__label">Project</div>
          <select
            className="dash-top__select"
            value={selectedProject?.id || ''}
            onChange={e => {
              const p = projects.find(x => x.id === e.target.value);
              if (p) { setSelectedProject(p); loadProjectDetails(p.id); }
            }}
            aria-label="Select project"
          >
            <option value="" disabled>Select project</option>
            {projects.map(p => <option key={p.id} value={p.id}>{p.name} — {p.status} ({p.tasks_count ?? '—'} tasks)</option>)}
          </select>
          {selectedProject && (
            <span className={`dash-top__status dash-top__status--${selectedProject.status}`}>{selectedProject.status}</span>
          )}
        </div>
        <div className="dash-top__actions">
          <Button variant="primary" size="sm" onClick={() => setIsCreateOpen(true)}>+ New Project</Button>
          {selectedProject && (
            <>
              <Button variant="secondary" size="sm" onClick={handleRun} isLoading={isRunning}>Run</Button>
              {selectedProject.status === 'running' ? (
                <Button variant="ghost" size="sm" onClick={handlePause}>Pause</Button>
              ) : (
                <Button variant="ghost" size="sm" onClick={handleResume}>Resume</Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* KPIS */}
      <section className="section">
        <KPIGrid
          projects={projects.length}
          activeAgents={agents.filter(a => a.status==='working').length}
          totalAgents={Math.max(agents.length, 201)}
          queued={stats.queued}
          running={stats.running}
          failed={stats.failed}
          completed={stats.completed}
          events={activity.length}
          provider={provider}
        />
      </section>

      {/* Main content per tab */}
      {activeTab === 'overview' && (
        <div className="grid" style={{ gridTemplateColumns: '1.2fr 0.8fr', gap: 24 }}>
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <TaskGraph tasks={tasks} onSelect={setSelectedTask} selectedId={selectedTask?.id} />
            {selectedTask && <div className="card"><div className="card__body"><TaskDetail task={selectedTask} onRetry={handleRetry} onClose={() => setSelectedTask(null)} /></div></div>}
            <div className="card">
              <div className="card__header"><h3 style={{ fontSize:14 }}>Workspace Files</h3><span style={{ fontSize:11, color:'var(--text-tertiary)' }}>{files.length} files</span></div>
              <div className="card__body" style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:16, minHeight:300 }}>
                <div style={{ borderRight:'1px solid var(--border-divider)', paddingRight:12 }}>
                  <FileTree files={files} onSelect={setSelectedFile} selected={selectedFile} />
                </div>
                <div>
                  {selectedProject && <CodeViewer projectId={selectedProject.id} path={selectedFile} />}
                </div>
              </div>
            </div>
          </div>
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>
            <ActivityFeed items={activity} />
            <div className="card">
              <div className="card__header"><h3 style={{ fontSize:14 }}>Agents (201 logical)</h3></div>
              <div className="card__body"><AgentGrid agents={agents.slice(0,12)} /></div>
            </div>
            <div className="card"><div className="card__header"><h3 style={{ fontSize:14 }}>Approvals</h3></div><div className="card__body"><Approvals projectId={selectedProject?.id} onUpdate={() => selectedProject && loadProjectDetails(selectedProject.id)} /></div></div>
          </div>
        </div>
      )}

      {activeTab === 'tasks' && (
        <section className="section">
          <TaskGraph tasks={tasks} onSelect={setSelectedTask} selectedId={selectedTask?.id} />
          {selectedTask && <div className="card" style={{ marginTop:16 }}><div className="card__body"><TaskDetail task={selectedTask} onRetry={handleRetry} onClose={() => setSelectedTask(null)} /></div></div>}
          {tasks.length > 0 && !selectedTask && (
            <div className="card" style={{ marginTop:16 }}>
              <div className="card__body">
                <h4 style={{ marginBottom:12 }}>All Tasks ({tasks.length})</h4>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(280px, 1fr))', gap:12 }}>
                  {tasks.map(t => (
                    <button key={t.id} onClick={() => setSelectedTask(t)} style={{ textAlign:'left', background:'var(--surface-base)', border:'1px solid var(--border-default)', borderRadius:12, padding:12, cursor:'pointer' }}>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--text-primary)' }}>{t.title}</div>
                      <div style={{ fontSize:11, color:'var(--text-tertiary)' }} className="mono">{t.id.slice(0,10)} · {t.status} · {t.owner_role || t.owner_agent_id}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {activeTab === 'agents' && (
        <section className="section"><AgentGrid agents={agents} /></section>
      )}

      {activeTab === 'files' && (
        <section className="section">
          <div className="card">
            <div className="card__header"><h3>Workspace — {selectedProject?.name || 'No project'}</h3></div>
            <div className="card__body" style={{ display:'grid', gridTemplateColumns:'300px 1fr', gap:16, minHeight:480 }}>
              <div style={{ borderRight:'1px solid var(--border-divider)', paddingRight:12 }}><FileTree files={files} onSelect={setSelectedFile} selected={selectedFile} /></div>
              <div>{selectedProject ? <CodeViewer projectId={selectedProject.id} path={selectedFile} /> : <div style={{ color:'var(--text-tertiary)' }}>Select a project</div>}</div>
            </div>
          </div>
        </section>
      )}

      {activeTab === 'approvals' && (
        <section className="section"><div className="card"><div className="card__header"><h3>Approvals & Human-in-the-Loop</h3></div><div className="card__body"><Approvals projectId={selectedProject?.id} /></div></div></section>
      )}

      {activeTab === 'database' && (
        <section className="section">{selectedProject ? <DatabaseViewer projectId={selectedProject.id} /> : <div className="card"><div className="card__body" style={{ color:'var(--text-tertiary)' }}>Select a project to view database.</div></div>}</section>
      )}

      {activeTab === 'activity' && (
        <section className="section"><ActivityFeed items={activity} maxHeight={800} /></section>
      )}

      {/* Create modal */}
      <Modal isOpen={isCreateOpen} onClose={() => setIsCreateOpen(false)} title="Create Project — Agency Chain">
        <form onSubmit={handleCreate} style={{ display:'flex', flexDirection:'column', gap:16 }}>
          <Input label="Project name" placeholder="Expense Tracker" required value={newProject.name} onChange={e => setNewProject({ ...newProject, name: e.target.value })} />
          <div className="input-group">
            <label className="input__label" htmlFor="desc">Description</label>
            <textarea id="desc" className="input" rows={2} placeholder="Short description" value={newProject.description} onChange={e => setNewProject({ ...newProject, description: e.target.value })} style={{ resize:'vertical' }} />
          </div>
          <div className="input-group">
            <label className="input__label" htmlFor="req">Requirements / Prompt (PM → Agency Chain)</label>
            <textarea id="req" className="input" rows={6} placeholder="Build a FastAPI + SQLite expense tracker with CRUD, auth, tests…" required value={newProject.requirements} onChange={e => setNewProject({ ...newProject, requirements: e.target.value })} style={{ resize:'vertical', fontFamily:'var(--font-family-mono)', fontSize:13 }} />
            <div className="input__hint">The Project Manager will atomize this into the Instruction → Task DAG and run the agency chain.</div>
          </div>
          <div style={{ display:'flex', gap:12, justifyContent:'flex-end', paddingTop:8 }}>
            <Button type="button" variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancel</Button>
            <Button type="submit" variant="primary" isLoading={isRunning}>Create & Run Chain</Button>
          </div>
        </form>
      </Modal>

      {/* Empty state when no projects */}
      {projects.length === 0 && (
        <div className="card" style={{ marginTop:24, textAlign:'center', padding:40 }}>
          <h3 style={{ marginBottom:8 }}>No projects yet</h3>
          <p style={{ color:'var(--text-tertiary)', fontSize:13, marginBottom:16 }}>Create your first project to run the autonomous Agency Chain — 201 agents, YAML DAG, Instructor → Assistant, parallel execution.</p>
          <Button variant="primary" onClick={() => setIsCreateOpen(true)}>Create Project</Button>
        </div>
      )}
    </MainLayout>
  );
}

function formatEventTitle(type: string, payload: any): string {
  if (payload?.title) return `${type} — ${payload.title}`;
  if (payload?.operation) return `${type} — ${payload.operation}`;
  if (payload?.agent_id) return `${type} — ${payload.agent_id}`;
  return type;
}

export default function App() {
  const [appMode, setAppMode] = useState<'operations' | 'runtime'>('operations');

  return (
    <NotificationProvider>
      <DashboardProvider>
        <div style={{ position: 'sticky', top: 0, zIndex: 1000, background: '#1F2933', padding: '6px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #323F4B' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: '#F5F7FA', fontSize: 13, fontWeight: 600 }}>
            <span>AI Agency Console</span>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button
              onClick={() => setAppMode('operations')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: appMode === 'operations' ? '#174A73' : '#323F4B',
                color: '#FFFFFF'
              }}
            >
              Operations Console
            </button>
            <button
              onClick={() => setAppMode('runtime')}
              style={{
                padding: '4px 12px',
                fontSize: 12,
                fontWeight: 600,
                borderRadius: 4,
                border: 'none',
                cursor: 'pointer',
                background: appMode === 'runtime' ? '#174A73' : '#323F4B',
                color: '#FFFFFF'
              }}
            >
              Live Runtime Engine
            </button>
          </div>
        </div>
        {appMode === 'operations' ? <OperationsApp /> : <DashboardInner />}
      </DashboardProvider>
    </NotificationProvider>
  );
}

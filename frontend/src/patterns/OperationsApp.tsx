/* Operations App - Main entry point for the AI Agency Operations Interface */

import React, { useState } from 'react';
import { OperationsShell, ScreenId } from './OperationsShell';
import { Dashboard } from './Dashboard';
import { AgentDirectory } from './AgentDirectory';
import { TaskQueue } from './TaskQueue';
import { AuditLog } from './AuditLog';
import { agents, tasks } from '../data/seed';
import type { Agent, Task } from '../types/seed';
import './OperationsApp.css';

// Icons as simple SVG components
const DashboardIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <rect x="2" y="2" width="7" height="7" rx="1" />
    <rect x="11" y="2" width="7" height="7" rx="1" />
    <rect x="2" y="11" width="7" height="7" rx="1" />
    <rect x="11" y="11" width="7" height="7" rx="1" />
  </svg>
);

const AgentsIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="7" r="3" />
    <path d="M4 18v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2" />
  </svg>
);

const TasksIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <path d="M3 5h14M3 10h14M3 15h10" />
    <circle cx="17" cy="15" r="2" />
  </svg>
);

const AuditIcon = () => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
    <circle cx="10" cy="10" r="7" />
    <path d="M10 6v4M10 14v.01" />
  </svg>
);

export function OperationsApp() {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('dashboard');
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [selectedAgent, setSelectedAgent] = useState<Agent | null>(null);

  const navItems = [
    { id: 'dashboard' as ScreenId, label: 'Dashboard', icon: <DashboardIcon /> },
    { id: 'agents' as ScreenId, label: 'Agents', icon: <AgentsIcon />, count: agents.length },
    { id: 'tasks' as ScreenId, label: 'Task Queue', icon: <TasksIcon />, count: tasks.length },
    { id: 'audit' as ScreenId, label: 'Audit Log', icon: <AuditIcon /> },
  ];

  const handleSelectTask = (task: Task) => {
    setSelectedTask(task);
    setActiveScreen('tasks');
  };

  const handleSelectAgent = (agent: Agent) => {
    setSelectedAgent(agent);
    setActiveScreen('agents');
  };

  const handleViewTasks = () => {
    setActiveScreen('tasks');
  };

  const getScreenTitle = (): string => {
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
        return (
          <Dashboard
            onViewTasks={handleViewTasks}
            onSelectTask={handleSelectTask}
            onSelectAgent={handleSelectAgent}
          />
        );
      case 'agents':
        return (
          <AgentDirectory
            onSelectAgent={handleSelectAgent}
          />
        );
      case 'tasks':
        return (
          <TaskQueue
            onSelectTask={handleSelectTask}
          />
        );
      case 'audit':
        return <AuditLog />;
      default:
        return null;
    }
  };

  return (
    <OperationsShell
      activeScreen={activeScreen}
      onScreenChange={setActiveScreen}
      navItems={navItems}
    >
      <div className="operations-header">
        <h1 className="operations-title">{getScreenTitle()}</h1>
      </div>
      {renderScreen()}
    </OperationsShell>
  );
}
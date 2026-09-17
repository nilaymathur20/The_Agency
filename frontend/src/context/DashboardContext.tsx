import React, { createContext, useContext, useReducer, ReactNode } from 'react';

interface Task {
  id: string;
  title: string;
  status: 'pending' | 'queued' | 'running' | 'completed' | 'failed' | 'blocked' | 'waiting';
  assignedTo?: string;
  progress?: number;
}

interface Agent {
  id: string;
  name: string;
  role: string;
  status: 'ready' | 'working' | 'blocked' | 'dormant' | 'waiting';
  currentTask?: string;
  stats: { tasksCompleted: number; avgDuration: number; toolCalls: number; errors: number };
}

interface DashboardState {
  tasks: Map<string, Task>;
  agents: Map<string, Agent>;
  kpis: { successRate: number; avgDuration: number; tasksCompleted: number; toolCalls: number };
  isLoading: boolean;
  error: Error | null;
}

type DashboardAction =
  | { type: 'ADD_TASK'; payload: Task }
  | { type: 'UPDATE_TASK'; payload: Partial<Task> & { id: string } }
  | { type: 'ADD_AGENT'; payload: Agent }
  | { type: 'UPDATE_AGENT'; payload: Partial<Agent> & { id: string } }
  | { type: 'UPDATE_KPIS'; payload: DashboardState['kpis'] }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_ERROR'; payload: Error | null }
  | { type: 'RESET' };

const initialState: DashboardState = {
  tasks: new Map(),
  agents: new Map(),
  kpis: { successRate: 0, avgDuration: 0, tasksCompleted: 0, toolCalls: 0 },
  isLoading: false,
  error: null,
};

function dashboardReducer(state: DashboardState, action: DashboardAction): DashboardState {
  switch (action.type) {
    case 'ADD_TASK':
      return { ...state, tasks: new Map(state.tasks).set(action.payload.id, action.payload) };
    case 'UPDATE_TASK': {
      const tasks = new Map(state.tasks);
      const existing = tasks.get(action.payload.id);
      if (existing) tasks.set(action.payload.id, { ...existing, ...action.payload });
      return { ...state, tasks };
    }
    case 'ADD_AGENT':
      return { ...state, agents: new Map(state.agents).set(action.payload.id, action.payload) };
    case 'UPDATE_AGENT': {
      const agents = new Map(state.agents);
      const existing = agents.get(action.payload.id);
      if (existing) agents.set(action.payload.id, { ...existing, ...action.payload });
      return { ...state, agents };
    }
    case 'UPDATE_KPIS': return { ...state, kpis: action.payload };
    case 'SET_LOADING': return { ...state, isLoading: action.payload };
    case 'SET_ERROR': return { ...state, error: action.payload };
    case 'RESET': return initialState;
    default: return state;
  }
}

interface DashboardContextType { state: DashboardState; dispatch: React.Dispatch<DashboardAction>; }
const DashboardContext = createContext<DashboardContextType | undefined>(undefined);

export function DashboardProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(dashboardReducer, initialState);
  return <DashboardContext.Provider value={{ state, dispatch }}>{children}</DashboardContext.Provider>;
}

export function useDashboard() {
  const context = useContext(DashboardContext);
  if (!context) throw new Error('useDashboard must be used within DashboardProvider');
  return context;
}

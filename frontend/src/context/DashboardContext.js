import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useReducer } from 'react';
const initialState = {
    tasks: new Map(),
    agents: new Map(),
    kpis: { successRate: 0, avgDuration: 0, tasksCompleted: 0, toolCalls: 0 },
    isLoading: false,
    error: null,
};
function dashboardReducer(state, action) {
    switch (action.type) {
        case 'ADD_TASK':
            return { ...state, tasks: new Map(state.tasks).set(action.payload.id, action.payload) };
        case 'UPDATE_TASK': {
            const tasks = new Map(state.tasks);
            const existing = tasks.get(action.payload.id);
            if (existing)
                tasks.set(action.payload.id, { ...existing, ...action.payload });
            return { ...state, tasks };
        }
        case 'ADD_AGENT':
            return { ...state, agents: new Map(state.agents).set(action.payload.id, action.payload) };
        case 'UPDATE_AGENT': {
            const agents = new Map(state.agents);
            const existing = agents.get(action.payload.id);
            if (existing)
                agents.set(action.payload.id, { ...existing, ...action.payload });
            return { ...state, agents };
        }
        case 'UPDATE_KPIS': return { ...state, kpis: action.payload };
        case 'SET_LOADING': return { ...state, isLoading: action.payload };
        case 'SET_ERROR': return { ...state, error: action.payload };
        case 'RESET': return initialState;
        default: return state;
    }
}
const DashboardContext = createContext(undefined);
export function DashboardProvider({ children }) {
    const [state, dispatch] = useReducer(dashboardReducer, initialState);
    return _jsx(DashboardContext.Provider, { value: { state, dispatch }, children: children });
}
export function useDashboard() {
    const context = useContext(DashboardContext);
    if (!context)
        throw new Error('useDashboard must be used within DashboardProvider');
    return context;
}

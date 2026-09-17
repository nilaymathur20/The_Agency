import { jsx as _jsx } from "react/jsx-runtime";
import { createContext, useContext, useState } from 'react';
const AuthContext = createContext(undefined);
export function AuthProvider({ children }) {
    const [state, setState] = useState({ user: null, isAuthenticated: false });
    const login = (user) => setState({ user, isAuthenticated: true });
    const logout = () => setState({ user: null, isAuthenticated: false });
    return _jsx(AuthContext.Provider, { value: { state, login, logout }, children: children });
}
export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx)
        throw new Error('useAuth must be used within AuthProvider');
    return ctx;
}

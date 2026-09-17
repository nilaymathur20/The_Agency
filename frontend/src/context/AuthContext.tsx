import React, { createContext, useContext, useState, ReactNode } from 'react';

interface User { id: string; name: string; role: string; }
interface AuthState { user: User | null; isAuthenticated: boolean; }

const AuthContext = createContext<{
  state: AuthState;
  login: (user: User) => void;
  logout: () => void;
} | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ user: null, isAuthenticated: false });
  const login = (user: User) => setState({ user, isAuthenticated: true });
  const logout = () => setState({ user: null, isAuthenticated: false });
  return <AuthContext.Provider value={{ state, login, logout }}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

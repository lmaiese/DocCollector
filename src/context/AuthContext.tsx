import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useLocation } from 'wouter';

interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'superadmin' | 'admin' | 'employee' | 'client';
  client_id?: string | null;
  tenant_id: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  // FIX: redirectTo è ora il terzo parametro opzionale usato effettivamente
  login: (userData: AuthUser, token: string, redirectTo?: string) => void;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]           = useState<AuthUser | null>(null);
  const [token, setToken]         = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [, setLocation]           = useLocation();

  useEffect(() => {
    const storedUser  = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
      setToken(storedToken);
    }
    setIsLoading(false);
  }, []);

  const login = (userData: AuthUser, tok: string, redirectTo?: string) => {
    setUser(userData);
    setToken(tok);
    localStorage.setItem('user',  JSON.stringify(userData));
    localStorage.setItem('token', tok);

    // FIX: priorità: 1) redirectTo esplicito, 2) default per ruolo
    if (redirectTo) {
      setLocation(redirectTo);
    } else {
      setLocation(userData.role === 'client' ? '/portale' : '/');
    }
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setLocation('/');
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside <AuthProvider>');
  return ctx;
}

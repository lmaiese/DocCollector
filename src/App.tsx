/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Requests from './pages/Requests';
import Audit from './pages/Audit';
import Layout from './components/Layout';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    // Check for existing session (mock)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLogin = async () => {
    try {
      const res = await fetch('/api/auth/login', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
        localStorage.setItem('user', JSON.stringify(data.user));
        setLocation('/');
      } else {
        alert('Login failed');
      }
    } catch (err) {
      console.error(err);
      alert('Login error');
    }
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    setLocation('/');
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/clients" component={Clients} />
        <Route path="/requests" component={Requests} />
        <Route path="/audit" component={Audit} />
        <Route>404: Page Not Found</Route>
      </Switch>
    </Layout>
  );
}


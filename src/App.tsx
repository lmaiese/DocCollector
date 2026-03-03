/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'react-hot-toast';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Requests from './pages/Requests';
import Audit from './pages/Audit';
import Profile from './pages/Profile';
import Tenants from './pages/Tenants';
import Layout from './components/Layout';

export default function App() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [, setLocation] = useLocation();

  useEffect(() => {
    const storedUser = localStorage.getItem('user');
    const storedToken = localStorage.getItem('token');
    if (storedUser && storedToken) {
      setUser(JSON.parse(storedUser));
    }
    setLoading(false);
  }, []);

  const handleLoginSuccess = (userData: any, token: string) => {
    setUser(userData);
    localStorage.setItem('user', JSON.stringify(userData));
    localStorage.setItem('token', token);
    setLocation('/');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
    setLocation('/');
  };

  if (loading) return <div className="flex items-center justify-center h-screen">Loading...</div>;

  if (!user) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <Layout user={user} onLogout={handleLogout}>
      <Toaster position="top-right" />
      <Switch>
        <Route path="/">
          <Dashboard user={user} />
        </Route>
        <Route path="/clients" component={Clients} />
        <Route path="/requests" component={Requests} />
        <Route path="/audit" component={Audit} />
        <Route path="/profile">
          <Profile user={user} />
        </Route>
        <Route path="/tenants" component={Tenants} />
        <Route>404: Page Not Found</Route>
      </Switch>
    </Layout>
  );
}


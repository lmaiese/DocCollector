import React from 'react';
import { Route, Switch } from 'wouter';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login     from './pages/Login';
import Layout    from './components/Layout';
import Dashboard from './pages/Dashboard';
import Clients   from './pages/Clients';
import Requests  from './pages/Requests';
import Audit     from './pages/Audit';
import Profile   from './pages/Profile';
import Tenants   from './pages/Tenants';

function AppContent() {
  const { user, logout, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (!user) return <Login />;

  return (
    <Layout user={user} onLogout={logout}>
      <Toaster position="top-right" />
      <Switch>
        <Route path="/"         component={() => <Dashboard user={user} />} />
        <Route path="/clients"  component={Clients} />
        <Route path="/requests" component={Requests} />
        <Route path="/audit"    component={Audit} />
        <Route path="/profile"  component={() => <Profile user={user} />} />
        <Route path="/tenants"  component={Tenants} />
        <Route>
          <div className="flex items-center justify-center h-64">
            <p className="text-gray-500 text-lg">404 — Pagina non trovata</p>
          </div>
        </Route>
      </Switch>
    </Layout>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

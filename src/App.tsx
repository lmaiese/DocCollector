import React, { useEffect } from 'react';
import { Route, Switch, useLocation } from 'wouter';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Login           from './pages/Login';
import ClientLogin     from './pages/ClientLogin';
import Layout          from './pages/Layout';
import Dashboard       from './pages/Dashboard';
import Clients         from './pages/Clients';
import Requests        from './pages/Requests';
import Audit           from './pages/Audit';
import Profile         from './pages/Profile';
import Tenants         from './pages/Tenants';
import Practices       from './pages/Practices';
import PracticeDetail  from './pages/PracticeDetail';
import Users           from './pages/Users';
import PortalLayout    from './pages/PortalLayout';
import PortalDashboard from './pages/PortalDashboard';
import PortalRequests  from './pages/PortalRequests';
import { API_BASE_URL } from './config';

function AppContent() {
  const { user, login, logout, isLoading } = useAuth();
  const [location, setLocation] = useLocation();

  useEffect(() => {
    if (!location.startsWith('/portale/accesso')) return;

    const params = new URLSearchParams(window.location.search);
    const token  = params.get('token');
    const next   = params.get('next') || '/portale';

    if (!token) {
      setLocation('/portale/login?error=no_token');
      return;
    }

    fetch(`${API_BASE_URL}/api/auth/verify-token?token=${encodeURIComponent(token)}`)
      .then(r => r.json())
      .then(data => {
        if (data.token && data.user) {
          login(data.user, data.token, next);
          window.history.replaceState({}, '', next);
        } else {
          setLocation('/portale/login?error=invalid_token');
        }
      })
      .catch(() => setLocation('/portale/login?error=network'));
  }, [location]); // eslint-disable-line react-hooks/exhaustive-deps

  if (isLoading) return (
    <div className="flex items-center justify-center h-screen bg-gray-50">
      <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
    </div>
  );

  // ── Route portale cliente ──────────────────────────────────────────────
  if (location.startsWith('/portale')) {
    if (location === '/portale/accesso' || location.startsWith('/portale/accesso?')) {
      return (
        <div className="flex items-center justify-center h-screen bg-gray-50">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-indigo-600" />
        </div>
      );
    }

    if (!user || user.role !== 'client') {
      return <ClientLogin />;
    }

    return (
      <PortalLayout user={user} onLogout={logout}>
        <Toaster position="top-right" />
        <Switch>
          <Route path="/portale"           component={() => <PortalDashboard user={user} />} />
          <Route path="/portale/richieste" component={PortalRequests} />
          <Route>
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Pagina non trovata</p>
            </div>
          </Route>
        </Switch>
      </PortalLayout>
    );
  }

  // ── Route staff ────────────────────────────────────────────────────────
  if (!user) return <Login />;

  return (
    <Layout user={user} onLogout={logout}>
      <Toaster position="top-right" />
      <Switch>
        <Route path="/"              component={() => <Dashboard user={user} />} />
        <Route path="/clients"       component={Clients} />
        <Route path="/requests"      component={Requests} />
        <Route path="/audit"         component={Audit} />
        <Route path="/profile"       component={() => <Profile user={user} />} />
        <Route path="/tenants"       component={Tenants} />
        <Route path="/practices"     component={Practices} />
        <Route path="/practices/:id" component={PracticeDetail} />
        <Route path="/users"         component={Users} />
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
  return <AuthProvider><AppContent /></AuthProvider>;
}

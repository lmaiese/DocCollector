import React, { useEffect, useState } from 'react';
import {
  FileText, CheckCircle, AlertCircle,
  Building, Users, Database, Clock, AlertTriangle,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { api } from '../api/clients';
import { DashboardStats } from '../types';

export default function Dashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<DashboardStats | null>(null);

  useEffect(() => {
    api.get<DashboardStats>('/api/dashboard').then(setStats).catch(console.error);
  }, []);

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
      </div>
    );
  }

  if (stats.isSuperAdmin) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">Panoramica Sistema</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <StatCard icon={Building} color="purple" label="Tenant Attivi"         value={stats.pendingRequests} />
          <StatCard icon={Users}    color="blue"   label="Utenti Totali"          value={stats.missingDocs} />
          <StatCard icon={Database} color="green"  label="Documenti nel Sistema"  value={stats.uploadedDocs} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard icon={AlertCircle}   color="yellow" label="Richieste in Attesa"  value={stats.pendingRequests} />
        <StatCard icon={CheckCircle}   color="green"  label="Documenti Caricati"   value={stats.uploadedDocs} />
        <StatCard icon={FileText}      color="red"    label="Documenti Mancanti"   value={stats.missingDocs} />
        <StatCard icon={AlertTriangle} color="orange" label="In Scadenza (7gg)"    value={stats.expiringThisWeek} />
      </div>

      {stats.overdueRequests > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <p className="text-red-700 font-medium">
            {stats.overdueRequests} richiesta{stats.overdueRequests > 1 ? 'e' : ''} scaduta
            {stats.overdueRequests > 1 ? 'e' : ''} — intervieni subito!
          </p>
        </div>
      )}

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">
          Attività Richieste (Ultimi 7 giorni)
        </h3>
        <div className="h-64">
          {stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="date" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} name="Richieste" />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-400">
              <Clock className="w-5 h-5 mr-2" />
              Nessuna attività negli ultimi 7 giorni
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: {
  icon: any; color: string; label: string; value: number;
}) {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-600',
    green:  'bg-green-100 text-green-600',
    red:    'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
    blue:   'bg-blue-100 text-blue-600',
  };
  return (
    <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorMap[color]}`}>
        <Icon className="w-7 h-7" />
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{label}</p>
        <h3 className="text-2xl font-bold text-gray-900">{value}</h3>
      </div>
    </div>
  );
}

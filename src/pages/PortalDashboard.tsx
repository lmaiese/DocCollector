import React, { useEffect, useState } from 'react';
import { Clock, CheckCircle, AlertTriangle, FolderOpen, Eye } from 'lucide-react';
import { api } from '../api/index';

export default function PortalDashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>(null);

  useEffect(() => {
    api.get('/api/portal/dashboard').then((d: any) => setStats(d.stats)).catch(console.error);
  }, []);

  if (!stats) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">
          Benvenuto{user.name ? `, ${user.name.split(' ')[0]}` : ''}
        </h2>
        <p className="text-gray-500 mt-1">
          Qui trovi tutti i documenti richiesti dallo studio.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <StatCard icon={Clock}         color="yellow" label="Da caricare"    value={stats.pending} />
        <StatCard icon={Eye}           color="blue"   label="In revisione"   value={stats.underReview} />
        <StatCard icon={CheckCircle}   color="green"  label="Approvati"      value={stats.approved} />
        <StatCard icon={AlertTriangle} color="red"    label="Scaduti"        value={stats.overdue} />
        <StatCard icon={AlertTriangle} color="orange" label="In scadenza"    value={stats.expiring} />
        <StatCard icon={FolderOpen}    color="purple" label="In lavorazione" value={stats.uploaded} />
      </div>

      {stats.overdue > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0" />
          <div>
            <p className="text-red-800 font-semibold">
              Hai {stats.overdue} documento{stats.overdue > 1 ? 'i' : ''} scadut{stats.overdue > 1 ? 'i' : 'o'}!
            </p>
            <p className="text-red-600 text-sm">Carica subito per evitare problemi.</p>
          </div>
        </div>
      )}

      {stats.expiring > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
          <Clock className="w-5 h-5 text-amber-500 flex-shrink-0" />
          <p className="text-amber-800">
            <strong>{stats.expiring}</strong> documento{stats.expiring > 1 ? 'i' : ''} in scadenza nei prossimi 7 giorni.
          </p>
        </div>
      )}
    </div>
  );
}

function StatCard({ icon: Icon, color, label, value }: any) {
  const colorMap: Record<string, string> = {
    yellow: 'bg-yellow-100 text-yellow-600',
    blue:   'bg-blue-100 text-blue-600',
    green:  'bg-green-100 text-green-600',
    red:    'bg-red-100 text-red-600',
    orange: 'bg-orange-100 text-orange-600',
    purple: 'bg-purple-100 text-purple-600',
  };
  return (
    <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
      <div className={`p-3 rounded-lg ${colorMap[color]}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-xs text-gray-500 font-medium">{label}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}

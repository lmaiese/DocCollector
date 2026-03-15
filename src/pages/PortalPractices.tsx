import React, { useEffect, useState } from 'react';
import { FolderOpen, CheckCircle, Clock, AlertTriangle } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import { api } from '../api/index';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:        { label: 'Aperta',         color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In lavorazione', color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Completata',     color: 'bg-green-100 text-green-700' },
  delivered:   { label: 'Consegnata',     color: 'bg-purple-100 text-purple-700' },
  archived:    { label: 'Archiviata',     color: 'bg-gray-100 text-gray-500' },
};

export default function PortalPractices() {
  const [practices, setPractices] = useState<any[]>([]);
  const [loading, setLoading]     = useState(true);

  useEffect(() => {
    api.get<any[]>('/api/portal/practices')
      .then(setPractices)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Le tue Pratiche</h2>
        <p className="text-gray-500 text-sm mt-1">
          Panoramica delle pratiche aperte dallo studio per te.
        </p>
      </div>

      {practices.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nessuna pratica al momento.</p>
          <p className="text-gray-400 text-sm mt-1">
            Lo studio aprirà una pratica quando ci sarà qualcosa da gestire insieme.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {practices.map(p => {
            const cfg    = STATUS_LABELS[p.status] ?? STATUS_LABELS.open;
            const today  = new Date().toISOString().split('T')[0];
            const isLate = p.deadline && p.deadline < today && p.status !== 'completed';

            return (
              <div key={p.id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-5">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-gray-900">{p.title}</h3>
                      {p.fiscalYear && (
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded font-mono">
                          {p.fiscalYear}
                        </span>
                      )}
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.color}`}>
                        {cfg.label}
                      </span>
                      {isLate && (
                        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-red-100 text-red-700 flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3" /> In ritardo
                        </span>
                      )}
                    </div>

                    {p.deadline && (
                      <p className="text-xs text-gray-500 mt-1 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        Scadenza: {format(parseISO(p.deadline), 'd MMMM yyyy', { locale: it })}
                      </p>
                    )}

                    {p.notes && (
                      <p className="text-sm text-gray-500 mt-2 italic">{p.notes}</p>
                    )}
                  </div>

                  <div className="text-right flex-shrink-0">
                    <p className="text-2xl font-bold text-gray-900">{p.progress ?? 0}%</p>
                    <p className="text-xs text-gray-400">
                      {p.approvedCount ?? 0}/{p.requestCount ?? 0} doc approvati
                    </p>
                  </div>
                </div>

                {/* Barra progresso */}
                {(p.requestCount ?? 0) > 0 && (
                  <div className="mt-4">
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          p.progress === 100 ? 'bg-green-500' :
                          p.progress > 50   ? 'bg-blue-500'  : 'bg-yellow-500'
                        }`}
                        style={{ width: `${p.progress ?? 0}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs text-gray-400 mt-1">
                      <span>{p.pendingCount ?? 0} da caricare</span>
                      <span>{p.approvedCount ?? 0} approvati</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
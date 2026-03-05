import React, { useEffect, useState, useCallback } from 'react';
import { Plus, FolderOpen, ChevronRight, User,
         Calendar, CheckCircle, Clock, AlertTriangle, Filter } from 'lucide-react';
import { Link } from 'wouter';
import toast from 'react-hot-toast';
import { api } from '../api/clients';
import { useAuth } from '../context/AuthContext';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open:        { label: 'Aperta',        color: 'bg-blue-100 text-blue-700' },
  in_progress: { label: 'In lavorazione',color: 'bg-yellow-100 text-yellow-700' },
  completed:   { label: 'Completata',    color: 'bg-green-100 text-green-700' },
  delivered:   { label: 'Consegnata',    color: 'bg-purple-100 text-purple-700' },
  archived:    { label: 'Archiviata',    color: 'bg-gray-100 text-gray-500' },
};

const EMPTY = { client_id: '', title: '', type: '', fiscal_year: '', deadline: '',
                notes: '', assigned_to: '', visible_to_client: true };

export default function Practices() {
  const { user }                  = useAuth();
  const [practices, setPractices] = useState<any[]>([]);
  const [clients, setClients]     = useState<any[]>([]);
  const [staff, setStaff]         = useState<any[]>([]);
  const [showForm, setShowForm]   = useState(false);
  const [form, setForm]           = useState({ ...EMPTY });
  const [filters, setFilters]     = useState({ status: '', client_id: '', assigned_to: '' });

  const fetchPractices = useCallback(() => {
    const q = new URLSearchParams();
    if (filters.status)      q.set('status',      filters.status);
    if (filters.client_id)   q.set('client_id',   filters.client_id);
    if (filters.assigned_to) q.set('assigned_to', filters.assigned_to);
    api.get<any[]>(`/api/practices?${q}`).then(setPractices).catch(console.error);
  }, [filters]);

  useEffect(() => { fetchPractices(); }, [fetchPractices]);
  useEffect(() => {
    api.get<any[]>('/api/clients').then(setClients).catch(console.error);
    api.get<any[]>('/api/users').then(rows =>
      setStaff(rows.filter((u: any) => ['admin','employee'].includes(u.role)))
    ).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = toast.loading('Creazione pratica...');
    try {
      await api.post('/api/practices', {
        client_id:        form.client_id,
        title:            form.title,
        type:             form.type     || undefined,
        fiscal_year:      form.fiscal_year ? Number(form.fiscal_year) : undefined,
        deadline:         form.deadline  || undefined,
        notes:            form.notes     || undefined,
        assigned_to:      form.assigned_to || undefined,
        visible_to_client: form.visible_to_client,
      });
      toast.success('Pratica creata', { id: tid });
      setShowForm(false);
      setForm({ ...EMPTY });
      fetchPractices();
    } catch (err: any) { toast.error(err.message, { id: tid }); }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.put(`/api/practices/${id}`, { status });
      toast.success('Stato aggiornato');
      fetchPractices();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Pratiche</h2>
        <button onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center
                     gap-2 hover:bg-indigo-700 transition-colors text-sm font-medium">
          <Plus className="w-4 h-4" /> Nuova Pratica
        </button>
      </div>

      {/* Filtri */}
      <div className="flex flex-wrap gap-3">
        <select value={filters.status}
          onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutti gli stati</option>
          {Object.entries(STATUS_LABELS).map(([k, v]) =>
            <option key={k} value={k}>{v.label}</option>)}
        </select>
        <select value={filters.client_id}
          onChange={e => setFilters(f => ({ ...f, client_id: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutti i clienti</option>
          {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <select value={filters.assigned_to}
          onChange={e => setFilters(f => ({ ...f, assigned_to: e.target.value }))}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutti i responsabili</option>
          {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
        </select>
        {(filters.status || filters.client_id || filters.assigned_to) && (
          <button onClick={() => setFilters({ status:'', client_id:'', assigned_to:'' })}
            className="text-sm text-gray-500 hover:text-gray-700 px-2">
            ✕ Rimuovi filtri
          </button>
        )}
      </div>

      {/* Form nuova pratica */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-5">Nuova Pratica</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <select required value={form.client_id}
                onChange={e => setForm(f => ({ ...f, client_id: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm">
                <option value="">Seleziona cliente...</option>
                {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Titolo pratica *</label>
              <input required value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="es. Dichiarazione Redditi 2024"
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
              <select value={form.type}
                onChange={e => setForm(f => ({ ...f, type: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm">
                <option value="">— Seleziona —</option>
                <option value="dichiarazione_annuale">Dichiarazione Annuale</option>
                <option value="iva_mensile">IVA Mensile</option>
                <option value="iva_trimestrale">IVA Trimestrale</option>
                <option value="bilancio">Bilancio</option>
                <option value="onboarding">Onboarding</option>
                <option value="altro">Altro</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Anno fiscale</label>
              <input type="number" min="2000" max="2099"
                value={form.fiscal_year}
                onChange={e => setForm(f => ({ ...f, fiscal_year: e.target.value }))}
                placeholder={String(new Date().getFullYear())}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scadenza pratica</label>
              <input type="date" value={form.deadline}
                onChange={e => setForm(f => ({ ...f, deadline: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Responsabile</label>
              <select value={form.assigned_to}
                onChange={e => setForm(f => ({ ...f, assigned_to: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm">
                <option value="">— Non assegnata —</option>
                {staff.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Note interne</label>
              <textarea value={form.notes} rows={2}
                onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm" />
            </div>
            <div className="md:col-span-2 flex items-center gap-2">
              <input type="checkbox" id="vis" checked={form.visible_to_client}
                onChange={e => setForm(f => ({ ...f, visible_to_client: e.target.checked }))}
                className="rounded" />
              <label htmlFor="vis" className="text-sm text-gray-600">
                Visibile al cliente nel portale
              </label>
            </div>
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                Annulla
              </button>
              <button type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                Crea Pratica
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista pratiche */}
      <div className="space-y-3">
        {practices.map(p => (
          <PracticeCard key={p.id} practice={p} onStatusChange={handleStatusChange} />
        ))}
        {practices.length === 0 && (
          <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
            <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-medium">Nessuna pratica trovata</p>
            <p className="text-gray-400 text-sm mt-1">Crea la prima pratica per iniziare.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function PracticeCard({ practice: p, onStatusChange }: any) {
  const cfg     = STATUS_LABELS[p.status] || STATUS_LABELS.open;
  const today   = new Date().toISOString().split('T')[0];
  const isLate  = p.deadline && p.deadline < today && p.status !== 'completed';

  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md
                    transition-shadow p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-semibold text-gray-900 truncate">{p.title}</h3>
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
                <AlertTriangle className="w-3 h-3" /> Scaduta
              </span>
            )}
          </div>
          <p className="text-sm text-indigo-600 font-medium mt-0.5">{p.clientName}</p>

          <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
            {p.assigneeName && (
              <span className="flex items-center gap-1">
                <User className="w-3 h-3" /> {p.assigneeName}
              </span>
            )}
            {p.deadline && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3 h-3" />
                {format(parseISO(p.deadline), 'd MMM yyyy', { locale: it })}
              </span>
            )}
          </div>

          {/* Barra progresso */}
          {p.requestCount > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>{p.approvedCount}/{p.requestCount} documenti approvati</span>
                <span>{p.progress}%</span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    p.progress === 100 ? 'bg-green-500' :
                    p.progress > 50    ? 'bg-blue-500'  : 'bg-yellow-500'
                  }`}
                  style={{ width: `${p.progress}%` }}
                />
              </div>
              {p.rejectedCount > 0 && (
                <p className="text-xs text-red-600 mt-1">
                  {p.rejectedCount} documento{p.rejectedCount > 1 ? 'i' : ''} rifiutat{p.rejectedCount > 1 ? 'i' : 'o'}
                </p>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Avanza stato rapidamente */}
          {p.status === 'completed' && (
            <button onClick={() => onStatusChange(p.id, 'delivered')}
              className="text-xs bg-purple-50 text-purple-700 border border-purple-200
                         px-3 py-1.5 rounded-lg hover:bg-purple-100 font-medium">
              Segna consegnata
            </button>
          )}
          {p.status === 'delivered' && (
            <button onClick={() => onStatusChange(p.id, 'archived')}
              className="text-xs bg-gray-50 text-gray-600 border border-gray-200
                         px-3 py-1.5 rounded-lg hover:bg-gray-100 font-medium">
              Archivia
            </button>
          )}
          <Link href={`/practices/${p.id}`}
            className="flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium">
            Dettaglio <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}
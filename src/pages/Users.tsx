import React, { useEffect, useState } from 'react';
import { Plus, Trash2, UserCheck, UserX, Send, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/index';

interface StaffUser {
  id: string; email: string; name: string;
  role: string; clientId: string | null; isActive: boolean; createdAt: string;
}

interface Client { id: string; name: string; }

const ROLE_LABELS: Record<string, string> = {
  admin: 'Admin', employee: 'Dipendente', client: 'Cliente',
};
const ROLE_COLORS: Record<string, string> = {
  admin:    'bg-purple-100 text-purple-700',
  employee: 'bg-blue-100 text-blue-700',
  client:   'bg-green-100 text-green-700',
};

const EMPTY = { email: '', name: '', role: 'employee', clientId: '' };

export default function Users() {
  const [users, setUsers]       = useState<StaffUser[]>([]);
  const [clients, setClients]   = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm]         = useState({ ...EMPTY });
  const [filter, setFilter]     = useState('');

  const fetchUsers = () => {
    api.get<StaffUser[]>('/api/users').then(setUsers).catch(console.error);
  };

  useEffect(() => {
    fetchUsers();
    api.get<Client[]>('/api/clients').then(setClients).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = toast.loading('Creazione utente...');
    try {
      await api.post('/api/users', {
        email:    form.email,
        name:     form.name || undefined,
        role:     form.role,
        clientId: form.role === 'client' ? form.clientId : undefined,
      });
      toast.success(
        form.role === 'client'
          ? 'Utente cliente creato — riceverà email con link di accesso'
          : 'Utente staff creato',
        { id: tid }
      );
      setShowForm(false);
      setForm({ ...EMPTY });
      fetchUsers();
    } catch (err: any) { toast.error(err.message, { id: tid }); }
  };

  const handleToggleActive = async (u: StaffUser) => {
    const tid = toast.loading(u.isActive ? 'Disabilitazione...' : 'Riabilitazione...');
    try {
      await api.patch(`/api/users/${u.id}`, { isActive: !u.isActive });
      toast.success(u.isActive ? 'Utente disabilitato' : 'Utente riabilitato', { id: tid });
      fetchUsers();
    } catch (err: any) { toast.error(err.message, { id: tid }); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo utente? L\'operazione è irreversibile.')) return;
    try {
      await api.delete(`/api/users/${id}`);
      toast.success('Utente eliminato');
      fetchUsers();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleResendMagicLink = async (email: string) => {
    const tid = toast.loading('Invio magic link...');
    try {
      await api.post('/api/auth/magic-link', { email });
      toast.success('Link di accesso reinviato', { id: tid });
    } catch (err: any) { toast.error(err.message, { id: tid }); }
  };

  const filtered = users.filter(u =>
    !filter ||
    u.name?.toLowerCase().includes(filter.toLowerCase()) ||
    u.email.toLowerCase().includes(filter.toLowerCase()) ||
    u.role === filter
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-800">Utenti</h2>
        <button
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center
                     gap-2 hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Nuovo Utente
        </button>
      </div>

      {/* Filtri rapidi */}
      <div className="flex gap-2 flex-wrap">
        {['', 'admin', 'employee', 'client'].map(r => (
          <button key={r}
            onClick={() => setFilter(r)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === r
                ? 'bg-indigo-600 text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
          >
            {r === '' ? 'Tutti' : ROLE_LABELS[r]}
          </button>
        ))}
      </div>

      {/* Form nuovo utente */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm">
          <h3 className="text-lg font-semibold mb-5">Nuovo Utente</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Email *</label>
              <input required type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm" placeholder="mario@studio.it" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nome</label>
              <input type="text" value={form.name}
                onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
                className="w-full border rounded-lg p-2 text-sm" placeholder="Mario Rossi" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Ruolo *</label>
              <select required value={form.role}
                onChange={e => setForm(f => ({ ...f, role: e.target.value, clientId: '' }))}
                className="w-full border rounded-lg p-2 text-sm">
                <option value="employee">Dipendente</option>
                <option value="admin">Admin</option>
                <option value="client">Cliente (portale)</option>
              </select>
            </div>
            {form.role === 'client' && (
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Cliente associato *
                </label>
                <select required value={form.clientId}
                  onChange={e => setForm(f => ({ ...f, clientId: e.target.value }))}
                  className="w-full border rounded-lg p-2 text-sm">
                  <option value="">Seleziona cliente...</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
                <p className="text-xs text-gray-400 mt-1">
                  L'utente riceverà un'email con il link di accesso al portale.
                </p>
              </div>
            )}
            <div className="md:col-span-2 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setForm({ ...EMPTY }); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm">
                Annulla
              </button>
              <button type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm font-medium">
                Crea Utente
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Tabella utenti */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-500">Nome / Email</th>
              <th className="p-4 font-medium text-gray-500">Ruolo</th>
              <th className="p-4 font-medium text-gray-500">Cliente</th>
              <th className="p-4 font-medium text-gray-500">Stato</th>
              <th className="p-4 font-medium text-gray-500">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(u => {
              const clientName = clients.find(c => c.id === u.clientId)?.name;
              return (
                <tr key={u.id} className={`border-b border-gray-100 hover:bg-gray-50 ${
                  !u.isActive ? 'opacity-50' : ''
                }`}>
                  <td className="p-4">
                    <p className="font-medium text-gray-900">{u.name || '—'}</p>
                    <p className="text-xs text-gray-500">{u.email}</p>
                  </td>
                  <td className="p-4">
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full ${ROLE_COLORS[u.role] || 'bg-gray-100 text-gray-600'}`}>
                      {ROLE_LABELS[u.role] || u.role}
                    </span>
                  </td>
                  <td className="p-4 text-gray-600 text-sm">{clientName || '—'}</td>
                  <td className="p-4">
                    <span className={`text-xs font-medium ${u.isActive ? 'text-green-600' : 'text-red-500'}`}>
                      {u.isActive ? 'Attivo' : 'Disabilitato'}
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2">
                      {u.role === 'client' && u.isActive && (
                        <button
                          onClick={() => handleResendMagicLink(u.email)}
                          className="text-gray-400 hover:text-indigo-600 transition-colors"
                          title="Reinvia link di accesso"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`transition-colors ${
                          u.isActive
                            ? 'text-gray-400 hover:text-orange-500'
                            : 'text-gray-400 hover:text-green-600'
                        }`}
                        title={u.isActive ? 'Disabilita' : 'Riabilita'}
                      >
                        {u.isActive ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => handleDelete(u.id)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Elimina"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-400">
                  Nessun utente trovato.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Plus, Trash2, Edit2, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/clients';
import { Client } from '../types';

const EMPTY_FORM = { name: '', internal_code: '', tax_id: '', email: '', phone: '', notes: '' };

export default function Clients() {
  const [clients, setClients]   = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId]     = useState<string | null>(null);
  const [formData, setFormData] = useState({ ...EMPTY_FORM });
  const [search, setSearch]     = useState('');

  const fetchClients = () => {
    const q = search ? `?search=${encodeURIComponent(search)}` : '';
    api.get<Client[]>(`/api/clients${q}`).then(setClients).catch(console.error);
  };

  useEffect(() => { fetchClients(); }, [search]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading(editId ? 'Aggiornamento...' : 'Salvataggio...');
    try {
      if (editId) {
        await api.put(`/api/clients/${editId}`, formData);
        toast.success('Cliente aggiornato', { id: toastId });
      } else {
        await api.post('/api/clients', formData);
        toast.success('Cliente aggiunto', { id: toastId });
      }
      setShowForm(false); setEditId(null); setFormData({ ...EMPTY_FORM }); fetchClients();
    } catch (err: any) { toast.error(err.message, { id: toastId }); }
  };

  const handleEdit = (c: Client) => {
    setEditId(c.id);
    setFormData({
      name: c.name, internal_code: c.internal_code || '',
      tax_id: c.tax_id || '', email: c.email || '',
      phone: c.phone || '', notes: c.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminare questo cliente?')) return;
    try { await api.delete(`/api/clients/${id}`); toast.success('Cliente eliminato'); fetchClients(); }
    catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Clienti</h2>
        <button
          onClick={() => { setShowForm(true); setEditId(null); setFormData({ ...EMPTY_FORM }); }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors text-sm font-medium"
        >
          <Plus className="w-4 h-4" /> Aggiungi Cliente
        </button>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" placeholder="Cerca nome, codice, P.IVA..."
          className="w-full pl-9 pr-4 py-2 border rounded-lg text-sm"
          value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">{editId ? 'Modifica Cliente' : 'Nuovo Cliente'}</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input required placeholder="Ragione Sociale *" className="border p-2 rounded-lg"
              value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))} />
            <input placeholder="Codice Interno" className="border p-2 rounded-lg"
              value={formData.internal_code} onChange={e => setFormData(f => ({ ...f, internal_code: e.target.value }))} />
            <input placeholder="CF / Partita IVA" className="border p-2 rounded-lg font-mono"
              value={formData.tax_id} onChange={e => setFormData(f => ({ ...f, tax_id: e.target.value }))} />
            <input type="email" placeholder="Email" className="border p-2 rounded-lg"
              value={formData.email} onChange={e => setFormData(f => ({ ...f, email: e.target.value }))} />
            <input placeholder="Telefono" className="border p-2 rounded-lg"
              value={formData.phone} onChange={e => setFormData(f => ({ ...f, phone: e.target.value }))} />
            <input placeholder="Note" className="border p-2 rounded-lg"
              value={formData.notes} onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => { setShowForm(false); setEditId(null); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editId ? 'Salva Modifiche' : 'Aggiungi'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-500">Ragione Sociale</th>
              <th className="p-4 font-medium text-gray-500">Codice</th>
              <th className="p-4 font-medium text-gray-500">CF / P.IVA</th>
              <th className="p-4 font-medium text-gray-500">Email</th>
              <th className="p-4 font-medium text-gray-500">Azioni</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(c => (
              <tr key={c.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{c.name}</td>
                <td className="p-4 text-gray-600 font-mono text-xs">{c.internal_code || '—'}</td>
                <td className="p-4 text-gray-600 font-mono text-xs">{c.tax_id || '—'}</td>
                <td className="p-4 text-gray-600">{c.email || '—'}</td>
                <td className="p-4">
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleEdit(c)}
                      className="text-gray-400 hover:text-indigo-600 transition-colors" title="Modifica">
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      className="text-gray-400 hover:text-red-600 transition-colors" title="Elimina">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={5} className="p-10 text-center text-gray-400">
                  {search ? 'Nessun cliente corrisponde alla ricerca.' : 'Nessun cliente. Aggiungine uno per iniziare.'}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}



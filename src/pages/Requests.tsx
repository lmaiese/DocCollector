import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Upload, CheckCircle, Clock,
  Download, Trash2, Search, Filter, X,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/client';
import { Request, Client } from '../types';
import DeadlineBadge from '../components/DeadlineBadge';
import { useAuth } from '../context/AuthContext';

const REQUEST_TYPES = ['FATT', 'CUD', 'BANK', 'OTHER'];
const EMPTY_FORM    = { client_id: '', period: '', type: 'FATT', deadline: '', notes: '' };

export default function Requests() {
  const { user } = useAuth();
  const [requests, setRequests]       = useState<Request[]>([]);
  const [clients, setClients]         = useState<Client[]>([]);
  const [showForm, setShowForm]       = useState(false);
  const [uploadingId, setUploadingId] = useState<string | null>(null);
  const [formData, setFormData]       = useState({ ...EMPTY_FORM });
  const [filters, setFilters]         = useState({ search: '', status: '', type: '', client_id: '' });
  const [showFilters, setShowFilters] = useState(false);

  const fetchRequests = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search)    params.set('search',    filters.search);
    if (filters.status)    params.set('status',    filters.status);
    if (filters.type)      params.set('type',      filters.type);
    if (filters.client_id) params.set('client_id', filters.client_id);
    api.get<Request[]>(`/api/requests?${params}`).then(setRequests).catch(console.error);
  }, [filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);
  useEffect(() => {
    api.get<Client[]>('/api/clients').then(setClients).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const toastId = toast.loading('Creazione richiesta...');
    try {
      await api.post('/api/requests', formData);
      toast.success('Richiesta creata', { id: toastId });
      setShowForm(false);
      setFormData({ ...EMPTY_FORM });
      fetchRequests();
    } catch (err: any) { toast.error(err.message, { id: toastId }); }
  };

  const handleUpload = async (requestId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('request_id', requestId);
    setUploadingId(requestId);
    const toastId = toast.loading('Caricamento...');
    try {
      await api.upload('/api/documents/upload', fd);
      toast.success('Documento caricato!', { id: toastId });
      fetchRequests();
    } catch (err: any) { toast.error(err.message, { id: toastId }); }
    finally { setUploadingId(null); }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Eliminare questa richiesta?')) return;
    try { await api.delete(`/api/requests/${id}`); toast.success('Richiesta eliminata'); fetchRequests(); }
    catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Eliminare il documento? La richiesta tornerà in attesa.')) return;
    try { await api.delete(`/api/documents/${docId}`); toast.success('Documento eliminato'); fetchRequests(); }
    catch (err: any) { toast.error(err.message); }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Richieste Documentali</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm font-medium transition-colors ${
              showFilters ? 'bg-indigo-50 border-indigo-300 text-indigo-700' : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtri
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nuova Richiesta
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input type="text" placeholder="Cerca cliente, tipo..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))} />
            </div>
            <select className="border rounded-lg p-2 text-sm" value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}>
              <option value="">Tutti gli stati</option>
              <option value="pending">In attesa</option>
              <option value="uploaded">Caricato</option>
            </select>
            <select className="border rounded-lg p-2 text-sm" value={filters.type}
              onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}>
              <option value="">Tutti i tipi</option>
              {REQUEST_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
            </select>
            <select className="border rounded-lg p-2 text-sm" value={filters.client_id}
              onChange={e => setFilters(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Tutti i clienti</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button onClick={() => setFilters({ search: '', status: '', type: '', client_id: '' })}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1">
              <X className="w-3 h-3" /> Rimuovi tutti i filtri
            </button>
          )}
        </div>
      )}

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Nuova Richiesta</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select required className="border p-2 rounded-lg" value={formData.client_id}
              onChange={e => setFormData(f => ({ ...f, client_id: e.target.value }))}>
              <option value="">Seleziona Cliente *</option>
              {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <input type="text" placeholder="Periodo (YYYYMM) *" required
              pattern="\d{6}" title="Formato YYYYMM es. 202501"
              className="border p-2 rounded-lg font-mono"
              value={formData.period}
              onChange={e => setFormData(f => ({ ...f, period: e.target.value }))} />
            <select required className="border p-2 rounded-lg" value={formData.type}
              onChange={e => setFormData(f => ({ ...f, type: e.target.value }))}>
              <option value="FATT">Fatture (FATT)</option>
              <option value="CUD">CUD</option>
              <option value="BANK">Estratto Conto (BANK)</option>
              <option value="OTHER">Altro</option>
            </select>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Scadenza (opzionale)</label>
              <input type="date" className="w-full border p-2 rounded-lg"
                value={formData.deadline}
                onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))} />
            </div>
            <input type="text" placeholder="Note (opzionale)"
              className="border p-2 rounded-lg md:col-span-2"
              value={formData.notes}
              onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))} />
            <div className="md:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg">Annulla</button>
              <button type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                Crea Richiesta
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-medium text-gray-500">Cliente</th>
                <th className="p-4 font-medium text-gray-500">Periodo</th>
                <th className="p-4 font-medium text-gray-500">Tipo</th>
                <th className="p-4 font-medium text-gray-500">Scadenza</th>
                <th className="p-4 font-medium text-gray-500">Stato</th>
                <th className="p-4 font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => (
                <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4 font-medium text-gray-900">{req.client_name}</td>
                  <td className="p-4 text-gray-600 font-mono">{req.period}</td>
                  <td className="p-4">
                    <span className="px-2 py-1 bg-indigo-50 text-indigo-700 rounded text-xs font-semibold">
                      {req.type}
                    </span>
                  </td>
                  <td className="p-4">
                    <DeadlineBadge deadline={req.deadline} status={req.status} />
                  </td>
                  <td className="p-4">
                    {req.status === 'uploaded'
                      ? <span className="flex items-center gap-1 text-green-600 font-medium"><CheckCircle className="w-4 h-4" /> Caricato</span>
                      : <span className="flex items-center gap-1 text-yellow-600 font-medium"><Clock className="w-4 h-4" /> In attesa</span>
                    }
                  </td>
                  <td className="p-4">
                    {req.status === 'uploaded' && req.document_id ? (
                      <div className="flex items-center gap-3">
                        <a href={`/api/documents/${req.document_id}/download`}
                          className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 font-medium" download>
                          <Download className="w-4 h-4" /> Scarica
                        </a>
                        <button onClick={() => handleDeleteDocument(req.document_id!)}
                          className="text-red-400 hover:text-red-600 transition-colors" title="Elimina documento">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3">
                        <label className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg font-medium flex items-center gap-2 transition-colors">
                          <Upload className="w-4 h-4" />
                          {uploadingId === req.id ? 'Caricamento...' : 'Carica'}
                          <input type="file" className="hidden" disabled={uploadingId === req.id}
                            onChange={e => e.target.files?.[0] && handleUpload(req.id, e.target.files[0])} />
                        </label>
                        {user?.role !== 'employee' && (
                          <button onClick={() => handleDeleteRequest(req.id)}
                            className="text-gray-400 hover:text-red-600 transition-colors" title="Elimina richiesta">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={6} className="p-10 text-center text-gray-400">
                    {activeFilterCount > 0
                      ? 'Nessuna richiesta corrisponde ai filtri selezionati.'
                      : 'Nessuna richiesta. Crea la prima!'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

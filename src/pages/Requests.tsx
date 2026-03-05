import React, { useEffect, useState, useCallback } from 'react';
import {
  Plus, Upload, CheckCircle, Clock, Download, Trash2,
  Search, Filter, X, Eye, XCircle, AlertTriangle, MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/clients';
import { Request, Client } from '../types';
import DeadlineBadge from '../components/DeadlineBadge';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const EMPTY_FORM = {
  client_id: '', period: '', doc_type_code: 'FATT_ATT',
  deadline: '', notes: '', practice_id: '',
};

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  pending:      { label: 'In attesa',    color: 'text-yellow-600 bg-yellow-50 border-yellow-200', icon: Clock },
  uploaded:     { label: 'Caricato',     color: 'text-blue-600 bg-blue-50 border-blue-200',       icon: Eye },
  under_review: { label: 'In revisione', color: 'text-purple-600 bg-purple-50 border-purple-200', icon: Eye },
  approved:     { label: 'Approvato',    color: 'text-green-600 bg-green-50 border-green-200',    icon: CheckCircle },
  rejected:     { label: 'Rifiutato',    color: 'text-red-600 bg-red-50 border-red-200',          icon: XCircle },
};

interface ExtendedRequest extends Request {
  docTypeLabel?:    string;
  docTypeCode?:     string;
  rejectionReason?: string;
  practiceId?:      string;
}

export default function Requests() {
  const { user }                          = useAuth();
  const [requests, setRequests]           = useState<ExtendedRequest[]>([]);
  const [clients, setClients]             = useState<Client[]>([]);
  const [docTypes, setDocTypes]           = useState<any[]>([]);
  const [showForm, setShowForm]           = useState(false);
  const [uploadingId, setUploadingId]     = useState<string | null>(null);
  const [formData, setFormData]           = useState({ ...EMPTY_FORM });
  const [filters, setFilters]             = useState({
    search: '', status: '', doc_type_code: '', client_id: '',
  });
  const [showFilters, setShowFilters]     = useState(false);
  const [rejectTarget, setRejectTarget]   = useState<string | null>(null);
  const [rejectReason, setRejectReason]   = useState('');
  const [reviewing, setReviewing]         = useState<string | null>(null);

  const fetchRequests = useCallback(() => {
    const params = new URLSearchParams();
    if (filters.search)        params.set('search',        filters.search);
    if (filters.status)        params.set('status',        filters.status);
    if (filters.doc_type_code) params.set('doc_type_code', filters.doc_type_code);
    if (filters.client_id)     params.set('client_id',     filters.client_id);
    api.get<ExtendedRequest[]>(`/api/requests?${params}`)
      .then(setRequests)
      .catch(console.error);
  }, [filters]);

  useEffect(() => { fetchRequests(); }, [fetchRequests]);

  useEffect(() => {
    api.get<Client[]>('/api/clients').then(setClients).catch(console.error);
    api.get<any[]>('/api/document-types').then(setDocTypes).catch(console.error);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const tid = toast.loading('Creazione richiesta...');
    try {
      await api.post('/api/requests', formData);
      toast.success('Richiesta creata', { id: tid });
      setShowForm(false);
      setFormData({ ...EMPTY_FORM });
      fetchRequests();
    } catch (err: any) { toast.error(err.message, { id: tid }); }
  };

  const handleUpload = async (requestId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('request_id', requestId);
    setUploadingId(requestId);
    const tid = toast.loading('Caricamento...');
    try {
      await api.upload('/api/documents/upload', fd);
      toast.success('Documento caricato!', { id: tid });
      fetchRequests();
    } catch (err: any) { toast.error(err.message, { id: tid }); }
    finally { setUploadingId(null); }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Eliminare questa richiesta?')) return;
    try {
      await api.delete(`/api/requests/${id}`);
      toast.success('Richiesta eliminata');
      fetchRequests();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Eliminare il documento? La richiesta tornerà in attesa.')) return;
    try {
      await api.delete(`/api/documents/${docId}`);
      toast.success('Documento eliminato');
      fetchRequests();
    } catch (err: any) { toast.error(err.message); }
  };

  const handleReview = async (
    requestId: string,
    action: 'approve' | 'reject',
    reason?: string,
  ) => {
    if (action === 'reject' && !reason?.trim()) {
      toast.error('Inserisci la motivazione del rifiuto');
      return;
    }
    setReviewing(requestId);
    const tid = toast.loading(action === 'approve' ? 'Approvazione...' : 'Rifiuto...');
    try {
      await api.post(`/api/requests/${requestId}/review`, {
        action,
        rejection_reason: reason || '',
      });
      toast.success(action === 'approve' ? '✅ Documento approvato' : '❌ Documento rifiutato', { id: tid });
      setRejectTarget(null);
      setRejectReason('');
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally { setReviewing(null); }
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;
  const canReview = user?.role === 'admin' || user?.role === 'employee';

  return (
    <div className="space-y-6">

      {/* ── Header ── */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Richieste Documentali</h2>
        <div className="flex gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm
                        font-medium transition-colors ${
              showFilters
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-gray-300 text-gray-700 hover:bg-gray-50'
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtri
            {activeFilterCount > 0 && (
              <span className="bg-indigo-600 text-white text-xs rounded-full
                               w-5 h-5 flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center
                       gap-2 hover:bg-indigo-700 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" /> Nuova Richiesta
          </button>
        </div>
      </div>

      {/* ── Filtri ── */}
      {showFilters && (
        <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca cliente, periodo..."
                className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm"
                value={filters.search}
                onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              />
            </div>
            <select
              className="border rounded-lg p-2 text-sm"
              value={filters.status}
              onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
            >
              <option value="">Tutti gli stati</option>
              {Object.entries(STATUS_CONFIG).map(([k, v]) => (
                <option key={k} value={k}>{v.label}</option>
              ))}
            </select>
            <select
              className="border rounded-lg p-2 text-sm"
              value={filters.doc_type_code}
              onChange={e => setFilters(f => ({ ...f, doc_type_code: e.target.value }))}
            >
              <option value="">Tutti i tipi</option>
              {docTypes.map(dt => (
                <option key={dt.id} value={dt.code}>{dt.label}</option>
              ))}
            </select>
            <select
              className="border rounded-lg p-2 text-sm"
              value={filters.client_id}
              onChange={e => setFilters(f => ({ ...f, client_id: e.target.value }))}
            >
              <option value="">Tutti i clienti</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {activeFilterCount > 0 && (
            <button
              onClick={() => setFilters({ search:'', status:'', doc_type_code:'', client_id:'' })}
              className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3 h-3" /> Rimuovi tutti i filtri
            </button>
          )}
        </div>
      )}

      {/* ── Form nuova richiesta ── */}
      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <h3 className="text-lg font-semibold mb-4">Nuova Richiesta</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Cliente *</label>
              <select
                required
                className="w-full border p-2 rounded-lg text-sm"
                value={formData.client_id}
                onChange={e => setFormData(f => ({ ...f, client_id: e.target.value }))}
              >
                <option value="">Seleziona cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Tipo documento *</label>
              <select
                required
                className="w-full border p-2 rounded-lg text-sm"
                value={formData.doc_type_code}
                onChange={e => setFormData(f => ({ ...f, doc_type_code: e.target.value }))}
              >
                {docTypes.map(dt => (
                  <option key={dt.id} value={dt.code}>{dt.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Periodo * <span className="text-gray-400 font-normal">(YYYYMM)</span>
              </label>
              <input
                required
                type="text"
                pattern="\d{6}"
                title="Formato YYYYMM es. 202501"
                placeholder="202501"
                className="w-full border p-2 rounded-lg text-sm font-mono"
                value={formData.period}
                onChange={e => setFormData(f => ({ ...f, period: e.target.value }))}
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Scadenza</label>
              <input
                type="date"
                className="w-full border p-2 rounded-lg text-sm"
                value={formData.deadline}
                onChange={e => setFormData(f => ({ ...f, deadline: e.target.value }))}
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1">Note</label>
              <input
                type="text"
                placeholder="Istruzioni per il cliente..."
                className="w-full border p-2 rounded-lg text-sm"
                value={formData.notes}
                onChange={e => setFormData(f => ({ ...f, notes: e.target.value }))}
              />
            </div>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setFormData({ ...EMPTY_FORM }); }}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg text-sm"
              >
                Annulla
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg
                           hover:bg-indigo-700 text-sm font-medium"
              >
                Crea Richiesta
              </button>
            </div>
          </form>
        </div>
      )}

      {/* ── Tabella richieste ── */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-medium text-gray-500">Cliente</th>
                <th className="p-4 font-medium text-gray-500">Documento</th>
                <th className="p-4 font-medium text-gray-500">Periodo</th>
                <th className="p-4 font-medium text-gray-500">Scadenza</th>
                <th className="p-4 font-medium text-gray-500">Stato</th>
                <th className="p-4 font-medium text-gray-500">Azioni</th>
              </tr>
            </thead>
            <tbody>
              {requests.map(req => {
                const cfg  = STATUS_CONFIG[req.status] || STATUS_CONFIG.pending;
                const Icon = cfg.icon;
                const canUpload    = ['pending', 'rejected'].includes(req.status);
                const canReviewReq = canReview && ['uploaded','under_review'].includes(req.status);

                return (
                  <React.Fragment key={req.id}>
                    <tr className={`border-b border-gray-100 hover:bg-gray-50 ${
                      req.status === 'rejected' ? 'bg-red-50/30' : ''
                    }`}>
                      {/* Cliente */}
                      <td className="p-4 font-medium text-gray-900">
                        {req.client_name}
                      </td>

                      {/* Tipo documento */}
                      <td className="p-4">
                        <span className="px-2 py-1 bg-indigo-50 text-indigo-700
                                         rounded text-xs font-semibold">
                          {req.docTypeLabel || (req as any).doc_type_code || req.type}
                        </span>
                      </td>

                      {/* Periodo */}
                      <td className="p-4 text-gray-600 font-mono">
                        {req.period}
                      </td>

                      {/* Scadenza */}
                      <td className="p-4">
                        <DeadlineBadge
                          deadline={req.deadline}
                          status={req.status === 'approved' ? 'uploaded' : 'pending'}
                        />
                      </td>

                      {/* Stato */}
                      <td className="p-4">
                        <span className={`flex items-center gap-1 w-fit text-xs font-semibold
                                          px-2 py-1 rounded-full border ${cfg.color}`}>
                          <Icon className="w-3 h-3" />
                          {cfg.label}
                        </span>
                      </td>

                      {/* Azioni */}
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">

                          {/* Download documento approvato */}
                          {req.status === 'approved' && req.document_id && (
                            <a
                              href={`${API_BASE_URL}/api/documents/${req.document_id}/download`}
                              className="text-indigo-600 hover:text-indigo-800 flex items-center
                                         gap-1 font-medium text-xs"
                              download
                            >
                              <Download className="w-3.5 h-3.5" /> Scarica
                            </a>
                          )}

                          {/* Download + bottoni revisione per uploaded/under_review */}
                          {canReviewReq && (
                            <>
                              {req.document_id && (
                                <a
                                  href={`${API_BASE_URL}/api/documents/${req.document_id}/download`}
                                  className="text-gray-500 hover:text-indigo-600 flex items-center
                                             gap-1 text-xs"
                                  download
                                  title="Scarica per revisione"
                                >
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                              )}
                              <button
                                disabled={!!reviewing}
                                onClick={() => handleReview(req.id, 'approve')}
                                className="flex items-center gap-1 bg-green-50 text-green-700
                                           border border-green-200 px-2 py-1 rounded-lg text-xs
                                           font-medium hover:bg-green-100 disabled:opacity-50"
                              >
                                <CheckCircle className="w-3 h-3" /> Approva
                              </button>
                              <button
                                disabled={!!reviewing}
                                onClick={() => {
                                  setRejectTarget(rejectTarget === req.id ? null : req.id);
                                  setRejectReason('');
                                }}
                                className="flex items-center gap-1 bg-red-50 text-red-700
                                           border border-red-200 px-2 py-1 rounded-lg text-xs
                                           font-medium hover:bg-red-100 disabled:opacity-50"
                              >
                                <XCircle className="w-3 h-3" /> Rifiuta
                              </button>
                            </>
                          )}

                          {/* Upload (pending o rejected) */}
                          {canUpload && (
                            <label className={`cursor-pointer bg-blue-50 text-blue-600
                                              hover:bg-blue-100 px-2 py-1 rounded-lg text-xs
                                              font-medium flex items-center gap-1 transition-colors
                                              ${uploadingId === req.id ? 'opacity-60 cursor-not-allowed' : ''}`}>
                              <Upload className="w-3.5 h-3.5" />
                              {uploadingId === req.id ? '...' :
                                req.status === 'rejected' ? 'Ricarica' : 'Carica'}
                              <input
                                type="file"
                                className="hidden"
                                disabled={uploadingId === req.id}
                                onChange={e =>
                                  e.target.files?.[0] && handleUpload(req.id, e.target.files[0])
                                }
                              />
                            </label>
                          )}

                          {/* Elimina documento (uploaded/under_review) */}
                          {['uploaded','under_review'].includes(req.status) && req.document_id && canReview && (
                            <button
                              onClick={() => handleDeleteDocument(req.document_id!)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Elimina documento"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Elimina richiesta (solo pending, solo admin) */}
                          {req.status === 'pending' && user?.role === 'admin' && (
                            <button
                              onClick={() => handleDeleteRequest(req.id)}
                              className="text-gray-400 hover:text-red-600 transition-colors"
                              title="Elimina richiesta"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ── Riga rifiuto (inline form) ── */}
                    {rejectTarget === req.id && (
                      <tr className="bg-red-50 border-b border-red-100">
                        <td colSpan={6} className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <span className="text-sm font-medium text-red-700 mr-2">
                              Motivazione rifiuto:
                            </span>
                            <input
                              type="text"
                              autoFocus
                              value={rejectReason}
                              onChange={e => setRejectReason(e.target.value)}
                              onKeyDown={e => {
                                if (e.key === 'Enter') handleReview(req.id, 'reject', rejectReason);
                                if (e.key === 'Escape') { setRejectTarget(null); setRejectReason(''); }
                              }}
                              placeholder="es. File illeggibile, mancano pagine..."
                              className="flex-1 border border-red-300 rounded-lg px-3 py-1.5 text-sm
                                         focus:ring-2 focus:ring-red-400 outline-none"
                            />
                            <button
                              onClick={() => handleReview(req.id, 'reject', rejectReason)}
                              disabled={!rejectReason.trim() || !!reviewing}
                              className="bg-red-600 text-white px-3 py-1.5 rounded-lg text-sm
                                         font-medium hover:bg-red-700 disabled:opacity-50"
                            >
                              Conferma
                            </button>
                            <button
                              onClick={() => { setRejectTarget(null); setRejectReason(''); }}
                              className="text-gray-500 hover:text-gray-700 px-2"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )}

                    {/* ── Riga motivazione rifiuto esistente ── */}
                    {req.status === 'rejected' && req.rejectionReason && (
                      <tr className="bg-red-50/50 border-b border-red-100">
                        <td colSpan={6} className="px-4 py-2">
                          <p className="text-xs text-red-600 flex items-center gap-1">
                            <XCircle className="w-3 h-3 flex-shrink-0" />
                            <strong>Rifiutato:</strong>&nbsp;{req.rejectionReason}
                          </p>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}

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

import React, { useEffect, useState } from 'react';
import {
  Upload, CheckCircle, Clock, AlertTriangle,
  XCircle, Eye, MessageSquare, ChevronDown, ChevronUp,
} from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/index';
import DeadlineBadge from '../components/DeadlineBadge';
import { API_BASE_URL } from '../config';

const STATUS_CONFIG = {
  pending:      { label: 'Da caricare',   icon: Clock,       color: 'text-yellow-600 bg-yellow-50' },
  uploaded:     { label: 'Caricato',      icon: Eye,         color: 'text-blue-600 bg-blue-50' },
  under_review: { label: 'In revisione',  icon: Eye,         color: 'text-purple-600 bg-purple-50' },
  approved:     { label: 'Approvato',     icon: CheckCircle, color: 'text-green-600 bg-green-50' },
  rejected:     { label: 'Da ricaricare', icon: XCircle,     color: 'text-red-600 bg-red-50' },
};

export default function PortalRequests() {
  const [requests, setRequests]   = useState<any[]>([]);
  const [uploading, setUploading] = useState<string | null>(null);
  const [expanded, setExpanded]   = useState<string | null>(null);
  const [filterStatus, setFilter] = useState('');

  const fetchRequests = () => {
    const q = filterStatus ? `?status=${filterStatus}` : '';
    api.get<any[]>(`/api/portal/requests${q}`).then(setRequests).catch(console.error);
  };

  useEffect(() => { fetchRequests(); }, [filterStatus]);

  const handleUpload = async (requestId: string, file: File) => {
    const fd = new FormData();
    fd.append('file', file);
    setUploading(requestId);
    const tid = toast.loading('Caricamento in corso...');
    try {
      await api.upload(`/api/portal/requests/${requestId}/upload`, fd);
      toast.success('Documento caricato con successo!', { id: tid });
      fetchRequests();
    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally { setUploading(null); }
  };

  const pending = requests.filter(r => ['pending', 'rejected'].includes(r.status));
  const others  = requests.filter(r => !['pending', 'rejected'].includes(r.status));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Documenti Richiesti</h2>
        <select value={filterStatus} onChange={e => setFilter(e.target.value)}
          className="border rounded-lg px-3 py-2 text-sm">
          <option value="">Tutti</option>
          <option value="pending">Da caricare</option>
          <option value="uploaded">Caricato</option>
          <option value="under_review">In revisione</option>
          <option value="approved">Approvato</option>
          <option value="rejected">Da ricaricare</option>
        </select>
      </div>

      {pending.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            ⚠️ Azione richiesta ({pending.length})
          </h3>
          <div className="space-y-3">
            {pending.map(req => (
              <RequestCard key={req.id} req={req}
                uploading={uploading} onUpload={handleUpload}
                expanded={expanded} setExpanded={setExpanded}
                onCommentSent={fetchRequests} />
            ))}
          </div>
        </section>
      )}

      {others.length > 0 && (
        <section>
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Storico ({others.length})
          </h3>
          <div className="space-y-3">
            {others.map(req => (
              <RequestCard key={req.id} req={req}
                uploading={uploading} onUpload={handleUpload}
                expanded={expanded} setExpanded={setExpanded}
                onCommentSent={fetchRequests} />
            ))}
          </div>
        </section>
      )}

      {requests.length === 0 && (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nessun documento richiesto al momento.</p>
          <p className="text-gray-400 text-sm mt-1">
            Lo studio ti avviserà via email quando ci sarà qualcosa da caricare.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── RequestCard: stato commento isolato per card ─────────────────────────
function RequestCard({ req, uploading, onUpload, expanded, setExpanded, onCommentSent }: {
  req: any;
  uploading: string | null;
  onUpload: (id: string, file: File) => void;
  expanded: string | null;
  setExpanded: (id: string | null) => void;
  onCommentSent: () => void;
}) {
  // FIX: ogni card ha il suo stato commento — prima era condiviso nel parent
  const [comment, setComment] = useState('');

  const cfg    = STATUS_CONFIG[req.status as keyof typeof STATUS_CONFIG];
  const Icon   = cfg.icon;
  const isOpen = expanded === req.id;
  const canUpload = ['pending', 'rejected'].includes(req.status);

  const handleComment = async () => {
    if (!comment.trim()) return;
    try {
      await api.post(`/api/portal/requests/${req.id}/comments`, { body: comment });
      toast.success('Messaggio inviato');
      setComment('');
      onCommentSent();
    } catch (err: any) { toast.error(err.message); }
  };

  return (
    <div className={`bg-white rounded-xl border shadow-sm transition-all ${
      req.status === 'rejected' ? 'border-red-200' :
      req.status === 'approved' ? 'border-green-200' : 'border-gray-100'
    }`}>
      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-semibold text-gray-900">
                {req.docTypeLabel || req.docTypeCode}
              </h3>
              <span className="text-xs text-gray-500 font-mono bg-gray-100 px-2 py-0.5 rounded">
                {req.period}
              </span>
            </div>
            <div className="flex items-center gap-3 mt-2">
              <span className={`flex items-center gap-1 text-xs font-semibold px-2 py-1 rounded-full ${cfg.color}`}>
                <Icon className="w-3 h-3" />{cfg.label}
              </span>
              <DeadlineBadge
                deadline={req.deadline}
                status={req.status === 'approved' ? 'uploaded' : 'pending'}
              />
            </div>
            {req.status === 'rejected' && req.rejectionReason && (
              <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700">
                <strong>Motivazione rifiuto:</strong> {req.rejectionReason}
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            {canUpload && (
              <label className={`cursor-pointer bg-indigo-600 text-white px-4 py-2 rounded-lg
                text-sm font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2
                ${uploading === req.id ? 'opacity-60 cursor-not-allowed' : ''}`}>
                <Upload className="w-4 h-4" />
                {uploading === req.id ? 'Caricamento...' : req.status === 'rejected' ? 'Ricarica' : 'Carica'}
                <input type="file" className="hidden" disabled={uploading === req.id}
                  onChange={e => e.target.files?.[0] && onUpload(req.id, e.target.files[0])} />
              </label>
            )}
            <button onClick={() => setExpanded(isOpen ? null : req.id)}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg">
              {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>

      {isOpen && (
        <div className="border-t border-gray-100 p-5 bg-gray-50 rounded-b-xl space-y-3">
          {req.notes && (
            <p className="text-sm text-gray-600">
              <strong>Note dello studio:</strong> {req.notes}
            </p>
          )}
          {req.documentFilename && (
            <p className="text-sm text-gray-600">
              <strong>File caricato:</strong>{' '}
              {/* FIX: usa /api/portal/documents/:id/download non /api/documents */}
              <a
                href={`${API_BASE_URL}/api/portal/documents/${req.documentId}/download`}
                className="text-indigo-600 hover:underline"
                download
              >
                {req.documentFilename}
              </a>
            </p>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Scrivi un messaggio allo studio..."
              value={comment}
              onChange={e => setComment(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleComment()}
              className="flex-1 border rounded-lg px-3 py-2 text-sm"
            />
            <button
              onClick={handleComment}
              disabled={!comment.trim()}
              className="bg-gray-200 hover:bg-gray-300 disabled:opacity-50 px-3 py-2 rounded-lg text-sm font-medium"
            >
              <MessageSquare className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
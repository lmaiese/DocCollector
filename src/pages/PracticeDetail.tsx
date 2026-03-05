import React, { useEffect, useState } from 'react';
import { useRoute, Link } from 'wouter';
import { CheckCircle, XCircle, Clock, Eye, ArrowLeft,
         Upload, MessageSquare, AlertTriangle } from 'lucide-react';
import toast from 'react-hot-toast';
import { api } from '../api/index';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

const STATUS_ICON: Record<string, any> = {
  pending:      { icon: Clock,       color: 'text-yellow-500' },
  uploaded:     { icon: Eye,         color: 'text-blue-500' },
  under_review: { icon: Eye,         color: 'text-purple-500' },
  approved:     { icon: CheckCircle, color: 'text-green-500' },
  rejected:     { icon: XCircle,     color: 'text-red-500' },
};

export default function PracticeDetail() {
  const [, params]             = useRoute('/practices/:id');
  const { user }               = useAuth();
  const [practice, setPractice]= useState<any>(null);
  const [reviewing, setReviewing] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState<string | null>(null);

  const fetch = () => {
    if (!params?.id) return;
    api.get<any>(`/api/practices/${params.id}`).then(setPractice).catch(console.error);
  };

  useEffect(() => { fetch(); }, [params?.id]);

  const handleReview = async (requestId: string, action: 'approve' | 'reject') => {
    if (action === 'reject' && !rejectReason.trim()) {
      toast.error('Inserisci la motivazione del rifiuto'); return;
    }
    setReviewing(requestId);
    const tid = toast.loading(action === 'approve' ? 'Approvazione...' : 'Rifiuto...');
    try {
      await api.post(`/api/requests/${requestId}/review`, {
        action, rejection_reason: rejectReason,
      });
      toast.success(action === 'approve' ? 'Documento approvato' : 'Documento rifiutato', { id: tid });
      setShowRejectForm(null);
      setRejectReason('');
      fetch();
    } catch (err: any) {
      toast.error(err.message, { id: tid });
    } finally { setReviewing(null); }
  };

  if (!practice) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  const totalReqs    = practice.requests?.length || 0;
  const approvedReqs = practice.requests?.filter((r: any) => r.status === 'approved').length || 0;
  const progress     = totalReqs > 0 ? Math.round((approvedReqs / totalReqs) * 100) : 0;

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/practices"
          className="text-gray-500 hover:text-gray-700 flex items-center gap-1 text-sm">
          <ArrowLeft className="w-4 h-4" /> Pratiche
        </Link>
      </div>

      {/* Header pratica */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{practice.title}</h2>
            <p className="text-indigo-600 font-medium mt-1">{practice.client?.name}</p>
            {practice.notes && (
              <p className="text-sm text-gray-500 mt-2">{practice.notes}</p>
            )}
          </div>
          <div className="text-right">
            <p className="text-3xl font-bold text-gray-900">{progress}%</p>
            <p className="text-xs text-gray-500">{approvedReqs}/{totalReqs} completati</p>
          </div>
        </div>
        <div className="mt-4 h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              progress === 100 ? 'bg-green-500' :
              progress > 50   ? 'bg-blue-500'  : 'bg-yellow-500'
            }`}
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Lista richieste */}
      <div className="space-y-3">
        <h3 className="font-semibold text-gray-700">Documenti richiesti</h3>
        {practice.requests?.map((req: any) => {
          const cfg   = STATUS_ICON[req.status] || STATUS_ICON.pending;
          const Icon  = cfg.icon;
          const canReview = ['uploaded', 'under_review'].includes(req.status);
          const doc   = req.documents?.[0];

          return (
            <div key={req.id} className={`bg-white rounded-xl border shadow-sm p-5 ${
              req.status === 'rejected' ? 'border-red-200' :
              req.status === 'approved' ? 'border-green-100' : 'border-gray-100'
            }`}>
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <Icon className={`w-5 h-5 flex-shrink-0 ${cfg.color}`} />
                  <div>
                    <p className="font-medium text-gray-900">{req.docTypeCode}</p>
                    <p className="text-xs text-gray-500">Periodo {req.period}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {doc && (
                    <a href={`${API_BASE_URL}/api/documents/${doc.id}/download`}
                      className="text-sm text-indigo-600 hover:underline flex items-center gap-1" download>
                      📎 {doc.originalFilename}
                    </a>
                  )}

                  {canReview && user?.role !== 'client' && (
                    <>
                      <button
                        disabled={!!reviewing}
                        onClick={() => handleReview(req.id, 'approve')}
                        className="flex items-center gap-1 bg-green-50 text-green-700 border
                                   border-green-200 px-3 py-1.5 rounded-lg text-sm font-medium
                                   hover:bg-green-100 disabled:opacity-50">
                        <CheckCircle className="w-4 h-4" /> Approva
                      </button>
                      <button
                        disabled={!!reviewing}
                        onClick={() => setShowRejectForm(
                          showRejectForm === req.id ? null : req.id
                        )}
                        className="flex items-center gap-1 bg-red-50 text-red-700 border
                                   border-red-200 px-3 py-1.5 rounded-lg text-sm font-medium
                                   hover:bg-red-100 disabled:opacity-50">
                        <XCircle className="w-4 h-4" /> Rifiuta
                      </button>
                    </>
                  )}
                </div>
              </div>

              {/* Form rifiuto */}
              {showRejectForm === req.id && (
                <div className="mt-4 pt-4 border-t border-gray-100">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Motivazione rifiuto *
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={rejectReason}
                      onChange={e => setRejectReason(e.target.value)}
                      placeholder="es. File illeggibile, formato errato..."
                      className="flex-1 border rounded-lg px-3 py-2 text-sm"
                      autoFocus
                    />
                    <button
                      onClick={() => handleReview(req.id, 'reject')}
                      disabled={!rejectReason.trim() || !!reviewing}
                      className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm
                                 font-medium hover:bg-red-700 disabled:opacity-50">
                      Conferma rifiuto
                    </button>
                  </div>
                </div>
              )}

              {/* Motivazione rifiuto esistente */}
              {req.status === 'rejected' && req.rejectionReason && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded-lg p-3 text-sm text-red-700 flex gap-2">
                  <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                  <span><strong>Rifiutato:</strong> {req.rejectionReason}</span>
                </div>
              )}

              {/* Commenti */}
              {req.comments?.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-100 space-y-2">
                  {req.comments
                    .filter((c: any) => user?.role !== 'client' || c.visibleToClient)
                    .map((c: any) => (
                      <div key={c.id} className="flex gap-2 text-sm">
                        <span className="font-medium text-gray-700">{c.authorName}:</span>
                        <span className="text-gray-600">{c.body}</span>
                        {!c.visibleToClient && (
                          <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded ml-auto">
                            Solo staff
                          </span>
                        )}
                      </div>
                    ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

import React, { useEffect, useState } from 'react';
import { Download, FileText, Inbox } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { it } from 'date-fns/locale';
import toast from 'react-hot-toast';
import { api } from '../api/index';
import { API_BASE_URL } from '../config';

interface SharedDoc {
  id: string;
  originalFilename: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
  direction: string;
  docTypeCode: string | null;
  period: string | null;
}

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function PortalDocuments() {
  const [docs, setDocs]       = useState<SharedDoc[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get<SharedDoc[]>('/api/portal/documents')
      .then(setDocs)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleDownload = async (doc: SharedDoc) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API_BASE_URL}/api/portal/documents/${doc.id}/download`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Download fallito');
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement('a');
      a.href     = url;
      a.download = doc.originalFilename;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) { toast.error(err.message); }
  };

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Documenti Ricevuti</h2>
        <p className="text-gray-500 text-sm mt-1">
          Documenti elaborati dallo studio e condivisi con te (F24, buste paga, dichiarazioni, ecc.)
        </p>
      </div>

      {docs.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 p-12 text-center">
          <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Nessun documento ricevuto al momento.</p>
          <p className="text-gray-400 text-sm mt-1">
            Lo studio condividerà qui i documenti elaborati per te.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden shadow-sm">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="p-4 font-medium text-gray-500">Documento</th>
                <th className="p-4 font-medium text-gray-500 hidden md:table-cell">Periodo</th>
                <th className="p-4 font-medium text-gray-500 hidden md:table-cell">Dimensione</th>
                <th className="p-4 font-medium text-gray-500">Data</th>
                <th className="p-4 font-medium text-gray-500">Scarica</th>
              </tr>
            </thead>
            <tbody>
              {docs.map(doc => (
                <tr key={doc.id} className="border-b border-gray-100 hover:bg-gray-50">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 bg-indigo-50 rounded-lg flex items-center justify-center flex-shrink-0">
                        <FileText className="w-4 h-4 text-indigo-600" />
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-sm leading-tight">
                          {doc.originalFilename}
                        </p>
                        {doc.docTypeCode && (
                          <p className="text-xs text-gray-400 mt-0.5">{doc.docTypeCode}</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-gray-600 font-mono text-xs hidden md:table-cell">
                    {doc.period || '—'}
                  </td>
                  <td className="p-4 text-gray-400 text-xs hidden md:table-cell">
                    {formatBytes(doc.sizeBytes)}
                  </td>
                  <td className="p-4 text-gray-500 text-xs">
                    {format(parseISO(doc.createdAt), 'd MMM yyyy', { locale: it })}
                  </td>
                  <td className="p-4">
                    <button
                      onClick={() => handleDownload(doc)}
                      className="flex items-center gap-1.5 text-indigo-600 hover:text-indigo-800
                                 font-medium text-xs hover:bg-indigo-50 px-2 py-1.5 rounded-lg
                                 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Scarica
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
import React, { useEffect, useState } from 'react';
import { Plus, Upload, CheckCircle, Clock, Download, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';

interface Request {
  id: string;
  client_name: string;
  period: string;
  type: string;
  status: 'pending' | 'uploaded';
  created_at: string;
  document_id?: string;
  document_filename?: string;
}

interface Client {
  id: string;
  name: string;
}

export default function Requests() {
  const [requests, setRequests] = useState<Request[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ client_id: '', period: '', type: 'FATT' });
  const [uploadingId, setUploadingId] = useState<string | null>(null);

  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('user') || '{}');
    setUser(storedUser);
    fetchRequests(storedUser);
    fetchClients();
  }, []);

  const fetchRequests = (currentUser: any) => {
    fetch('/api/requests', {
      headers: { 'x-user-id': currentUser.id }
    })
      .then(res => res.json())
      .then(data => setRequests(data))
      .catch(err => console.error(err));
  };

  const fetchClients = () => {
    fetch('/api/clients')
      .then(res => res.json())
      .then(data => setClients(data))
      .catch(err => console.error(err));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/requests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ client_id: '', period: '', type: 'FATT' });
        fetchRequests(user);
        toast.success('Request created successfully');
      } else {
        toast.error('Failed to create request');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error creating request');
    }
  };

  const handleUpload = async (requestId: string, file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('request_id', requestId);

    setUploadingId(requestId);
    const toastId = toast.loading('Uploading document...');
    
    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });
      if (res.ok) {
        fetchRequests(user);
        toast.success('Document uploaded successfully', { id: toastId });
      } else {
        const data = await res.json();
        toast.error(data.error || 'Upload failed', { id: toastId });
      }
    } catch (err) {
      console.error(err);
      toast.error('Upload error', { id: toastId });
    } finally {
      setUploadingId(null);
    }
  };

  const handleDeleteRequest = async (id: string) => {
    if (!confirm('Are you sure you want to delete this request?')) return;
    try {
      const res = await fetch(`/api/requests/${id}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        fetchRequests(user);
        toast.success('Request deleted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Delete error');
    }
  };

  const handleDeleteDocument = async (docId: string) => {
    if (!confirm('Are you sure you want to delete this document? The request will revert to pending.')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': user.id }
      });
      if (res.ok) {
        fetchRequests(user);
        toast.success('Document deleted');
      } else {
        const data = await res.json();
        toast.error(data.error || 'Delete failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Delete error');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Document Requests</h2>
        {user?.role !== 'client' && (
          <button 
            onClick={() => setShowForm(true)}
            className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Request
          </button>
        )}
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold mb-4">Create Request</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              className="border p-2 rounded-lg"
              value={formData.client_id}
              onChange={e => setFormData({...formData, client_id: e.target.value})}
              required
            >
              <option value="">Select Client</option>
              {clients.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <input
              type="text"
              placeholder="Period (YYYYMM)"
              className="border p-2 rounded-lg"
              value={formData.period}
              onChange={e => setFormData({...formData, period: e.target.value})}
              required
              pattern="\d{6}"
              title="YYYYMM format (e.g., 202310)"
            />
            <select
              className="border p-2 rounded-lg"
              value={formData.type}
              onChange={e => setFormData({...formData, type: e.target.value})}
              required
            >
              <option value="FATT">Invoices (FATT)</option>
              <option value="CUD">Tax Form (CUD)</option>
              <option value="BANK">Bank Statement (BANK)</option>
              <option value="OTHER">Other</option>
            </select>
            <div className="md:col-span-3 flex justify-end gap-2">
              <button 
                type="button" 
                onClick={() => setShowForm(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-lg"
              >
                Cancel
              </button>
              <button 
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Create Request
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-500">Client</th>
              <th className="p-4 font-medium text-gray-500">Period</th>
              <th className="p-4 font-medium text-gray-500">Type</th>
              <th className="p-4 font-medium text-gray-500">Status</th>
              <th className="p-4 font-medium text-gray-500">Action</th>
            </tr>
          </thead>
          <tbody>
            {requests.map(req => (
              <tr key={req.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{req.client_name}</td>
                <td className="p-4 text-gray-600 font-mono">{req.period}</td>
                <td className="p-4 text-gray-600">
                  <span className="px-2 py-1 bg-gray-100 rounded text-xs font-semibold">{req.type}</span>
                </td>
                <td className="p-4">
                  {req.status === 'uploaded' ? (
                    <span className="flex items-center gap-1 text-green-600 text-sm font-medium">
                      <CheckCircle className="w-4 h-4" /> Uploaded
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-yellow-600 text-sm font-medium">
                      <Clock className="w-4 h-4" /> Pending
                    </span>
                  )}
                </td>
                <td className="p-4">
                  {req.status === 'uploaded' && req.document_id ? (
                    <div className="flex items-center gap-3">
                      <a 
                        href={`/api/documents/${req.document_id}/download`}
                        className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-sm font-medium"
                        download
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </a>
                      <button
                        onClick={() => handleDeleteDocument(req.document_id!)}
                        className="text-red-500 hover:text-red-700"
                        title="Delete Document"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    req.status === 'pending' && (
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer bg-blue-50 text-blue-600 hover:bg-blue-100 px-3 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 w-fit transition-colors">
                        <Upload className="w-4 h-4" />
                        {uploadingId === req.id ? 'Uploading...' : 'Upload'}
                        <input 
                          type="file" 
                          className="hidden" 
                          onChange={(e) => {
                            if (e.target.files?.[0]) {
                              handleUpload(req.id, e.target.files[0]);
                            }
                          }}
                          disabled={uploadingId === req.id}
                        />
                      </label>
                      {user?.role !== 'client' && (
                        <button
                          onClick={() => handleDeleteRequest(req.id)}
                          className="text-gray-400 hover:text-red-600 transition-colors"
                          title="Delete Request"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    )
                  )}
                </td>
              </tr>
            ))}
            {requests.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500">No requests found. Create one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

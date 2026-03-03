import React, { useEffect, useState } from 'react';
import { Plus, Search } from 'lucide-react';
import toast from 'react-hot-toast';
import { API_BASE_URL } from '../config';

interface Client {
  id: string;
  name: string;
  internal_code: string;
  tax_id: string;
}

export default function Clients() {
  const [clients, setClients] = useState<Client[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', internal_code: '', tax_id: '' });

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = () => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (!user.id) return;

    fetch(`${API_BASE_URL}/api/clients`, {
      headers: { 'x-user-id': user.id }
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch clients');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setClients(data);
        } else {
          console.error('Clients data is not an array:', data);
          setClients([]);
        }
      })
      .catch(err => {
        console.error(err);
        toast.error('Failed to load clients');
      });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE_URL}/api/clients`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      if (res.ok) {
        setShowForm(false);
        setFormData({ name: '', internal_code: '', tax_id: '' });
        fetchClients();
        toast.success('Client added successfully');
      } else {
        toast.error('Failed to add client');
      }
    } catch (err) {
      console.error(err);
      toast.error('Error adding client');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-800">Clients</h2>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add Client
        </button>
      </div>

      {showForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 mb-6">
          <h3 className="text-lg font-semibold mb-4">New Client</h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Client Name"
              className="border p-2 rounded-lg"
              value={formData.name}
              onChange={e => setFormData({...formData, name: e.target.value})}
              required
            />
            <input
              type="text"
              placeholder="Internal Code"
              className="border p-2 rounded-lg"
              value={formData.internal_code}
              onChange={e => setFormData({...formData, internal_code: e.target.value})}
            />
            <input
              type="text"
              placeholder="Tax ID (CF/P.IVA)"
              className="border p-2 rounded-lg"
              value={formData.tax_id}
              onChange={e => setFormData({...formData, tax_id: e.target.value})}
              required
            />
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
                Save Client
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-500">Name</th>
              <th className="p-4 font-medium text-gray-500">Code</th>
              <th className="p-4 font-medium text-gray-500">Tax ID</th>
            </tr>
          </thead>
          <tbody>
            {clients.map(client => (
              <tr key={client.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 font-medium text-gray-900">{client.name}</td>
                <td className="p-4 text-gray-600">{client.internal_code}</td>
                <td className="p-4 text-gray-600 font-mono text-sm">{client.tax_id}</td>
              </tr>
            ))}
            {clients.length === 0 && (
              <tr>
                <td colSpan={3} className="p-8 text-center text-gray-500">No clients found. Add one to get started.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

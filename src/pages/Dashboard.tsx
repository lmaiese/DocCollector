import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, AlertCircle } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ pendingRequests: 0, uploadedDocs: 0, missingDocs: 0 });

  useEffect(() => {
    fetch('/api/dashboard')
      .then(res => res.json())
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Dashboard</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-yellow-100 rounded-lg text-yellow-600">
            <AlertCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Pending Requests</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-green-100 rounded-lg text-green-600">
            <CheckCircle className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Uploaded Documents</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.uploadedDocs}</h3>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
          <div className="p-3 bg-red-100 rounded-lg text-red-600">
            <FileText className="w-8 h-8" />
          </div>
          <div>
            <p className="text-sm text-gray-500 font-medium">Missing Documents</p>
            <h3 className="text-2xl font-bold text-gray-900">{stats.missingDocs}</h3>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Recent Activity</h3>
        <p className="text-gray-500 text-sm">No recent activity to show.</p>
      </div>
    </div>
  );
}

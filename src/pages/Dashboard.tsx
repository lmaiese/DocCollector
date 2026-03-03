import React, { useEffect, useState } from 'react';
import { FileText, CheckCircle, AlertCircle, Building, Users, Database } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { API_BASE_URL } from '../config';

export default function Dashboard({ user }: { user: any }) {
  const [stats, setStats] = useState<any>({ pendingRequests: 0, uploadedDocs: 0, missingDocs: 0, chartData: [] });

  useEffect(() => {
    if (!user) return;
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/dashboard`, {
      headers: { 
        'Authorization': `Bearer ${token}`,
        'x-user-id': user.id // Keep for backward compat if needed, but Auth header is primary
      }
    })
      .then(res => {
        if (res.ok) return res.json();
        throw new Error('Failed to fetch dashboard stats');
      })
      .then(data => setStats(data))
      .catch(err => console.error(err));
  }, [user]);

  if (stats.isSuperAdmin) {
    return (
      <div className="space-y-6">
        <h2 className="text-2xl font-bold text-gray-800">System Overview</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-purple-100 rounded-lg text-purple-600">
              <Building className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Active Tenants</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.pendingRequests}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-blue-100 rounded-lg text-blue-600">
              <Users className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Users</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.missingDocs}</h3>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100 flex items-center gap-4">
            <div className="p-3 bg-green-100 rounded-lg text-green-600">
              <Database className="w-8 h-8" />
            </div>
            <div>
              <p className="text-sm text-gray-500 font-medium">Total Documents</p>
              <h3 className="text-2xl font-bold text-gray-900">{stats.uploadedDocs}</h3>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-100">
          <h3 className="text-lg font-semibold text-gray-800 mb-4">System Health</h3>
          <p className="text-gray-500">All systems operational. Database size: Normal.</p>
        </div>
      </div>
    );
  }

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
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Request Activity (Last 7 Days)</h3>
        <div className="h-64">
          {stats.chartData && stats.chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#4f46e5" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-gray-500">
              No activity data available.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

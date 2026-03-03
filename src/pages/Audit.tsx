import React, { useEffect, useState } from 'react';
import { History } from 'lucide-react';
import { format } from 'date-fns';
import { API_BASE_URL } from '../config';

interface AuditLog {
  id: string;
  user_name: string;
  action: string;
  details: string;
  timestamp: string;
}

export default function Audit() {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    const token = localStorage.getItem('token');
    fetch(`${API_BASE_URL}/api/audit`, {
      headers: { 
        'Authorization': `Bearer ${token}`
      }
    })
      .then(res => res.json())
      .then(data => setLogs(data))
      .catch(err => console.error(err));
  }, []);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Audit Log</h2>
      
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="p-4 font-medium text-gray-500">Time</th>
              <th className="p-4 font-medium text-gray-500">User</th>
              <th className="p-4 font-medium text-gray-500">Action</th>
              <th className="p-4 font-medium text-gray-500">Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map(log => (
              <tr key={log.id} className="border-b border-gray-100 hover:bg-gray-50">
                <td className="p-4 text-gray-500 text-sm">
                  {format(new Date(log.timestamp), 'MMM d, yyyy HH:mm')}
                </td>
                <td className="p-4 font-medium text-gray-900">{log.user_name || 'System'}</td>
                <td className="p-4 text-gray-600 font-mono text-sm">{log.action}</td>
                <td className="p-4 text-gray-600">{log.details}</td>
              </tr>
            ))}
            {logs.length === 0 && (
              <tr>
                <td colSpan={4} className="p-8 text-center text-gray-500">No logs found.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

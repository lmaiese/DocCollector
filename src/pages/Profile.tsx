import React from 'react';
import { User, Mail, Building, Shield } from 'lucide-react';

export default function Profile({ user }: { user: any }) {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">My Profile</h2>
      
      <div className="bg-white p-8 rounded-xl shadow-sm border border-gray-100 max-w-2xl">
        <div className="flex items-center gap-6 mb-8">
          <div className="w-20 h-20 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600">
            <User className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-gray-900">{user.name}</h3>
            <p className="text-gray-500">{user.email}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Shield className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Role</span>
            </div>
            <p className="font-semibold text-gray-900 capitalize">{user.role}</p>
          </div>

          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-2 text-gray-500 mb-1">
              <Building className="w-4 h-4" />
              <span className="text-xs font-medium uppercase tracking-wider">Tenant ID</span>
            </div>
            <p className="font-semibold text-gray-900 font-mono text-sm">{user.tenant_id}</p>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-gray-100">
          <h4 className="font-semibold text-gray-900 mb-4">Security</h4>
          <button className="text-indigo-600 hover:text-indigo-800 font-medium text-sm">
            Change Password
          </button>
        </div>
      </div>
    </div>
  );
}

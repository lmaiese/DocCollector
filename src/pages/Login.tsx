import React, { useState } from 'react';
import { LogIn, Users, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { useAuth } from '../context/AuthContext';
import { API_BASE_URL } from '../config';

export default function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');

  const handleLogin = async (tokenOrEmail: string) => {
    const toastId = toast.loading('Accesso in corso...');
    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenOrEmail }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Login fallito');
      }
      const data = await res.json();
      toast.success('Accesso effettuato!', { id: toastId });
      login(data.user, data.token);
    } catch (err: any) {
      toast.error(err.message, { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <LogIn className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">DocCollector+</h1>
        <p className="text-gray-500 mb-8">Accedi per gestire i documenti in sicurezza.</p>

        <div className="space-y-4">
          <div className="text-left">
            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
            <input
              type="email"
              className="w-full rounded-lg border border-gray-300 p-2 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              placeholder="es. admin@studiodemo.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && email && handleLogin(email)}
            />
          </div>

          <button
            onClick={() => handleLogin('mock-token')}
            className="w-full flex items-center justify-center gap-3 bg-indigo-600 text-white py-3 px-4 rounded-lg hover:bg-indigo-700 transition-colors font-medium"
          >
            <img
              src="https://www.svgrepo.com/show/475656/google-color.svg"
              alt="Google"
              className="w-5 h-5 bg-white rounded-full p-0.5"
            />
            Accedi come Admin (Demo)
          </button>

          <button
            onClick={() => email ? handleLogin(email) : toast.error("Inserisci un'email")}
            className="w-full flex items-center justify-center gap-3 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Users className="w-5 h-5" />
            Accedi con Email
          </button>

          <button
            onClick={() => handleLogin('superadmin-token')}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors font-medium"
          >
            <ShieldAlert className="w-5 h-5" />
            Super Admin (Demo)
          </button>
        </div>

        <p className="mt-8 text-xs text-gray-400">
          Demo: admin@studiodemo.com · dipendente@studiodemo.com
        </p>
      </div>
    </div>
  );
}

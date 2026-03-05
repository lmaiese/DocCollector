import React, { useState } from 'react';
import { FileText, Mail, ArrowRight, CheckCircle } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '../config';

export default function ClientLogin() {
  const [email, setEmail]     = useState('');
  const [sent, setSent]       = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await fetch(`${API_BASE_URL}/api/auth/magic-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      setSent(true);
    } catch {
      toast.error('Errore di rete. Riprova.');
    } finally {
      setLoading(false);
    }
  };

  if (sent) return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 flex items-center justify-center p-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-3">Email inviata!</h2>
        <p className="text-gray-500 mb-2">
          Controlla la tua casella <strong>{email}</strong>.
        </p>
        <p className="text-gray-400 text-sm">
          Il link è valido per 72 ore. Se non lo trovi, controlla lo spam.
        </p>
        <button onClick={() => setSent(false)}
          className="mt-6 text-indigo-600 hover:underline text-sm">
          Usa un'altra email
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-gray-100 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <FileText className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Area Clienti</h1>
          <p className="text-gray-500 mt-2 text-sm">
            Inserisci la tua email per ricevere il link di accesso sicuro.
            Nessuna password richiesta.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              La tua email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="email" required value={email}
                onChange={e => setEmail(e.target.value)}
                placeholder="mario.rossi@azienda.it"
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg
                           focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none"
              />
            </div>
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full bg-indigo-600 text-white py-3 px-4 rounded-lg font-medium
                       hover:bg-indigo-700 transition-colors disabled:opacity-60
                       flex items-center justify-center gap-2"
          >
            {loading ? 'Invio in corso...' : <>Invia link di accesso <ArrowRight className="w-4 h-4" /></>}
          </button>
        </form>

        <p className="text-center text-xs text-gray-400 mt-6">
          Sei lo staff dello studio?{' '}
          <a href="/login" className="text-indigo-600 hover:underline">Accedi qui</a>
        </p>
      </div>
    </div>
  );
}
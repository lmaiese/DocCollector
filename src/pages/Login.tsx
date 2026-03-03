import React, { useState } from 'react';
import { LogIn, Users, ShieldAlert } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';
import { API_BASE_URL } from '../config';

interface LoginProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export default function Login({ onLoginSuccess }: LoginProps) {
  const [email, setEmail] = useState('');

  const handleLogin = async (role: 'admin' | 'employee' | 'superadmin' | 'mock') => {
    const toastId = toast.loading('Signing in...');
    
    // For demo purposes, we simulate Google Auth by sending a "token"
    // In a real app, this would be the ID Token from Google Sign-In
    let token = '';
    
    if (role === 'mock') {
        // Use the hardcoded admin email
        token = 'mock-token'; 
    } else if (role === 'superadmin') {
        token = 'superadmin-token';
    } else {
        // Use the entered email or a default one for testing
        token = email || `test-${role}@example.com`;
    }

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token })
      });

      if (res.ok) {
        const data = await res.json();
        toast.success('Signed in successfully', { id: toastId });
        onLoginSuccess(data.user, data.token);
      } else {
        const errData = await res.json();
        throw new Error(errData.error || 'Login failed');
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err.message, { id: toastId });
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
      <Toaster position="top-right" />
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
        <div className="mb-6 flex justify-center">
          <div className="w-16 h-16 bg-indigo-100 rounded-full flex items-center justify-center">
            <LogIn className="w-8 h-8 text-indigo-600" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome to DocCollector+</h1>
        <p className="text-gray-500 mb-8">Sign in to manage your documents securely.</p>
        
        <div className="space-y-4">
            <div className="text-left">
                <label className="block text-sm font-medium text-gray-700 mb-1">Email (Simulate Google Login)</label>
                <input 
                    type="email" 
                    className="w-full rounded-lg border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 p-2 border"
                    placeholder="Enter email to simulate login"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
            </div>

          <button 
            onClick={() => handleLogin('mock')}
            className="w-full flex items-center justify-center gap-3 bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 transition-colors font-medium"
          >
            <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5 bg-white rounded-full p-0.5" />
            Sign in as Demo Admin
          </button>
          
          <button 
            onClick={() => handleLogin('employee')}
            className="w-full flex items-center justify-center gap-3 bg-green-600 text-white py-3 px-4 rounded-lg hover:bg-green-700 transition-colors font-medium"
          >
            <Users className="w-5 h-5" />
            Sign in with Email (Simulated)
          </button>

          <button 
            onClick={() => handleLogin('superadmin')}
            className="w-full flex items-center justify-center gap-3 bg-gray-800 text-white py-3 px-4 rounded-lg hover:bg-gray-900 transition-colors font-medium"
          >
            <ShieldAlert className="w-5 h-5" />
            Sign in as Super Admin (Demo)
          </button>
        </div>
        
        <p className="mt-8 text-xs text-gray-400">
          By signing in, you agree to our Terms of Service and Privacy Policy.
        </p>
      </div>
    </div>
  );
}

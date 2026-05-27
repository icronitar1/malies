import React, { useState } from 'react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (email: string, password: string) => Promise<void>;
}

export default function LoginModal({ isOpen, onClose, onLogin, onRegister }: Props) {
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login') {
      await onLogin(email, password);
    } else {
      await onRegister(email, password);
    }
    onClose();
    setEmail('');
    setPassword('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-6">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-extrabold text-red-950">
            {authMode === 'login' ? 'Accedi' : 'Registrati'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 font-bold">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Password</label>
            <input
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-200 rounded-lg p-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-900"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 border border-gray-200 text-gray-700 py-2.5 rounded-lg text-sm font-bold hover:bg-gray-50">Annulla</button>
            <button type="submit" className="flex-1 bg-red-950 text-white py-2.5 rounded-lg text-sm font-bold hover:bg-red-900">
              {authMode === 'login' ? 'Accedi' : 'Registrati'}
            </button>
          </div>
        </form>

        <div className="text-center text-xs text-gray-500">
          {authMode === 'login' ? (
            <p>Non hai un account? <button onClick={() => setAuthMode('register')} className="text-red-950 font-bold underline">Registrati</button></p>
          ) : (
            <p>Hai già un account? <button onClick={() => setAuthMode('login')} className="text-red-950 font-bold underline">Accedi</button></p>
          )}
        </div>
      </div>
    </div>
  );
}

import React from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';

export default function NotFound() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10">
        {user && <Navbar />}

        <div className="flex flex-col items-center justify-center py-20 text-center space-y-6">
          <div className="w-20 h-20 rounded-3xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-4xl shadow-xl shadow-indigo-600/10">
            🔍
          </div>

          <div className="space-y-2 max-w-md">
            <h1 className="text-4xl font-black text-white tracking-tight">404 — Page Not Found</h1>
            <p className="text-sm text-slate-400">
              The page or resource you are trying to access doesn't exist or may have been relocated.
            </p>
          </div>

          <Link
            to={user ? '/dashboard' : '/login'}
            className="px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-2"
          >
            ← Back to {user ? 'Dashboard' : 'Login'}
          </Link>
        </div>
      </div>
    </div>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Button } from './ui/button';
import NotificationBell from './NotificationBell';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-semibold tracking-wider transition-all duration-200 ${
      isActive
        ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30 font-bold'
        : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
    }`;

  const isAdminOrSuper = user?.role && ['admin', 'super_admin'].includes(user.role);
  const isAdminActive = location.pathname.startsWith('/admin/');

  return (
    <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 sm:px-6 rounded-2xl border border-slate-800 bg-slate-900/80 backdrop-blur-xl shadow-xl mb-8 relative z-40">
      {/* Brand & Nav Links */}
      <div className="flex flex-wrap items-center gap-6">
        <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-lg shadow-lg shadow-indigo-600/30">
            O
          </div>
          <div>
            <h1 className="text-base font-extrabold tracking-tight text-white">
              OMVIK CRM
            </h1>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400">
              Real-Estate CRM
            </p>
          </div>
        </div>

        <nav className="flex flex-wrap items-center gap-1.5 sm:gap-2 border-l border-slate-800 pl-4 sm:pl-6">
          <NavLink to="/dashboard" className={navLinkClass}>
            Dashboard
          </NavLink>
          <NavLink
            to="/leads"
            className={({ isActive }) =>
              navLinkClass({ isActive: isActive && !location.pathname.startsWith('/leads/') })
            }
          >
            Leads List
          </NavLink>
          <NavLink to="/pipeline" className={navLinkClass}>
            📋 Pipeline
          </NavLink>
          <NavLink to="/followups" className={navLinkClass}>
            📅 Follow-ups
          </NavLink>
          <NavLink to="/site-visits" className={navLinkClass}>
            🏡 Site Visits
          </NavLink>

          {/* ADMIN SECTION DROPDOWN (ONLY VISIBLE TO ADMIN & SUPER_ADMIN) */}
          {isAdminOrSuper && (
            <div className="relative inline-block text-left" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setIsAdminOpen(!isAdminOpen)}
                className={`px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl text-xs font-bold tracking-wider transition-all duration-200 flex items-center gap-1.5 cursor-pointer border ${
                  isAdminActive
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-lg shadow-amber-500/10'
                    : 'bg-slate-800/80 text-slate-200 border-slate-700 hover:bg-slate-750'
                }`}
              >
                <span>⚙️ Admin Desk</span>
                <span className="text-[10px]">▼</span>
              </button>

              {isAdminOpen && (
                <div className="absolute left-0 mt-2 w-56 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
                  <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/60 mb-1">
                    Admin Management
                  </div>

                  <NavLink
                    to="/admin/projects"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>🏢</span> Real-Estate Projects
                  </NavLink>

                  <NavLink
                    to="/admin/users"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>👥</span> User & Employee Directory
                  </NavLink>

                  <NavLink
                    to="/admin/teams"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>🛡️</span> Teams & Sales Pods
                  </NavLink>

                  <NavLink
                    to="/admin/import"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>📥</span> Bulk Lead Import
                  </NavLink>

                  <NavLink
                    to="/admin/reports"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>📊</span> Executive Reports
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* User Info & Actions */}
      <div className="flex items-center gap-4">
        <div className="hidden md:flex items-center gap-2 text-right">
          <div>
            <p className="text-xs font-bold text-slate-100">{user?.name}</p>
            <p className="text-[10px] font-mono text-slate-400">{user?.email}</p>
          </div>
          <span className="px-2 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
            {user?.role}
          </span>
        </div>

        <NotificationBell />

        <Button
          variant="outline"
          onClick={handleLogout}
          className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 text-xs h-9 px-3"
        >
          Sign Out
        </Button>
      </div>
    </header>
  );
}

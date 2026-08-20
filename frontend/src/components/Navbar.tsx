import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import useAuth from '../hooks/useAuth';
import { Button } from './ui/button';
import NotificationBell from './NotificationBell';
import { searchGlobal } from '../api/search';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation & Dropdown State
  const [isAdminOpen, setIsAdminOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Global Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setIsSearchOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await searchGlobal(searchQuery);
        setSearchResults(res.results || []);
        setIsSearchOpen(true);
      } catch (err) {
        console.error(err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userDropdownRef = useRef<HTMLDivElement>(null);

  const handleLogout = async () => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem('omvik_token');
    }
    await logout();
    navigate('/login');
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsAdminOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
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

  const isAdminOrSuper = user?.role && ['admin', 'super_admin', 'director'].includes(user.role);
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

        {/* Global Search Input */}
        <div className="relative min-w-[220px] sm:min-w-[280px]">
          <input
            type="text"
            placeholder="🔍 Search name, phone, lead..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
            className="w-full h-9 px-3.5 text-xs bg-slate-950 border border-slate-800 rounded-xl text-slate-100 placeholder-slate-500 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
          />

          {isSearchOpen && (
            <div className="absolute top-11 left-0 w-80 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-2xl py-2 z-50 max-h-80 overflow-y-auto space-y-1">
              {isSearching ? (
                <div className="p-3 text-xs text-slate-400 text-center animate-pulse">Searching CRM records...</div>
              ) : searchResults.length === 0 ? (
                <div className="p-3 text-xs text-slate-400 text-center">No matching leads or customers found.</div>
              ) : (
                searchResults.map((item) => (
                  <div
                    key={`${item.type}-${item.id}`}
                    onClick={() => {
                      setIsSearchOpen(false);
                      setSearchQuery('');
                      navigate(item.link);
                    }}
                    className="p-2.5 px-3 hover:bg-slate-800/80 cursor-pointer transition-colors border-b border-slate-800/40 last:border-0"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-100 truncate">{item.label}</span>
                      <span className="text-[9px] uppercase font-bold px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300">
                        {item.type}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5 font-mono truncate">{item.sublabel}</p>
                  </div>
                ))
              )}
            </div>
          )}
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
          <NavLink
            to="/customers"
            className={({ isActive }) =>
              navLinkClass({ isActive: isActive && !location.pathname.startsWith('/customers/') })
            }
          >
            👥 Customers
          </NavLink>
          <NavLink to="/pipeline" className={navLinkClass}>
            📋 Pipeline
          </NavLink>
          <NavLink to="/followups" className={navLinkClass}>
            📅 Follow-ups
          </NavLink>
          <NavLink to="/daily-report" className={navLinkClass}>
            📝 EOD Report
          </NavLink>
          <NavLink to="/site-visits" className={navLinkClass}>
            🏡 Site Visits
          </NavLink>
          <NavLink to="/performance" className={navLinkClass}>
            📊 My Performance
          </NavLink>

          {/* ADMIN SECTION DROPDOWN (ONLY VISIBLE TO ADMIN, SUPER_ADMIN & DIRECTOR) */}
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

                  <NavLink
                    to="/admin/data-quality"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>🛡️</span> Data Quality Centre
                  </NavLink>

                  <NavLink
                    to="/admin/duplicates"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>🚫</span> Duplicate Monitor
                  </NavLink>

                  <NavLink
                    to="/admin/flagged-reports"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>🚨</span> Flagged EOD Reports
                  </NavLink>
                </div>
              )}
            </div>
          )}
        </nav>
      </div>

      {/* User Profile Dropdown Menu & Notifications (Available to EVERY role) */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="relative inline-block text-left" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 px-2.5 rounded-xl border border-slate-800 bg-slate-900/80 hover:bg-slate-800/80 transition-all cursor-pointer shadow-md"
          >
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-600/20">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left pr-1">
              <span className="text-xs font-bold text-slate-100 leading-tight">{user?.name}</span>
              <span className="text-[10px] font-mono text-indigo-400 font-bold leading-tight">
                {user?.employeeId || user?.role?.toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400">▼</span>
          </button>

          {isUserMenuOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-2xl py-2 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-1">
              <div className="px-3 py-1.5 border-b border-slate-800/60 mb-1">
                <p className="text-xs font-bold text-slate-100 truncate">{user?.name}</p>
                <div className="flex items-center justify-between mt-0.5">
                  <span className="text-[10px] font-mono text-indigo-400 font-bold">{user?.employeeId || '—'}</span>
                  <span className="text-[9px] uppercase font-bold text-slate-400">{user?.role?.replace('_', ' ')}</span>
                </div>
              </div>

              <NavLink
                to="/profile"
                onClick={() => setIsUserMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                    isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span>👤</span> My Profile & ID
              </NavLink>

              <NavLink
                to="/performance"
                onClick={() => setIsUserMenuOpen(false)}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                    isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`
                }
              >
                <span>📊</span> My Performance
              </NavLink>

              <button
                onClick={() => {
                  setIsUserMenuOpen(false);
                  handleLogout();
                }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg mx-1 text-left transition-colors cursor-pointer"
              >
                <span>🚪</span> Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

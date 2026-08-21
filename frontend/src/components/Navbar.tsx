import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Home,
  User,
  BarChart3,
  Calendar,
  FileText,
  Palmtree,
  Settings,
  KeyRound,
  LogOut,
  Flame,
  ShieldCheck,
  ChevronRight,
  Sparkles,
  Users,
  Building2,
  Inbox,
  CheckSquare
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
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
          <NavLink to="/leave" className={navLinkClass}>
            🌴 Leave & SLA
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
                    to="/admin/employee-history"
                    onClick={() => setIsAdminOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg mx-1 transition-colors ${
                        isActive ? 'bg-indigo-600 text-white font-bold' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`
                    }
                  >
                    <span>📈</span> Employee History
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

      {/* USER PROFILE FLYOUT DRAWER (MATCHING PINTEREST SLEEK GLASS REFERENCE DESIGN) */}
      <div className="flex items-center gap-3">
        <NotificationBell />

        <div className="relative inline-block text-left" ref={userDropdownRef}>
          <button
            type="button"
            onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
            className="flex items-center gap-2.5 p-1.5 px-3 rounded-2xl border border-slate-800/80 bg-slate-900/90 hover:bg-slate-800/80 transition-all cursor-pointer shadow-lg hover:border-indigo-500/40 group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md shadow-indigo-600/30 group-hover:scale-105 transition-transform">
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="hidden md:flex flex-col text-left pr-1">
              <span className="text-xs font-bold text-slate-100 leading-tight">{user?.name}</span>
              <span className="text-[10px] font-mono text-indigo-400 font-bold leading-tight">
                {user?.employeeId || user?.role?.toUpperCase()}
              </span>
            </div>
            <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">▼</span>
          </button>

          {/* SLEEK PINTEREST-STYLE GLASS PROFILE DRAWER */}
          <AnimatePresence>
            {isUserMenuOpen && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.2 }}
                className="absolute right-0 mt-3 w-80 rounded-[28px] bg-[#090d19]/95 border border-slate-800/90 shadow-[0_15px_50px_rgba(0,0,0,0.8)] backdrop-blur-3xl p-4 z-50 space-y-3"
              >
                {/* 1. PROFILE HEADER CARD */}
                <div className="p-3.5 rounded-2xl bg-gradient-to-r from-slate-900/90 via-slate-900/50 to-indigo-950/40 border border-slate-800/80 flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-0.5 shadow-lg shadow-indigo-600/30 flex-shrink-0">
                    <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-white text-base">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </div>
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="text-xs font-bold text-white truncate">{user?.name}</h4>
                    <p className="text-[11px] text-slate-400 truncate">{user?.email}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                        {user?.employeeId || 'SYS'}
                      </span>
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-800 text-slate-300 uppercase tracking-wider">
                        {user?.role?.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* 2. PILL-SHAPED NAVIGATION MENU ITEMS (MATCHING PINTEREST UI) */}
                <div className="space-y-1.5 pt-1">
                  
                  {/* Home / Dashboard */}
                  <NavLink
                    to="/dashboard"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-white/20'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 text-indigo-400">
                        <Home className="w-4 h-4" />
                      </div>
                      <span>Home Dashboard</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </NavLink>

                  {/* Profile */}
                  <NavLink
                    to="/profile"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-white/20'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 text-indigo-400">
                        <User className="w-4 h-4" />
                      </div>
                      <span>Your Profile & ID</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </NavLink>

                  {/* Performance */}
                  <NavLink
                    to="/performance"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-white/20'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 text-indigo-400">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                      <span>My Performance</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </NavLink>

                  {/* Followups */}
                  <NavLink
                    to="/followups"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-white/20'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 text-indigo-400">
                        <Calendar className="w-4 h-4" />
                      </div>
                      <span>My Scheduled Follow-ups</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </NavLink>

                  {/* Daily EOD Report */}
                  <NavLink
                    to="/daily-report"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-white/20'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 text-indigo-400">
                        <FileText className="w-4 h-4" />
                      </div>
                      <span>My Daily EOD Report</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </NavLink>

                  {/* Leave & SLA */}
                  <NavLink
                    to="/leave"
                    onClick={() => setIsUserMenuOpen(false)}
                    className={({ isActive }) =>
                      `flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold transition-all duration-200 shadow-sm ${
                        isActive
                          ? 'bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 text-white font-bold shadow-lg shadow-indigo-600/30 border border-white/20'
                          : 'bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800/80 hover:text-white hover:border-slate-700'
                      }`
                    }
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-slate-800/80 text-indigo-400">
                        <Palmtree className="w-4 h-4" />
                      </div>
                      <span>Apply Leave & SLA</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </NavLink>

                  {/* Sign Out Button */}
                  <button
                    type="button"
                    onClick={() => {
                      setIsUserMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center justify-between p-2.5 px-3.5 rounded-2xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all duration-200 shadow-sm cursor-pointer"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-1.5 rounded-xl bg-red-500/20 text-red-400">
                        <LogOut className="w-4 h-4" />
                      </div>
                      <span className="font-bold">Sign Out Account</span>
                    </div>
                    <ChevronRight className="w-3.5 h-3.5 opacity-60" />
                  </button>
                </div>

                {/* 3. BOTTOM GLOWING MASCOT / CRM ACTION STATUS CARD (MATCHING PINTEREST ORANGE CARD) */}
                <div className="p-3 rounded-2xl bg-gradient-to-br from-amber-500/15 via-orange-500/10 to-amber-600/15 border border-amber-500/30 shadow-lg relative overflow-hidden">
                  <div className="flex items-center gap-2 text-[11px] font-bold text-amber-400 mb-1">
                    <Flame className="w-4 h-4 text-amber-400 fill-amber-400 animate-pulse" />
                    <span>OMVIK ASSISTANT • Live Status</span>
                  </div>
                  <div className="space-y-0.5 text-[10px] text-slate-300">
                    <p className="flex items-center gap-1.5">
                      <span className="text-amber-400 font-bold">⚡</span>
                      <span>SLA Protection Active (36h Sweep)</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <span className="text-emerald-400 font-bold">☑</span>
                      <span>Daily EOD Cross-Check Active</span>
                    </p>
                  </div>
                </div>

              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </div>
    </header>
  );
}

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
  LogOut,
  Flame,
  ChevronRight,
  Menu,
  X,
  Search,
  Settings,
  ShieldCheck,
  Building2,
  Users,
  Inbox,
  FileSpreadsheet,
  AlertTriangle,
  FolderKanban,
  UserPlus,
  History,
  TrendingUp,
  Layers,
  FileWarning,
  KeyRound
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

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

  const primaryNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-2 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 whitespace-nowrap min-h-[44px] flex items-center ${
      isActive
        ? 'bg-indigo-600 text-white font-bold shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const isAdminOrSuper = user?.role && ['admin', 'super_admin', 'director', 'team_lead'].includes(user.role);
  const isAdminActive = location.pathname.startsWith('/admin/');

  return (
    <header className="w-full bg-[#0b0f19] border-b border-slate-800/80 sticky top-0 z-40 shadow-sm">
      {/* ── MAIN TOP HEADER BAR ────────────────────────────────────────── */}
      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-2.5 sm:gap-6">
        
        {/* LEFT: Logo & Subtitle */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0 cursor-pointer" onClick={() => navigate('/dashboard')}>
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-600/20">
            O
          </div>
          <div className="hidden min-[380px]:block">
            <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight">
              OMVIK CRM
            </h1>
            <p className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400 leading-tight">
              REAL-ESTATE CRM
            </p>
          </div>
        </div>

        {/* CENTER-LEFT: Global Search Bar */}
        <div className="relative w-32 min-[440px]:w-48 sm:w-60 lg:w-64 shrink">
          <div className="relative flex items-center">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
            <input
              type="text"
              placeholder="Search..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
              className="w-full h-9 pl-8 pr-3 text-xs bg-[#131c31] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
            />
          </div>

          {/* Search Dropdown Results */}
          {isSearchOpen && (
            <div className="absolute top-11 left-0 w-72 sm:w-96 rounded-xl bg-slate-900 border border-slate-800 shadow-2xl backdrop-blur-2xl py-2 z-50 max-h-80 overflow-y-auto space-y-1">
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

        {/* CENTER: Main Horizontally Aligned Navigation (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0 overflow-x-auto no-scrollbar">
          <NavLink to="/dashboard" className={primaryNavLinkClass}>Dashboard</NavLink>
          <NavLink to="/leads" className={({ isActive }) => primaryNavLinkClass({ isActive: isActive && !location.pathname.startsWith('/leads/') })}>Leads List</NavLink>
          <NavLink to="/customers" className={({ isActive }) => primaryNavLinkClass({ isActive: isActive && !location.pathname.startsWith('/customers/') })}>Customers</NavLink>
          
          {/* DIRECT USERS, REPORTS, EMPLOYEE HISTORY & LOGIN ACTIVITY LINKS */}
          {isAdminOrSuper && (
            <>
              <NavLink to="/admin/users" className={primaryNavLinkClass}>
                Users (+ Add User)
              </NavLink>
              <NavLink to="/admin/reports" className={primaryNavLinkClass}>
                Executive Reports
              </NavLink>
              <NavLink to="/admin/employee-history" className={primaryNavLinkClass}>
                Employee History
              </NavLink>
              <NavLink to="/admin/login-activity" className={primaryNavLinkClass}>
                Login Activity
              </NavLink>
            </>
          )}

          <NavLink to="/pipeline" className={primaryNavLinkClass}>Pipeline</NavLink>
          <NavLink to="/followups" className={primaryNavLinkClass}>Follow-ups</NavLink>
          <NavLink to="/daily-report" className={primaryNavLinkClass}>EOD Report</NavLink>
          <NavLink to="/site-visits" className={primaryNavLinkClass}>Site Visits</NavLink>
          <NavLink to="/performance" className={primaryNavLinkClass}>My Performance</NavLink>
        </nav>

        {/* RIGHT: Notifications, Profile Section & Mobile Toggle */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          <NotificationBell />

          {/* User Profile Trigger Button */}
          <div className="relative shrink-0" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 px-2.5 rounded-xl border border-slate-800 bg-[#131c31] hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:border-slate-700 group min-h-[44px]"
            >
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm group-hover:scale-105 transition-transform">
                {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="hidden sm:flex flex-col text-left pr-0.5">
                <span className="text-xs font-bold text-slate-100 leading-tight whitespace-nowrap">
                  {user?.name || 'User Account'}
                </span>
                <span className="text-[10px] font-mono text-indigo-400 font-semibold leading-tight">
                  {user?.employeeId || (user?.role ? user.role.toUpperCase() : 'EMP')}
                </span>
              </div>
              <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">▼</span>
            </button>

            {/* Profile Menu Flyout Drawer */}
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-80 sm:w-96 rounded-2xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl p-4 z-50 space-y-3 max-h-[85vh] overflow-y-auto"
                >
                  <div className="p-3 rounded-xl bg-[#131c31] border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-0.5 shadow-md flex-shrink-0">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-white text-sm">
                        {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{user?.name || 'User Account'}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          {user?.employeeId || (user?.role ? user.role.toUpperCase() : 'EMP')}
                        </span>
                        <span className="px-2 py-0.5 rounded-md text-[9px] font-bold bg-slate-800 text-slate-300 uppercase tracking-wider">
                          {user?.role ? user.role.replace('_', ' ') : 'User'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* ADMIN MANAGEMENT ITEMS DIRECTLY IN PROFILE LIST */}
                  {isAdminOrSuper && (
                    <div className="space-y-1 pt-1 border-t border-slate-800/80">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2 py-1">
                        ⚙️ Admin Desk Quick Access
                      </div>
                      
                      <NavLink
                        to="/admin/users"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-indigo-600/20 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600 hover:text-white transition-all min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Users className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold">👥 User Directory (+ Add User)</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/login-activity"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-[#131c31] border border-indigo-500/30 text-indigo-300 hover:bg-indigo-600 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <KeyRound className="w-4 h-4 text-indigo-400" />
                          <span className="font-bold">🔑 Login Activity Log</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/reports"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <BarChart3 className="w-4 h-4 text-indigo-400" />
                          <span>📊 Executive Reports</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/employee-history"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <History className="w-4 h-4 text-indigo-400" />
                          <span>📈 Employee Work History</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/import"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileSpreadsheet className="w-4 h-4 text-indigo-400" />
                          <span>📥 Bulk Lead Import</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/projects"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Building2 className="w-4 h-4 text-indigo-400" />
                          <span>🏢 Real-Estate Projects</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/teams"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <ShieldCheck className="w-4 h-4 text-indigo-400" />
                          <span>🛡️ Teams & Sales Pods</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/data-quality"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <Layers className="w-4 h-4 text-indigo-400" />
                          <span>🛡️ Data Quality Centre</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>

                      <NavLink
                        to="/admin/flagged-reports"
                        onClick={() => setIsUserMenuOpen(false)}
                        className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 min-h-[44px]"
                      >
                        <div className="flex items-center gap-2.5">
                          <FileWarning className="w-4 h-4 text-amber-400" />
                          <span>🚨 Flagged EOD Discrepancies</span>
                        </div>
                        <ChevronRight className="w-4 h-4 opacity-50" />
                      </NavLink>
                    </div>
                  )}

                  <div className="space-y-1 pt-2 border-t border-slate-800/80">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-2 py-1">
                      Account & Navigation
                    </div>

                    <NavLink to="/dashboard" onClick={() => setIsUserMenuOpen(false)} className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]">
                      <div className="flex items-center gap-2.5">
                        <Home className="w-4 h-4 text-indigo-400" />
                        <span>Home Dashboard</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </NavLink>

                    <NavLink to="/profile" onClick={() => setIsUserMenuOpen(false)} className="flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-slate-900/60 border border-slate-800/60 text-slate-300 hover:bg-slate-800 hover:text-white min-h-[44px]">
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-indigo-400" />
                        <span>Your Profile & ID</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-between p-2.5 px-3 rounded-xl text-xs font-semibold bg-red-500/10 border border-red-500/20 text-red-400 hover:bg-red-500/20 hover:text-red-300 transition-all cursor-pointer min-h-[44px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span className="font-bold">Sign Out Account</span>
                      </div>
                      <ChevronRight className="w-4 h-4 opacity-50" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle Button (~44px touch target) */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden h-11 w-11 flex items-center justify-center rounded-xl bg-[#131c31] border border-slate-800 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── SECONDARY SUB-HEADER STRIP (DESKTOP & TABLET) ─────────────────── */}
      <div className="w-full bg-[#080d17] border-t border-slate-800/60 py-2">
        <div className="max-w-[1650px] mx-auto px-4 sm:px-6 flex items-center justify-between text-xs">
          
          <div className="flex items-center gap-3 sm:gap-4 overflow-x-auto no-scrollbar">
            <NavLink
              to="/leave"
              className={({ isActive }) =>
                `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[36px] ${
                  isActive
                    ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                }`
              }
            >
              <span>🌴 Leave & SLA</span>
            </NavLink>

            {isAdminOrSuper && (
              <>
                <NavLink
                  to="/admin/reports"
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[36px] ${
                      isActive
                        ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <span>📊 Executive Reports</span>
                </NavLink>
                <NavLink
                  to="/admin/employee-history"
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[36px] ${
                      isActive
                        ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <span>📈 Employee History</span>
                </NavLink>
                <NavLink
                  to="/admin/login-activity"
                  className={({ isActive }) =>
                    `px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 min-h-[36px] ${
                      isActive
                        ? 'bg-slate-800 text-indigo-300 font-bold border border-indigo-500/30'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                    }`
                  }
                >
                  <span>🔑 Login Activity</span>
                </NavLink>
              </>
            )}

            {/* Admin Desk Dropdown */}
            {isAdminOrSuper && (
              <div className="relative inline-block text-left" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsAdminOpen(!isAdminOpen)}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 border cursor-pointer min-h-[36px] ${
                    isAdminActive
                      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30 font-bold'
                      : 'bg-slate-800/40 text-slate-300 border-slate-700/60 hover:bg-slate-800'
                  }`}
                >
                  <span>⚙️ Admin Desk selector</span>
                  <span className="text-[9px]">▼</span>
                </button>

                {isAdminOpen && (
                  <div className="absolute left-0 mt-1 w-60 rounded-xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl py-2 z-50 space-y-1">
                    <div className="px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-slate-500 border-b border-slate-800/60 mb-1">
                      Admin Control Desk
                    </div>
                    <NavLink to="/admin/users" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-[#6366f1] font-bold hover:bg-slate-800 rounded-lg mx-1 min-h-[40px]"><span>👥</span> User Directory (+ Add User)</NavLink>
                    <NavLink to="/admin/login-activity" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-indigo-300 font-bold hover:bg-slate-800 rounded-lg mx-1 min-h-[40px]"><span>🔑</span> Login Activity Log</NavLink>
                    <NavLink to="/admin/projects" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>🏢</span> Real-Estate Projects</NavLink>
                    <NavLink to="/admin/teams" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>🛡️</span> Teams & Sales Pods</NavLink>
                    <NavLink to="/admin/import" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>📥</span> Bulk Lead Import</NavLink>
                    <NavLink to="/admin/reports" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>📊</span> Executive Reports</NavLink>
                    <NavLink to="/admin/employee-history" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>📈</span> Employee History</NavLink>
                    <NavLink to="/admin/data-quality" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>🛡️</span> Data Quality Centre</NavLink>
                    <NavLink to="/admin/duplicates" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>🚫</span> Duplicate Monitor</NavLink>
                    <NavLink to="/admin/flagged-reports" onClick={() => setIsAdminOpen(false)} className="flex items-center gap-2 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-lg mx-1 min-h-[40px]"><span>🚨</span> Flagged EOD Reports</NavLink>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-400 font-mono hidden sm:block">
            Role: <strong className="text-slate-200">{user?.role?.toUpperCase() || 'GUEST'}</strong>
          </div>
        </div>
      </div>

      {/* ── FULL MOBILE SLIDE-OUT DRAWER MENU ────────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-slate-800 bg-[#090d18] p-4 space-y-3 z-50 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-2 pt-1">
              Main Menu
            </div>
            
            <div className="grid grid-cols-1 gap-1.5">
              <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>Dashboard</NavLink>
              <NavLink to="/leads" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>Leads List</NavLink>
              <NavLink to="/customers" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>Customers</NavLink>
              {isAdminOrSuper && (
                <>
                  <NavLink to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>👥 User Directory (+ Add User)</NavLink>
                  <NavLink to="/admin/login-activity" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>🔑 Login Activity Log</NavLink>
                  <NavLink to="/admin/reports" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>📊 Executive Reports</NavLink>
                  <NavLink to="/admin/employee-history" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>📈 Employee History</NavLink>
                </>
              )}
              <NavLink to="/pipeline" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>Pipeline</NavLink>
              <NavLink to="/followups" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>Follow-ups</NavLink>
              <NavLink to="/daily-report" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>EOD Report</NavLink>
              <NavLink to="/site-visits" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>Site Visits</NavLink>
              <NavLink to="/performance" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>My Performance</NavLink>
              <NavLink to="/leave" onClick={() => setIsMobileMenuOpen(false)} className={primaryNavLinkClass}>🌴 Leave & SLA Status</NavLink>
            </div>

            {isAdminOrSuper && (
              <div className="pt-3 border-t border-slate-800/80 space-y-1.5">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 px-2">
                  ⚙️ Admin Desk Management
                </div>
                <div className="grid grid-cols-1 gap-1">
                  <NavLink to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-indigo-400 font-bold hover:bg-slate-800 rounded-xl min-h-[44px]"><span>👥</span> User Directory (+ Add User)</NavLink>
                  <NavLink to="/admin/login-activity" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-indigo-300 font-bold hover:bg-slate-800 rounded-xl min-h-[44px]"><span>🔑</span> Login Activity Log</NavLink>
                  <NavLink to="/admin/projects" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>🏢</span> Projects Management</NavLink>
                  <NavLink to="/admin/teams" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>🛡️</span> Teams & Sales Pods</NavLink>
                  <NavLink to="/admin/import" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>📥</span> Bulk Lead Import</NavLink>
                  <NavLink to="/admin/reports" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>📊</span> Executive Reports</NavLink>
                  <NavLink to="/admin/employee-history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>📈</span> Employee History</NavLink>
                  <NavLink to="/admin/data-quality" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>🛡️</span> Data Quality Centre</NavLink>
                  <NavLink to="/admin/duplicates" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>🚫</span> Duplicate Monitor</NavLink>
                  <NavLink to="/admin/flagged-reports" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2.5 text-xs text-slate-300 hover:bg-slate-800 rounded-xl min-h-[44px]"><span>🚨</span> Flagged EOD Reports</NavLink>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

import React, { useState, useRef, useEffect } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  BarChart3,
  Calendar,
  FileText,
  Palmtree,
  LogOut,
  ChevronDown,
  Menu,
  X,
  Search,
  ShieldCheck,
  Building2,
  Users,
  FileSpreadsheet,
  History,
  TrendingUp,
  Layers,
  FileWarning,
  KeyRound,
  ChevronRight
} from 'lucide-react';
import useAuth from '../hooks/useAuth';
import NotificationBell from './NotificationBell';
import { searchGlobal } from '../api/search';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // Navigation & Dropdown State
  const [isMoreOpen, setIsMoreOpen] = useState(false);
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

  const moreDropdownRef = useRef<HTMLDivElement>(null);
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
      if (moreDropdownRef.current && !moreDropdownRef.current.contains(event.target as Node)) {
        setIsMoreOpen(false);
      }
      if (userDropdownRef.current && !userDropdownRef.current.contains(event.target as Node)) {
        setIsUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdowns on route change
  useEffect(() => {
    setIsMoreOpen(false);
    setIsUserMenuOpen(false);
    setIsMobileMenuOpen(false);
  }, [location.pathname]);

  const topNavLinkClass = ({ isActive }: { isActive: boolean }) =>
    `px-3 py-1.5 rounded-xl text-xs font-semibold tracking-wide transition-all duration-150 whitespace-nowrap min-h-[38px] flex items-center gap-1.5 ${
      isActive
        ? 'bg-indigo-600/15 text-indigo-300 font-bold border border-indigo-500/30 shadow-sm'
        : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
    }`;

  const isPrivilegedRole = user?.role && ['admin', 'super_admin', 'director', 'team_lead'].includes(user.role);
  const isAdminOrDirector = user?.role && ['admin', 'super_admin', 'director'].includes(user.role);
  const isSuperAdmin = user?.role === 'super_admin' || user?.role === 'admin';

  // Check if current route matches any items inside "More" menu
  const isMoreActive = [
    '/admin/reports',
    '/daily-report',
    '/performance',
    '/site-visits',
    '/leave',
    '/admin/users',
    '/admin/employee-history',
    '/admin/login-activity',
    '/admin/import',
    '/admin/projects',
    '/admin/teams',
    '/admin/data-quality',
    '/admin/flagged-reports'
  ].some((path) => location.pathname.startsWith(path));

  return (
    <header className="w-full bg-[#0b0f19] border-b border-slate-800/80 sticky top-0 z-40 shadow-sm">
      {/* ── SINGLE MAIN TOP NAVIGATION BAR ────────────────────────────────────── */}
      <div className="max-w-[1650px] mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3 sm:gap-6">
        
        {/* LEFT: Brand Logo & Search */}
        <div className="flex items-center gap-3 sm:gap-4 shrink-0">
          <div
            className="flex items-center gap-2.5 cursor-pointer"
            onClick={() => navigate('/dashboard')}
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-black text-white text-base shadow-md shadow-indigo-600/20">
              O
            </div>
            <div className="hidden min-[400px]:block">
              <h1 className="text-sm font-extrabold tracking-tight text-white leading-tight">
                OMVIK CRM
              </h1>
              <p className="text-[9px] font-semibold uppercase tracking-widest text-indigo-400 leading-tight">
                REAL-ESTATE PLATFORM
              </p>
            </div>
          </div>

          {/* Global Search Input */}
          <div className="relative w-36 min-[480px]:w-52 sm:w-60 xl:w-64">
            <div className="relative flex items-center">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 pointer-events-none" />
              <input
                type="text"
                placeholder="Search CRM..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onFocus={() => searchQuery.trim().length >= 2 && setIsSearchOpen(true)}
                className="w-full h-9 pl-8 pr-3 text-xs bg-[#131c31] border border-slate-800 rounded-xl text-slate-100 placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-all shadow-inner"
              />
            </div>

            {/* Search Dropdown Results */}
            {isSearchOpen && (
              <div className="absolute top-11 left-0 w-72 sm:w-96 rounded-xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl py-2 z-50 max-h-80 overflow-y-auto space-y-1">
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
        </div>

        {/* CENTER: Main Top Navigation Items (Desktop) */}
        <nav className="hidden lg:flex items-center gap-1 xl:gap-1.5 shrink-0">
          <NavLink to="/dashboard" className={topNavLinkClass}>Dashboard</NavLink>
          <NavLink to="/leads" className={({ isActive }) => topNavLinkClass({ isActive: isActive && !location.pathname.startsWith('/leads/') })}>Leads</NavLink>
          <NavLink to="/customers" className={({ isActive }) => topNavLinkClass({ isActive: isActive && !location.pathname.startsWith('/customers/') })}>Customers</NavLink>
          <NavLink to="/pipeline" className={topNavLinkClass}>Pipeline</NavLink>
          <NavLink to="/followups" className={topNavLinkClass}>Follow-ups</NavLink>

          {/* MORE ▾ MEGA-MENU DROPDOWN TRIGGER */}
          <div className="relative inline-block text-left" ref={moreDropdownRef}>
            <button
              type="button"
              onClick={() => setIsMoreOpen(!isMoreOpen)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all duration-150 flex items-center gap-1.5 cursor-pointer min-h-[38px] ${
                isMoreActive || isMoreOpen
                  ? 'bg-indigo-600/15 text-indigo-300 font-bold border border-indigo-500/30 shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
              }`}
            >
              <span>More</span>
              <ChevronDown className={`w-3.5 h-3.5 transition-transform duration-200 ${isMoreOpen ? 'rotate-180 text-indigo-400' : 'text-slate-400'}`} />
            </button>

            {/* MORE MEGA-MENU PANEL (2 or 3-column Layout) */}
            <AnimatePresence>
              {isMoreOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.97, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.97, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute left-0 xl:left-auto xl:right-0 mt-2 w-[660px] sm:w-[700px] rounded-2xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl p-5 z-50"
                >
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-6">
                    
                    {/* COLUMN 1: REPORTING & OPERATIONS */}
                    <div className="space-y-5">
                      {/* REPORTING SECTION */}
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2 py-0.5">
                          REPORTING
                        </div>

                        <NavLink
                          to="/admin/reports"
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <BarChart3 className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              Executive Reports
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              Pipeline and business performance
                            </div>
                          </div>
                        </NavLink>

                        <NavLink
                          to="/daily-report"
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              EOD Report
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              End-of-day operational summary
                            </div>
                          </div>
                        </NavLink>

                        <NavLink
                          to="/performance"
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <TrendingUp className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              My Performance
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              Personal KPI overview
                            </div>
                          </div>
                        </NavLink>
                      </div>

                      {/* OPERATIONS SECTION */}
                      <div className="space-y-1.5 pt-2 border-t border-slate-800/60">
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2 py-0.5">
                          OPERATIONS
                        </div>

                        <NavLink
                          to="/site-visits"
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Calendar className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              Site Visits
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              Client property visits & feedback
                            </div>
                          </div>
                        </NavLink>

                        <NavLink
                          to="/leave"
                          onClick={() => setIsMoreOpen(false)}
                          className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                        >
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                            <Palmtree className="w-4 h-4" />
                          </div>
                          <div>
                            <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                              Leave & SLA
                            </div>
                            <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                              Staff leave & SLA breach status
                            </div>
                          </div>
                        </NavLink>

                        {isPrivilegedRole && (
                          <NavLink
                            to="/admin/users"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                              <Users className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                Users (+ Add User)
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                User directory & permissions
                              </div>
                            </div>
                          </NavLink>
                        )}
                      </div>
                    </div>

                    {/* COLUMN 2: ACTIVITY & AUDIT */}
                    <div className="space-y-5">
                      <div className="space-y-1.5">
                        <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2 py-0.5">
                          ACTIVITY & AUDIT
                        </div>

                        {isPrivilegedRole ? (
                          <>
                            <NavLink
                              to="/admin/employee-history"
                              onClick={() => setIsMoreOpen(false)}
                              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <History className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                  Employee History
                                </div>
                                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                  Historical activity timeline
                                </div>
                              </div>
                            </NavLink>

                            <NavLink
                              to="/admin/login-activity"
                              onClick={() => setIsMoreOpen(false)}
                              className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                            >
                              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                                <KeyRound className="w-4 h-4" />
                              </div>
                              <div>
                                <div className="text-xs font-bold text-white group-hover:text-indigo-300 transition-colors">
                                  Login Activity
                                </div>
                                <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                  Security logs, IPs & user-agents
                                </div>
                              </div>
                            </NavLink>
                          </>
                        ) : (
                          <div className="p-3 text-[11px] text-slate-500 italic bg-[#0b0f19] rounded-xl border border-slate-800/60">
                            Activity governance requires manager permissions.
                          </div>
                        )}
                      </div>
                    </div>

                    {/* COLUMN 3: ADMIN TOOLS */}
                    <div className="space-y-1.5 col-span-2 sm:col-span-1">
                      <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 px-2 py-0.5">
                        ADMIN TOOLS
                      </div>

                      {isAdminOrDirector ? (
                        <>
                          <NavLink
                            to="/admin/import"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <FileSpreadsheet className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                Bulk Lead Import
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                Upload Excel/CSV lead batches
                              </div>
                            </div>
                          </NavLink>

                          <NavLink
                            to="/admin/projects"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <Building2 className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                Real-Estate Projects
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                Real estate inventory & pricing
                              </div>
                            </div>
                          </NavLink>

                          <NavLink
                            to="/admin/teams"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <ShieldCheck className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                Teams & Sales Pods
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                Sales structure & pod leads
                              </div>
                            </div>
                          </NavLink>

                          <NavLink
                            to="/admin/data-quality"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <Layers className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                Data Quality Centre
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                Audit missing fields & hygiene
                              </div>
                            </div>
                          </NavLink>

                          <NavLink
                            to="/admin/flagged-reports"
                            onClick={() => setIsMoreOpen(false)}
                            className="flex items-start gap-2.5 p-2 rounded-xl hover:bg-slate-800/80 transition-all group"
                          >
                            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:bg-amber-600 group-hover:text-white transition-colors">
                              <FileWarning className="w-4 h-4" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white group-hover:text-amber-300 transition-colors">
                                Flagged EOD Discrepancies
                              </div>
                              <div className="text-[11px] text-slate-400 leading-tight mt-0.5">
                                Review flagged daily reports
                              </div>
                            </div>
                          </NavLink>
                        </>
                      ) : (
                        <div className="p-3 text-[11px] text-slate-500 italic bg-[#0b0f19] rounded-xl border border-slate-800/60">
                          Admin tools require administrator access.
                        </div>
                      )}
                    </div>

                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </nav>

        {/* RIGHT: Notifications, Subtle Super Admin Indicator & Compact Profile Menu */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0 ml-auto">
          
          {/* Subtle SUPER ADMIN / ADMIN Indicator */}
          {isSuperAdmin && (
            <div className="hidden xl:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-[10px] font-extrabold uppercase tracking-wider">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              <span>SUPER ADMIN</span>
            </div>
          )}

          <NotificationBell />

          {/* COMPACT ACCOUNT-ONLY PROFILE DROPDOWN */}
          <div className="relative shrink-0" ref={userDropdownRef}>
            <button
              type="button"
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 px-2 rounded-xl border border-slate-800 bg-[#131c31] hover:bg-slate-800 transition-all cursor-pointer shadow-sm hover:border-slate-700 group min-h-[38px]"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-sm group-hover:scale-105 transition-transform">
                {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="hidden sm:inline-block text-xs font-bold text-slate-200 whitespace-nowrap">
                {user?.name?.split(' ')[0] || 'User'}
              </span>
              <ChevronDown className={`w-3 h-3 text-slate-400 transition-transform duration-200 ${isUserMenuOpen ? 'rotate-180 text-indigo-400' : ''}`} />
            </button>

            {/* COMPACT PROFILE MENU PANEL (ACCOUNT-ONLY, NO CRM LINKS) */}
            <AnimatePresence>
              {isUserMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -8 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -8 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-72 rounded-2xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl p-3 z-50 space-y-3"
                >
                  {/* Account Header */}
                  <div className="p-3 rounded-xl bg-[#131c31] border border-slate-800/80 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-0.5 shadow-md shrink-0">
                      <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center font-black text-white text-sm">
                        {user?.name ? user.name.trim().charAt(0).toUpperCase() : 'U'}
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate">{user?.name || 'User Account'}</h4>
                      <p className="text-[11px] text-slate-400 truncate">{user?.email || ''}</p>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-mono">
                          {user?.employeeId || (user?.role ? user.role.toUpperCase() : 'EMP')}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-800 text-slate-300 uppercase tracking-wider">
                          {user?.role ? user.role.replace('_', ' ') : 'User'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Actions Only */}
                  <div className="space-y-1 pt-1 border-t border-slate-800/80">
                    <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-2 py-0.5">
                      PROFILE & ACCOUNT
                    </div>

                    <NavLink
                      to="/profile"
                      onClick={() => setIsUserMenuOpen(false)}
                      className="flex items-center justify-between p-2 px-3 rounded-xl text-xs font-semibold text-slate-300 hover:bg-slate-800 hover:text-white transition-all min-h-[38px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <User className="w-4 h-4 text-indigo-400" />
                        <span>Profile & ID</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </NavLink>

                    <button
                      type="button"
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        handleLogout();
                      }}
                      className="w-full flex items-center justify-between p-2 px-3 rounded-xl text-xs font-semibold text-red-400 hover:bg-red-500/15 hover:text-red-300 transition-all cursor-pointer min-h-[38px]"
                    >
                      <div className="flex items-center gap-2.5">
                        <LogOut className="w-4 h-4 text-red-400" />
                        <span className="font-bold">Sign Out</span>
                      </div>
                      <ChevronRight className="w-3.5 h-3.5 opacity-50" />
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Mobile Menu Toggle Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="lg:hidden h-9 w-9 flex items-center justify-center rounded-xl bg-[#131c31] border border-slate-800 text-slate-300 hover:text-white transition-colors"
            aria-label="Toggle navigation drawer"
          >
            {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* ── RESPONSIVE MOBILE SLIDE-OUT DRAWER ──────────────────────────────── */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="lg:hidden border-t border-slate-800 bg-[#090d18] p-4 space-y-4 z-50 shadow-2xl max-h-[85vh] overflow-y-auto"
          >
            {/* Primary Mobile Menu */}
            <div className="space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-slate-500 px-2 py-0.5">
                PRIMARY MENU
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                <NavLink to="/dashboard" onClick={() => setIsMobileMenuOpen(false)} className={topNavLinkClass}>Dashboard</NavLink>
                <NavLink to="/leads" onClick={() => setIsMobileMenuOpen(false)} className={topNavLinkClass}>Leads</NavLink>
                <NavLink to="/customers" onClick={() => setIsMobileMenuOpen(false)} className={topNavLinkClass}>Customers</NavLink>
                <NavLink to="/pipeline" onClick={() => setIsMobileMenuOpen(false)} className={topNavLinkClass}>Pipeline</NavLink>
                <NavLink to="/followups" onClick={() => setIsMobileMenuOpen(false)} className={topNavLinkClass}>Follow-ups</NavLink>
              </div>
            </div>

            {/* Reporting Section */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2">
                REPORTING
              </div>
              <NavLink to="/admin/reports" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Executive Reports</span>
              </NavLink>
              <NavLink to="/daily-report" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span>EOD Report</span>
              </NavLink>
              <NavLink to="/performance" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                <TrendingUp className="w-4 h-4 text-indigo-400" />
                <span>My Performance</span>
              </NavLink>
            </div>

            {/* Operations Section */}
            <div className="pt-2 border-t border-slate-800/80 space-y-1">
              <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2">
                OPERATIONS
              </div>
              <NavLink to="/site-visits" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Site Visits</span>
              </NavLink>
              <NavLink to="/leave" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                <Palmtree className="w-4 h-4 text-indigo-400" />
                <span>Leave & SLA</span>
              </NavLink>
              {isPrivilegedRole && (
                <NavLink to="/admin/users" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-300 font-bold hover:bg-slate-800 rounded-xl">
                  <Users className="w-4 h-4 text-indigo-400" />
                  <span>Users (+ Add User)</span>
                </NavLink>
              )}
            </div>

            {/* Activity & Audit Section */}
            {isPrivilegedRole && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400 px-2">
                  ACTIVITY & AUDIT
                </div>
                <NavLink to="/admin/employee-history" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                  <History className="w-4 h-4 text-indigo-400" />
                  <span>Employee History</span>
                </NavLink>
                <NavLink to="/admin/login-activity" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-indigo-300 font-bold hover:bg-slate-800 rounded-xl">
                  <KeyRound className="w-4 h-4 text-indigo-400" />
                  <span>Login Activity</span>
                </NavLink>
              </div>
            )}

            {/* Admin Tools Section */}
            {isAdminOrDirector && (
              <div className="pt-2 border-t border-slate-800/80 space-y-1">
                <div className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400 px-2">
                  ADMIN TOOLS
                </div>
                <NavLink to="/admin/import" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4 text-amber-400" />
                  <span>Bulk Lead Import</span>
                </NavLink>
                <NavLink to="/admin/projects" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                  <Building2 className="w-4 h-4 text-amber-400" />
                  <span>Real-Estate Projects</span>
                </NavLink>
                <NavLink to="/admin/teams" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  <span>Teams & Sales Pods</span>
                </NavLink>
                <NavLink to="/admin/data-quality" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                  <Layers className="w-4 h-4 text-amber-400" />
                  <span>Data Quality Centre</span>
                </NavLink>
                <NavLink to="/admin/flagged-reports" onClick={() => setIsMobileMenuOpen(false)} className="flex items-center gap-2.5 px-3 py-2 text-xs text-slate-300 hover:bg-slate-800 rounded-xl">
                  <FileWarning className="w-4 h-4 text-amber-400" />
                  <span>Flagged EOD Discrepancies</span>
                </NavLink>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}

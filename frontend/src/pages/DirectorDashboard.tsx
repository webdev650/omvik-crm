import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from 'recharts';
import {
  Users,
  Trophy,
  XCircle,
  AlertTriangle,
  Clock,
  Kanban,
  Bot,
  Sparkles,
  X,
  Tag,
  Filter,
  Calendar,
  Layers,
  Award,
  Building,
  UserCheck,
  ChevronRight,
  PhoneCall,
  Eye,
  FileSpreadsheet,
  ArrowUpRight,
  PieChart as PieIcon
} from 'lucide-react';

import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getDashboardSummary } from '../api/dashboard';
import api from '../api/axios';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Badge } from '../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';

const SOURCE_COLORS = [
  '#0131B9', // Deep Blue
  '#15B0F8', // Vibrant Light Blue
  '#FBB040', // Golden Yellow
  '#FF0000', // Crimson Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981'  // Emerald
];

// Vibrant colors matching the user's reference basic pie chart
const DEEP_DIVE_COLORS = [
  '#3b82f6', // Active Leads - Blue
  '#f59e0b', // Inactive Leads - Yellow/Gold
  '#10b981', // Bookings (Won) - Green
  '#ef4444'  // Site Visits - Red
];

const STAGE_LABELS: Record<string, string> = {
  new: 'New Lead',
  contacted: 'Contacted',
  qualified: 'Qualified',
  site_visit: 'Site Visit',
  negotiation: 'Negotiation',
  nurture: 'Nurture',
  won: 'Won 🏆',
  lost: 'Lost'
};

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.07
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35, ease: 'easeOut' } }
};

export default function DirectorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Deep-Dive Filter State
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // Best Performers Date Toggle
  const [bestDateRange, setBestDateRange] = useState<'this_month' | 'this_year' | 'all_time'>('this_month');

  // Stat Card Drill-Down Modal State
  const [activeModal, setActiveModal] = useState<'total' | 'active' | 'inactive' | 'uncontacted' | 'overdue' | null>(null);
  const [overdueBucketFilter, setOverdueBucketFilter] = useState<string | null>(null);

  // Fetch projects list for filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    }
  });

  // Fetch users list for filter dropdown
  const { data: usersData } = useQuery({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    }
  });

  // Fetch Dashboard Analytics
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'summary', selectedProjectId, selectedEmployeeId, startDate, endDate, bestDateRange],
    queryFn: () => getDashboardSummary({
      projectId: selectedProjectId || undefined,
      employeeId: selectedEmployeeId || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined,
      bestDateRange
    }),
    refetchInterval: 30_000
  });

  const stats = data?.stats;
  const projectsList = projectsData?.projects || [];
  const usersList = usersData?.users || [];

  // Pipeline Funnel BarChart
  const stageChartData = useMemo(() => {
    if (!stats?.byStage) return [];
    return Object.entries(stats.byStage).map(([stageKey, count]) => ({
      stage: STAGE_LABELS[stageKey] || stageKey,
      count: count as number
    }));
  }, [stats?.byStage]);

  // Lead Sources PieChart (Normalized Uppercase)
  const sourceChartData = useMemo(() => {
    if (!stats?.bySource) return [];
    return stats.bySource.map((s: any) => ({
      name: (s.source || 'DIRECT').toUpperCase(),
      value: s.count
    }));
  }, [stats?.bySource]);

  // Multi-Project Overview BarChart
  const projectChartData = useMemo(() => {
    if (!stats?.byProject) return [];
    return stats.byProject.map((p: any) => ({
      name: p.projectName || 'Project',
      count: p.count
    }));
  }, [stats?.byProject]);

  // Project Deep-Dive Solid PieChart Data
  const deepDiveChartData = useMemo(() => {
    if (!stats?.projectDeepDive) return [];
    const pd = stats.projectDeepDive;
    return [
      { name: 'Active Leads', value: pd.activeCount || 0 },
      { name: 'Inactive Leads', value: pd.inactiveCount || 0 },
      { name: 'Bookings (Won)', value: pd.bookingsCount || 0 },
      { name: 'Site Visits', value: pd.siteVisitsCount || 0 }
    ];
  }, [stats?.projectDeepDive]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-[#0131B9] selection:text-white pb-16">
      
      {/* TOP NAVIGATION BAR */}
      <Navbar />

      {/* MAIN DASHBOARD CONTENT AREA */}
      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* HERO HEADING & QUICK ACTION BAR */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0131B9]/15 border border-[#15B0F8]/30 text-[#15B0F8] text-[11px] font-bold uppercase tracking-wider">
              <span>Executive Command Center</span>
              <span>—</span>
              <span>{user?.role?.replace('_', ' ')?.toUpperCase() || 'SUPER ADMIN'} VIEW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Executive Performance Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time lead counts, batch tracking, SLA health, conversion ratios, and top sales performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <NavLink
              to="/admin/lead-batches"
              className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/60 flex items-center gap-2"
            >
              <Tag className="w-4 h-4 text-[#15B0F8]" />
              <span>Lead Batches</span>
            </NavLink>

            <NavLink
              to="/admin/import"
              className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/60 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#FBB040]" />
              <span>Import Leads</span>
            </NavLink>

            <NavLink
              to="/pipeline"
              className="h-10 px-4 bg-[#0131B9] hover:bg-[#15B0F8] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0131B9]/20 flex items-center gap-2"
            >
              <Kanban className="w-4 h-4" />
              <span>Kanban Pipeline</span>
            </NavLink>
          </div>
        </div>

        {/* LOADING & ERROR STATES */}
        {isLoading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
              <div key={i} className="h-32 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {isError && (
          <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3">
            <p className="text-red-400 text-sm font-semibold">Failed to load executive dashboard summary.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* ── SECTION 1: 8 STAT CARDS IN 2 ROWS WITH UNIFORM ALIGNMENT & ANIMATION ── */}
        {stats && (
          <div className="space-y-6">
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="show"
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5"
            >
              
              {/* 1. TOTAL LEADS (Cumulative All Time) */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('total')}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-[#15B0F8]/60 hover:shadow-[0_10px_25px_rgba(21,176,248,0.15)] transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Total Leads</span>
                  <div className="w-8 h-8 rounded-xl bg-[#15B0F8]/10 text-[#15B0F8] flex items-center justify-center group-hover:scale-110 transition-transform">
                    <Tag className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-white tracking-tight">{stats.totalLeads}</span>
                </div>
                <p className="text-xs text-[#15B0F8] font-semibold flex items-center gap-1">
                  <span>All-time cumulative total</span>
                  <ChevronRight className="w-3 h-3" />
                </p>
              </motion.div>

              {/* 2. ACTIVE LEADS */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('active')}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-[#15B0F8]/60 hover:shadow-[0_10px_25px_rgba(21,176,248,0.15)] transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#15B0F8]">Active Leads</span>
                  <div className="w-8 h-8 rounded-xl bg-[#15B0F8]/10 text-[#15B0F8] flex items-center justify-center">
                    <Users className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-[#15B0F8] tracking-tight">{stats.activeLeadsCount}</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">High / Medium Intent</p>
              </motion.div>

              {/* 3. INACTIVE LEADS */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('inactive')}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-slate-600 transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Inactive Leads</span>
                  <div className="w-8 h-8 rounded-xl bg-slate-800 text-slate-400 flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-slate-300 tracking-tight">{stats.inactiveLeadsCount}</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Low Intent / Lost Stage</p>
              </motion.div>

              {/* 4. UNCONTACTED LEADS */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('uncontacted')}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-[#FBB040]/60 hover:shadow-[0_10px_25px_rgba(251,176,64,0.15)] transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FBB040]">Uncontacted</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FBB040]/10 text-[#FBB040] flex items-center justify-center">
                    <PhoneCall className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-[#FBB040] tracking-tight">{stats.uncontactedLeadsCount}</span>
                </div>
                <p className="text-xs text-[#FBB040] font-semibold flex items-center gap-1">
                  <span>0 touchpoints recorded</span>
                  <ChevronRight className="w-3 h-3" />
                </p>
              </motion.div>

              {/* 5. DEALS WON */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-emerald-500/60 hover:shadow-[0_10px_25px_rgba(16,185,129,0.15)] transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Deals Won</span>
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                    <Trophy className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-emerald-400 tracking-tight">{stats.wonCount}</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Closed successfully</p>
              </motion.div>

              {/* 6. DEALS LOST */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-[#FF0000]/60 hover:shadow-[0_10px_25px_rgba(255,0,0,0.15)] transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FF0000]">Deals Lost</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FF0000]/10 text-[#FF0000] flex items-center justify-center">
                    <XCircle className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-[#FF0000] tracking-tight">{stats.lostCount}</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold">Unsuccessful leads</p>
              </motion.div>

              {/* 7. SLA BREACHED (>48h) */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-[#FF0000]/60 hover:shadow-[0_10px_25px_rgba(255,0,0,0.15)] transition-all relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#FF0000]">SLA Breached</span>
                  <div className="w-8 h-8 rounded-xl bg-[#FF0000]/10 text-[#FF0000] flex items-center justify-center animate-pulse">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-[#FF0000] tracking-tight">{stats.slaBreachedCount}</span>
                </div>
                <p className="text-xs text-[#FF0000] font-bold">&gt;48h uncontacted threshold</p>
              </motion.div>

              {/* 8. OVERDUE ACTIONS (Bucketed Breakdown Box) */}
              <motion.div
                variants={cardVariants}
                whileHover={{ y: -4, scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setActiveModal('overdue')}
                className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-lg hover:border-[#15B0F8]/60 hover:shadow-[0_10px_25px_rgba(21,176,248,0.15)] transition-all cursor-pointer group relative overflow-hidden flex flex-col justify-between"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wider text-[#15B0F8]">Overdue Actions</span>
                  <div className="w-8 h-8 rounded-xl bg-[#15B0F8]/10 text-[#15B0F8] flex items-center justify-center">
                    <Clock className="w-4 h-4" />
                  </div>
                </div>
                <div className="my-3 flex items-baseline justify-between">
                  <span className="text-3xl sm:text-4xl font-black text-[#15B0F8] tracking-tight">
                    {stats.overdueBuckets?.total || stats.overdueFollowups}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-400 font-semibold border-t border-slate-800/80 pt-1">
                  <span>Recent: <strong className="text-[#FBB040]">{stats.overdueBuckets?.dueRecent || 0}</strong></span>
                  <span>4+ Days: <strong className="text-[#FF0000]">{stats.overdueBuckets?.due4PlusDays || 0}</strong></span>
                </div>
              </motion.div>

            </motion.div>

            {/* ── SECTION 4: BEST EMPLOYEE / BEST PROJECT WIDGET ──────────────────── */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4 mb-5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#FBB040]/10 border border-[#FBB040]/20 text-[#FBB040] flex items-center justify-center">
                    <Award className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-white">Top Sales Performers & Project Leaders</h3>
                    <p className="text-xs text-slate-400">Ranked strictly by highest count of closed won opportunities (Excludes Admins & Directors)</p>
                  </div>
                </div>

                {/* Date Filter Toggles */}
                <div className="flex items-center gap-1.5 bg-[#0b0f19] p-1 rounded-xl border border-slate-800">
                  <button
                    onClick={() => setBestDateRange('this_month')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bestDateRange === 'this_month'
                        ? 'bg-[#0131B9] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    This Month
                  </button>
                  <button
                    onClick={() => setBestDateRange('this_year')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bestDateRange === 'this_year'
                        ? 'bg-[#0131B9] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    This Year
                  </button>
                  <button
                    onClick={() => setBestDateRange('all_time')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      bestDateRange === 'all_time'
                        ? 'bg-[#0131B9] text-white shadow-sm'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    All Time
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Column 1: Best Employee (Excludes Admins/Directors) */}
                <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FBB040]/20 to-yellow-500/20 border border-[#FBB040]/30 flex items-center justify-center text-[#FBB040] font-extrabold text-lg">
                      🥇
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Best Employee (Staff Only)</p>
                      <h4 className="text-lg font-black text-white mt-0.5">
                        {stats.bestPerformers?.bestEmployee?.name || 'No Employee Deals Yet'}
                      </h4>
                      <p className="text-xs text-emerald-400 font-semibold mt-0.5">
                        🏆 {stats.bestPerformers?.bestEmployee?.wonCount || 0} deals won
                      </p>
                    </div>
                  </div>
                  <UserCheck className="w-8 h-8 text-[#FBB040] opacity-30" />
                </div>

                {/* Column 2: Best Project */}
                <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#0131B9]/20 to-[#15B0F8]/20 border border-[#15B0F8]/30 flex items-center justify-center text-[#15B0F8] font-extrabold text-lg">
                      🏢
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Best Project</p>
                      <h4 className="text-lg font-black text-white mt-0.5">
                        {stats.bestPerformers?.bestProject?.name || 'No Project Deals Yet'}
                      </h4>
                      <p className="text-xs text-[#15B0F8] font-semibold mt-0.5">
                        📈 {stats.bestPerformers?.bestProject?.wonCount || 0} deals won
                      </p>
                    </div>
                  </div>
                  <Building className="w-8 h-8 text-[#15B0F8] opacity-30" />
                </div>
              </div>
            </div>

            {/* ── SECTION 3A: OPPORTUNITIES BY PROJECT OVERVIEW (MULTI-PROJECT BAR CHART - KEPT PERMANENTLY) ── */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
                <div>
                  <h3 className="text-base sm:text-lg font-bold text-white">Opportunities by Project</h3>
                  <p className="text-xs text-slate-400">Total active opportunities across all real-estate projects</p>
                </div>
                <span className="px-2.5 py-1 rounded-md bg-slate-800 text-[#15B0F8] text-[11px] font-bold border border-slate-700/60 flex items-center gap-1.5">
                  <BarChart className="w-3.5 h-3.5" />
                  <span>All Projects Overview</span>
                </span>
              </div>

              <div className="h-72 w-full pt-2">
                {projectChartData.length === 0 ? (
                  <div className="flex items-center justify-center h-full text-xs text-slate-500">
                    No project data recorded yet.
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                      />
                      <Bar dataKey="count" fill="#15B0F8" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </div>

            {/* ── SECTION 3B: DEDICATED PROJECT DEEP DIVE & STAGE CONVERSION PIE CHART (SOLID PIE CHART WITH Slice % LABELS) ── */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#0131B9]/20 text-[#15B0F8] border border-[#15B0F8]/30 flex items-center justify-center">
                    <PieIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-white">Project Deep Dive & Stage Conversion Analytics</h3>
                    <p className="text-xs text-slate-400">Filter by Project, Employee, & Date Range to analyze stage distribution and conversion ratios</p>
                  </div>
                </div>
              </div>

              {/* Filter Bar: Project Dropdown, Employee Dropdown, Date Range */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#0b0f19] p-4 rounded-2xl border border-slate-800">
                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Filter by Project (e.g. MCO)</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full bg-[#131c31] border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5 font-medium focus:border-[#15B0F8]"
                  >
                    <option value="">All Real-Estate Projects</option>
                    {projectsList.map((p: any) => (
                      <option key={p._id} value={p._id}>{p.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Filter by Employee (Optional)</label>
                  <select
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full bg-[#131c31] border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5 font-medium focus:border-[#15B0F8]"
                  >
                    <option value="">All Team Members</option>
                    {usersList.map((u: any) => (
                      <option key={u._id} value={u._id}>{u.name} ({u.role})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">Start Date (dt/month/yr)</label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-[#131c31] border-slate-700 text-xs text-slate-200 rounded-xl h-10"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-400 block mb-1">End Date (dt/month/yr)</label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-[#131c31] border-slate-700 text-xs text-slate-200 rounded-xl h-10"
                  />
                </div>
              </div>

              {/* Deep-Dive Grid: Solid Pie Chart + Conversion Ratios */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
                {/* Left (7 Cols): Solid Filled Basic Pie Chart with Percentage Labels */}
                <div className="lg:col-span-7 bg-[#0b0f19] p-5 rounded-2xl border border-slate-800">
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="text-sm font-bold text-slate-200">Basic Pie Chart Distribution</h4>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {startDate && endDate ? `${startDate} to ${endDate}` : 'All Date Ranges'}
                    </span>
                  </div>

                  <div className="h-72 w-full flex items-center justify-center">
                    {deepDiveChartData.every((d) => d.value === 0) ? (
                      <p className="text-xs text-slate-500 italic">No distribution metrics recorded for this project filter.</p>
                    ) : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={deepDiveChartData}
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            innerRadius={0} // Solid Pie Chart matching user's image!
                            dataKey="value"
                            label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                            labelLine={true}
                          >
                            {deepDiveChartData.map((_entry: any, index: number) => (
                              <Cell key={`cell-${index}`} fill={DEEP_DIVE_COLORS[index % DEEP_DIVE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip
                            contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                          />
                          <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>

                {/* Right (5 Cols): Stage Conversion Ratios */}
                <div className="lg:col-span-5 space-y-3">
                  <h4 className="text-sm font-bold text-slate-200 mb-1">Stage Conversion Ratios</h4>

                  <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-300">Contacted : Visits</p>
                      <p className="text-[11px] text-slate-500">Contacted leads vs Completed Site Visits</p>
                    </div>
                    <span className="text-xl font-black text-[#3b82f6] font-mono">
                      {stats.projectDeepDive?.ratios?.contactedToVisits || '0:0'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-300">Contacted : Bookings</p>
                      <p className="text-[11px] text-slate-500">Contacted leads vs Won Bookings</p>
                    </div>
                    <span className="text-xl font-black text-emerald-400 font-mono">
                      {stats.projectDeepDive?.ratios?.contactedToBookings || '0:0'}
                    </span>
                  </div>

                  <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between">
                    <div>
                      <p className="text-xs font-bold text-slate-300">Visits : Bookings</p>
                      <p className="text-[11px] text-slate-500">Completed Site Visits vs Won Bookings</p>
                    </div>
                    <span className="text-xl font-black text-[#f59e0b] font-mono">
                      {stats.projectDeepDive?.ratios?.visitsToBookings || '0:0'}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* ── SECTION 2: LEAD SOURCES (NORMALIZED UPPERCASE) & FUNNEL ────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              
              {/* Pipeline Funnel Breakdown */}
              <div className="lg:col-span-8 bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Pipeline Funnel Breakdown</h3>
                    <p className="text-xs text-slate-400">Stage-by-stage active lead distribution</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700/60">
                    By Stage
                  </span>
                </div>

                <div className="h-72 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={stageChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="stage"
                        stroke="#64748b"
                        fontSize={11}
                        tickLine={false}
                        interval={0}
                        angle={-15}
                        textAnchor="end"
                      />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                      />
                      <Bar dataKey="count" fill="#0131B9" radius={[6, 6, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* 2c. Normalized Lead Sources Pie Chart */}
              <div className="lg:col-span-4 bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Lead Sources</h3>
                    <p className="text-xs text-slate-400">Normalized uppercase channel breakdown</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700/60">
                    Normalized
                  </span>
                </div>

                <div className="h-72 w-full flex items-center justify-center pt-2">
                  {sourceChartData.length === 0 ? (
                    <p className="text-xs text-slate-500">No source data recorded yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceChartData}
                          cx="50%"
                          cy="42%"
                          innerRadius={50}
                          outerRadius={78}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {sourceChartData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        />
                        <Legend
                          verticalAlign="bottom"
                          height={36}
                          iconType="circle"
                          wrapperStyle={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

          </div>
        )}
      </main>

      {/* ── STAT CARD DRILL-DOWN MODALS ─────────────────────────────────────────── */}
      {activeModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#131c31] border border-slate-800 rounded-2xl max-w-3xl w-full p-6 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-lg font-bold text-white uppercase tracking-tight">
                  {activeModal === 'total' && 'Total Cumulative Leads Breakdown'}
                  {activeModal === 'active' && 'Active Leads List (High/Medium Intent)'}
                  {activeModal === 'inactive' && 'Inactive Leads List (Low Intent / Lost)'}
                  {activeModal === 'uncontacted' && 'Uncontacted Leads List (0 Touchpoints)'}
                  {activeModal === 'overdue' && 'Overdue Follow-Up Action Breakdown'}
                </h3>
                <p className="text-xs text-slate-400">Click any row to jump directly to lead detail</p>
              </div>

              <div className="flex items-center gap-2">
                {activeModal === 'total' && (
                  <Button
                    size="sm"
                    onClick={() => { setActiveModal(null); navigate('/admin/lead-batches'); }}
                    className="bg-[#0131B9] hover:bg-[#15B0F8] text-white text-xs font-bold rounded-xl flex items-center gap-1.5"
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>View Lead Batches & Sheets →</span>
                  </Button>
                )}

                <button onClick={() => setActiveModal(null)} className="text-slate-400 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Content for Overdue Bucketed Actions */}
            {activeModal === 'overdue' && stats?.overdueBuckets && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div
                    onClick={() => setOverdueBucketFilter('recent')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${overdueBucketFilter === 'recent' ? 'border-[#FBB040] bg-[#FBB040]/10' : 'border-slate-800 bg-[#0b0f19]'}`}
                  >
                    <p className="text-[10px] text-slate-400 uppercase font-bold">Due Last Few Hours</p>
                    <p className="text-xl font-black text-[#FBB040] mt-1">{stats.overdueBuckets.dueRecent}</p>
                  </div>
                  <div
                    onClick={() => setOverdueBucketFilter('1day')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${overdueBucketFilter === '1day' ? 'border-[#FBB040] bg-[#FBB040]/10' : 'border-slate-800 bg-[#0b0f19]'}`}
                  >
                    <p className="text-[10px] text-slate-400 uppercase font-bold">1 Day Overdue</p>
                    <p className="text-xl font-black text-[#FBB040] mt-1">{stats.overdueBuckets.due1Day}</p>
                  </div>
                  <div
                    onClick={() => setOverdueBucketFilter('2to3days')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${overdueBucketFilter === '2to3days' ? 'border-[#FBB040] bg-[#FBB040]/10' : 'border-slate-800 bg-[#0b0f19]'}`}
                  >
                    <p className="text-[10px] text-slate-400 uppercase font-bold">2-3 Days Overdue</p>
                    <p className="text-xl font-black text-[#FBB040] mt-1">{stats.overdueBuckets.due2To3Days}</p>
                  </div>
                  <div
                    onClick={() => setOverdueBucketFilter('4plusdays')}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${overdueBucketFilter === '4plusdays' ? 'border-[#FF0000] bg-[#FF0000]/10' : 'border-slate-800 bg-[#0b0f19]'}`}
                  >
                    <p className="text-[10px] text-slate-400 uppercase font-bold">4+ Days Overdue</p>
                    <p className="text-xl font-black text-[#FF0000] mt-1">{stats.overdueBuckets.due4PlusDays}</p>
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button
                    size="sm"
                    onClick={() => { setActiveModal(null); navigate('/followups'); }}
                    className="bg-[#0131B9] hover:bg-[#15B0F8] text-white text-xs font-bold rounded-xl"
                  >
                    Manage Follow-ups Page →
                  </Button>
                </div>
              </div>
            )}

            {/* Modal Content for Opportunity Drill-down Lists */}
            {activeModal !== 'overdue' && (
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0b0f19]">
                <Table>
                  <TableHeader className="bg-[#0b0f19]">
                    <TableRow className="border-b border-slate-800">
                      <TableHead className="text-slate-400 text-xs">Customer Name</TableHead>
                      <TableHead className="text-slate-400 text-xs">Mobile</TableHead>
                      <TableHead className="text-slate-400 text-xs">Project</TableHead>
                      <TableHead className="text-slate-400 text-xs">Owner Rep</TableHead>
                      <TableHead className="text-slate-400 text-xs">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {((activeModal === 'total' ? stats?.drillDowns?.totalList :
                      activeModal === 'active' ? stats?.drillDowns?.activeList :
                      activeModal === 'inactive' ? stats?.drillDowns?.inactiveList :
                      stats?.drillDowns?.uncontactedList) || []).map((opp: any) => (
                      <TableRow key={opp._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                        <TableCell className="font-bold text-white text-xs">{opp.customer?.name || 'Prospect'}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">{opp.customer?.primaryMobile || '—'}</TableCell>
                        <TableCell className="text-[#15B0F8] text-xs font-semibold">{opp.project?.name || '—'}</TableCell>
                        <TableCell className="text-slate-300 text-xs">{opp.owner?.name || 'Unassigned'}</TableCell>
                        <TableCell>
                          <Button
                            size="sm"
                            onClick={() => { setActiveModal(null); navigate(`/leads/${opp._id}`); }}
                            className="h-7 text-[10px] bg-[#0131B9]/20 hover:bg-[#0131B9] text-[#15B0F8] hover:text-white rounded-lg"
                          >
                            View Lead →
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── INTEGRATED OMVIK SALES ASSISTANT FLOATING WIDGET ─────────────────────── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {isAssistantOpen && (
          <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#0131B9] flex items-center justify-center text-white">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-white">OMVIK SALES ASSISTANT</h4>
                  <p className="text-[10px] text-emerald-400 font-semibold">● Active Nudge Engine</p>
                </div>
              </div>
              <button
                onClick={() => setIsAssistantOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#131c31] border border-slate-800 space-y-1.5 text-slate-300">
              <div className="flex items-center gap-1.5 text-[#FBB040] font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daily Action Summary</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                {stats?.uncontactedLeadsCount > 0
                  ? `📞 You still have ${stats.uncontactedLeadsCount} uncontacted leads to contact today!`
                  : 'Fantastic job! Your daily action inbox is clean today. No immediate SLA escalations required.'}
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span>SLA Health: <strong className="text-emerald-400">48h Active</strong></span>
              <NavLink to="/followups" className="text-[#15B0F8] hover:underline font-bold">
                View Tasks →
              </NavLink>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          className="h-12 px-4 rounded-full bg-gradient-to-r from-[#0131B9] to-[#15B0F8] hover:from-[#0131B9] hover:to-[#15B0F8] text-white font-bold text-xs shadow-xl shadow-[#0131B9]/30 flex items-center gap-2 border border-white/20 transition-all transform hover:scale-105 active:scale-95 cursor-pointer"
        >
          <Bot className="w-5 h-5 text-[#FBB040]" />
          <span className="hidden sm:inline">OMVIK ASSISTANT</span>
        </button>
      </div>

    </div>
  );
}

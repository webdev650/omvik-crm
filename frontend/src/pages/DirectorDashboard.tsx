import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink } from 'react-router-dom';
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
  MessageSquare,
  ChevronRight
} from 'lucide-react';

import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getDashboardSummary } from '../api/dashboard';

// ── Color Palettes for Recharts ─────────────────────────────────────────────

const SOURCE_COLORS = [
  '#3b82f6', // Blue
  '#6366f1', // Indigo
  '#10b981', // Emerald
  '#f59e0b', // Amber
  '#ec4899', // Pink
  '#8b5cf6', // Violet
  '#ef4444'  // Red
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

export default function DirectorDashboard() {
  const { user } = useAuth();
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary,
    refetchInterval: 30_000 // Refresh every 30s
  });

  const stats = data?.stats;

  // Transform byStage map to array for BarChart
  const stageChartData = React.useMemo(() => {
    if (!stats?.byStage) return [];
    return Object.entries(stats.byStage).map(([stageKey, count]) => ({
      stage: STAGE_LABELS[stageKey] || stageKey,
      count: count as number
    }));
  }, [stats?.byStage]);

  // Transform bySource array for PieChart
  const sourceChartData = React.useMemo(() => {
    if (!stats?.bySource) return [];
    return stats.bySource.map((s: any) => ({
      name: (s.source || 'Direct').replace('_', ' '),
      value: s.count
    }));
  }, [stats?.bySource]);

  // Transform byProject array for BarChart
  const projectChartData = React.useMemo(() => {
    if (!stats?.byProject) return [];
    return stats.byProject.map((p: any) => ({
      name: p.projectName || 'Project',
      count: p.count
    }));
  }, [stats?.byProject]);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white pb-16">
      
      {/* TOP NAVIGATION BAR */}
      <Navbar />

      {/* MAIN DASHBOARD CONTENT AREA */}
      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* DASHBOARD HERO HEADING SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Executive Overview</span>
              <span>—</span>
              <span>{user?.role?.replace('_', ' ')?.toUpperCase() || 'SUPER ADMIN'} VIEW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Executive Performance Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time pipeline analytics, SLA health, and source conversion breakdown.
            </p>
          </div>

          {/* Kanban Action Button */}
          <div className="flex items-center gap-3 shrink-0">
            <NavLink
              to="/pipeline"
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Kanban className="w-4 h-4" />
              <span>Kanban Board</span>
            </NavLink>
          </div>
        </div>

        {/* LOADING STATE */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* ERROR STATE */}
        {isError && (
          <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3">
            <p className="text-red-400 text-sm font-semibold">Failed to load executive summary analytics.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
            >
              Retry
            </button>
          </div>
        )}

        {/* KPI METRIC CARDS ROW */}
        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 sm:gap-4">
              
              {/* 1. Active Leads */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Active Leads
                  </span>
                  <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                    {stats.totalActive}
                  </span>
                  <Users className="w-4 h-4 text-blue-400 opacity-60" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">In active pipeline</p>
              </div>

              {/* 2. Deals Won */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Deals Won
                  </span>
                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                    {stats.wonCount}
                  </span>
                  <Trophy className="w-4 h-4 text-emerald-400 opacity-60" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Closed successfully</p>
              </div>

              {/* 3. Deals Lost */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                    Deals Lost
                  </span>
                  <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-red-400 tracking-tight">
                    {stats.lostCount}
                  </span>
                  <XCircle className="w-4 h-4 text-red-400 opacity-60" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Unsuccessful leads</p>
              </div>

              {/* 4. SLA Breached */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">
                    SLA Breached
                  </span>
                  <div className="w-2 h-2 rounded-full bg-amber-500 shadow-sm" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-amber-400 tracking-tight">
                    {stats.slaBreachedCount}
                  </span>
                  <AlertTriangle className="w-4 h-4 text-amber-400 opacity-60" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">&gt;36h uncontacted</p>
              </div>

              {/* 5. Overdue Actions */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Overdue Actions
                  </span>
                  <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" />
                </div>
                <div className="mt-3 flex items-baseline justify-between">
                  <span className="text-2xl sm:text-3xl font-black text-indigo-300 tracking-tight">
                    {stats.overdueFollowups}
                  </span>
                  <Clock className="w-4 h-4 text-indigo-400 opacity-60" />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">Missed follow-ups</p>
              </div>
            </div>

            {/* MAIN CONTENT TWO-COLUMN GRID (70% / 30%) */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
              
              {/* LEFT (70% / 8 cols): Pipeline Funnel Breakdown */}
              <div className="lg:col-span-8 bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                      <span>Pipeline Funnel Breakdown</span>
                    </h3>
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
                      <Bar dataKey="count" fill="#4f46e5" radius={[6, 6, 0, 0]} barSize={34} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* RIGHT (30% / 4 cols): Lead Sources */}
              <div className="lg:col-span-4 bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Lead Sources</h3>
                    <p className="text-xs text-slate-400">Channel breakdown</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700/60">
                    Distribution
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
                          wrapperStyle={{ fontSize: '11px', color: '#94a3b8' }}
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  )}
                </div>
              </div>
            </div>

            {/* PROJECT DISTRIBUTION SECTION (IF AVAILABLE) */}
            {projectChartData.length > 0 && (
              <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm">
                <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
                  <div>
                    <h3 className="text-base sm:text-lg font-bold text-white">Opportunities by Project</h3>
                    <p className="text-xs text-slate-400">Active distribution per property project</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-md bg-slate-800 text-slate-300 text-[11px] font-semibold border border-slate-700/60">
                    Active Projects
                  </span>
                </div>

                <div className="h-64 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }}
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                      />
                      <Bar dataKey="count" fill="#38bdf8" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </>
        )}
      </main>

      {/* ── INTEGRATED OMVIK SALES ASSISTANT FLOATING WIDGET ─────────────────────── */}
      <div className="fixed bottom-5 right-5 z-40 flex flex-col items-end">
        {isAssistantOpen && (
          <div className="mb-3 w-80 sm:w-96 rounded-2xl bg-[#0d1322] border border-slate-800 shadow-2xl backdrop-blur-2xl p-4 text-xs space-y-3 animate-in fade-in slide-in-from-bottom-5 duration-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
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
              <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                <Sparkles className="w-3.5 h-3.5" />
                <span>Daily Action Summary</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Fantastic job! Your daily action inbox is clean today. No immediate SLA escalations required.
              </p>
            </div>

            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1 border-t border-slate-800/60">
              <span>SLA Health: <strong className="text-emerald-400">Optimal</strong></span>
              <NavLink to="/followups" className="text-indigo-400 hover:underline font-bold">
                View Tasks →
              </NavLink>
            </div>
          </div>
        )}

        <button
          onClick={() => setIsAssistantOpen(!isAssistantOpen)}
          className="h-12 px-4 rounded-full bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs shadow-xl shadow-indigo-600/30 flex items-center gap-2 border border-white/20 transition-all transform hover:scale-105 active:scale-95"
        >
          <Bot className="w-5 h-5 text-amber-300" />
          <span className="hidden sm:inline">OMVIK ASSISTANT</span>
        </button>
      </div>

    </div>
  );
}

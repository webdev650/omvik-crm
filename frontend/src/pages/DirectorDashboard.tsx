import React from 'react';
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

import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getDashboardSummary } from '../api/dashboard';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';

// ── Color Palettes for Recharts ─────────────────────────────────────────────

const SOURCE_COLORS = [
  '#6366f1', // Indigo
  '#06b6d4', // Cyan
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
              📊 Executive Overview — {user?.role?.toUpperCase()} VIEW
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Executive Performance Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Real-time pipeline analytics, SLA health, and source conversion breakdown.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/pipeline"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <span>📋 Kanban Board</span>
            </NavLink>
          </div>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-28 bg-slate-900/60 rounded-2xl animate-pulse" />
            ))}
          </div>
        )}

        {/* Error State */}
        {isError && (
          <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3">
            <p className="text-red-400 font-semibold">Failed to load executive summary analytics.</p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700"
            >
              Retry
            </button>
          </div>
        )}

        {/* Key Performance Indicators */}
        {stats && (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Active Leads</p>
                  <p className="text-3xl font-extrabold text-white mt-2">{stats.totalActive}</p>
                  <p className="text-[11px] text-slate-400 mt-1">In active pipeline</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-emerald-500 uppercase tracking-wider">Deals Won</p>
                  <p className="text-3xl font-extrabold text-emerald-400 mt-2">{stats.wonCount}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Closed successfully</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-red-500 uppercase tracking-wider">Deals Lost</p>
                  <p className="text-3xl font-extrabold text-red-400 mt-2">{stats.lostCount}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Unsuccessful leads</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-amber-500 uppercase tracking-wider">SLA Breached</p>
                  <p className="text-3xl font-extrabold text-amber-400 mt-2">{stats.slaBreachedCount}</p>
                  <p className="text-[11px] text-slate-400 mt-1">&gt;36h uncontacted</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
                <CardContent className="p-5">
                  <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Overdue Actions</p>
                  <p className="text-3xl font-extrabold text-indigo-300 mt-2">{stats.overdueFollowups}</p>
                  <p className="text-[11px] text-slate-400 mt-1">Missed follow-ups</p>
                </CardContent>
              </Card>
            </div>

            {/* Charts Section: Pipeline Funnel BarChart & Source PieChart */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Funnel BarChart (Spans 2 columns) */}
              <Card className="lg:col-span-2 border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>📈 Pipeline Funnel Breakdown</span>
                    <span className="text-xs font-normal text-slate-400">By Stage</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72 pt-2">
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
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                      />
                      <Bar dataKey="count" fill="#6366f1" radius={[6, 6, 0, 0]} barSize={32} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>

              {/* Source Breakdown PieChart */}
              <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>🎯 Lead Sources</span>
                    <span className="text-xs font-normal text-slate-400">Distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-72 flex items-center justify-center pt-2">
                  {sourceChartData.length === 0 ? (
                    <p className="text-xs text-slate-500">No source data recorded yet</p>
                  ) : (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={sourceChartData}
                          cx="50%"
                          cy="45%"
                          innerRadius={50}
                          outerRadius={80}
                          paddingAngle={4}
                          dataKey="value"
                        >
                          {sourceChartData.map((_entry: any, index: number) => (
                            <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
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
                </CardContent>
              </Card>
            </div>

            {/* Project Breakdown BarChart */}
            {projectChartData.length > 0 && (
              <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="text-base font-bold flex items-center justify-between">
                    <span>🏢 Opportunities by Project</span>
                    <span className="text-xs font-normal text-slate-400">Active distribution</span>
                  </CardTitle>
                </CardHeader>
                <CardContent className="h-64 pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={projectChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis dataKey="name" stroke="#64748b" fontSize={11} tickLine={false} />
                      <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc' }}
                        cursor={{ fill: '#1e293b', opacity: 0.5 }}
                      />
                      <Bar dataKey="count" fill="#06b6d4" radius={[6, 6, 0, 0]} barSize={40} />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        )}
      </div>
    </div>
  );
}

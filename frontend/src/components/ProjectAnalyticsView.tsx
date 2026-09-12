import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
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
  BarChart2,
  PieChart as PieIcon,
  Filter
} from 'lucide-react';
import { getDashboardSummary } from '../api/dashboard';
import api from '../api/axios';
import { Input } from './ui/input';

const SOURCE_COLORS = [
  '#0131B9', // Deep Blue
  '#15B0F8', // Vibrant Light Blue
  '#FBB040', // Golden Yellow
  '#FF0000', // Crimson Red
  '#8b5cf6', // Violet
  '#ec4899', // Pink
  '#10b981'  // Emerald
];

const DEEP_DIVE_COLORS = [
  '#3b82f6', // Active Leads - Electric Blue
  '#f59e0b', // Inactive Leads - Golden Yellow
  '#10b981', // Bookings (Won) - Emerald Green
  '#ef4444'  // Site Visits - Coral Red
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

const RADIAN = Math.PI / 180;
const renderPieSliceLabel = ({ cx, cy, midAngle, innerRadius, outerRadius, percent }: any) => {
  if (!percent || percent <= 0.03) return null;
  const radius = innerRadius + (outerRadius - innerRadius) * 0.55;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);

  return (
    <text
      x={x}
      y={y}
      fill="#ffffff"
      textAnchor="middle"
      dominantBaseline="central"
      fontSize={13}
      fontWeight={900}
      style={{ filter: 'drop-shadow(0px 2px 4px rgba(0,0,0,0.8))' }}
    >
      {`${(percent * 100).toFixed(0)}%`}
    </text>
  );
};

export default function ProjectAnalyticsView() {
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [bestDateRange] = useState<'this_month' | 'this_year' | 'all_time'>('this_month');

  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: async () => {
      const res = await api.get('/projects');
      return res.data;
    }
  });

  const { data: usersData } = useQuery({
    queryKey: ['usersList'],
    queryFn: async () => {
      const res = await api.get('/users');
      return res.data;
    }
  });

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

  const stageChartData = useMemo(() => {
    if (!stats?.byStage) return [];
    return Object.entries(stats.byStage).map(([stageKey, count]) => ({
      stage: STAGE_LABELS[stageKey] || stageKey,
      count: count as number
    }));
  }, [stats?.byStage]);

  const sourceChartData = useMemo(() => {
    if (!stats?.bySource) return [];
    return stats.bySource.map((s: any) => ({
      name: (s.source || 'DIRECT').toUpperCase(),
      value: s.count
    }));
  }, [stats?.bySource]);

  const projectChartData = useMemo(() => {
    if (!stats?.byProject) return [];
    return stats.byProject.map((p: any) => ({
      name: p.projectName || 'Project',
      count: p.count
    }));
  }, [stats?.byProject]);

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

  const deepDiveTotal = useMemo(() => {
    return deepDiveChartData.reduce((acc, item) => acc + item.value, 0);
  }, [deepDiveChartData]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-64 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
        <div className="h-64 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3">
        <p className="text-red-400 text-sm font-semibold">Failed to load project analytics.</p>
        <button
          onClick={() => refetch()}
          className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* SECTION 3A: OPPORTUNITIES BY PROJECT OVERVIEW */}
      <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white">Opportunities by Project</h3>
            <p className="text-xs text-slate-400">Total active opportunities across all real-estate projects</p>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-slate-800 text-[#15B0F8] text-[11px] font-bold border border-slate-700/60 flex items-center gap-1.5">
            <BarChart2 className="w-3.5 h-3.5" />
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

      {/* SECTION 3B: HIGH-END SOLID BASIC PIE CHART DISTRIBUTION & RATIOS */}
      <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#0131B9]/30 to-[#15B0F8]/20 text-[#15B0F8] border border-[#15B0F8]/40 flex items-center justify-center shadow-md">
              <PieIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-lg font-extrabold text-white tracking-tight">Project Deep Dive & Stage Conversion Analytics</h3>
              <p className="text-xs text-slate-400">Filter by Project (e.g. MCO), Employee, & Date Range to analyze solid pie chart distribution</p>
            </div>
          </div>

          <div className="px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-800 text-xs font-mono text-[#15B0F8]">
            Total Segment Leads: <strong>{deepDiveTotal}</strong>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 bg-[#0b0f19] p-4 rounded-2xl border border-slate-800/90 shadow-inner">
          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">Filter by Project (e.g. MCO)</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="w-full bg-[#131c31] border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5 font-bold focus:border-[#15B0F8] transition-colors"
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
              className="w-full bg-[#131c31] border border-slate-700 text-xs text-slate-200 rounded-xl p-2.5 font-bold focus:border-[#15B0F8] transition-colors"
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
              className="bg-[#131c31] border-slate-700 text-xs text-slate-200 font-bold rounded-xl h-10"
            />
          </div>

          <div>
            <label className="text-[11px] font-bold text-slate-400 block mb-1">End Date (dt/month/yr)</label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="bg-[#131c31] border-slate-700 text-xs text-slate-200 font-bold rounded-xl h-10"
            />
          </div>
        </div>

        {/* Deep Dive Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          <div className="lg:col-span-7 bg-[#0b0f19] p-5 sm:p-6 rounded-2xl border border-slate-800/90 shadow-md">
            <div className="flex items-center justify-between mb-4 border-b border-slate-800/60 pb-3">
              <h4 className="text-sm font-extrabold text-white tracking-wide">Basic Pie Chart Distribution</h4>
              <span className="text-xs text-slate-400 font-mono">
                {startDate && endDate ? `${startDate} — ${endDate}` : 'Overall Date Scope'}
              </span>
            </div>

            <div className="h-80 w-full flex items-center justify-center">
              {deepDiveTotal === 0 ? (
                <p className="text-xs text-slate-500 italic">No stage metrics recorded for the selected project filter.</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={deepDiveChartData}
                      cx="50%"
                      cy="45%"
                      outerRadius={105}
                      innerRadius={0}
                      dataKey="value"
                      label={renderPieSliceLabel}
                      labelLine={false}
                    >
                      {deepDiveChartData.map((_entry: any, index: number) => (
                        <Cell key={`cell-${index}`} fill={DEEP_DIVE_COLORS[index % DEEP_DIVE_COLORS.length]} stroke="#0b0f19" strokeWidth={2} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '14px', color: '#f8fafc', fontSize: '12px', fontWeight: 'bold' }}
                      formatter={(val: any, name: any) => [`${val} Leads`, name]}
                    />
                    <Legend
                      verticalAlign="bottom"
                      height={44}
                      iconType="circle"
                      wrapperStyle={{ fontSize: '12px', fontWeight: '700', color: '#cbd5e1' }}
                      formatter={(value) => {
                        const item = deepDiveChartData.find(d => d.name === value);
                        return `${value} (${item?.value || 0})`;
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </div>

          <div className="lg:col-span-5 space-y-4">
            <h4 className="text-sm font-extrabold text-white tracking-wide mb-1">Stage Conversion Ratios</h4>

            <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between hover:border-[#3b82f6]/50 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-200">Contacted : Visits</p>
                <p className="text-[11px] text-slate-400">Contacted leads vs Completed Site Visits</p>
              </div>
              <span className="text-2xl font-black text-[#3b82f6] font-mono tracking-tight">
                {stats?.projectDeepDive?.ratios?.contactedToVisits || '0:0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between hover:border-emerald-500/50 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-200">Contacted : Bookings</p>
                <p className="text-[11px] text-slate-400">Contacted leads vs Won Bookings</p>
              </div>
              <span className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {stats?.projectDeepDive?.ratios?.contactedToBookings || '0:0'}
              </span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800 flex items-center justify-between hover:border-[#f59e0b]/50 transition-colors">
              <div>
                <p className="text-xs font-bold text-slate-200">Visits : Bookings</p>
                <p className="text-[11px] text-slate-400">Completed Site Visits vs Won Bookings</p>
              </div>
              <span className="text-2xl font-black text-[#f59e0b] font-mono tracking-tight">
                {stats?.projectDeepDive?.ratios?.visitsToBookings || '0:0'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: LEAD SOURCES & FUNNEL */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 sm:gap-6">
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
                <XAxis dataKey="stage" stroke="#64748b" fontSize={11} tickLine={false} interval={0} angle={-15} textAnchor="end" />
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
                  <Pie data={sourceChartData} cx="50%" cy="42%" innerRadius={50} outerRadius={78} paddingAngle={4} dataKey="value">
                    {sourceChartData.map((_entry: any, index: number) => (
                      <Cell key={`cell-${index}`} fill={SOURCE_COLORS[index % SOURCE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px', color: '#f8fafc', fontSize: '12px' }} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase' }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

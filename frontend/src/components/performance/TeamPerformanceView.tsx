import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Users,
  Trophy,
  CheckCircle2,
  AlertTriangle,
  Home,
  PhoneCall,
  PhoneForwarded,
  Download,
  Search,
  Filter,
  Calendar,
  Layers,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  X,
  ExternalLink,
  Crown,
  Flame,
  FileSpreadsheet
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid
} from 'recharts';
import {
  getTeamPerformance,
  getEmployeeTeamDetail,
  EmployeePerformanceRow,
  PerformanceFilterParams
} from '../../api/performance';
import { getProjects } from '../../api/projects';
import { getTeams } from '../../api/teams';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import useAuth from '../../hooks/useAuth';

type SortField =
  | 'rank'
  | 'name'
  | 'employeeId'
  | 'totalLeads'
  | 'calls'
  | 'connectedRate'
  | 'followupsCompleted'
  | 'followupsOverdue'
  | 'siteVisits'
  | 'dealsWon'
  | 'conversionRate'
  | 'eodDays';

export default function TeamPerformanceView() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Filters State
  const [range, setRange] = useState<string>('this_month');
  const [customFrom, setCustomFrom] = useState<string>('');
  const [customTo, setCustomTo] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('all');
  const [teamId, setTeamId] = useState<string>('all');
  const [search, setSearch] = useState<string>('');

  // Table Sorting State
  const [sortField, setSortField] = useState<SortField>('rank');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // Selected Employee for Detail Modal
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);

  // Query Projects & Teams for Filter Dropdowns
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'list'],
    queryFn: () => getProjects()
  });

  const { data: teamsData } = useQuery({
    queryKey: ['teams', 'list'],
    queryFn: () => getTeams(),
    enabled: ['super_admin', 'admin', 'director'].includes(user?.role || '')
  });

  const projects = Array.isArray(projectsData?.projects)
    ? projectsData.projects
    : Array.isArray(projectsData)
    ? projectsData
    : [];

  const teams = Array.isArray(teamsData?.teams)
    ? teamsData.teams
    : Array.isArray(teamsData)
    ? teamsData
    : [];

  // Team Performance Query
  const queryParams: PerformanceFilterParams = useMemo(() => {
    return {
      range,
      from: range === 'custom' ? customFrom : undefined,
      to: range === 'custom' ? customTo : undefined,
      projectId: projectId !== 'all' ? projectId : undefined,
      teamId: teamId !== 'all' ? teamId : undefined,
      search: search.trim() ? search.trim() : undefined
    };
  }, [range, customFrom, customTo, projectId, teamId, search]);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teamPerformance', queryParams],
    queryFn: () => getTeamPerformance(queryParams)
  });

  // Single Employee Detail Query
  const { data: detailData, isLoading: isLoadingDetail } = useQuery({
    queryKey: ['employeeTeamDetail', selectedUserId, queryParams],
    queryFn: () =>
      selectedUserId
        ? getEmployeeTeamDetail(selectedUserId, {
            range,
            from: range === 'custom' ? customFrom : undefined,
            to: range === 'custom' ? customTo : undefined,
            projectId: projectId !== 'all' ? projectId : undefined
          })
        : null,
    enabled: !!selectedUserId
  });

  const totals = data?.totals || {
    totalLeads: 0,
    calls: 0,
    connectedCalls: 0,
    connectedRate: 0,
    followupsCompleted: 0,
    followupsOverdue: 0,
    siteVisits: 0,
    dealsWon: 0,
    conversionRate: 0
  };

  const rawEmployees = data?.employees || [];

  // Sort employees according to active column
  const sortedEmployees = useMemo(() => {
    const list = [...rawEmployees];
    list.sort((a, b) => {
      let valA: any = a[sortField];
      let valB: any = b[sortField];

      if (typeof valA === 'string') {
        valA = valA.toLowerCase();
        valB = valB.toLowerCase();
        return sortDirection === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }

      valA = Number(valA) || 0;
      valB = Number(valB) || 0;
      return sortDirection === 'asc' ? valA - valB : valB - valA;
    });
    return list;
  }, [rawEmployees, sortField, sortDirection]);

  // Handle Header Sort Click
  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortField(field);
      // For numerical stats, default to descending on first click, except rank
      setSortDirection(field === 'name' || field === 'employeeId' || field === 'rank' ? 'asc' : 'desc');
    }
  };

  const renderSortIcon = (field: SortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-500 opacity-60 ml-1 inline" />;
    }
    return sortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-indigo-400 ml-1 inline" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-400 ml-1 inline" />
    );
  };

  // CSV Export
  const handleExportCSV = () => {
    if (!sortedEmployees.length) return;

    const headers = [
      'Rank',
      'Name',
      'Employee ID',
      'Role',
      'Team',
      'Total Leads',
      'Calls',
      'Connected %',
      'Follow-ups Completed',
      'Overdue Follow-ups',
      'Site Visits',
      'Deals Won',
      'Conversion %',
      'EOD Submitted (Days / Working Days)'
    ];

    const rows = sortedEmployees.map(emp => [
      emp.rank || '',
      `"${emp.name.replace(/"/g, '""')}"`,
      emp.employeeId,
      emp.role,
      `"${(emp.teamName || '').replace(/"/g, '""')}"`,
      emp.totalLeads,
      emp.calls,
      `${emp.connectedRate}%`,
      emp.followupsCompleted,
      emp.followupsOverdue,
      emp.siteVisits,
      emp.dealsWon,
      `${emp.conversionRate}%`,
      `"${emp.eodSubmitted}"`
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map(e => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    const dateTag = data?.from ? `${data.from}_to_${data.to}` : range;
    link.setAttribute('download', `omvik-team-performance-${dateTag}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Bar chart dataset (Top employees on Calls & Deals Won)
  const chartData = useMemo(() => {
    return sortedEmployees.map(emp => ({
      name: emp.name.split(' ')[0],
      fullName: emp.name,
      calls: emp.calls,
      dealsWon: emp.dealsWon
    }));
  }, [sortedEmployees]);

  return (
    <div className="space-y-6">
      {/* ── Page Hero Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
            <Users className="w-3.5 h-3.5" />
            <span>Team Performance & Conversion Audit</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Team Performance
          </h1>
          <p className="text-xs sm:text-sm text-slate-400">
            Real-time conversion ratios, system-logged call activities, site visits, and deals won across all staff.
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap shrink-0">
          <div className="px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-800 font-mono text-xs text-indigo-400 font-bold">
            {data?.workingDays || 0} Working Days ({data?.from || '—'} to {data?.to || '—'})
          </div>
          <Button
            onClick={handleExportCSV}
            disabled={!sortedEmployees.length || isLoading}
            variant="outline"
            className="border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 text-xs font-bold gap-2 rounded-xl h-9"
          >
            <Download className="w-3.5 h-3.5 text-indigo-400" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* ── Filter Toolbar ── */}
      <div className="bg-[#131c31] border border-slate-800/80 p-4 sm:p-5 rounded-2xl shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          {/* Quick Date Range Pills */}
          <div className="flex items-center gap-1.5 flex-wrap">
            {[
              { id: 'today', label: 'Today' },
              { id: 'yesterday', label: 'Yesterday' },
              { id: 'last_7_days', label: 'Last 7 Days' },
              { id: 'this_month', label: 'This Month' },
              { id: 'last_month', label: 'Last Month' },
              { id: 'custom', label: 'Custom' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setRange(tab.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  range === tab.id
                    ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                    : 'bg-[#0b0f19] border border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative min-w-[240px] sm:w-72">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search employee or ID..."
              className="pl-9 pr-8 h-9 text-xs bg-[#0b0f19] border-slate-800 text-slate-100 placeholder:text-slate-500 rounded-xl focus:border-indigo-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Secondary Filters (Project, Team, Custom Date Inputs) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
          {/* Project Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Project
            </label>
            <select
              value={projectId}
              onChange={e => setProjectId(e.target.value)}
              className="w-full h-9 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="all">All Projects</option>
              {projects.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {p.name} {p.code ? `(${p.code})` : ''}
                </option>
              ))}
            </select>
          </div>

          {/* Team Filter */}
          <div className="space-y-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Team
            </label>
            {user?.role === 'team_lead' ? (
              <div className="h-9 px-3 flex items-center rounded-xl border border-slate-800 bg-[#0b0f19] text-xs text-indigo-400 font-bold">
                My Assigned Team
              </div>
            ) : (
              <select
                value={teamId}
                onChange={e => setTeamId(e.target.value)}
                className="w-full h-9 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="all">All Teams</option>
                {teams.map((t: any) => (
                  <option key={t._id} value={t._id}>
                    {t.name}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Custom Date Pickers */}
          {range === 'custom' && (
            <>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  From Date
                </label>
                <input
                  type="date"
                  value={customFrom}
                  onChange={e => setCustomFrom(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  To Date
                </label>
                <input
                  type="date"
                  value={customTo}
                  onChange={e => setCustomTo(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
            </>
          )}
        </div>
      </div>

      {/* ── Loading / Error State ── */}
      {isLoading ? (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="h-32 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            <div className="h-32 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-28 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        </div>
      ) : isError ? (
        <div className="bg-[#131c31] border border-red-500/30 p-8 rounded-2xl text-center space-y-3">
          <p className="text-red-400 text-xs font-semibold">Failed to load team performance data.</p>
          <Button onClick={() => refetch()} className="bg-slate-800 text-slate-200 text-xs font-bold">
            Retry Load
          </Button>
        </div>
      ) : (
        <>
          {/* ── SECTION 1: TOP 8 TEAM METRIC CARDS ── */}
          <div className="space-y-4">
            {/* 2 Main Highlight Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              {/* Conversion Rate Card */}
              <div className="p-6 rounded-2xl bg-[#131c31] border border-indigo-500/30 shadow-sm relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Team Conversion Rate (Win Ratio)
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-white">{totals.conversionRate}%</span>
                  <span className="text-xs font-bold text-indigo-300">
                    {totals.dealsWon} Won / {totals.totalLeads} Total Leads
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Percentage of assigned team opportunities successfully closed as Won.
                </p>
              </div>

              {/* Deals Closed Won Card */}
              <div className="p-6 rounded-2xl bg-[#131c31] border border-emerald-500/30 shadow-sm relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Team Deals Closed Won
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-white">{totals.dealsWon}</span>
                  <span className="text-xs font-bold text-emerald-400">Total Closed Sales</span>
                </div>
                <p className="text-xs text-slate-400">
                  Total client agreements signed and finalized across telecalling & field staff.
                </p>
              </div>
            </div>

            {/* 6 Metric Tiles (Total Leads, Calls, Connected Calls, Follow-ups, Overdue, Site Visits) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              {/* Total Leads Owned */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Total Leads Owned</span>
                </p>
                <p className="text-3xl font-black text-white">{totals.totalLeads}</p>
                <p className="text-xs text-slate-500">Assigned opportunities in period</p>
              </div>

              {/* Total Calls */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400 flex items-center gap-1.5">
                  <PhoneCall className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Total Calls</span>
                </p>
                <p className="text-3xl font-black text-indigo-300">{totals.calls}</p>
                <p className="text-xs text-slate-500">System-logged call activities</p>
              </div>

              {/* Connected Calls */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400 flex items-center gap-1.5">
                  <PhoneForwarded className="w-3.5 h-3.5 text-teal-400" />
                  <span>Connected Calls</span>
                </p>
                <p className="text-3xl font-black text-teal-300">{totals.connectedCalls}</p>
                <p className="text-xs text-slate-500">{totals.connectedRate}% connection rate</p>
              </div>

              {/* Follow-ups Completed */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Follow-ups Done</span>
                </p>
                <p className="text-3xl font-black text-emerald-400">{totals.followupsCompleted}</p>
                <p className="text-xs text-slate-500">Logged client touchpoints</p>
              </div>

              {/* Overdue Follow-ups */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Overdue Follow-ups</span>
                </p>
                <p className="text-3xl font-black text-red-400">{totals.followupsOverdue}</p>
                <p className="text-xs text-slate-500">Action items requiring call</p>
              </div>

              {/* Site Visits Driven */}
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Site Visits Driven</span>
                </p>
                <p className="text-3xl font-black text-cyan-300">{totals.siteVisits}</p>
                <p className="text-xs text-slate-500">Completed & advanced visits</p>
              </div>
            </div>
          </div>

          {/* ── SECTION 2: COMPARISON BAR CHART ── */}
          {chartData.length > 0 && (
            <div className="bg-[#131c31] border border-slate-800/80 p-5 rounded-2xl shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <span>Employee Benchmark: Calls & Deals Won</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Comparative breakdown of calls made vs agreements successfully closed won in this date range.
                  </p>
                </div>
                <span className="text-[11px] font-mono text-slate-500">
                  {chartData.length} Staff Member{chartData.length !== 1 ? 's' : ''}
                </span>
              </div>

              <div className="h-64 sm:h-72 w-full pt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 25 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                    <XAxis
                      dataKey="name"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis stroke="#64748b" fontSize={11} tickLine={false} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0b0f19',
                        borderColor: '#334155',
                        borderRadius: '12px',
                        fontSize: '12px',
                        color: '#f8fafc'
                      }}
                      formatter={(val: any, name: any) => [
                        val,
                        name === 'calls' ? 'Calls Logged' : 'Deals Closed Won'
                      ]}
                      labelFormatter={(label, payload) => {
                        const row = payload?.[0]?.payload;
                        return row?.fullName || label;
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      align="right"
                      wrapperStyle={{ paddingBottom: '10px', fontSize: '11px' }}
                    />
                    <Bar dataKey="calls" name="Calls" fill="#6366f1" radius={[4, 4, 0, 0]} maxBarSize={32} />
                    <Bar dataKey="dealsWon" name="Deals Won" fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          )}

          {/* ── SECTION 3: EMPLOYEE PERFORMANCE TABLE ── */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <span>Employee Performance Ranking</span>
                  <Badge variant="outline" className="text-indigo-400 border-indigo-500/30 text-[10px]">
                    {sortedEmployees.length} Staff
                  </Badge>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Click any employee row to inspect their personal 6-card breakdown or jump to full employee history.
                </p>
              </div>
              <div className="text-[11px] text-slate-400 flex items-center gap-3">
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400" /> Top Performer
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-red-400" /> High Overdue
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-slate-600" /> Zero Activity
                </span>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-800 bg-[#0b0f19]/70 text-slate-400 select-none">
                    <th
                      onClick={() => handleSort('rank')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors"
                    >
                      Rank {renderSortIcon('rank')}
                    </th>
                    <th
                      onClick={() => handleSort('name')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors min-w-[150px]"
                    >
                      Name {renderSortIcon('name')}
                    </th>
                    <th
                      onClick={() => handleSort('employeeId')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors min-w-[130px]"
                    >
                      Employee ID {renderSortIcon('employeeId')}
                    </th>
                    <th
                      onClick={() => handleSort('totalLeads')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right"
                    >
                      Total Leads {renderSortIcon('totalLeads')}
                    </th>
                    <th
                      onClick={() => handleSort('calls')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right"
                    >
                      Calls {renderSortIcon('calls')}
                    </th>
                    <th
                      onClick={() => handleSort('connectedRate')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right min-w-[100px]"
                    >
                      Connected % {renderSortIcon('connectedRate')}
                    </th>
                    <th
                      onClick={() => handleSort('followupsCompleted')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right min-w-[110px]"
                    >
                      Follow-ups Done {renderSortIcon('followupsCompleted')}
                    </th>
                    <th
                      onClick={() => handleSort('followupsOverdue')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right min-w-[110px]"
                    >
                      Overdue Follow-ups {renderSortIcon('followupsOverdue')}
                    </th>
                    <th
                      onClick={() => handleSort('siteVisits')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right min-w-[90px]"
                    >
                      Site Visits {renderSortIcon('siteVisits')}
                    </th>
                    <th
                      onClick={() => handleSort('dealsWon')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right"
                    >
                      Deals Won {renderSortIcon('dealsWon')}
                    </th>
                    <th
                      onClick={() => handleSort('conversionRate')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right min-w-[95px]"
                    >
                      Conversion % {renderSortIcon('conversionRate')}
                    </th>
                    <th
                      onClick={() => handleSort('eodDays')}
                      className="py-3 px-3.5 font-bold cursor-pointer hover:text-white transition-colors text-right min-w-[130px]"
                    >
                      EOD Submitted {renderSortIcon('eodDays')}
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {sortedEmployees.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="py-12 text-center text-slate-500 text-xs">
                        No employee performance records match your current filters.
                      </td>
                    </tr>
                  ) : (
                    sortedEmployees.map((emp, index) => {
                      const isTop = (emp.rank === 1 && emp.dealsWon > 0) || index === 0;
                      return (
                        <tr
                          key={emp.userId}
                          onClick={() => setSelectedUserId(emp.userId)}
                          className={`cursor-pointer transition-colors group ${
                            emp.isHighOverdue
                              ? 'bg-red-500/5 hover:bg-red-500/10'
                              : emp.isZeroActivity
                              ? 'opacity-60 bg-slate-900/40 hover:bg-slate-900/80 hover:opacity-100'
                              : isTop
                              ? 'bg-amber-500/5 hover:bg-amber-500/10'
                              : 'hover:bg-slate-800/40'
                          }`}
                        >
                          {/* Rank */}
                          <td className="py-3 px-3.5 font-mono font-bold">
                            {isTop && emp.dealsWon > 0 ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 text-[11px]">
                                <Crown className="w-3 h-3 text-amber-400" /> #{emp.rank}
                              </span>
                            ) : (
                              <span className="text-slate-400">#{emp.rank}</span>
                            )}
                          </td>

                          {/* Name */}
                          <td className="py-3 px-3.5">
                            <div className="font-bold text-slate-100 group-hover:text-indigo-400 transition-colors flex items-center gap-1.5">
                              <span>{emp.name}</span>
                              {emp.isHighOverdue && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-red-500/20 text-red-400 border border-red-500/30 font-bold">
                                  Overdue Alert
                                </span>
                              )}
                              {emp.isZeroActivity && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-slate-800 text-slate-400 border border-slate-700 font-bold">
                                  No Activity
                                </span>
                              )}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono">
                              {emp.teamName} • {emp.role}
                            </div>
                          </td>

                          {/* Employee ID */}
                          <td className="py-3 px-3.5 font-mono text-slate-300 font-bold">
                            {emp.employeeId}
                          </td>

                          {/* Total Leads */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-200">
                            {emp.totalLeads}
                          </td>

                          {/* Calls */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-indigo-300">
                            {emp.calls}
                          </td>

                          {/* Connected % */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-teal-300">
                            {emp.connectedRate}%
                            <span className="text-[10px] text-slate-500 block font-normal">
                              ({emp.connectedCalls} connected)
                            </span>
                          </td>

                          {/* Follow-ups Completed */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-emerald-400">
                            {emp.followupsCompleted}
                          </td>

                          {/* Overdue Follow-ups */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-red-400">
                            {emp.followupsOverdue > 0 ? (
                              <span className="inline-block px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30">
                                {emp.followupsOverdue}
                              </span>
                            ) : (
                              '0'
                            )}
                          </td>

                          {/* Site Visits */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-cyan-300">
                            {emp.siteVisits}
                          </td>

                          {/* Deals Won */}
                          <td className="py-3 px-3.5 text-right font-mono font-black text-emerald-400 text-sm">
                            {emp.dealsWon}
                          </td>

                          {/* Conversion % */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-white">
                            <span
                              className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                                emp.conversionRate >= 20
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : emp.conversionRate > 0
                                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                                  : 'text-slate-400'
                              }`}
                            >
                              {emp.conversionRate}%
                            </span>
                          </td>

                          {/* EOD Submitted */}
                          <td className="py-3 px-3.5 text-right font-mono font-bold text-slate-300">
                            <span>{emp.eodSubmitted}</span>
                            <span className="text-[10px] text-slate-500 block font-normal">
                              {Math.round((emp.eodDays / Math.max(1, emp.workingDays)) * 100)}% compliance
                            </span>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* ── SECTION 4: EMPLOYEE DETAIL DRILLDOWN MODAL ── */}
      {selectedUserId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131c31] border border-slate-800 rounded-3xl max-w-4xl w-full p-6 sm:p-8 space-y-6 shadow-2xl relative my-8 animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800/80 pb-4">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider mb-1">
                  <span>Individual Performance Drilldown</span>
                </div>
                <h3 className="text-xl sm:text-2xl font-extrabold text-white">
                  {detailData?.employee?.name || 'Employee Details'}
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  ID: <span className="font-mono text-indigo-300">{detailData?.employee?.employeeId}</span> •{' '}
                  {detailData?.employee?.email} • Team: <span className="text-slate-200">{detailData?.employee?.teamName}</span>
                </p>
              </div>

              <button
                type="button"
                onClick={() => setSelectedUserId(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content: The Same 6 Cards As Employee View + Calls */}
            {isLoadingDetail ? (
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-8">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="h-28 bg-[#0b0f19] border border-slate-800 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : detailData?.performance ? (
              <div className="space-y-5">
                {/* 2 Highlight Banners */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Conversion Rate Card */}
                  <div className="p-5 rounded-2xl bg-[#0b0f19] border border-indigo-500/30 shadow-sm space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                      Conversion Rate (Win Ratio)
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {detailData.performance.winRate}%
                      </span>
                      <span className="text-xs font-bold text-indigo-300">
                        {detailData.performance.opportunitiesWon} Won / {detailData.performance.leadsOwned} Total
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Assigned opportunities successfully closed won for selected range.
                    </p>
                  </div>

                  {/* Deals Closed Won Card */}
                  <div className="p-5 rounded-2xl bg-[#0b0f19] border border-emerald-500/30 shadow-sm space-y-2">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                      Deals Closed Won
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-3xl sm:text-4xl font-black text-white">
                        {detailData.performance.opportunitiesWon}
                      </span>
                      <span className="text-xs font-bold text-emerald-400">Closed Sales</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Client contracts closed won under this employee.
                    </p>
                  </div>
                </div>

                {/* 4 Standard Tiles */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-400" />
                      <span>Total Leads Owned</span>
                    </p>
                    <p className="text-2xl font-black text-white">{detailData.performance.leadsOwned}</p>
                    <p className="text-[11px] text-slate-500">Currently assigned opportunities</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Follow-ups Completed</span>
                    </p>
                    <p className="text-2xl font-black text-emerald-400">
                      {detailData.performance.followupsCompleted}
                    </p>
                    <p className="text-[11px] text-slate-500">Logged client touchpoints</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                      <span>Overdue Follow-ups</span>
                    </p>
                    <p className="text-2xl font-black text-red-400">{detailData.performance.followupsOverdue}</p>
                    <p className="text-[11px] text-slate-500">Action items requiring call</p>
                  </div>

                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                      <Home className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Site Visits Driven</span>
                    </p>
                    <p className="text-2xl font-black text-cyan-300">
                      {detailData.performance.siteVisitsCompleted}
                    </p>
                    <p className="text-[11px] text-slate-500">Completed & advanced visits</p>
                  </div>
                </div>

                {/* Additional Activity Row (Calls & EOD) */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">System Calls Logged</p>
                    <p className="text-xl font-black text-indigo-300">{detailData.performance.calls}</p>
                    <p className="text-[10px] text-slate-500">Activities in selected range</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-teal-400">Connected Calls</p>
                    <p className="text-xl font-black text-teal-300">
                      {detailData.performance.connectedCalls} ({detailData.performance.connectedRate}%)
                    </p>
                    <p className="text-[10px] text-slate-500">Call connection percentage</p>
                  </div>
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">EOD Reports</p>
                    <p className="text-xl font-black text-amber-300">{detailData.performance.eodSubmitted}</p>
                    <p className="text-[10px] text-slate-500">Submitted vs working days</p>
                  </div>
                </div>
              </div>
            ) : null}

            {/* Modal Footer with link to /admin/employee-history */}
            <div className="border-t border-slate-800/80 pt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <Button
                variant="ghost"
                onClick={() => setSelectedUserId(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close Drilldown
              </Button>

              <Button
                onClick={() => {
                  setSelectedUserId(null);
                  navigate(`/admin/employee-history/${selectedUserId}?fromDate=${data?.from}&toDate=${data?.to}`);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold gap-2 rounded-xl h-9"
              >
                <span>View Full Timeline in Employee History</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

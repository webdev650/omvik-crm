import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'sonner';
import {
  ClipboardList,
  RefreshCw,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileWarning,
  Copy,
  Download,
  Search,
  X,
  ExternalLink,
  Check
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getTeamOverviewReport } from '../../api/dailyReports';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

type CardCategory = 'total' | 'submitted' | 'pending' | 'flagged';

interface MetricDiscrepancy {
  label: string;
  claimed: number;
  logged: number;
  text: string;
  isMismatch: boolean;
}

function formatSubmitTime(dateString?: string) {
  if (!dateString) return '—';
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

function getDiscrepancyMetrics(report: any): MetricDiscrepancy[] {
  if (!report) return [];
  const metrics: { label: string; claimed: number; logged: number }[] = [
    { label: 'Calls', claimed: report.claimedCalls ?? 0, logged: report.systemActivityCount ?? 0 },
    { label: 'Connected Calls', claimed: report.connectedCalls ?? 0, logged: report.systemConnectedCallsCount ?? 0 },
    { label: 'WhatsApp', claimed: report.whatsappMessages ?? 0, logged: report.systemWhatsappCount ?? 0 },
    { label: 'Follow-ups', claimed: report.claimedFollowups ?? 0, logged: report.systemFollowupCount ?? 0 },
    { label: 'Visits', claimed: report.claimedSiteVisits ?? 0, logged: report.systemSiteVisitCount ?? 0 },
    { label: 'Bookings', claimed: report.bookingsToday ?? 0, logged: report.systemBookingsCount ?? 0 }
  ];

  return metrics.map((m) => ({
    label: m.label,
    claimed: m.claimed,
    logged: m.logged,
    text: `${m.label}: claimed ${m.claimed} vs ${m.logged} logged`,
    isMismatch: m.claimed !== m.logged
  }));
}

function downloadCSV(filename: string, headers: string[], rows: (string | number)[][]) {
  const csvContent = [
    headers.join(','),
    ...rows.map((row) =>
      row.map((val) => `"${String(val ?? '').replace(/"/g, '""')}"`).join(',')
    )
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function TeamEODOverviewPage() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active clickable card state
  const [activeCategory, setActiveCategory] = useState<CardCategory | null>(null);
  const [panelSearch, setPanelSearch] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teamEODOverview', selectedDate],
    queryFn: () => getTeamOverviewReport(selectedDate)
  });

  const overviewList = data?.overview || [];
  const submittedCount = data?.submittedCount ?? overviewList.filter((i: any) => i.submitted).length;
  const pendingCount =
    data?.pendingCount ??
    overviewList.filter((i: any) => !i.submitted && !i.isExempt && !i.isOnLeave).length;
  const discrepantCount =
    data?.discrepantCount ??
    overviewList.filter((item: any) => item.report?.discrepancyFlag).length;
  const totalCount = data?.totalCount ?? overviewList.length;

  // Items for the selected active category (derived from the SAME overviewList)
  const categoryItems = useMemo(() => {
    if (!activeCategory) return [];
    switch (activeCategory) {
      case 'total':
        return overviewList;
      case 'submitted':
        return overviewList.filter((item: any) => item.submitted);
      case 'pending':
        return overviewList.filter((item: any) => !item.submitted && !item.isExempt && !item.isOnLeave);
      case 'flagged':
        return overviewList.filter((item: any) => item.report?.discrepancyFlag);
      default:
        return [];
    }
  }, [overviewList, activeCategory]);

  // Search filtered items within the active category panel
  const filteredPanelItems = useMemo(() => {
    if (!panelSearch.trim()) return categoryItems;
    const q = panelSearch.toLowerCase().trim();
    return categoryItems.filter((item: any) => {
      const name = item.user?.name?.toLowerCase() || '';
      const empId = item.user?.employeeId?.toLowerCase() || '';
      const role = item.user?.role?.toLowerCase() || '';
      const status = item.status?.toLowerCase() || '';
      return name.includes(q) || empId.includes(q) || role.includes(q) || status.includes(q);
    });
  }, [categoryItems, panelSearch]);

  // Main table list: optionally filtered when a card is selected
  const mainTableList = useMemo(() => {
    if (!activeCategory) return overviewList;
    return categoryItems;
  }, [activeCategory, overviewList, categoryItems]);

  const toggleCategory = (category: CardCategory) => {
    setActiveCategory((prev) => (prev === category ? null : category));
    setPanelSearch('');
  };

  const handleEmployeeClick = (empId: string) => {
    navigate(`/admin/employee-history/${empId}?date=${selectedDate}&fromDate=${selectedDate}&toDate=${selectedDate}`);
  };

  const fallbackCopy = (text: string, cb: () => void) => {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      cb();
    } catch {
      toast.error('Failed to copy to clipboard.');
    }
  };

  // Copy list to clipboard
  const handleCopyList = () => {
    if (categoryItems.length === 0) {
      toast.error('No employees in this category to copy.');
      return;
    }

    const lines = categoryItems.map(
      (item: any, idx: number) =>
        `${idx + 1}. ${item.user?.name || 'Unknown'} (${item.user?.employeeId || 'EMP'})`
    );

    const title =
      activeCategory === 'pending'
        ? `📋 Pending EOD Submissions (${selectedDate}):`
        : `📋 ${getCategoryTitle(activeCategory || 'total')} (${selectedDate}):`;

    const fullText = [title, ...lines].join('\n');

    const onSuccess = () => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      toast.success(
        activeCategory === 'pending'
          ? `Copied ${categoryItems.length} pending names to clipboard!`
          : `Copied ${categoryItems.length} names to clipboard!`
      );
    };

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(fullText).then(onSuccess, () => fallbackCopy(fullText, onSuccess));
    } else {
      fallbackCopy(fullText, onSuccess);
    }
  };

  // CSV download for the active category list
  const handleExportCSV = () => {
    if (categoryItems.length === 0) {
      toast.error('No records to export.');
      return;
    }

    const headers = [
      'Name',
      'Employee ID',
      'Role',
      'Status',
      'Submitted Time',
      'Active Leads',
      'Real Logged Calls',
      'Total Calls',
      'Connected Calls',
      'Visits',
      'Bookings',
      'Discrepancies (Claimed vs Logged)',
      'Remarks'
    ];

    const rows = categoryItems.map((item: any) => {
      const emp = item.user || {};
      const rep = item.report || {};
      const mismatches = getDiscrepancyMetrics(rep)
        .filter((m) => m.isMismatch)
        .map((m) => m.text)
        .join('; ');

      return [
        emp.name || '',
        emp.employeeId || '',
        emp.role || '',
        item.status || '',
        formatSubmitTime(rep.createdAt),
        item.currentLeadsAssigned ?? 0,
        item.realCallsCount ?? 0,
        rep.claimedCalls ?? '',
        rep.connectedCalls ?? '',
        rep.claimedSiteVisits ?? '',
        rep.bookingsToday ?? '',
        mismatches || rep.discrepancyNote || '',
        rep.notes || ''
      ];
    });

    downloadCSV(`team-eod-${activeCategory || 'list'}-${selectedDate}.csv`, headers, rows);
    toast.success('Downloaded CSV export successfully!');
  };

  const getCategoryTitle = (cat: CardCategory) => {
    switch (cat) {
      case 'total':
        return 'Total Active Team';
      case 'submitted':
        return 'EOD Submitted';
      case 'pending':
        return 'Pending Submission';
      case 'flagged':
        return 'Discrepancies Flagged';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Page Hero Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Management Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Team EOD Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Monitor daily report submission compliance and compare self-reported accomplishments against system logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-[#0b0f19] border border-slate-800 p-1.5 px-3 rounded-xl">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date:</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-36 bg-transparent border-0 text-white font-mono text-xs font-bold focus:outline-none focus:ring-0 p-0"
              />
            </div>

            {/* Quick Link to Flagged Reports */}
            <Button
              onClick={() => navigate('/admin/flagged-reports')}
              variant="outline"
              className="h-11 px-3.5 border-slate-800 bg-[#0b0f19] text-amber-400 hover:bg-slate-800 hover:text-amber-300 rounded-xl gap-2 min-h-[44px] text-xs font-bold"
            >
              <FileWarning className="w-4 h-4 text-amber-400" />
              <span>Flagged Reports ({discrepantCount})</span>
            </Button>

            {/* Refresh Button */}
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="h-11 px-3.5 border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl gap-2 min-h-[44px] text-xs font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* ── INTERACTIVE 4 SUMMARY STAT CARDS ──────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Card 1: Total Active Team */}
          <button
            type="button"
            onClick={() => toggleCategory('total')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCategory('total');
              }
            }}
            aria-expanded={activeCategory === 'total'}
            aria-controls="category-details-panel"
            aria-label={`Total Active Team: ${totalCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCategory === 'total'
                ? 'border-indigo-400 ring-2 ring-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Active Team</p>
              <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold shrink-0">
                {activeCategory === 'total' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-white font-mono mt-1">{totalCount}</p>
          </button>

          {/* Card 2: EOD Submitted */}
          <button
            type="button"
            onClick={() => toggleCategory('submitted')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCategory('submitted');
              }
            }}
            aria-expanded={activeCategory === 'submitted'}
            aria-controls="category-details-panel"
            aria-label={`EOD Submitted: ${submittedCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCategory === 'submitted'
                ? 'border-emerald-400 ring-2 ring-emerald-500/30 bg-emerald-500/15 shadow-lg shadow-emerald-500/10'
                : 'border-emerald-500/20 bg-emerald-500/5 hover:border-emerald-500/40 hover:bg-emerald-500/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">EOD Submitted</span>
              </p>
              <span className="text-[10px] text-emerald-500/70 group-hover:text-emerald-400 font-semibold shrink-0">
                {activeCategory === 'submitted' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{submittedCount}</p>
          </button>

          {/* Card 3: Pending Submission */}
          <button
            type="button"
            onClick={() => toggleCategory('pending')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCategory('pending');
              }
            }}
            aria-expanded={activeCategory === 'pending'}
            aria-controls="category-details-panel"
            aria-label={`Pending Submission: ${pendingCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCategory === 'pending'
                ? 'border-amber-400 ring-2 ring-amber-500/30 bg-amber-500/15 shadow-lg shadow-amber-500/10'
                : 'border-amber-500/20 bg-amber-500/5 hover:border-amber-500/40 hover:bg-amber-500/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Pending Submission</span>
              </p>
              <span className="text-[10px] text-amber-500/70 group-hover:text-amber-400 font-semibold shrink-0">
                {activeCategory === 'pending' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono mt-1">{pendingCount}</p>
          </button>

          {/* Card 4: Discrepancies Flagged */}
          <button
            type="button"
            onClick={() => toggleCategory('flagged')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                toggleCategory('flagged');
              }
            }}
            aria-expanded={activeCategory === 'flagged'}
            aria-controls="category-details-panel"
            aria-label={`Discrepancies Flagged: ${discrepantCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCategory === 'flagged'
                ? 'border-red-400 ring-2 ring-red-500/30 bg-red-500/15 shadow-lg shadow-red-500/10'
                : 'border-red-500/20 bg-red-500/5 hover:border-red-500/40 hover:bg-red-500/10'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5 truncate">
                <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate">Discrepancies Flagged</span>
              </p>
              <span className="text-[10px] text-red-500/70 group-hover:text-red-400 font-semibold shrink-0">
                {activeCategory === 'flagged' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-red-400 font-mono mt-1">{discrepantCount}</p>
          </button>
        </div>

        {/* ── EXPANDABLE DETAIL LIST PANEL (DIRECTLY UNDER CARDS) ─────────────── */}
        <AnimatePresence>
          {activeCategory && (
            <motion.div
              id="category-details-panel"
              key={activeCategory}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-slate-800 bg-[#101728] shadow-2xl overflow-hidden"
            >
              {/* Panel Action Header Bar */}
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0d1322] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-white">
                      {getCategoryTitle(activeCategory)} ({categoryItems.length})
                    </span>
                    <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono">
                      📅 {selectedDate}
                    </Badge>
                    <span className="text-[11px] text-indigo-400 hidden sm:inline">
                      • Click any employee name to inspect history
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {activeCategory === 'total' && 'All active team members for the selected date with their operational status.'}
                    {activeCategory === 'submitted' && 'Telecallers who submitted an EOD report for this date (flagged reports marked with badge).'}
                    {activeCategory === 'pending' && 'Telecallers who have not submitted their EOD report yet. Real system calls logged today are shown.'}
                    {activeCategory === 'flagged' && 'Reports where claimed numbers do not match system logs, showing claimed vs logged breakdown.'}
                  </p>
                </div>

                {/* Panel Action Controls: Search (8+ people), Copy list, CSV & Back to full table */}
                <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
                  {/* Small Search Box inside panel for 8+ people */}
                  {(categoryItems.length >= 8 || panelSearch.trim().length > 0) && (
                    <div className="relative w-40 sm:w-48">
                      <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                      <Input
                        type="text"
                        placeholder="Search name / ID..."
                        value={panelSearch}
                        onChange={(e) => setPanelSearch(e.target.value)}
                        className="h-8 pl-8 pr-2.5 text-xs bg-[#131c31] border-slate-700 text-slate-100 placeholder-slate-400 rounded-lg focus:border-indigo-500"
                      />
                    </div>
                  )}

                  {/* Copy List Button */}
                  <Button
                    type="button"
                    onClick={handleCopyList}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 border-slate-700 bg-[#131c31] text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg gap-1.5"
                    title={activeCategory === 'pending' ? 'Copy all pending names' : 'Copy list to clipboard'}
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{hasCopied ? 'Copied!' : 'Copy list'}</span>
                  </Button>

                  {/* CSV Export Button */}
                  <Button
                    type="button"
                    onClick={handleExportCSV}
                    size="sm"
                    variant="outline"
                    className="h-8 px-2.5 border-slate-700 bg-[#131c31] text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-lg gap-1.5"
                    title="Export list as CSV spreadsheet"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>CSV</span>
                  </Button>

                  {/* Back to full table / Close */}
                  <Button
                    type="button"
                    onClick={() => setActiveCategory(null)}
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg gap-1"
                    title="Close panel and return to full table"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Back to full table</span>
                    <span className="sm:hidden">Close</span>
                  </Button>
                </div>
              </div>

              {/* Panel Content Area */}
              <div className="p-3 sm:p-4">
                {categoryItems.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-slate-400 text-xs font-medium">
                      No one in this category for this date.
                    </p>
                  </div>
                ) : filteredPanelItems.length === 0 ? (
                  <div className="py-10 text-center space-y-2">
                    <p className="text-slate-400 text-xs font-medium">
                      No team members match your search filter.
                    </p>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPanelSearch('')}
                      className="text-xs text-indigo-400 hover:text-indigo-300"
                    >
                      Clear search
                    </Button>
                  </div>
                ) : (
                  <>
                    {/* MOBILE STACKED LIST VIEW (Zero horizontal scroll on 360px & 390px screens) */}
                    <div className="grid grid-cols-1 gap-2.5 sm:hidden">
                      {filteredPanelItems.map((item: any) => {
                        const emp = item.user;
                        const report = item.report;
                        return (
                          <div
                            key={emp._id}
                            className="p-3 rounded-xl bg-[#131c31] border border-slate-800/80 space-y-2 break-words"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleEmployeeClick(emp._id)}
                                  className="text-xs font-bold text-white hover:text-indigo-300 transition-colors text-left flex items-center gap-1 group"
                                >
                                  <span>{emp.name}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 opacity-60" />
                                </button>
                                <div className="flex items-center gap-1.5 mt-0.5">
                                  <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                                    {emp.employeeId || 'EMP'}
                                  </span>
                                  <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                                    {emp.role}
                                  </span>
                                </div>
                              </div>

                              {/* Status Badge */}
                              <div>
                                {item.status === 'Submitted' && (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                    Submitted ✓
                                  </Badge>
                                )}
                                {item.status === 'Flagged' && (
                                  <Badge variant="destructive" className="text-[10px] font-bold gap-1">
                                    Flagged ⚠️
                                  </Badge>
                                )}
                                {item.status === 'Pending' && (
                                  <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                                    Pending
                                  </Badge>
                                )}
                                {item.status === 'On leave' && (
                                  <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px] font-bold">
                                    On leave 🌴
                                  </Badge>
                                )}
                                {item.status === 'Exempt' && (
                                  <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-semibold">
                                    Exempt
                                  </Badge>
                                )}
                              </div>
                            </div>

                            {/* Mobile Metric Details based on Active Card */}
                            {activeCategory === 'total' && (
                              <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800 text-slate-400">
                                <span>Active Leads: <strong className="text-slate-200 font-mono">{item.currentLeadsAssigned ?? 0}</strong></span>
                                <span>Real Calls: <strong className="text-slate-200 font-mono">{item.realCallsCount ?? 0}</strong></span>
                              </div>
                            )}

                            {activeCategory === 'pending' && (
                              <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800 text-[11px]">
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Active Leads</span>
                                  <span className="font-mono font-bold text-indigo-300">{item.currentLeadsAssigned ?? 0}</span>
                                </div>
                                <div>
                                  <span className="text-slate-400 text-[10px] block">Real Calls Logged</span>
                                  <span className="font-mono font-bold text-blue-300">{item.realCallsCount ?? 0}</span>
                                </div>
                              </div>
                            )}

                            {activeCategory === 'submitted' && report && (
                              <div className="space-y-1.5 pt-1 border-t border-slate-800 text-[11px]">
                                <div className="flex items-center justify-between text-slate-400 text-[10px]">
                                  <span>Submit Time:</span>
                                  <span className="font-mono text-slate-200">{formatSubmitTime(report.createdAt)}</span>
                                </div>
                                <div className="grid grid-cols-4 gap-1 text-center font-mono text-[10px]">
                                  <div className="bg-[#0b0f19] p-1 rounded">
                                    <span className="text-slate-500 block text-[9px]">Calls</span>
                                    <span className="font-bold text-blue-400">{report.claimedCalls ?? 0}</span>
                                  </div>
                                  <div className="bg-[#0b0f19] p-1 rounded">
                                    <span className="text-slate-500 block text-[9px]">Conn.</span>
                                    <span className="font-bold text-cyan-400">{report.connectedCalls ?? 0}</span>
                                  </div>
                                  <div className="bg-[#0b0f19] p-1 rounded">
                                    <span className="text-slate-500 block text-[9px]">Visits</span>
                                    <span className="font-bold text-purple-400">{report.claimedSiteVisits ?? 0}</span>
                                  </div>
                                  <div className="bg-[#0b0f19] p-1 rounded">
                                    <span className="text-slate-500 block text-[9px]">Book.</span>
                                    <span className="font-bold text-amber-400">{report.bookingsToday ?? 0}</span>
                                  </div>
                                </div>
                              </div>
                            )}

                            {activeCategory === 'flagged' && report && (
                              <div className="space-y-2 pt-2 border-t border-slate-800 text-xs">
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                                    Claimed vs System Logged:
                                  </span>
                                  {(() => {
                                    const allMetrics = getDiscrepancyMetrics(report);
                                    const mismatches = allMetrics.filter((m) => m.isMismatch);
                                    const metricsToShow = mismatches.length > 0 ? mismatches : allMetrics;
                                    return (
                                      <div className="flex flex-wrap gap-1">
                                        {metricsToShow.map((m, idx) => (
                                          <span
                                            key={idx}
                                            className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-mono font-medium ${
                                              m.isMismatch
                                                ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                                            }`}
                                          >
                                            {m.text}
                                          </span>
                                        ))}
                                      </div>
                                    );
                                  })()}
                                </div>
                                <div>
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                                    Employee Remark:
                                  </span>
                                  <p className="text-slate-300 text-xs italic mt-0.5">
                                    {report.notes ? `"${report.notes}"` : 'No remarks provided'}
                                  </p>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>

                    {/* TABLET & DESKTOP TABLE VIEW */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-[#0d1322]">
                          <TableRow className="border-b border-slate-800">
                            <TableHead className="text-slate-400 font-semibold text-xs">Employee</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-center">Role</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-center">Status</TableHead>

                            {/* Contextual Columns based on active card */}
                            {activeCategory === 'total' && (
                              <>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Active Leads</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Real Calls Logged</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Submission Status</TableHead>
                              </>
                            )}

                            {activeCategory === 'submitted' && (
                              <>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Submit Time</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Total Calls</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Connected Calls</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Visits</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Bookings</TableHead>
                              </>
                            )}

                            {activeCategory === 'pending' && (
                              <>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Active Leads</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs text-center">Real Calls Logged Today</TableHead>
                              </>
                            )}

                            {activeCategory === 'flagged' && (
                              <>
                                <TableHead className="text-slate-400 font-semibold text-xs">Discrepancy Details (Claimed vs Logged)</TableHead>
                                <TableHead className="text-slate-400 font-semibold text-xs">Employee Remark</TableHead>
                              </>
                            )}

                            <TableHead className="text-slate-400 font-semibold text-xs text-right">Action</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPanelItems.map((item: any) => {
                            const emp = item.user;
                            const report = item.report;
                            return (
                              <TableRow
                                key={emp._id}
                                className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors"
                              >
                                {/* Employee Name & ID */}
                                <TableCell className="font-bold text-white text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleEmployeeClick(emp._id)}
                                    className="text-left group flex items-center gap-1.5 cursor-pointer"
                                  >
                                    <span className="text-slate-100 group-hover:text-indigo-400 transition-colors font-bold">
                                      {emp.name}
                                    </span>
                                    <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                    {emp.employeeId || 'EMP'}
                                  </p>
                                </TableCell>

                                {/* Role */}
                                <TableCell className="text-center">
                                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {emp.role}
                                  </span>
                                </TableCell>

                                {/* Status */}
                                <TableCell className="text-center">
                                  {item.status === 'Submitted' && (
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                      Submitted ✓
                                    </Badge>
                                  )}
                                  {item.status === 'Flagged' && (
                                    <Badge variant="destructive" className="text-[10px] font-bold gap-1">
                                      Flagged ⚠️
                                    </Badge>
                                  )}
                                  {item.status === 'Pending' && (
                                    <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] font-bold">
                                      Pending
                                    </Badge>
                                  )}
                                  {item.status === 'On leave' && (
                                    <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px] font-bold">
                                      On leave 🌴
                                    </Badge>
                                  )}
                                  {item.status === 'Exempt' && (
                                    <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] font-semibold">
                                      Exempt
                                    </Badge>
                                  )}
                                </TableCell>

                                {/* Total View Columns */}
                                {activeCategory === 'total' && (
                                  <>
                                    <TableCell className="text-center font-mono text-xs font-bold text-indigo-300">
                                      {item.currentLeadsAssigned ?? 0}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-xs font-bold text-blue-300">
                                      {item.realCallsCount ?? 0}
                                    </TableCell>
                                    <TableCell className="text-center text-xs text-slate-400">
                                      {item.submitted ? (
                                        <span className="text-emerald-400 font-semibold">Report Received</span>
                                      ) : item.isExempt ? (
                                        <span className="text-slate-500 italic">No report required</span>
                                      ) : item.isOnLeave ? (
                                        <span className="text-purple-400">Approved leave</span>
                                      ) : (
                                        <span className="text-amber-400 font-semibold">Awaiting EOD</span>
                                      )}
                                    </TableCell>
                                  </>
                                )}

                                {/* Submitted View Columns */}
                                {activeCategory === 'submitted' && (
                                  <>
                                    <TableCell className="text-center font-mono text-xs text-slate-200">
                                      {formatSubmitTime(report?.createdAt)}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-xs">
                                      <span className="font-bold text-blue-400">{report?.claimedCalls ?? 0}</span>
                                      <span className="text-slate-500 text-[10px] block">/ {report?.systemActivityCount ?? 0} logged</span>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-xs">
                                      <span className="font-bold text-cyan-400">{report?.connectedCalls ?? 0}</span>
                                      <span className="text-slate-500 text-[10px] block">/ {report?.systemConnectedCallsCount ?? 0} logged</span>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-xs">
                                      <span className="font-bold text-purple-400">{report?.claimedSiteVisits ?? 0}</span>
                                      <span className="text-slate-500 text-[10px] block">/ {report?.systemSiteVisitCount ?? 0} logged</span>
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-xs">
                                      <span className="font-bold text-amber-400">{report?.bookingsToday ?? 0}</span>
                                      <span className="text-slate-500 text-[10px] block">/ {report?.systemBookingsCount ?? 0} logged</span>
                                    </TableCell>
                                  </>
                                )}

                                {/* Pending View Columns */}
                                {activeCategory === 'pending' && (
                                  <>
                                    <TableCell className="text-center font-mono text-xs font-bold text-indigo-300">
                                      {item.currentLeadsAssigned ?? 0}
                                    </TableCell>
                                    <TableCell className="text-center font-mono text-xs font-bold text-blue-300">
                                      {item.realCallsCount ?? 0}
                                    </TableCell>
                                  </>
                                )}

                                {/* Flagged View Columns */}
                                {activeCategory === 'flagged' && (
                                  <>
                                    <TableCell className="text-xs">
                                      <div className="space-y-1.5 max-w-md">
                                        {(() => {
                                          const allMetrics = getDiscrepancyMetrics(report);
                                          const mismatches = allMetrics.filter((m) => m.isMismatch);
                                          const metricsToShow = mismatches.length > 0 ? mismatches : allMetrics;
                                          return (
                                            <div className="flex flex-wrap gap-1.5">
                                              {metricsToShow.map((m, idx) => (
                                                <span
                                                  key={idx}
                                                  className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-mono font-medium ${
                                                    m.isMismatch
                                                      ? 'bg-red-500/15 text-red-300 border border-red-500/30'
                                                      : 'bg-slate-800 text-slate-400 border border-slate-700'
                                                  }`}
                                                >
                                                  {m.text}
                                                </span>
                                              ))}
                                            </div>
                                          );
                                        })()}
                                        {report?.discrepancyNote && (
                                          <p className="text-amber-400/90 text-[10px] font-medium leading-tight">
                                            ⚠️ {report.discrepancyNote}
                                          </p>
                                        )}
                                      </div>
                                    </TableCell>
                                    <TableCell className="text-xs text-slate-300 max-w-xs">
                                      {report?.notes ? (
                                        <span className="italic">"{report.notes}"</span>
                                      ) : (
                                        <span className="text-slate-500">No remarks provided</span>
                                      )}
                                    </TableCell>
                                  </>
                                )}

                                {/* Action */}
                                <TableCell className="text-right">
                                  <Button
                                    type="button"
                                    onClick={() => handleEmployeeClick(emp._id)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-indigo-400 hover:text-white hover:bg-slate-800 gap-1"
                                  >
                                    <span>History</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                        </TableBody>
                      </Table>
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── MAIN DAILY TEAM COMPLIANCE LOG TABLE ───────────────────────────── */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19] flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📋 Daily Team Compliance Log ({selectedDate})</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                (Unsubmitted telecallers sorted at top)
              </span>
            </h4>

            {activeCategory && (
              <div className="flex items-center gap-2">
                <span className="text-[11px] text-indigo-400 font-medium">
                  Filtered by: <strong>{getCategoryTitle(activeCategory)}</strong> ({mainTableList.length})
                </span>
                <Button
                  type="button"
                  onClick={() => setActiveCategory(null)}
                  variant="outline"
                  size="sm"
                  className="h-7 px-2.5 border-slate-700 bg-slate-900 text-xs text-slate-300 hover:text-white rounded-lg gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Back to full table</span>
                </Button>
              </div>
            )}
          </div>

          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400 text-xs font-bold">
              Failed to load team EOD overview.
            </div>
          ) : mainTableList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No active team members match the current filter.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-400 font-semibold text-xs">Telecaller</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Status</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Active Leads</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">WhatsApp</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Total Calls</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Connected Calls</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Visits</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Bookings</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Notes / Discrepancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {mainTableList.map((item: any) => {
                    const emp = item.user;
                    const report = item.report;
                    const isSubmitted = item.submitted;
                    const isRequired = item.isRequiredSubmitter ?? ['telecaller', 'team_lead'].includes(emp.role);
                    const isDiscrepant = report?.discrepancyFlag;

                    return (
                      <TableRow
                        key={emp._id}
                        className={`border-b border-slate-800/40 transition-colors ${
                          !isSubmitted && isRequired
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : isDiscrepant
                            ? 'bg-red-500/5 hover:bg-red-500/10'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Employee Name & ID */}
                        <TableCell className="font-bold text-white text-xs">
                          <div>
                            <button
                              type="button"
                              onClick={() => handleEmployeeClick(emp._id)}
                              className="text-slate-100 hover:text-indigo-400 transition-colors text-left font-bold cursor-pointer"
                            >
                              {emp.name}
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                                {emp.employeeId || 'EMP'}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                                {emp.role}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          {!isSubmitted ? (
                            item.isOnLeave ? (
                              <Badge className="bg-purple-500/15 text-purple-300 border-purple-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1">
                                On leave 🌴
                              </Badge>
                            ) : isRequired ? (
                              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1">
                                Pending
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5">
                                N/A (Exempt)
                              </Badge>
                            )
                          ) : isDiscrepant ? (
                            <Badge variant="destructive" className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 gap-1">
                              <span>Flagged ⚠️</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1">
                              Submitted ✓
                            </Badge>
                          )}
                        </TableCell>

                        {/* Current Active Leads Assigned */}
                        <TableCell className="text-center font-mono text-xs font-extrabold text-indigo-300">
                          {item.currentLeadsAssigned ?? 0}
                        </TableCell>

                        {/* WhatsApp Messages */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-emerald-400">{report.whatsappMessages ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemWhatsappCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Total Calls */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-blue-400">{report.claimedCalls ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemActivityCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <div>
                              <span className="text-slate-400 font-mono font-bold">{item.realCallsCount ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">logged</span>
                            </div>
                          )}
                        </TableCell>

                        {/* Connected Calls */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-cyan-400">{report.connectedCalls ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemConnectedCallsCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Site Visits */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-purple-400">{report.claimedSiteVisits ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemSiteVisitCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Bookings */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-amber-400">{report.bookingsToday ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemBookingsCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Notes & Discrepancies */}
                        <TableCell className="text-xs text-slate-300">
                          {isSubmitted ? (
                            <div className="space-y-1 max-w-xs">
                              {isDiscrepant && (
                                <p className="text-[11px] text-amber-400 font-semibold leading-tight">
                                  ⚠️ {report.discrepancyNote}
                                </p>
                              )}
                              <p className="text-slate-400 truncate">
                                {report.notes ? `"${report.notes}"` : 'No remarks'}
                              </p>
                            </div>
                          ) : item.isOnLeave ? (
                            <span className="text-purple-400/90 text-[11px] font-semibold">Approved leave record</span>
                          ) : isRequired ? (
                            <span className="text-amber-400/80 text-[11px] italic font-semibold">Report not submitted yet</span>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Exempt from EOD submission</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

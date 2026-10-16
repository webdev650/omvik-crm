import React, { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
  Check,
  CheckCheck,
  RotateCcw,
  MessageSquare
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getTeamOverviewReport, getFlaggedReports, resolveFlaggedReport } from '../../api/dailyReports';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';

type CardCategory = 'total' | 'submitted' | 'pending' | 'flagged';
type ActiveTab = 'all' | 'submitted' | 'pending' | 'flagged';
type FlaggedStatusFilter = 'all' | 'open' | 'reviewed' | 'resolved';

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
  const [searchParams, setSearchParams] = useSearchParams();

  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Active Tab state: 'all' | 'submitted' | 'pending' | 'flagged'
  const urlTab = searchParams.get('tab');
  const initialTab: ActiveTab =
    urlTab === 'flagged'
      ? 'flagged'
      : urlTab === 'submitted'
      ? 'submitted'
      : urlTab === 'pending'
      ? 'pending'
      : 'all';

  const [selectedTab, setSelectedTab] = useState<ActiveTab>(initialTab);

  // Sync state if URL search param changes
  useEffect(() => {
    if (urlTab === 'flagged') setSelectedTab('flagged');
    else if (urlTab === 'submitted') setSelectedTab('submitted');
    else if (urlTab === 'pending') setSelectedTab('pending');
    else if (urlTab === 'all' || urlTab === 'overview') setSelectedTab('all');
  }, [urlTab]);

  // Active Clickable Summary Card (collapsible detail panel under cards)
  const [activeCard, setActiveCard] = useState<CardCategory | null>(
    initialTab === 'flagged'
      ? 'flagged'
      : initialTab === 'submitted'
      ? 'submitted'
      : initialTab === 'pending'
      ? 'pending'
      : 'total'
  );

  const [panelSearch, setPanelSearch] = useState<string>('');
  const [mainTableSearch, setMainTableSearch] = useState<string>('');
  const [hasCopied, setHasCopied] = useState(false);

  // Flagged History section filters
  const [flaggedStatusFilter, setFlaggedStatusFilter] = useState<FlaggedStatusFilter>('all');
  const [flaggedFromDate, setFlaggedFromDate] = useState<string>('');
  const [flaggedToDate, setFlaggedToDate] = useState<string>('');
  const [flaggedSearch, setFlaggedSearch] = useState<string>('');

  // Resolution modal state
  const [resolveModalOpen, setResolveModalOpen] = useState(false);
  const [actionReport, setActionReport] = useState<any | null>(null);
  const [actionType, setActionType] = useState<'review' | 'resolve'>('resolve');
  const [modalNotes, setModalNotes] = useState('');
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // ── QUERY 1: Team EOD Overview for Selected Date ─────────────────────────
  const {
    data: overviewData,
    isLoading: isOverviewLoading,
    isError: isOverviewError,
    refetch: refetchOverview,
    isFetching: isOverviewFetching
  } = useQuery({
    queryKey: ['teamEODOverview', selectedDate],
    queryFn: () => getTeamOverviewReport(selectedDate)
  });

  // ── QUERY 2: Flagged Reports History across CRM ──────────────────────────
  const {
    data: flaggedData,
    isLoading: isFlaggedLoading,
    isError: isFlaggedError,
    refetch: refetchFlagged,
    isFetching: isFlaggedFetching
  } = useQuery({
    queryKey: ['flaggedReports', flaggedStatusFilter, flaggedFromDate, flaggedToDate],
    queryFn: () =>
      getFlaggedReports({
        status: flaggedStatusFilter,
        fromDate: flaggedFromDate || undefined,
        toDate: flaggedToDate || undefined
      })
  });

  const handleRefreshAll = async () => {
    await Promise.all([refetchOverview(), refetchFlagged()]);
    toast.success('Refreshed Team EOD and Flagged audit data');
  };

  const overviewList = overviewData?.overview || [];
  const totalCount = overviewData?.totalCount ?? overviewList.length;
  const submittedCount = overviewData?.submittedCount ?? overviewList.filter((i: any) => i.submitted).length;
  const pendingCount =
    overviewData?.pendingCount ??
    overviewList.filter((i: any) => !i.submitted && !i.isExempt && !i.isOnLeave).length;
  const discrepantCount =
    overviewData?.discrepantCount ??
    overviewList.filter((item: any) => item.report?.discrepancyFlag).length;

  // ── Sync between Cards & Tabs ──────────────────────────────────────────
  const handleCardClick = (category: CardCategory) => {
    if (activeCard === category) {
      // Toggle off / collapse detail panel
      setActiveCard(null);
    } else {
      setActiveCard(category);
      // Synchronize matching tab
      const tabMap: Record<CardCategory, ActiveTab> = {
        total: 'all',
        submitted: 'submitted',
        pending: 'pending',
        flagged: 'flagged'
      };
      const matchingTab = tabMap[category];
      setSelectedTab(matchingTab);
      setSearchParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', matchingTab);
        return next;
      });
    }
    setPanelSearch('');
  };

  const handleTabClick = (tab: ActiveTab) => {
    setSelectedTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    });

    // Synchronize matching card highlight & detail panel
    const cardMap: Record<ActiveTab, CardCategory> = {
      all: 'total',
      submitted: 'submitted',
      pending: 'pending',
      flagged: 'flagged'
    };
    setActiveCard(cardMap[tab]);
    setPanelSearch('');
  };

  // ── Category items for the active card panel (derived from SAME overviewList)
  const categoryItems = useMemo(() => {
    if (!activeCard) return [];
    switch (activeCard) {
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
  }, [overviewList, activeCard]);

  // Search filtered items within the active card expandable panel
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

  // ── Main Daily Compliance Log table list: filtered by selected tab ─────
  const tabFilteredTableList = useMemo(() => {
    let list: any[] = [];
    switch (selectedTab) {
      case 'all':
        list = overviewList;
        break;
      case 'submitted':
        list = overviewList.filter((item: any) => item.submitted);
        break;
      case 'pending':
        list = overviewList.filter((item: any) => !item.submitted && !item.isExempt && !item.isOnLeave);
        break;
      case 'flagged':
        list = overviewList.filter((item: any) => item.report?.discrepancyFlag);
        break;
      default:
        list = overviewList;
    }

    if (!mainTableSearch.trim()) return list;
    const q = mainTableSearch.toLowerCase().trim();
    return list.filter((item: any) => {
      const name = item.user?.name?.toLowerCase() || '';
      const empId = item.user?.employeeId?.toLowerCase() || '';
      const role = item.user?.role?.toLowerCase() || '';
      const status = item.status?.toLowerCase() || '';
      return name.includes(q) || empId.includes(q) || role.includes(q) || status.includes(q);
    });
  }, [overviewList, selectedTab, mainTableSearch]);

  // ── Flagged History audit list ─────────────────────────────────────────
  const allFlaggedReports = flaggedData?.reports || [];
  const filteredFlaggedReports = useMemo(() => {
    if (!flaggedSearch.trim()) return allFlaggedReports;
    const q = flaggedSearch.toLowerCase().trim();
    return allFlaggedReports.filter((r: any) => {
      const name = r.user?.name?.toLowerCase() || '';
      const empId = r.user?.employeeId?.toLowerCase() || '';
      const date = r.date?.toLowerCase() || '';
      const note = r.discrepancyNote?.toLowerCase() || '';
      const remarks = r.notes?.toLowerCase() || '';
      const resolution = r.resolutionNotes?.toLowerCase() || '';
      return (
        name.includes(q) ||
        empId.includes(q) ||
        date.includes(q) ||
        note.includes(q) ||
        remarks.includes(q) ||
        resolution.includes(q)
      );
    });
  }, [allFlaggedReports, flaggedSearch]);

  const handleEmployeeClick = (empId: string, dateForDrilldown?: string) => {
    const targetDate = dateForDrilldown || selectedDate;
    navigate(`/admin/employee-history/${empId}?date=${targetDate}&fromDate=${targetDate}&toDate=${targetDate}`);
  };

  const handleInspectFlaggedRow = (reportId?: string) => {
    setSelectedTab('flagged');
    setActiveCard('flagged');
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', 'flagged');
      return next;
    });
    setTimeout(() => {
      const el = document.getElementById(reportId ? `flagged-report-${reportId}` : 'flagged-audit-section');
      if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 100);
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

  // Copy list from active panel
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
      activeCard === 'pending'
        ? `📋 Pending EOD Submissions (${selectedDate}):`
        : `📋 ${getCategoryTitle(activeCard || 'total')} (${selectedDate}):`;

    const fullText = [title, ...lines].join('\n');

    const onSuccess = () => {
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 2000);
      toast.success(
        activeCard === 'pending'
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

  // CSV Export for Current Active Tab Table
  const handleExportTabCSV = () => {
    if (tabFilteredTableList.length === 0) {
      toast.error('No records in the current tab to export.');
      return;
    }

    const headers = [
      'Telecaller Name',
      'Employee ID',
      'Role',
      'Status',
      'Active Leads',
      'Real Logged Calls',
      'WhatsApp Claimed/Logged',
      'Calls Claimed/Logged',
      'Connected Claimed/Logged',
      'Visits Claimed/Logged',
      'Bookings Claimed/Logged',
      'Discrepancy Details',
      'Employee Remarks'
    ];

    const rows = tabFilteredTableList.map((item: any) => {
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
        item.currentLeadsAssigned ?? 0,
        item.realCallsCount ?? 0,
        rep._id ? `${rep.whatsappMessages ?? 0}/${rep.systemWhatsappCount ?? 0}` : '—',
        rep._id ? `${rep.claimedCalls ?? 0}/${rep.systemActivityCount ?? 0}` : `${item.realCallsCount ?? 0} logged`,
        rep._id ? `${rep.connectedCalls ?? 0}/${rep.systemConnectedCallsCount ?? 0}` : '—',
        rep._id ? `${rep.claimedSiteVisits ?? 0}/${rep.systemSiteVisitCount ?? 0}` : '—',
        rep._id ? `${rep.bookingsToday ?? 0}/${rep.systemBookingsCount ?? 0}` : '—',
        mismatches || rep.discrepancyNote || '',
        rep.notes || ''
      ];
    });

    downloadCSV(`team-eod-${selectedTab}-${selectedDate}.csv`, headers, rows);
    toast.success(`Exported ${tabFilteredTableList.length} rows to CSV!`);
  };

  // CSV Export for All Flagged Reports
  const handleExportFlaggedAuditCSV = () => {
    if (filteredFlaggedReports.length === 0) {
      toast.error('No flagged records to export.');
      return;
    }

    const headers = [
      'Employee Name',
      'Employee ID',
      'Date',
      'Status',
      'Claimed Calls',
      'Logged Calls',
      'Claimed Connected',
      'Logged Connected',
      'Claimed WhatsApp',
      'Logged WhatsApp',
      'Claimed Visits',
      'Logged Visits',
      'Claimed Bookings',
      'Logged Bookings',
      'Discrepancy Details',
      'Employee Remarks',
      'Resolution Notes',
      'Resolved By',
      'Resolved At'
    ];

    const rows = filteredFlaggedReports.map((r: any) => [
      r.user?.name || '',
      r.user?.employeeId || '',
      r.date || '',
      r.resolutionStatus || 'open',
      r.claimedCalls ?? 0,
      r.systemActivityCount ?? 0,
      r.connectedCalls ?? 0,
      r.systemConnectedCallsCount ?? 0,
      r.whatsappMessages ?? 0,
      r.systemWhatsappCount ?? 0,
      r.claimedSiteVisits ?? 0,
      r.systemSiteVisitCount ?? 0,
      r.bookingsToday ?? 0,
      r.systemBookingsCount ?? 0,
      r.discrepancyNote || '',
      r.notes || '',
      r.resolutionNotes || '',
      r.resolvedBy?.name || '',
      r.resolvedAt ? new Date(r.resolvedAt).toLocaleString() : ''
    ]);

    downloadCSV(`flagged-reports-audit-${todayStr}.csv`, headers, rows);
    toast.success(`Exported ${filteredFlaggedReports.length} flagged audit rows!`);
  };

  // Open Resolution Dialog
  const handleOpenActionModal = (report: any, action: 'review' | 'resolve') => {
    setActionReport(report);
    setActionType(action);
    setModalNotes(report.resolutionNotes || '');
    setResolveModalOpen(true);
  };

  // Submit Resolution / Review Action
  const handleSubmitReportAction = async () => {
    if (!actionReport) return;
    setIsSubmittingAction(true);
    try {
      const nextStatus = actionType === 'review' ? 'reviewed' : 'resolved';
      await resolveFlaggedReport(actionReport._id, {
        status: nextStatus,
        resolutionNotes: modalNotes
      });
      toast.success(
        actionType === 'review'
          ? `Marked report for ${actionReport.user?.name} as Reviewed`
          : `Resolved discrepancy report for ${actionReport.user?.name}`
      );
      setResolveModalOpen(false);
      await Promise.all([refetchOverview(), refetchFlagged()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to update report resolution');
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Quick Reopen Action
  const handleReopenReport = async (reportId: string, employeeName: string) => {
    try {
      await resolveFlaggedReport(reportId, { status: 'open', resolutionNotes: '' });
      toast.info(`Reopened discrepancy report for ${employeeName}`);
      await Promise.all([refetchOverview(), refetchFlagged()]);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || 'Failed to reopen report');
    }
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

  const isRefreshing = isOverviewFetching || isFlaggedFetching;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* ── STEP 2.1: HEADER (Team EOD Overview with Date Picker & Refresh) ── */}
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

            {/* Refresh Button */}
            <Button
              onClick={handleRefreshAll}
              variant="outline"
              disabled={isRefreshing}
              className="h-11 px-3.5 border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl gap-2 min-h-[44px] text-xs font-bold"
            >
              <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-indigo-400' : ''}`} />
              <span>{isRefreshing ? 'Refreshing...' : 'Refresh'}</span>
            </Button>
          </div>
        </div>

        {/* ── STEP 2.2: FOUR SUMMARY CARDS (Clickable, Opens List, Date-Filtered) */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          
          {/* Card 1: Total Active Team */}
          <button
            type="button"
            onClick={() => handleCardClick('total')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick('total');
              }
            }}
            aria-expanded={activeCard === 'total'}
            aria-controls="category-details-panel"
            aria-label={`Total Active Team: ${totalCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCard === 'total'
                ? 'border-indigo-400 ring-2 ring-indigo-500/30 bg-indigo-500/10 shadow-lg shadow-indigo-500/10'
                : 'border-slate-800/80 hover:border-slate-700 hover:bg-slate-800/30'
            }`}
          >
            <div className="flex items-center justify-between gap-1">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider truncate">Total Active Team</p>
              <span className="text-[10px] text-slate-500 group-hover:text-indigo-400 font-semibold shrink-0">
                {activeCard === 'total' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-white font-mono mt-1">{totalCount}</p>
          </button>

          {/* Card 2: EOD Submitted */}
          <button
            type="button"
            onClick={() => handleCardClick('submitted')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick('submitted');
              }
            }}
            aria-expanded={activeCard === 'submitted'}
            aria-controls="category-details-panel"
            aria-label={`EOD Submitted: ${submittedCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCard === 'submitted'
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
                {activeCard === 'submitted' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-emerald-400 font-mono mt-1">{submittedCount}</p>
          </button>

          {/* Card 3: Pending Submission */}
          <button
            type="button"
            onClick={() => handleCardClick('pending')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick('pending');
              }
            }}
            aria-expanded={activeCard === 'pending'}
            aria-controls="category-details-panel"
            aria-label={`Pending Submission: ${pendingCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCard === 'pending'
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
                {activeCard === 'pending' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-amber-400 font-mono mt-1">{pendingCount}</p>
          </button>

          {/* Card 4: Discrepancies Flagged */}
          <button
            type="button"
            onClick={() => handleCardClick('flagged')}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick('flagged');
              }
            }}
            aria-expanded={activeCard === 'flagged'}
            aria-controls="category-details-panel"
            aria-label={`Discrepancies Flagged: ${discrepantCount}. Click to inspect list.`}
            className={`p-4 rounded-2xl bg-[#131c31] border text-left transition-all duration-150 cursor-pointer w-full focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] group ${
              activeCard === 'flagged'
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
                {activeCard === 'flagged' ? 'Hide ▲' : 'View ▼'}
              </span>
            </div>
            <p className="text-2xl font-black text-red-400 font-mono mt-1">{discrepantCount}</p>
          </button>
        </div>

        {/* ── EXPANDABLE DETAIL LIST PANEL (Directly Under Cards) ─────────────── */}
        <AnimatePresence>
          {activeCard && (
            <motion.div
              id="category-details-panel"
              key={activeCard}
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="rounded-2xl border border-slate-800 bg-[#101728] shadow-2xl overflow-hidden"
            >
              <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#0d1322] flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-extrabold text-white">
                      {getCategoryTitle(activeCard)} ({categoryItems.length})
                    </span>
                    <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 text-[10px] font-mono">
                      📅 {selectedDate}
                    </Badge>
                    <span className="text-[11px] text-indigo-400 hidden sm:inline">
                      • Click any employee name to inspect history
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    {activeCard === 'total' && 'All active team members for the selected date with their operational status.'}
                    {activeCard === 'submitted' && 'Telecallers who submitted an EOD report for this date (flagged reports marked with badge).'}
                    {activeCard === 'pending' && 'Telecallers who have not submitted their EOD report yet. Real system calls logged today are shown.'}
                    {activeCard === 'flagged' && 'Reports where claimed numbers do not match system logs, showing claimed vs logged breakdown.'}
                  </p>
                </div>

                {/* Panel Action Controls: Search (8+ people), Copy list, Close */}
                <div className="flex flex-wrap items-center gap-2 pt-1 md:pt-0">
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
                    title={activeCard === 'pending' ? 'Copy all pending names' : 'Copy list to clipboard'}
                  >
                    {hasCopied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 text-indigo-400" />}
                    <span>{hasCopied ? 'Copied!' : 'Copy list'}</span>
                  </Button>

                  {/* Close / Collapse Card Panel */}
                  <Button
                    type="button"
                    onClick={() => setActiveCard(null)}
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg gap-1"
                    title="Close list panel"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Close</span>
                  </Button>
                </div>
              </div>

              {/* Panel Content Area */}
              <div className="p-3 sm:p-4">
                {categoryItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium">
                    No one in this category for this date.
                  </div>
                ) : filteredPanelItems.length === 0 ? (
                  <div className="py-8 text-center text-slate-400 text-xs font-medium space-y-2">
                    <p>No team members match your search filter.</p>
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
                    {/* Mobile Card Stack */}
                    <div className="grid grid-cols-1 gap-2.5 sm:hidden">
                      {filteredPanelItems.map((item: any) => {
                        const emp = item.user;
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
                              <div>
                                {item.status === 'Submitted' && (
                                  <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                    Submitted ✓
                                  </Badge>
                                )}
                                {item.status === 'Flagged' && (
                                  <Badge variant="destructive" className="text-[10px] font-bold">
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
                          </div>
                        );
                      })}
                    </div>

                    {/* Tablet/Desktop Table */}
                    <div className="hidden sm:block overflow-x-auto">
                      <Table>
                        <TableHeader className="bg-[#0d1322]">
                          <TableRow className="border-b border-slate-800">
                            <TableHead className="text-slate-400 font-semibold text-xs">Employee</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-center">Role</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-center">Status</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-center">Active Leads</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-center">Real Calls Logged</TableHead>
                            <TableHead className="text-slate-400 font-semibold text-xs text-right">Audit History</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {filteredPanelItems.map((item: any) => {
                            const emp = item.user;
                            return (
                              <TableRow key={emp._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                                <TableCell className="font-bold text-white text-xs">
                                  <button
                                    type="button"
                                    onClick={() => handleEmployeeClick(emp._id)}
                                    className="text-left group flex items-center gap-1.5 cursor-pointer font-bold text-slate-100 hover:text-indigo-400 transition-colors"
                                  >
                                    <span>{emp.name}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                  </button>
                                  <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                    {emp.employeeId || 'EMP'}
                                  </p>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                                    {emp.role}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center">
                                  {item.status === 'Submitted' && (
                                    <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                      Submitted ✓
                                    </Badge>
                                  )}
                                  {item.status === 'Flagged' && (
                                    <Badge variant="destructive" className="text-[10px] font-bold">
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
                                <TableCell className="text-center font-mono text-xs font-bold text-indigo-300">
                                  {item.currentLeadsAssigned ?? 0}
                                </TableCell>
                                <TableCell className="text-center font-mono text-xs font-bold text-blue-300">
                                  {item.realCallsCount ?? 0}
                                </TableCell>
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

        {/* ── STEP 2.3: TABS BELOW CARDS (WITH COUNTS, SYNCED WITH CARDS) ───── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
          {/* Tabs */}
          <div role="tablist" aria-label="Team Compliance Views" className="flex items-center gap-1.5 p-1 bg-[#131c31] border border-slate-800/80 rounded-2xl flex-wrap">
            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === 'all'}
              tabIndex={0}
              onClick={() => handleTabClick('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] ${
                selectedTab === 'all'
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <span>All Team</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedTab === 'all' ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {totalCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === 'submitted'}
              tabIndex={0}
              onClick={() => handleTabClick('submitted')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] ${
                selectedTab === 'submitted'
                  ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submitted</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedTab === 'submitted' ? 'bg-white/20 text-white' : 'bg-slate-800 text-emerald-400'
              }`}>
                {submittedCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === 'pending'}
              tabIndex={0}
              onClick={() => handleTabClick('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] ${
                selectedTab === 'pending'
                  ? 'bg-amber-600 text-white shadow-md shadow-amber-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Pending</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedTab === 'pending' ? 'bg-white/20 text-white' : 'bg-slate-800 text-amber-400'
              }`}>
                {pendingCount}
              </span>
            </button>

            <button
              type="button"
              role="tab"
              aria-selected={selectedTab === 'flagged'}
              tabIndex={0}
              onClick={() => handleTabClick('flagged')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] ${
                selectedTab === 'flagged'
                  ? 'bg-red-600 text-white shadow-md shadow-red-600/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Flagged</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedTab === 'flagged' ? 'bg-white/20 text-white' : 'bg-slate-800 text-red-400'
              }`}>
                {discrepantCount}
              </span>
            </button>
          </div>

          {/* Table Search & Export CSV for Current Tab */}
          <div className="flex items-center gap-2">
            <div className="relative w-44 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search telecaller / ID..."
                value={mainTableSearch}
                onChange={(e) => setMainTableSearch(e.target.value)}
                className="h-9 pl-8 pr-2.5 text-xs bg-[#131c31] border-slate-700 text-slate-100 placeholder-slate-400 rounded-xl focus:border-indigo-500"
              />
            </div>

            <Button
              type="button"
              onClick={handleExportTabCSV}
              size="sm"
              variant="outline"
              className="h-9 px-3 border-slate-700 bg-[#131c31] text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl gap-1.5"
              title="Download CSV for currently selected tab"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Export Tab CSV</span>
              <span className="sm:hidden">CSV</span>
            </Button>
          </div>
        </div>

        {/* ── STEP 2.4: DAILY TEAM COMPLIANCE LOG TABLE (FILTERED BY SELECTED TAB) */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19] flex items-center justify-between flex-wrap gap-2">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📋 Daily Team Compliance Log ({selectedDate})</span>
              <span className="text-[10px] text-slate-400 font-normal hidden sm:inline">
                • Filter: <strong className="text-indigo-400 capitalize">{selectedTab}</strong> ({tabFilteredTableList.length} rows)
                {selectedTab === 'all' && ' (Unsubmitted telecallers sorted at top)'}
              </span>
            </h4>

            {mainTableSearch && (
              <div className="flex items-center gap-2 text-xs">
                <span className="text-slate-400">Filtering by "{mainTableSearch}"</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setMainTableSearch('')}
                  className="h-6 px-1.5 text-indigo-400 hover:text-indigo-300 text-xs"
                >
                  Clear
                </Button>
              </div>
            )}
          </div>

          {isOverviewLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isOverviewError ? (
            <div className="p-12 text-center text-red-400 text-xs font-bold">
              Failed to load team EOD overview.
            </div>
          ) : tabFilteredTableList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs font-medium">
              No one in this category for this date.
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
                  {tabFilteredTableList.map((item: any) => {
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
                        {/* Telecaller Name & Employee ID */}
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
                            <button
                              type="button"
                              onClick={() => handleInspectFlaggedRow(report?._id)}
                              title="Click to inspect flagged discrepancy audit"
                              className="cursor-pointer group"
                            >
                              <Badge variant="destructive" className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 gap-1 group-hover:ring-1 group-hover:ring-red-400 transition-all">
                                <span>Flagged ⚠️</span>
                              </Badge>
                            </button>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1">
                              Submitted ✓
                            </Badge>
                          )}
                        </TableCell>

                        {/* Active Leads Assigned */}
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

                        {/* Notes / Discrepancy details */}
                        <TableCell className="text-xs text-slate-300">
                          {isSubmitted ? (
                            <div className="space-y-1 max-w-xs">
                              {isDiscrepant && (
                                <div className="space-y-0.5">
                                  <p className="text-[11px] text-amber-400 font-semibold leading-tight">
                                    ⚠️ {report.discrepancyNote}
                                  </p>
                                  <button
                                    type="button"
                                    onClick={() => handleInspectFlaggedRow(report?._id)}
                                    className="text-[10px] text-amber-300 hover:text-amber-200 underline font-semibold cursor-pointer block"
                                  >
                                    Review Audit Details →
                                  </button>
                                </div>
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

        {/* ── STEP 2.5 & 2.6: FLAGGED REPORTS AUDIT SECTION & HISTORY FILTERS ── */}
        <section id="flagged-audit-section" className="space-y-5 pt-4">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-2 border-b border-slate-800">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
                <FileWarning className="w-3.5 h-3.5" />
                <span>Audit & Resolution Center</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-white flex items-center gap-2 flex-wrap">
                <span>Flagged EOD Discrepancies Audit Log</span>
                <Badge variant="outline" className="border-amber-500/30 bg-amber-500/10 text-amber-300 text-xs font-mono font-bold">
                  {allFlaggedReports.length} Total Historical Discrepanc{allFlaggedReports.length === 1 ? 'y' : 'ies'}
                </Badge>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Review and resolve self-reported achievements that differ significantly from CRM system logs.
              </p>
            </div>

            {/* Quick Actions & CSV */}
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                onClick={handleExportFlaggedAuditCSV}
                size="sm"
                variant="outline"
                className="h-10 px-3.5 border-slate-700 bg-[#131c31] text-xs font-semibold text-slate-200 hover:text-white hover:bg-slate-800 rounded-xl gap-2 min-h-[40px]"
                title="Export all filtered flagged reports to CSV"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Export Flagged CSV ({filteredFlaggedReports.length})</span>
              </Button>
            </div>
          </div>

          {/* Filters Bar: Status Filter + Date Range + Search */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-4 sm:p-5 shadow-sm space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 items-end">
              
              {/* Status Filter */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Resolution Status:
                </label>
                <div className="flex items-center gap-1 bg-[#0b0f19] border border-slate-800 p-1 rounded-xl">
                  {(['all', 'open', 'reviewed', 'resolved'] as FlaggedStatusFilter[]).map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setFlaggedStatusFilter(st)}
                      className={`flex-1 py-1 rounded-lg text-xs font-bold capitalize transition-all cursor-pointer text-center ${
                        flaggedStatusFilter === st
                          ? 'bg-amber-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* From Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  From Date:
                </label>
                <Input
                  type="date"
                  value={flaggedFromDate}
                  onChange={(e) => setFlaggedFromDate(e.target.value)}
                  className="h-9 bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs rounded-xl"
                />
              </div>

              {/* To Date */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  To Date:
                </label>
                <Input
                  type="date"
                  value={flaggedToDate}
                  onChange={(e) => setFlaggedToDate(e.target.value)}
                  className="h-9 bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs rounded-xl"
                />
              </div>

              {/* Search Flagged */}
              <div className="space-y-1.5">
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                  Search Flagged Log:
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5 pointer-events-none" />
                  <Input
                    type="text"
                    placeholder="Search name, ID, note..."
                    value={flaggedSearch}
                    onChange={(e) => setFlaggedSearch(e.target.value)}
                    className="h-9 pl-8 pr-2.5 text-xs bg-[#0b0f19] border-slate-800 text-slate-100 placeholder-slate-400 rounded-xl focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            {/* Quick reset filters bar */}
            {(flaggedStatusFilter !== 'all' || flaggedFromDate || flaggedToDate || flaggedSearch) && (
              <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-800/60">
                <span className="text-slate-400">
                  Showing {filteredFlaggedReports.length} results matching filter criteria.
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFlaggedStatusFilter('all');
                    setFlaggedFromDate('');
                    setFlaggedToDate('');
                    setFlaggedSearch('');
                  }}
                  className="text-amber-400 hover:text-amber-300 h-6 px-2 text-xs"
                >
                  Reset all filters
                </Button>
              </div>
            )}
          </div>

          {/* Flagged Reports Table */}
          <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
            {isFlaggedLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-14 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : isFlaggedError ? (
              <div className="p-12 text-center text-red-400 text-xs font-bold">
                Failed to load flagged daily reports.
              </div>
            ) : allFlaggedReports.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium">
                ✨ No EOD activity report discrepancies flagged. All self-reported numbers match system activity logs!
              </div>
            ) : filteredFlaggedReports.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs font-medium space-y-2">
                <p>No flagged reports match your current filter selections.</p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFlaggedStatusFilter('all');
                    setFlaggedFromDate('');
                    setFlaggedToDate('');
                    setFlaggedSearch('');
                  }}
                  className="text-amber-400 hover:text-amber-300"
                >
                  Reset filters
                </Button>
              </div>
            ) : (
              <>
                {/* Mobile View for Flagged Reports (360px & 390px) */}
                <div className="grid grid-cols-1 gap-3 p-3.5 sm:hidden">
                  {filteredFlaggedReports.map((r: any) => {
                    const status = r.resolutionStatus || 'open';
                    return (
                      <div
                        key={r._id}
                        id={`flagged-report-${r._id}`}
                        className="p-3.5 rounded-xl bg-[#0d1322] border border-slate-800 space-y-3 break-words"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <button
                              type="button"
                              onClick={() => handleEmployeeClick(r.user?._id, r.date)}
                              className="text-xs font-bold text-white hover:text-indigo-300 transition-colors text-left flex items-center gap-1 group"
                            >
                              <span>{r.user?.name || 'Employee'}</span>
                              <ExternalLink className="w-3 h-3 text-slate-500 group-hover:text-indigo-400 opacity-60" />
                            </button>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                                {r.user?.employeeId || 'EMP'}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                                {r.user?.role || 'Staff'}
                              </span>
                            </div>
                          </div>

                          <div className="text-right space-y-1">
                            <Badge variant="outline" className="border-slate-700 bg-slate-900 text-slate-300 font-mono text-[10px]">
                              📅 {r.date}
                            </Badge>
                            <div>
                              {status === 'resolved' && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[9px] font-bold">
                                  Resolved ✓
                                </Badge>
                              )}
                              {status === 'reviewed' && (
                                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[9px] font-bold">
                                  Reviewed
                                </Badge>
                              )}
                              {status === 'open' && (
                                <Badge variant="destructive" className="text-[9px] font-bold">
                                  Open Flag ⚠️
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Metric Claimed vs Logged chips */}
                        <div className="grid grid-cols-5 gap-1 text-center font-mono text-[10px] pt-1 border-t border-slate-800">
                          <div className="bg-[#131c31] p-1 rounded">
                            <span className="text-slate-500 block text-[9px]">Calls</span>
                            <span className="font-bold text-amber-400">{r.claimedCalls ?? 0}</span>
                            <span className="text-slate-600 block text-[8px]">/{r.systemActivityCount ?? 0}</span>
                          </div>
                          <div className="bg-[#131c31] p-1 rounded">
                            <span className="text-slate-500 block text-[9px]">Conn.</span>
                            <span className="font-bold text-cyan-400">{r.connectedCalls ?? 0}</span>
                            <span className="text-slate-600 block text-[8px]">/{r.systemConnectedCallsCount ?? 0}</span>
                          </div>
                          <div className="bg-[#131c31] p-1 rounded">
                            <span className="text-slate-500 block text-[9px]">WA</span>
                            <span className="font-bold text-emerald-400">{r.whatsappMessages ?? 0}</span>
                            <span className="text-slate-600 block text-[8px]">/{r.systemWhatsappCount ?? 0}</span>
                          </div>
                          <div className="bg-[#131c31] p-1 rounded">
                            <span className="text-slate-500 block text-[9px]">Visits</span>
                            <span className="font-bold text-purple-400">{r.claimedSiteVisits ?? 0}</span>
                            <span className="text-slate-600 block text-[8px]">/{r.systemSiteVisitCount ?? 0}</span>
                          </div>
                          <div className="bg-[#131c31] p-1 rounded">
                            <span className="text-slate-500 block text-[9px]">Book.</span>
                            <span className="font-bold text-amber-400">{r.bookingsToday ?? 0}</span>
                            <span className="text-slate-600 block text-[8px]">/{r.systemBookingsCount ?? 0}</span>
                          </div>
                        </div>

                        {/* Discrepancy Note & Remarks */}
                        <div className="space-y-1 text-xs">
                          {r.discrepancyNote && (
                            <p className="text-[11px] text-amber-300 font-semibold leading-tight">
                              ⚠️ {r.discrepancyNote}
                            </p>
                          )}
                          <p className="text-slate-400 text-[10px] italic">
                            {r.notes ? `Remarks: "${r.notes}"` : 'No remarks provided'}
                          </p>
                          {r.resolutionNotes && (
                            <p className="text-emerald-400/90 text-[10px] font-mono">
                              Resolution: "{r.resolutionNotes}" ({r.resolvedBy?.name || 'Admin'})
                            </p>
                          )}
                        </div>

                        {/* Actions Bar */}
                        <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-800">
                          {status !== 'resolved' && (
                            <Button
                              type="button"
                              onClick={() => handleOpenActionModal(r, 'resolve')}
                              size="sm"
                              className="h-7 px-2 text-[10px] font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1"
                            >
                              <CheckCheck className="w-3 h-3" />
                              <span>Resolve</span>
                            </Button>
                          )}
                          {status === 'open' && (
                            <Button
                              type="button"
                              onClick={() => handleOpenActionModal(r, 'review')}
                              size="sm"
                              variant="outline"
                              className="h-7 px-2 text-[10px] font-bold border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-lg gap-1"
                            >
                              <span>Review</span>
                            </Button>
                          )}
                          {status !== 'open' && (
                            <Button
                              type="button"
                              onClick={() => handleReopenReport(r._id, r.user?.name)}
                              size="sm"
                              variant="ghost"
                              className="h-7 px-2 text-[10px] text-slate-400 hover:text-white rounded-lg gap-1"
                            >
                              <RotateCcw className="w-3 h-3" />
                              <span>Reopen</span>
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Tablet / Desktop Table View */}
                <div className="hidden sm:block overflow-x-auto">
                  <Table>
                    <TableHeader className="bg-[#0b0f19]">
                      <TableRow className="border-b border-slate-800">
                        <TableHead className="text-slate-400 font-semibold text-xs">Employee</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs">Date</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-center">Status</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-center">WhatsApp</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-center">Calls</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-center">Connected</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-center">Visits</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-center">Bookings</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs">Discrepancy Detail & Remarks</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredFlaggedReports.map((r: any) => {
                        const status = r.resolutionStatus || 'open';
                        return (
                          <TableRow
                            key={r._id}
                            id={`flagged-report-${r._id}`}
                            className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors"
                          >
                            {/* Employee */}
                            <TableCell className="font-bold text-white text-xs">
                              <div>
                                <button
                                  type="button"
                                  onClick={() => handleEmployeeClick(r.user?._id, r.date)}
                                  className="text-left group flex items-center gap-1.5 cursor-pointer font-bold text-slate-100 hover:text-indigo-400 transition-colors"
                                >
                                  <span>{r.user?.name || 'Employee'}</span>
                                  <ExternalLink className="w-3 h-3 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                                <p className="text-[10px] text-indigo-400 font-mono mt-0.5">
                                  {r.user?.employeeId || 'EMP'}
                                </p>
                              </div>
                            </TableCell>

                            {/* Date */}
                            <TableCell className="font-mono text-slate-300 text-xs">
                              {r.date}
                            </TableCell>

                            {/* Resolution Status */}
                            <TableCell className="text-center">
                              {status === 'resolved' && (
                                <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] font-bold">
                                  Resolved ✓
                                </Badge>
                              )}
                              {status === 'reviewed' && (
                                <Badge className="bg-blue-500/15 text-blue-400 border-blue-500/30 text-[10px] font-bold">
                                  Reviewed
                                </Badge>
                              )}
                              {status === 'open' && (
                                <Badge variant="destructive" className="text-[10px] font-bold">
                                  Open Flag ⚠️
                                </Badge>
                              )}
                            </TableCell>

                            {/* WhatsApp */}
                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-amber-400 font-bold">{r.whatsappMessages ?? 0}</span>
                              <span className="text-slate-500 block text-[10px]">/ {r.systemWhatsappCount ?? 0} logged</span>
                            </TableCell>

                            {/* Total Calls */}
                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-amber-400 font-bold">{r.claimedCalls ?? 0}</span>
                              <span className="text-slate-500 block text-[10px]">/ {r.systemActivityCount ?? 0} logged</span>
                            </TableCell>

                            {/* Connected Calls */}
                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-amber-400 font-bold">{r.connectedCalls ?? 0}</span>
                              <span className="text-slate-500 block text-[10px]">/ {r.systemConnectedCallsCount ?? 0} logged</span>
                            </TableCell>

                            {/* Visits */}
                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-amber-400 font-bold">{r.claimedSiteVisits ?? 0}</span>
                              <span className="text-slate-500 block text-[10px]">/ {r.systemSiteVisitCount ?? 0} logged</span>
                            </TableCell>

                            {/* Bookings */}
                            <TableCell className="text-center font-mono text-xs">
                              <span className="text-amber-400 font-bold">{r.bookingsToday ?? 0}</span>
                              <span className="text-slate-500 block text-[10px]">/ {r.systemBookingsCount ?? 0} logged</span>
                            </TableCell>

                            {/* Discrepancy Detail & Remarks */}
                            <TableCell className="text-xs text-slate-300">
                              <div className="space-y-1 max-w-sm">
                                {r.discrepancyNote && (
                                  <p className="text-[11px] text-amber-300 font-medium leading-tight">
                                    ⚠️ {r.discrepancyNote}
                                  </p>
                                )}
                                <p className="text-slate-400 text-[11px]">
                                  {r.notes ? `Remarks: "${r.notes}"` : 'No remarks provided'}
                                </p>
                                {r.resolutionNotes && (
                                  <p className="text-emerald-400/90 text-[10px] font-mono leading-tight">
                                    ✓ Notes: "{r.resolutionNotes}" ({r.resolvedBy?.name || 'Admin'})
                                  </p>
                                )}
                              </div>
                            </TableCell>

                            {/* Actions */}
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                {status !== 'resolved' && (
                                  <Button
                                    type="button"
                                    onClick={() => handleOpenActionModal(r, 'resolve')}
                                    size="sm"
                                    className="h-7 px-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg gap-1"
                                    title="Mark as resolved with notes"
                                  >
                                    <CheckCheck className="w-3 h-3" />
                                    <span>Resolve</span>
                                  </Button>
                                )}
                                {status === 'open' && (
                                  <Button
                                    type="button"
                                    onClick={() => handleOpenActionModal(r, 'review')}
                                    size="sm"
                                    variant="outline"
                                    className="h-7 px-2 text-xs font-bold border-blue-500/30 text-blue-400 hover:bg-blue-500/10 rounded-lg gap-1"
                                    title="Mark report as reviewed"
                                  >
                                    <span>Review</span>
                                  </Button>
                                )}
                                {status !== 'open' && (
                                  <Button
                                    type="button"
                                    onClick={() => handleReopenReport(r._id, r.user?.name)}
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 px-2 text-xs text-slate-400 hover:text-white rounded-lg gap-1"
                                    title="Reopen discrepancy flag"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reopen</span>
                                  </Button>
                                )}
                                <Button
                                  type="button"
                                  onClick={() => handleEmployeeClick(r.user?._id, r.date)}
                                  size="sm"
                                  variant="ghost"
                                  className="h-7 px-1.5 text-xs text-indigo-400 hover:text-white rounded-lg"
                                  title="View employee performance history"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </Button>
                              </div>
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
        </section>

      </main>

      {/* ── RESOLUTION / REVIEW ACTION DIALOG MODAL ───────────────────────── */}
      <Dialog open={resolveModalOpen} onOpenChange={setResolveModalOpen}>
        <DialogContent className="max-w-md bg-[#101728] border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white text-base font-bold flex items-center gap-2">
              {actionType === 'resolve' ? (
                <>
                  <CheckCheck className="w-4 h-4 text-emerald-400" />
                  <span>Resolve Flagged Discrepancy</span>
                </>
              ) : (
                <>
                  <MessageSquare className="w-4 h-4 text-blue-400" />
                  <span>Mark Discrepancy as Reviewed</span>
                </>
              )}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-400">
              {actionReport && (
                <span>
                  Employee: <strong className="text-white">{actionReport.user?.name}</strong> • Date: <strong className="text-white">{actionReport.date}</strong>
                </span>
              )}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs">
            {actionReport && (
              <div className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1 text-xs">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">Flagged Discrepancy:</span>
                <p className="text-amber-300 font-semibold">{actionReport.discrepancyNote}</p>
                {actionReport.notes && (
                  <p className="text-slate-400 italic text-[11px]">Remark: "{actionReport.notes}"</p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-300">
                Resolution / Audit Notes (Optional):
              </label>
              <textarea
                rows={3}
                value={modalNotes}
                onChange={(e) => setModalNotes(e.target.value)}
                placeholder="e.g., Cross-verified with cloud telephony logs; approved discrepancy."
                className="w-full p-2.5 rounded-xl bg-[#0b0f19] border border-slate-700 text-slate-100 placeholder-slate-500 text-xs focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-end gap-2 pt-3 border-t border-slate-800">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setResolveModalOpen(false)}
              className="h-9 px-3 text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleSubmitReportAction}
              disabled={isSubmittingAction}
              className={`h-9 px-4 text-xs font-bold text-white rounded-xl ${
                actionType === 'resolve'
                  ? 'bg-emerald-600 hover:bg-emerald-500'
                  : 'bg-blue-600 hover:bg-blue-500'
              }`}
            >
              {isSubmittingAction ? 'Saving...' : actionType === 'resolve' ? 'Confirm Resolve' : 'Confirm Reviewed'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

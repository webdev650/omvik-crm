import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Download,
  Search,
  ArrowLeft,
  Users,
  Clock,
  Building2,
  Phone,
  Tag,
  RefreshCw,
  Eye,
  CheckCircle2,
  Sparkles,
  ArrowUpDown
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Navbar from '../components/Navbar';
import { getLeadsByDate, getLeadsDateSummary, LeadByDateItem } from '../api/opportunities';
import { getMyAccessibleBatches } from '../api/batchAccess';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../components/ui/table';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Format a Date object to YYYY-MM-DD
function formatDateToYYYYMMDD(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Format time string from ISO date string
function formatTimeToAMPM(isoStr: string): string {
  try {
    const d = new Date(isoStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true });
  } catch {
    return '—';
  }
}

// Format date into human-readable e.g. "Saturday, Oct 10, 2026"
function formatHumanDate(dateStr: string): string {
  try {
    const [y, m, d] = dateStr.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
}

export default function LeadHistoryCalendarPage() {
  const navigate = useNavigate();

  // Calendar navigation state
  const today = useMemo(() => new Date(), []);
  const todayStr = useMemo(() => formatDateToYYYYMMDD(today), [today]);

  const [viewDate, setViewDate] = useState<Date>(new Date());
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const currentYear = viewDate.getFullYear();
  const currentMonth = viewDate.getMonth(); // 0-11
  const monthStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}`;

  // Filter & search state for the leads table
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedBatch, setSelectedBatch] = useState<string>('');
  const [sortField, setSortField] = useState<'time' | 'name' | 'code' | 'intent' | 'stage'>('time');
  const [sortAsc, setSortAsc] = useState<boolean>(false);

  // Fetch Accessible Batches for filtering
  const { data: accessibleBatchesData } = useQuery({
    queryKey: ['myAccessibleBatches'],
    queryFn: getMyAccessibleBatches
  });
  const accessibleBatches = accessibleBatchesData?.batches || [];

  // Fetch month summary (dates highlighting and lead counts)
  const {
    data: dateSummary = {},
    isLoading: isSummaryLoading,
    refetch: refetchSummary
  } = useQuery({
    queryKey: ['leadsDateSummary', monthStr, currentYear, selectedBatch],
    queryFn: () => getLeadsDateSummary(monthStr, currentYear, { batchId: selectedBatch || undefined })
  });

  // Fetch leads for the currently selected date
  const {
    data: leads = [],
    isLoading: isLeadsLoading,
    isRefetching: isLeadsRefetching,
    refetch: refetchLeads
  } = useQuery({
    queryKey: ['leadsByDate', selectedDate, selectedBatch],
    queryFn: () => getLeadsByDate(selectedDate, { batchId: selectedBatch || undefined }),
    enabled: !!selectedDate
  });

  // Month navigation handlers
  const handlePrevMonth = () => {
    setViewDate(new Date(currentYear, currentMonth - 1, 1));
  };

  const handleNextMonth = () => {
    setViewDate(new Date(currentYear, currentMonth + 1, 1));
  };

  const handleJumpToToday = () => {
    const now = new Date();
    setViewDate(new Date(now.getFullYear(), now.getMonth(), 1));
    setSelectedDate(todayStr);
  };

  // Generate calendar grid cells
  const calendarCells = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const daysInPrevMonth = new Date(currentYear, currentMonth, 0).getDate();

    const cells: {
      dayNumber: number;
      dateStr: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      isSelected: boolean;
      leadCount: number;
    }[] = [];

    // 1. Previous month padding cells
    for (let i = firstDayIndex - 1; i >= 0; i--) {
      const day = daysInPrevMonth - i;
      const prevMonthDate = new Date(currentYear, currentMonth - 1, day);
      const dStr = formatDateToYYYYMMDD(prevMonthDate);
      cells.push({
        dayNumber: day,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        leadCount: dateSummary[dStr] || 0
      });
    }

    // 2. Current month cells
    for (let day = 1; day <= daysInCurrentMonth; day++) {
      const curDate = new Date(currentYear, currentMonth, day);
      const dStr = formatDateToYYYYMMDD(curDate);
      cells.push({
        dayNumber: day,
        dateStr: dStr,
        isCurrentMonth: true,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        leadCount: dateSummary[dStr] || 0
      });
    }

    // 3. Next month padding cells to complete 35 or 42 cells grid
    const totalCells = cells.length > 35 ? 42 : 35;
    const remaining = totalCells - cells.length;
    for (let day = 1; day <= remaining; day++) {
      const nextMonthDate = new Date(currentYear, currentMonth + 1, day);
      const dStr = formatDateToYYYYMMDD(nextMonthDate);
      cells.push({
        dayNumber: day,
        dateStr: dStr,
        isCurrentMonth: false,
        isToday: dStr === todayStr,
        isSelected: dStr === selectedDate,
        leadCount: dateSummary[dStr] || 0
      });
    }

    return cells;
  }, [currentYear, currentMonth, todayStr, selectedDate, dateSummary]);

  // Compute total leads across current month
  const totalLeadsThisMonth = useMemo(() => {
    let count = 0;
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    for (let d = 1; d <= daysInMonth; d++) {
      const dStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      if (dateSummary[dStr]) {
        count += dateSummary[dStr];
      }
    }
    return count;
  }, [dateSummary, currentYear, currentMonth]);

  // Filtered & sorted leads for the selected date
  const filteredAndSortedLeads = useMemo(() => {
    let result = [...leads];

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((l) => {
        return (
          (l.customerName && l.customerName.toLowerCase().includes(q)) ||
          (l.phone && l.phone.includes(q)) ||
          (l.leadCode && l.leadCode.toLowerCase().includes(q)) ||
          (l.project && l.project.toLowerCase().includes(q)) ||
          (l.assignedTo && l.assignedTo.toLowerCase().includes(q)) ||
          (l.source && l.source.toLowerCase().includes(q)) ||
          (l.currentStage && l.currentStage.toLowerCase().includes(q))
        );
      });
    }

    result.sort((a, b) => {
      let cmp = 0;
      if (sortField === 'time') {
        const tA = new Date(a.createdAt).getTime() || 0;
        const tB = new Date(b.createdAt).getTime() || 0;
        cmp = tA - tB;
      } else if (sortField === 'name') {
        cmp = (a.customerName || '').localeCompare(b.customerName || '');
      } else if (sortField === 'code') {
        cmp = (a.leadCode || '').localeCompare(b.leadCode || '');
      } else if (sortField === 'intent') {
        const rank = { high: 3, medium: 2, low: 1 };
        const rA = rank[a.intent?.toLowerCase() as 'high' | 'medium' | 'low'] || 0;
        const rB = rank[b.intent?.toLowerCase() as 'high' | 'medium' | 'low'] || 0;
        cmp = rA - rB;
      } else if (sortField === 'stage') {
        cmp = (a.currentStage || '').localeCompare(b.currentStage || '');
      }
      return sortAsc ? cmp : -cmp;
    });

    return result;
  }, [leads, searchQuery, sortField, sortAsc]);

  // Handle Export to Excel / CSV
  const handleExportCSV = () => {
    if (!filteredAndSortedLeads.length) {
      toast.error('No leads available to export for this date.');
      return;
    }

    const exportRows = filteredAndSortedLeads.map((item, index) => ({
      'S.No': index + 1,
      'Lead Code': item.leadCode || '—',
      'Customer Name': item.customerName || 'Prospect',
      'Phone': item.phone || '—',
      'Email': item.email || '',
      'City': item.city || '',
      'Project': item.project || 'General Project',
      'Intent': item.intent ? item.intent.toUpperCase() : 'MEDIUM',
      'Source': item.source || 'DIRECT',
      'Assigned Rep': item.assignedTo || 'Unassigned',
      'Current Stage': item.currentStage || 'new',
      'Created Date': selectedDate,
      'Created Time': formatTimeToAMPM(item.createdAt)
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportRows);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Leads_${selectedDate}`);
    XLSX.writeFile(workbook, `OMVIK_Leads_${selectedDate}.xlsx`);
    toast.success(`Exported ${exportRows.length} leads for ${selectedDate}!`);
  };

  const handleSortToggle = (field: 'time' | 'name' | 'code' | 'intent' | 'stage') => {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false); // default to descending for new sort
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1720px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <CalendarIcon className="w-3.5 h-3.5" />
              <span>Lead Upload History</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white flex items-center gap-3">
              <span>Lead History Calendar</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Select any date on the calendar to view, audit, search, and export all leads uploaded or created on that day.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/leads')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700/80 text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Leads</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/admin/import-history')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Import History</span>
            </Button>
          </div>
        </div>

        {/* Master Layout: Left Calendar (1/3) + Right Table (2/3) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* ========================================================================= */}
          {/* LEFT SIDE: CALENDAR UI (lg:col-span-4 or 5)                                */}
          {/* ========================================================================= */}
          <div className="lg:col-span-4 xl:col-span-4 space-y-4">
            {/* Sheet Filter Selector */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-4 shadow-sm space-y-2">
              <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-indigo-400" />
                  <span>My Accessible Sheets</span>
                </span>
                {selectedBatch && (
                  <button
                    onClick={() => setSelectedBatch('')}
                    className="text-[10px] text-indigo-400 hover:text-indigo-300 lowercase font-medium"
                  >
                    view all
                  </button>
                )}
              </label>
              <select
                value={selectedBatch}
                onChange={(e) => setSelectedBatch(e.target.value)}
                className="w-full h-9 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-2.5 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Accessible Sheets</option>
                {accessibleBatches.map((b: any) => (
                  <option key={b.batchId} value={b.batchId}>
                    {b.isPrivate ? '🔒' : '📄'} {b.batchId} ({b.leadCount || 0} leads)
                  </option>
                ))}
              </select>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-5 shadow-sm space-y-4">
              {/* Calendar Controls Header */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-white">
                    {MONTH_NAMES[currentMonth]} {currentYear}
                  </h2>
                  {totalLeadsThisMonth > 0 && (
                    <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/30 text-[10px] font-bold">
                      {totalLeadsThisMonth} Leads
                    </Badge>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleJumpToToday}
                    className="h-8 px-2 text-[11px] font-bold text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg"
                  >
                    Today
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePrevMonth}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    title="Previous Month"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handleNextMonth}
                    className="h-8 w-8 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg"
                    title="Next Month"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              {/* Day of Week Headers */}
              <div className="grid grid-cols-7 gap-1 text-center">
                {DAY_NAMES.map((name) => (
                  <div key={name} className="text-[11px] font-extrabold uppercase text-slate-400 py-1">
                    {name}
                  </div>
                ))}
              </div>

              {/* Calendar Days Grid */}
              <div className="grid grid-cols-7 gap-1.5">
                {calendarCells.map((cell) => {
                  const hasLeads = cell.leadCount > 0;
                  const isSelected = cell.isSelected;
                  const isCurrent = cell.isCurrentMonth;

                  return (
                    <button
                      key={cell.dateStr}
                      onClick={() => setSelectedDate(cell.dateStr)}
                      className={`relative min-h-[58px] rounded-xl p-1.5 flex flex-col items-center justify-between transition-all group ${
                        !isCurrent
                          ? 'opacity-25 hover:opacity-60 bg-[#0b0f19]/30 border border-slate-900 text-slate-600'
                          : isSelected
                          ? 'bg-blue-600/30 border-2 border-blue-400 text-white shadow-lg shadow-blue-500/20 ring-2 ring-blue-500/30'
                          : hasLeads
                          ? 'bg-blue-600/20 hover:bg-blue-600/30 border-2 border-blue-500/80 text-white hover:scale-[1.03] shadow-md shadow-blue-500/10'
                          : 'bg-[#0b0f19] hover:bg-slate-800/50 border border-slate-800/80 text-slate-400 hover:text-slate-200'
                      } ${cell.isToday && !isSelected ? 'ring-2 ring-emerald-400/80' : ''}`}
                    >
                      {/* Day Number and Today Indicator */}
                      <div className="w-full flex items-center justify-between text-xs px-0.5">
                        <span
                          className={`font-bold ${
                            isSelected
                              ? 'text-blue-300 font-black'
                              : hasLeads
                              ? 'text-blue-200 font-black'
                              : cell.isToday
                              ? 'text-emerald-400 font-black'
                              : isCurrent
                              ? 'text-slate-400'
                              : 'text-slate-600'
                          }`}
                        >
                          {cell.dayNumber}
                        </span>

                        {cell.isToday && (
                          <span
                            className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"
                            title="Today"
                          />
                        )}
                      </div>

                      {/* Lead Count Badge / Indicator */}
                      {hasLeads ? (
                        <div
                          className={`mt-1 px-2 py-0.5 rounded-full text-[11px] font-black tracking-tight leading-none transition-all shadow-sm ${
                            isSelected
                              ? 'bg-blue-500 text-white shadow-blue-500/50 ring-1 ring-white/40'
                              : 'bg-blue-600 text-white group-hover:bg-blue-500 shadow-blue-600/30'
                          }`}
                          title={`${cell.leadCount} leads created on ${cell.dateStr}`}
                        >
                          {cell.leadCount}
                        </div>
                      ) : (
                        <div className="h-3" />
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Calendar Legend / Info Footer */}
              <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center justify-between text-[11px] text-slate-400 gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-600 border border-blue-400" />
                  <span className="text-blue-300 font-semibold">Has Leads ({totalLeadsThisMonth})</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  <span>Today</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-md border-2 border-blue-400 bg-blue-600/30" />
                  <span>Selected</span>
                </div>
              </div>
            </div>

            {/* Quick Summary Pill for Selected Date */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-4 text-xs space-y-2">
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold">Selected Date:</span>
                <span className="font-bold text-slate-200">{selectedDate}</span>
              </div>
              <div className="flex items-center justify-between text-slate-400">
                <span className="font-semibold">Leads Uploaded/Created:</span>
                <span className="font-extrabold text-indigo-400 text-sm">
                  {leads.length} Leads
                </span>
              </div>
              {leads.length > 0 && (
                <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-slate-400">
                  <span className="font-semibold">High Intent Leads:</span>
                  <span className="font-bold text-emerald-400">
                    {leads.filter((l) => l.intent?.toLowerCase() === 'high').length}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* ========================================================================= */}
          {/* RIGHT SIDE: LEAD RESULTS TABLE (lg:col-span-8 or 8)                        */}
          {/* ========================================================================= */}
          <div className="lg:col-span-8 xl:col-span-8 space-y-4">
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
              {/* Header Bar */}
              <div className="p-5 bg-[#0e1628] border-b border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white flex items-center gap-2">
                      <span>Leads for {formatHumanDate(selectedDate)}</span>
                    </h2>
                    <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/40 text-xs font-bold">
                      {filteredAndSortedLeads.length} {filteredAndSortedLeads.length === 1 ? 'Lead' : 'Leads'}
                    </Badge>
                  </div>
                  <p className="text-xs text-slate-400">
                    Showing all opportunities logged on this specific date. Click any lead to view full detail.
                  </p>
                </div>

                {/* Search Bar & Action Buttons */}
                <div className="flex flex-wrap items-center gap-2.5">
                  <div className="relative w-full sm:w-60">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Filter by name, phone, code..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-9 bg-[#0b0f19] border-slate-700 text-xs text-slate-200 rounded-xl focus:border-indigo-500"
                    />
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={handleExportCSV}
                    disabled={filteredAndSortedLeads.length === 0}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-bold rounded-xl flex items-center gap-1.5 h-9"
                    title="Export as CSV/Excel"
                  >
                    <Download className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Export</span>
                  </Button>

                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => {
                      refetchLeads();
                      refetchSummary();
                    }}
                    className="h-9 w-9 p-0 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl"
                    title="Refresh data"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isLeadsRefetching ? 'animate-spin' : ''}`} />
                  </Button>
                </div>
              </div>

              {/* Leads Table */}
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="bg-[#0b0f19]">
                    <TableRow className="border-b border-slate-800">
                      <TableHead
                        onClick={() => handleSortToggle('code')}
                        className="text-slate-400 font-semibold text-xs cursor-pointer hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Lead Code</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </TableHead>
                      <TableHead
                        onClick={() => handleSortToggle('name')}
                        className="text-slate-400 font-semibold text-xs cursor-pointer hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Customer Name</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Phone</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Project</TableHead>
                      <TableHead
                        onClick={() => handleSortToggle('intent')}
                        className="text-slate-400 font-semibold text-xs cursor-pointer hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Intent</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Source</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Assigned To</TableHead>
                      <TableHead
                        onClick={() => handleSortToggle('stage')}
                        className="text-slate-400 font-semibold text-xs cursor-pointer hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Stage</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </TableHead>
                      <TableHead
                        onClick={() => handleSortToggle('time')}
                        className="text-slate-400 font-semibold text-xs cursor-pointer hover:text-slate-200 select-none"
                      >
                        <div className="flex items-center gap-1">
                          <span>Time</span>
                          <ArrowUpDown className="w-3 h-3 text-slate-500" />
                        </div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {isLeadsLoading ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-3">
                            <RefreshCw className="w-6 h-6 animate-spin text-indigo-400" />
                            <p className="text-xs text-slate-400">Loading leads for {selectedDate}...</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : filteredAndSortedLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-16">
                          <div className="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto text-slate-400">
                            <div className="w-12 h-12 rounded-2xl bg-slate-800/60 border border-slate-700 flex items-center justify-center text-slate-400">
                              <CalendarIcon className="w-6 h-6" />
                            </div>
                            <h3 className="text-sm font-bold text-slate-200">
                              {searchQuery
                                ? 'No leads matched your search'
                                : `No leads were uploaded or created on ${formatHumanDate(selectedDate)}`}
                            </h3>
                            <p className="text-xs text-slate-500">
                              {searchQuery
                                ? 'Try searching by a different name, phone number, or lead code.'
                                : 'Select a highlighted date on the calendar to inspect leads uploaded or created on that day.'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredAndSortedLeads.map((item) => {
                        const intentLower = item.intent ? item.intent.toLowerCase() : 'medium';

                        return (
                          <TableRow
                            key={item._id}
                            onClick={() => navigate(`/leads/${item._id}`)}
                            className="border-b border-slate-800/40 hover:bg-slate-800/50 cursor-pointer transition-colors group"
                          >
                            {/* Lead Code */}
                            <TableCell className="font-mono text-xs font-bold text-indigo-400 group-hover:text-indigo-300">
                              {item.leadCode || 'OMV-LEAD'}
                            </TableCell>

                            {/* Customer Name */}
                            <TableCell className="font-semibold text-slate-100 text-xs">
                              {item.customerName || 'Prospect'}
                            </TableCell>

                            {/* Phone Number */}
                            <TableCell className="text-slate-300 font-mono text-xs">
                              {item.phone || '—'}
                            </TableCell>

                            {/* Project */}
                            <TableCell className="text-slate-300 text-xs font-medium">
                              <span className="flex items-center gap-1.5 truncate max-w-[160px]">
                                <Building2 className="w-3 h-3 text-slate-400 shrink-0" />
                                {item.project || 'General'}
                              </span>
                            </TableCell>

                            {/* Intent */}
                            <TableCell>
                              <Badge
                                className={`text-[10px] font-bold uppercase ${
                                  intentLower === 'high'
                                    ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                                    : intentLower === 'low'
                                    ? 'bg-red-500/20 text-red-400 border-red-500/40'
                                    : 'bg-amber-500/20 text-amber-400 border-amber-500/40'
                                }`}
                              >
                                {item.intent || 'Medium'}
                              </Badge>
                            </TableCell>

                            {/* Source */}
                            <TableCell className="text-slate-400 text-xs">
                              <span className="px-2 py-0.5 rounded bg-slate-800/80 text-[11px] font-mono">
                                {item.source || 'DIRECT'}
                              </span>
                            </TableCell>

                            {/* Assigned To */}
                            <TableCell className="text-emerald-400 text-xs font-medium">
                              👤 {item.assignedTo || 'Unassigned'}
                            </TableCell>

                            {/* Current Stage */}
                            <TableCell>
                              <Badge className="bg-slate-800 text-slate-200 border-slate-700 text-[10px] uppercase">
                                {item.currentStage || item.stage || 'new'}
                              </Badge>
                            </TableCell>

                            {/* Created Time */}
                            <TableCell className="text-slate-400 font-mono text-xs whitespace-nowrap">
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3 text-slate-500" />
                                {formatTimeToAMPM(item.createdAt)}
                              </span>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Table Footer with Summary Stats */}
              {filteredAndSortedLeads.length > 0 && (
                <div className="p-4 bg-[#0e1628] border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 gap-2">
                  <span>
                    Showing <strong className="text-slate-200">{filteredAndSortedLeads.length}</strong> of{' '}
                    <strong className="text-slate-200">{leads.length}</strong> leads on {selectedDate}
                  </span>
                  <span className="text-[11px] text-slate-500">
                    💡 Click on any lead row to view complete customer profile & activity timeline
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

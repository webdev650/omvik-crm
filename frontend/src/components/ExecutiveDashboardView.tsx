import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Users,
  Sparkles,
  Activity,
  Flame,
  Clock,
  AlertTriangle,
  Calendar,
  Building,
  Handshake,
  Trophy,
  XCircle,
  Percent,
  Target,
  IndianRupee,
  Calculator,
  TrendingUp,
  PhoneCall,
  CheckSquare,
  ChevronRight,
  ArrowUpRight,
  Layers,
  Award,
  BarChart2
} from 'lucide-react';
import { getExecutiveKpis } from '../api/reports';
import { Input } from './ui/input';

const PERIOD_OPTIONS = [
  { id: 'today', label: 'Today' },
  { id: 'yesterday', label: 'Yesterday' },
  { id: 'this_week', label: 'This Week' },
  { id: 'last_week', label: 'Last Week' },
  { id: 'this_month', label: 'This Month' },
  { id: 'last_month', label: 'Last Month' },
  { id: 'this_quarter', label: 'This Quarter' },
  { id: 'custom', label: 'Custom Range' }
];

const formatCurrency = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

const formatPct = (val: number) => {
  if (val === undefined || val === null || isNaN(val)) return '0%';
  return `${val}%`;
};

// Framer Motion Animation Variants
const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04
    }
  }
};

const cardVariants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
};

interface ExecutiveDashboardViewProps {
  hideHeader?: boolean;
}

export default function ExecutiveDashboardView({ hideHeader = false }: ExecutiveDashboardViewProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('this_month');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['executiveKpis', selectedPeriod, fromDate, toDate],
    queryFn: () =>
      getExecutiveKpis({
        period: selectedPeriod,
        from: selectedPeriod === 'custom' ? fromDate : undefined,
        to: selectedPeriod === 'custom' ? toDate : undefined
      }),
    refetchInterval: 30_000
  });

  const kpis = data?.kpis || {};

  return (
    <div className="space-y-6">
      
      {/* ── SECTION HEADER & PERIOD SELECTOR ────────────────────────────────── */}
      <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
        {!hideHeader && (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0131B9]/20 border border-[#15B0F8]/30 text-[#15B0F8] text-[11px] font-bold uppercase tracking-wider mb-1.5">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Main Management View</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Executive Dashboard — Key Performance Indicators
              </h2>
              <p className="text-xs text-slate-400">
                Live operational snapshot & date-filtered conversion metrics across all teams and projects.
              </p>
            </div>

            <div className="text-xs text-slate-400 font-mono bg-[#0b0f19] px-3.5 py-2 rounded-xl border border-slate-800 flex items-center gap-2 self-start md:self-auto">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Scope Window:</span>
              <strong className="text-slate-200">
                {data?.range?.start
                  ? `${new Date(data.range.start).toLocaleDateString()} — ${new Date(data.range.end).toLocaleDateString()}`
                  : 'Loading...'}
              </strong>
            </div>
          </div>
        )}

        {hideHeader && (
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <span className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <BarChart2 className="w-4 h-4 text-[#15B0F8]" />
              <span>Filter KPIs by Period</span>
            </span>
            <div className="text-xs text-slate-400 font-mono bg-[#0b0f19] px-3.5 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Scope:</span>
              <strong className="text-slate-200">
                {data?.range?.start
                  ? `${new Date(data.range.start).toLocaleDateString()} — ${new Date(data.range.end).toLocaleDateString()}`
                  : 'Loading...'}
              </strong>
            </div>
          </div>
        )}

        {/* Period Selector Tabs & Custom Date Pickers */}
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-1.5 bg-[#0b0f19] p-1.5 rounded-2xl border border-slate-800">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedPeriod === opt.id
                    ? 'bg-[#0131B9] text-white shadow-md shadow-[#0131B9]/30 border border-[#15B0F8]/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {selectedPeriod === 'custom' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              className="flex flex-wrap items-center gap-4 bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">From:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-[#131c31] border-slate-700 text-xs text-slate-200 font-bold rounded-xl h-9 w-40"
                />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-400">To:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-[#131c31] border-slate-700 text-xs text-slate-200 font-bold rounded-xl h-9 w-40"
                />
              </div>
            </motion.div>
          )}
        </div>
      </div>

      {/* ── LOADING & ERROR STATES ────────────────────────────────────────── */}
      {isLoading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {Array.from({ length: 18 }).map((_, i) => (
            <div key={i} className="h-32 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-8 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3">
          <p className="text-red-400 text-sm font-semibold">Failed to load Executive KPI metrics.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-slate-800 text-slate-200 text-xs font-semibold rounded-xl hover:bg-slate-700 transition-colors"
          >
            Retry
          </button>
        </div>
      )}

      {/* ── SECTION 1: 18 STAT CARDS RESPONSIVE GRID ──────────────────────── */}
      {!isLoading && !isError && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-5"
        >
          
          {/* 1. Total Leads */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-[#15B0F8]/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">1. Total Leads</span>
              <div className="w-8 h-8 rounded-xl bg-[#15B0F8]/10 text-[#15B0F8] flex items-center justify-center">
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-white tracking-tight">{kpis.totalLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Created in period</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-[#15B0F8] font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 2. New Leads */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-[#15B0F8]/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">2. New Leads</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-white tracking-tight">{kpis.newLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Leads in period</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 3. Active Leads (Snapshot) */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-cyan-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-400">3. Active Leads</span>
              <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 flex items-center justify-center">
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-cyan-400 tracking-tight">{kpis.activeLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">isActive = true</span>
              <span className="px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold text-[10px]">
                LIVE SNAPSHOT
              </span>
            </div>
          </motion.div>

          {/* 4. Hot Leads (Snapshot) */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-amber-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-400">4. Hot Leads</span>
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-amber-400 tracking-tight">{kpis.hotLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">intent = high & active</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-bold text-[10px]">
                LIVE SNAPSHOT
              </span>
            </div>
          </motion.div>

          {/* 5. Follow-ups Due Today (Today-Only) */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-yellow-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-yellow-400">5. Due Today</span>
              <div className="w-8 h-8 rounded-xl bg-yellow-500/10 text-yellow-400 flex items-center justify-center">
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-yellow-400 tracking-tight">{kpis.followupsDueToday ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">scheduled for today</span>
              <span className="px-2 py-0.5 rounded-full bg-yellow-500/15 border border-yellow-500/30 text-yellow-300 font-bold text-[10px]">
                TODAY ONLY
              </span>
            </div>
          </motion.div>

          {/* 6. Overdue Follow-ups (Snapshot) */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-red-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">6. Overdue Follow-ups</span>
              <div className="w-8 h-8 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center animate-pulse">
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-red-400 tracking-tight">{kpis.overdueFollowups ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">status = overdue</span>
              <span className="px-2 py-0.5 rounded-full bg-red-500/15 border border-red-500/30 text-red-300 font-bold text-[10px]">
                LIVE SNAPSHOT
              </span>
            </div>
          </motion.div>

          {/* 7. Site Visits Scheduled */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-sky-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">7. Scheduled Visits</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-white tracking-tight">{kpis.siteVisitsScheduled ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">planned / confirmed</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 8. Site Visits Completed */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-teal-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">8. Visits Completed</span>
              <div className="w-8 h-8 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center">
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-teal-400 tracking-tight">{kpis.siteVisitsCompleted ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">completed in period</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-teal-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 9. Negotiations (Snapshot) */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-blue-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-400">9. Negotiations</span>
              <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center">
                <Handshake className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-blue-400 tracking-tight">{kpis.negotiations ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">stage = negotiation</span>
              <span className="px-2 py-0.5 rounded-full bg-blue-500/15 border border-blue-500/30 text-blue-300 font-bold text-[10px]">
                LIVE SNAPSHOT
              </span>
            </div>
          </motion.div>

          {/* 10. Bookings */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">10. Bookings</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">{kpis.bookings ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">booked in period</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 11. Lost Leads */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-rose-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-rose-400">11. Lost Leads</span>
              <div className="w-8 h-8 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center">
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-rose-400 tracking-tight">{kpis.lostLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">moved to lost</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-rose-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 12. Conversion Rate */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">12. Conversion Rate</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">{formatPct(kpis.conversionRate)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Bookings ÷ Total Leads</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 13. Site Visit Conversion */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-indigo-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">13. Visit Conversion</span>
              <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center">
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-[#15B0F8] tracking-tight">{formatPct(kpis.siteVisitConversion)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Bookings ÷ Completed Visits</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-indigo-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 14. Booking Value */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">14. Booking Value</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{formatCurrency(kpis.bookingValue)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Sum finalPrice in period</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 15. Average Deal Value */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-sky-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">15. Avg Deal Value</span>
              <div className="w-8 h-8 rounded-xl bg-sky-500/10 text-sky-400 flex items-center justify-center">
                <Calculator className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">{formatCurrency(kpis.averageDealValue)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Booking Value ÷ Bookings</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-sky-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 16. Sales Pipeline Value (Snapshot) */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-violet-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-violet-400">16. Pipeline Value</span>
              <div className="w-8 h-8 rounded-xl bg-violet-500/10 text-violet-400 flex items-center justify-center">
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-black text-violet-300 tracking-tight">{formatCurrency(kpis.salesPipelineValue)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Sum active estimatedValue</span>
              <span className="px-2 py-0.5 rounded-full bg-violet-500/15 border border-violet-500/30 text-violet-300 font-bold text-[10px]">
                LIVE SNAPSHOT
              </span>
            </div>
          </motion.div>

          {/* 17. Lead Response Rate */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-fuchsia-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">17. Response Rate</span>
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500/10 text-fuchsia-400 flex items-center justify-center">
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-[#15B0F8] tracking-tight">{formatPct(kpis.leadResponseRate)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Leads with 1+ activity</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-fuchsia-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

          {/* 18. Follow-up Compliance */}
          <motion.div
            variants={cardVariants}
            className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/90 shadow-md hover:border-emerald-500/50 transition-all flex flex-col justify-between group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">18. Compliance</span>
              <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-3xl font-black text-emerald-400 tracking-tight">{formatPct(kpis.followupCompliance)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-400">Completed ÷ Due follow-ups</span>
              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-emerald-400 font-bold text-[10px]">
                PERIOD TOTAL
              </span>
            </div>
          </motion.div>

        </motion.div>
      )}

      {/* ── SECTION 2: PERFORMANCE HIGHLIGHTS (ITEMS 19 - 21 RANKED LIST WIDGETS) ── */}
      {!isLoading && !isError && (
        <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800/60 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-[#FBB040]/10 border border-[#FBB040]/20 text-[#FBB040] flex items-center justify-center">
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-extrabold text-white tracking-tight">Performance Highlights</h3>
                <p className="text-xs text-slate-400">Top ranked leaders across sales team, projects, and acquisition channels in selected period</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            
            {/* 19. Sales Team Performance Widget */}
            <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-amber-500/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-amber-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">19. Sales Team</h4>
                  </div>
                  <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full">TOP 3</span>
                </div>

                <div className="space-y-2 pt-1">
                  {(!kpis.salesTeamPerformance || kpis.salesTeamPerformance.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No team bookings in period</p>
                  ) : (
                    kpis.salesTeamPerformance.map((item: any, idx: number) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                      return (
                        <div key={item.userId || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c31] border border-slate-800/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{medal}</span>
                            <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-amber-400 shrink-0">{item.count} Bookings</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <Link
                to="/admin/reports/executives"
                className="inline-flex items-center justify-between text-xs font-bold text-[#15B0F8] hover:text-white pt-2 border-t border-slate-800/80 transition-colors group"
              >
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* 20. Project Performance Widget */}
            <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-[#15B0F8]/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-[#15B0F8]" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">20. Projects</h4>
                  </div>
                  <span className="text-[10px] font-bold text-[#15B0F8] bg-[#15B0F8]/10 px-2 py-0.5 rounded-full">TOP 3</span>
                </div>

                <div className="space-y-2 pt-1">
                  {(!kpis.projectPerformance || kpis.projectPerformance.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No project bookings in period</p>
                  ) : (
                    kpis.projectPerformance.map((item: any, idx: number) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                      return (
                        <div key={item.projectId || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c31] border border-slate-800/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{medal}</span>
                            <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-[#15B0F8] shrink-0">{item.count} Bookings</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <Link
                to="/admin/reports/projects"
                className="inline-flex items-center justify-between text-xs font-bold text-[#15B0F8] hover:text-white pt-2 border-t border-slate-800/80 transition-colors group"
              >
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* 21. Source Performance Widget */}
            <div className="p-5 rounded-2xl bg-[#0b0f19] border border-slate-800/90 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-all">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-emerald-400" />
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-200">21. Lead Sources</h4>
                  </div>
                  <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full">TOP 3</span>
                </div>

                <div className="space-y-2 pt-1">
                  {(!kpis.sourcePerformance || kpis.sourcePerformance.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No source bookings in period</p>
                  ) : (
                    kpis.sourcePerformance.map((item: any, idx: number) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                      return (
                        <div key={item.source || idx} className="flex items-center justify-between p-2.5 rounded-xl bg-[#131c31] border border-slate-800/80">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{medal}</span>
                            <span className="text-xs font-bold text-slate-200 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-extrabold text-emerald-400 shrink-0">{item.count} Bookings</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <Link
                to="/admin/reports/sources"
                className="inline-flex items-center justify-between text-xs font-bold text-[#15B0F8] hover:text-white pt-2 border-t border-slate-800/80 transition-colors group"
              >
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}

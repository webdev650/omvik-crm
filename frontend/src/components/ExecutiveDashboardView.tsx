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
    transition: { staggerChildren: 0.04 }
  }
};
const cardVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.3, ease: 'easeOut' as const } }
};

// Restrained, single-accent glass shell shared by every stat card. Color is
// reserved for meaning (accent = live/brand, emerald = positive outcome,
// amber = needs attention, red = at risk) rather than one hue per card.
const card = 'relative rounded-xl border border-white/[0.08] bg-[#12141c] p-5 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset,0_12px_24px_-16px_rgba(0,0,0,0.6)] transition-colors duration-200 flex flex-col justify-between hover:border-white/[0.16]';

const iconBox = 'w-9 h-9 rounded-lg flex items-center justify-center border';
const neutralIcon = `${iconBox} bg-white/[0.04] border-white/[0.08] text-slate-300`;
const accentIcon = `${iconBox} bg-[#15B0F8]/10 border-[#15B0F8]/25 text-[#5fcbfb]`;
const positiveIcon = `${iconBox} bg-emerald-500/10 border-emerald-500/25 text-emerald-300`;
const warningIcon = `${iconBox} bg-amber-500/10 border-amber-500/25 text-amber-300`;
const dangerIcon = `${iconBox} bg-red-500/10 border-red-500/25 text-red-300`;

const badge = 'px-2 py-0.5 rounded-md text-[10px] font-bold tracking-wide border';
const neutralBadge = `${badge} bg-white/[0.03] border-white/[0.08] text-slate-400`;
const accentBadge = `${badge} bg-[#15B0F8]/10 border-[#15B0F8]/25 text-[#5fcbfb]`;
const positiveBadge = `${badge} bg-emerald-500/10 border-emerald-500/25 text-emerald-300`;
const dangerBadge = `${badge} bg-red-500/10 border-red-500/25 text-red-300`;

const eyebrow = 'text-[11px] font-semibold text-slate-400';
const bigNumber = 'text-3xl font-bold text-white tracking-tight tabular-nums';

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
      <div className="relative overflow-hidden bg-[#12141c] border border-white/[0.08] rounded-2xl p-5 sm:p-6 shadow-[0_1px_0_0_rgba(255,255,255,0.04)_inset] space-y-4">
        <div className="pointer-events-none absolute -top-32 -right-24 w-96 h-96 rounded-full bg-[#0131B9]/10 blur-[110px]" />

        {!hideHeader && (
          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/[0.07] pb-4">
            <div>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-[#15B0F8]/10 border border-[#15B0F8]/25 text-[#5fcbfb] text-[11px] font-semibold mb-2">
                <BarChart2 className="w-3.5 h-3.5" />
                <span>Main Management View</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Executive Dashboard — Key Performance Indicators
              </h2>
              <p className="text-xs text-slate-400 mt-1">
                Live operational snapshot & date-filtered conversion metrics across all teams and projects.
              </p>
            </div>
            <div className="text-xs text-slate-300 font-mono bg-white/[0.03] px-3.5 py-2 rounded-lg border border-white/[0.08] flex items-center gap-2 self-start md:self-auto">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
              <span className="text-slate-400">Scope Window:</span>
              <strong className="text-slate-100 font-semibold">
                {data?.range?.start
                  ? `${new Date(data.range.start).toLocaleDateString()} — ${new Date(data.range.end).toLocaleDateString()}`
                  : 'Loading...'}
              </strong>
            </div>
          </div>
        )}

        {/* Period Selector Tabs & Custom Date Pickers */}
        <div className="relative space-y-3 pt-1">
          <div className="flex flex-wrap items-center gap-1 bg-black/25 p-1 rounded-xl border border-white/[0.06]">
            {PERIOD_OPTIONS.map((opt) => (
              <button
                key={opt.id}
                onClick={() => setSelectedPeriod(opt.id)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors duration-150 ${
                  selectedPeriod === opt.id
                    ? 'bg-[#15B0F8] text-[#04101c] shadow-sm'
                    : 'text-slate-400 hover:text-slate-100 hover:bg-white/[0.05]'
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
              className="flex flex-wrap items-center gap-4 bg-black/25 p-3.5 rounded-xl border border-white/[0.06]"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">From:</span>
                <Input
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-white/[0.04] border-white/10 text-xs text-slate-200 font-semibold rounded-lg h-9 w-40"
                />
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-400">To:</span>
                <Input
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-white/[0.04] border-white/10 text-xs text-slate-200 font-semibold rounded-lg h-9 w-40"
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
            <div key={i} className="h-32 bg-[#12141c] border border-white/[0.08] rounded-xl animate-pulse" />
          ))}
        </div>
      )}

      {isError && (
        <div className="p-8 border border-red-500/20 bg-red-500/[0.05] rounded-xl text-center space-y-3">
          <p className="text-red-400 text-sm font-semibold">Failed to load Executive KPI metrics.</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-white/[0.06] border border-white/10 text-slate-200 text-xs font-semibold rounded-lg hover:bg-white/[0.1] transition-colors"
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
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>1. Total Leads</span>
              <div className={neutralIcon}>
                <Users className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={bigNumber}>{kpis.totalLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Created in period</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 2. New Leads */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>2. New Leads</span>
              <div className={neutralIcon}>
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={bigNumber}>{kpis.newLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Leads in period</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 3. Active Leads */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>3. Active Leads</span>
              <div className={accentIcon}>
                <Activity className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-[#5fcbfb]`}>{kpis.activeLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">isActive = true</span>
              <span className={accentBadge}>LIVE SNAPSHOT</span>
            </div>
          </motion.div>

          {/* 4. Hot Leads */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>4. Hot Leads</span>
              <div className={warningIcon}>
                <Flame className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-amber-300`}>{kpis.hotLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">intent = high & active</span>
              <span className={`${badge} bg-amber-500/10 border-amber-500/25 text-amber-300`}>LIVE SNAPSHOT</span>
            </div>
          </motion.div>

          {/* 5. Follow-ups Due Today */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>5. Due Today</span>
              <div className={neutralIcon}>
                <Clock className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={bigNumber}>{kpis.followupsDueToday ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">scheduled for today</span>
              <span className={neutralBadge}>TODAY ONLY</span>
            </div>
          </motion.div>

          {/* 6. Overdue Follow-ups */}
          <motion.div variants={cardVariants} className={`${card} border-red-500/20`}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-red-300/80">6. Overdue Follow-ups</span>
              <div className={dangerIcon}>
                <AlertTriangle className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-red-400`}>{kpis.overdueFollowups ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">status = overdue</span>
              <span className={dangerBadge}>LIVE SNAPSHOT</span>
            </div>
          </motion.div>

          {/* 7. Scheduled Visits */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>7. Scheduled Visits</span>
              <div className={neutralIcon}>
                <Calendar className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={bigNumber}>{kpis.siteVisitsScheduled ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">planned / confirmed</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 8. Visits Completed */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>8. Visits Completed</span>
              <div className={neutralIcon}>
                <Building className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={bigNumber}>{kpis.siteVisitsCompleted ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">completed in period</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 9. Negotiations */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>9. Negotiations</span>
              <div className={accentIcon}>
                <Handshake className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-[#5fcbfb]`}>{kpis.negotiations ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">stage = negotiation</span>
              <span className={accentBadge}>LIVE SNAPSHOT</span>
            </div>
          </motion.div>

          {/* 10. Bookings */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-300/80">10. Bookings</span>
              <div className={positiveIcon}>
                <Trophy className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-emerald-300`}>{kpis.bookings ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">booked in period</span>
              <span className={positiveBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 11. Lost Leads */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>11. Lost Leads</span>
              <div className={neutralIcon}>
                <XCircle className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={bigNumber}>{kpis.lostLeads ?? 0}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">moved to lost</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 12. Conversion Rate */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>12. Conversion Rate</span>
              <div className={positiveIcon}>
                <Percent className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-emerald-300`}>{formatPct(kpis.conversionRate)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Bookings ÷ Total Leads</span>
              <span className={positiveBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 13. Visit Conversion */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>13. Visit Conversion</span>
              <div className={accentIcon}>
                <Target className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-[#5fcbfb]`}>{formatPct(kpis.siteVisitConversion)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Bookings ÷ Completed Visits</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 14. Booking Value */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-emerald-300/80">14. Booking Value</span>
              <div className={positiveIcon}>
                <IndianRupee className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-white`}>{formatCurrency(kpis.bookingValue)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Sum finalPrice in period</span>
              <span className={positiveBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 15. Average Deal Value */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>15. Avg Deal Value</span>
              <div className={neutralIcon}>
                <Calculator className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className="text-2xl sm:text-3xl font-bold text-white tracking-tight tabular-nums">{formatCurrency(kpis.averageDealValue)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Booking Value ÷ Bookings</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 16. Pipeline Value */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>16. Pipeline Value</span>
              <div className={accentIcon}>
                <TrendingUp className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`text-2xl sm:text-3xl font-bold tracking-tight tabular-nums text-[#5fcbfb]`}>{formatCurrency(kpis.salesPipelineValue)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Sum active estimatedValue</span>
              <span className={accentBadge}>LIVE SNAPSHOT</span>
            </div>
          </motion.div>

          {/* 17. Response Rate */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>17. Response Rate</span>
              <div className={neutralIcon}>
                <PhoneCall className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-[#5fcbfb]`}>{formatPct(kpis.leadResponseRate)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Leads with 1+ activity</span>
              <span className={neutralBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>

          {/* 18. Compliance */}
          <motion.div variants={cardVariants} className={card}>
            <div className="flex items-center justify-between">
              <span className={eyebrow}>18. Compliance</span>
              <div className={positiveIcon}>
                <CheckSquare className="w-4 h-4" />
              </div>
            </div>
            <div className="my-3">
              <span className={`${bigNumber} text-emerald-300`}>{formatPct(kpis.followupCompliance)}</span>
            </div>
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-500">Completed ÷ Due follow-ups</span>
              <span className={positiveBadge}>PERIOD TOTAL</span>
            </div>
          </motion.div>
        </motion.div>
      )}

      {/* ── SECTION 2: PERFORMANCE HIGHLIGHTS (ITEMS 19 - 21 RANKED LIST WIDGETS) ── */}
      {!isLoading && !isError && (
        <div className="bg-[#12141c] border border-white/[0.08] rounded-2xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-white/[0.07] pb-3">
            <div className="flex items-center gap-3">
              <div className={neutralIcon}>
                <Award className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white tracking-tight">Performance Highlights</h3>
                <p className="text-xs text-slate-400">Top ranked leaders across sales team, projects, and acquisition channels in selected period</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* 19. Sales Team */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex flex-col justify-between space-y-4 hover:border-white/[0.14] transition-colors duration-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Users className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-semibold text-slate-200">19. Sales Team</h4>
                  </div>
                  <span className={neutralBadge}>TOP 3</span>
                </div>
                <div className="space-y-2 pt-1">
                  {(!kpis.salesTeamPerformance || kpis.salesTeamPerformance.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No team bookings in period</p>
                  ) : (
                    kpis.salesTeamPerformance.map((item: any, idx: number) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                      return (
                        <div key={item.userId || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{medal}</span>
                            <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#5fcbfb] shrink-0">{item.count} Bookings</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <Link to="/admin/reports/executives" className="inline-flex items-center justify-between text-xs font-semibold text-[#5fcbfb] hover:text-white pt-2 border-t border-white/[0.06] transition-colors group">
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* 20. Projects */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex flex-col justify-between space-y-4 hover:border-white/[0.14] transition-colors duration-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Building className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-semibold text-slate-200">20. Projects</h4>
                  </div>
                  <span className={neutralBadge}>TOP 3</span>
                </div>
                <div className="space-y-2 pt-1">
                  {(!kpis.projectPerformance || kpis.projectPerformance.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No project bookings in period</p>
                  ) : (
                    kpis.projectPerformance.map((item: any, idx: number) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                      return (
                        <div key={item.projectId || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{medal}</span>
                            <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#5fcbfb] shrink-0">{item.count} Bookings</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <Link to="/admin/reports/projects" className="inline-flex items-center justify-between text-xs font-semibold text-[#5fcbfb] hover:text-white pt-2 border-t border-white/[0.06] transition-colors group">
                <span>View Full Report</span>
                <ArrowUpRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
              </Link>
            </div>

            {/* 21. Lead Sources */}
            <div className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.07] flex flex-col justify-between space-y-4 hover:border-white/[0.14] transition-colors duration-200">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-white/[0.06] pb-2.5">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4 h-4 text-slate-400" />
                    <h4 className="text-xs font-semibold text-slate-200">21. Lead Sources</h4>
                  </div>
                  <span className={neutralBadge}>TOP 3</span>
                </div>
                <div className="space-y-2 pt-1">
                  {(!kpis.sourcePerformance || kpis.sourcePerformance.length === 0) ? (
                    <p className="text-xs text-slate-500 italic py-3 text-center">No source bookings in period</p>
                  ) : (
                    kpis.sourcePerformance.map((item: any, idx: number) => {
                      const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : '🥉';
                      return (
                        <div key={item.source || idx} className="flex items-center justify-between p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06]">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-base shrink-0">{medal}</span>
                            <span className="text-xs font-semibold text-slate-200 truncate">{item.name}</span>
                          </div>
                          <span className="text-xs font-mono font-bold text-[#5fcbfb] shrink-0">{item.count} Bookings</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <Link to="/admin/reports/sources" className="inline-flex items-center justify-between text-xs font-semibold text-[#5fcbfb] hover:text-white pt-2 border-t border-white/[0.06] transition-colors group">
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
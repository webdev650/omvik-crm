import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  Users,
  AlertTriangle,
  Flame,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Clock,
  Kanban,
  Bot,
  Sparkles,
  X,
  ChevronRight
} from 'lucide-react';

import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getDashboardSummary } from '../api/dashboard';
import { getMyFollowups } from '../api/followups';
import { getOpportunities } from '../api/opportunities';
import { Badge, getStageBadgeVariant } from '../components/ui/badge';
import { Button } from '../components/ui/button';

// ── Unified Priority Queue Item Interface ──────────────────────────────────

interface PriorityItem {
  id: string;
  opportunityId: string;
  priorityLevel: 1 | 2 | 3; // 1: Urgent (Overdue/SLA Breach), 2: Hot Deal, 3: Scheduled
  typeLabel: string;
  badgeColor: string;
  customerName: string;
  mobile: string;
  projectName: string;
  stage: string;
  actionText: string;
  dueText?: string;
}

export default function RepDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [activeFilter, setActiveFilter] = useState<'all' | 'p1' | 'p2' | 'p3'>('all');
  const [isAssistantOpen, setIsAssistantOpen] = useState(false);

  // Fetch Summary Stats
  const { data: summaryData } = useQuery({
    queryKey: ['dashboard', 'summary'],
    queryFn: getDashboardSummary
  });
  const stats = summaryData?.stats;

  // Fetch Follow-ups
  const { data: followupsData, isLoading: loadingFollowups } = useQuery({
    queryKey: ['followups', 'me'],
    queryFn: () => getMyFollowups()
  });
  const followups: any[] = followupsData?.followups || [];

  // Fetch Opportunities
  const { data: oppsData, isLoading: loadingOpps } = useQuery({
    queryKey: ['opportunities'],
    queryFn: () => getOpportunities()
  });
  const opps: any[] = oppsData?.opportunities || [];

  // Construct and Sort Unified Priority Queue
  const priorityQueue: PriorityItem[] = useMemo(() => {
    const items: PriorityItem[] = [];
    const processedOppIds = new Set<string>();

    // 1. Process Overdue / Missed Follow-ups (Priority 1)
    followups.forEach((f) => {
      if (f.status === 'overdue' || f.status === 'missed') {
        const oppId = typeof f.opportunity === 'object' ? f.opportunity?._id : f.opportunity;
        if (oppId) processedOppIds.add(oppId);

        items.push({
          id: `fu-${f._id}`,
          opportunityId: oppId,
          priorityLevel: 1,
          typeLabel: '⚠️ OVERDUE ACTION',
          badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30 font-bold',
          customerName: f.opportunity?.customer?.name || f.opportunity?.rawName || 'Lead Opportunity',
          mobile: f.opportunity?.customer?.primaryMobile || 'N/A',
          projectName: f.opportunity?.project?.name || 'Project',
          stage: f.opportunity?.stage || 'contacted',
          actionText: f.purpose || 'Follow-up call overdue',
          dueText: f.dueAt ? new Date(f.dueAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined
        });
      }
    });

    // 2. Process SLA Breached Opportunities (Priority 1)
    opps.forEach((o) => {
      if (o.slaBreached && !processedOppIds.has(o._id)) {
        processedOppIds.add(o._id);
        items.push({
          id: `sla-${o._id}`,
          opportunityId: o._id,
          priorityLevel: 1,
          typeLabel: '🚨 SLA BREACHED',
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30 font-bold',
          customerName: o.customer?.name || o.rawName || 'Customer Lead',
          mobile: o.customer?.primaryMobile || 'N/A',
          projectName: o.project?.name || 'Project',
          stage: o.stage || 'new',
          actionText: 'Uncontacted lead >36 hours. Immediate touchpoint required.'
        });
      }
    });

    // 3. Process Hot Opportunities in Negotiation / Site Visit (Priority 2)
    opps.forEach((o) => {
      if ((o.stage === 'negotiation' || o.stage === 'site_visit') && !processedOppIds.has(o._id)) {
        processedOppIds.add(o._id);
        items.push({
          id: `hot-${o._id}`,
          opportunityId: o._id,
          priorityLevel: 2,
          typeLabel: '🔥 HOT DEAL',
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30 font-bold',
          customerName: o.customer?.name || o.rawName || 'Hot Customer',
          mobile: o.customer?.primaryMobile || 'N/A',
          projectName: o.project?.name || 'Project',
          stage: o.stage,
          actionText: `Active ${o.stage.replace('_', ' ')} deal. Maintain momentum.`
        });
      }
    });

    // 4. Process Scheduled Follow-ups for Today / Active (Priority 3)
    followups.forEach((f) => {
      if (f.status === 'scheduled') {
        const oppId = typeof f.opportunity === 'object' ? f.opportunity?._id : f.opportunity;
        if (oppId && !processedOppIds.has(oppId)) {
          processedOppIds.add(oppId);
          items.push({
            id: `sch-${f._id}`,
            opportunityId: oppId,
            priorityLevel: 3,
            typeLabel: '📅 SCHEDULED TODAY',
            badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 font-bold',
            customerName: f.opportunity?.customer?.name || f.opportunity?.rawName || 'Scheduled Lead',
            mobile: f.opportunity?.customer?.primaryMobile || 'N/A',
            projectName: f.opportunity?.project?.name || 'Project',
            stage: f.opportunity?.stage || 'contacted',
            actionText: f.purpose || 'Scheduled follow-up call',
            dueText: f.dueAt ? new Date(f.dueAt).toLocaleString('en-IN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : undefined
          });
        }
      }
    });

    // Sort Queue: Priority 1 first, then Priority 2, then Priority 3
    return items.sort((a, b) => a.priorityLevel - b.priorityLevel);
  }, [followups, opps]);

  // Filtered items based on tab selection
  const filteredQueue = useMemo(() => {
    if (activeFilter === 'p1') return priorityQueue.filter((i) => i.priorityLevel === 1);
    if (activeFilter === 'p2') return priorityQueue.filter((i) => i.priorityLevel === 2);
    if (activeFilter === 'p3') return priorityQueue.filter((i) => i.priorityLevel === 3);
    return priorityQueue;
  }, [priorityQueue, activeFilter]);

  // Personal Performance Metrics
  const perfMetrics = useMemo(() => {
    const totalDeals = opps.length;
    const wonDeals = opps.filter((o) => o.stage === 'won').length;
    const conversionRate = totalDeals > 0 ? Math.round((wonDeals / totalDeals) * 100) : 0;
    const siteVisits = opps.filter((o) => ['site_visit', 'negotiation', 'won'].includes(o.stage)).length;
    const completedFollowups = followups.filter((f) => f.status === 'completed').length;

    return {
      totalDeals,
      wonDeals,
      conversionRate,
      siteVisits,
      completedFollowups
    };
  }, [opps, followups]);

  const isLoading = loadingFollowups || loadingOpps;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans selection:bg-indigo-600 selection:text-white pb-16">
      
      {/* TOP NAVIGATION BAR */}
      <Navbar />

      {/* MAIN CONTENT AREA */}
      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* DASHBOARD HERO HEADING SECTION */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <span>Sales Rep Action Workstation</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Hello, {user?.name || 'Aparna Tripathy'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Your prioritized list of required next actions. Overdue & breached items are listed first.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <NavLink
              to="/pipeline"
              className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
            >
              <Kanban className="w-4 h-4" />
              <span>Kanban Pipeline</span>
            </NavLink>
          </div>
        </div>

        {/* KPI ACTION SUMMARY CARDS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 sm:gap-4">
          <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                Total Active
              </span>
              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-sm" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-white tracking-tight">
                {stats?.totalActive ?? opps.length}
              </span>
              <Users className="w-4 h-4 text-blue-400 opacity-60" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Assigned leads</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-red-400">
                P1: Urgent Action
              </span>
              <div className="w-2 h-2 rounded-full bg-red-500 shadow-sm" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-red-400 tracking-tight">
                {priorityQueue.filter((i) => i.priorityLevel === 1).length}
              </span>
              <AlertTriangle className="w-4 h-4 text-red-400 opacity-60" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Overdue & SLA Breached</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                P2: Hot Deals
              </span>
              <div className="w-2 h-2 rounded-full bg-indigo-500 shadow-sm" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-indigo-300 tracking-tight">
                {priorityQueue.filter((i) => i.priorityLevel === 2).length}
              </span>
              <Flame className="w-4 h-4 text-indigo-400 opacity-60" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Site Visit & Negotiation</p>
          </div>

          <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm relative overflow-hidden group hover:border-slate-700 transition-all">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                P3: Scheduled
              </span>
              <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-sm" />
            </div>
            <div className="mt-3 flex items-baseline justify-between">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight">
                {priorityQueue.filter((i) => i.priorityLevel === 3).length}
              </span>
              <Calendar className="w-4 h-4 text-emerald-400 opacity-60" />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Pending follow-ups</p>
          </div>
        </div>

        {/* PERSONAL PERFORMANCE BANNER */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm">
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-400">My Conversion Rate</p>
            <p className="text-2xl font-black text-white">{perfMetrics.conversionRate}%</p>
            <p className="text-[11px] text-slate-400">{perfMetrics.wonDeals} deals closed won</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">Site Visits Driven</p>
            <p className="text-2xl font-black text-emerald-300">{perfMetrics.siteVisits}</p>
            <p className="text-[11px] text-slate-400">Total qualified visits</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400">Completed Calls</p>
            <p className="text-2xl font-black text-cyan-300">{perfMetrics.completedFollowups}</p>
            <p className="text-[11px] text-slate-400">Logged touchpoints</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Assigned Pipeline</p>
            <p className="text-2xl font-black text-amber-300">{perfMetrics.totalDeals}</p>
            <p className="text-[11px] text-slate-400">Active assigned leads</p>
          </div>
        </div>

        {/* PRIORITY ACTION QUEUE TABLE */}
        <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
            <div>
              <h3 className="text-lg font-extrabold text-white flex items-center gap-2">
                <span>⚡ Daily Priority Action Queue</span>
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Focus on high-priority items at the top to maintain SLA compliance and pipeline momentum.
              </p>
            </div>

            {/* Filter Pill Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-[#0b0f19] rounded-xl border border-slate-800">
              <button
                onClick={() => setActiveFilter('all')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({priorityQueue.length})
              </button>
              <button
                onClick={() => setActiveFilter('p1')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'p1' ? 'bg-red-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                P1 Urgent ({priorityQueue.filter((i) => i.priorityLevel === 1).length})
              </button>
              <button
                onClick={() => setActiveFilter('p2')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'p2' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                P2 Hot ({priorityQueue.filter((i) => i.priorityLevel === 2).length})
              </button>
              <button
                onClick={() => setActiveFilter('p3')}
                className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                  activeFilter === 'p3' ? 'bg-slate-800 text-white' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                P3 Scheduled ({priorityQueue.filter((i) => i.priorityLevel === 3).length})
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 bg-slate-900/60 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="text-3xl">🎉</div>
                <h4 className="text-sm font-bold text-slate-200">No Priority Actions Pending</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You have completed all urgent follow-ups and SLA touchpoints. Check the Pipeline Kanban board to move deals forward!
                </p>
              </div>
            ) : (
              filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.priorityLevel === 1
                      ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                      : item.priorityLevel === 2
                      ? 'border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40'
                      : 'border-slate-800 bg-[#0b0f19]/60 hover:border-slate-700'
                  }`}
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] uppercase border ${item.badgeColor}`}>
                        {item.typeLabel}
                      </span>
                      <Badge variant={getStageBadgeVariant(item.stage)}>
                        {item.stage ? item.stage.replace('_', ' ') : 'new'}
                      </Badge>
                    </div>

                    <h4 className="text-sm font-bold text-slate-100 hover:text-indigo-300 transition-colors truncate">
                      {item.customerName}
                    </h4>
                    <p className="text-xs text-slate-400">{item.actionText}</p>
                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                      <span>🏙️ {item.projectName}</span>
                      <span>📱 {item.mobile}</span>
                      {item.dueText && <span>⏰ {item.dueText}</span>}
                    </div>
                  </div>

                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      onClick={() => navigate(`/leads/${item.opportunityId}`)}
                      className={`text-xs h-9 px-4 font-bold shadow-sm ${
                        item.priorityLevel === 1
                          ? 'bg-red-600 hover:bg-red-500 text-white'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white'
                      }`}
                    >
                      Take Action →
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

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

import React, { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { NavLink, useNavigate } from 'react-router-dom';

import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getDashboardSummary } from '../api/dashboard';
import { getMyFollowups } from '../api/followups';
import { getOpportunities } from '../api/opportunities';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
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
          badgeColor: 'bg-red-500/20 text-red-400 border-red-500/30 animate-pulse',
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
          badgeColor: 'bg-amber-500/20 text-amber-400 border-amber-500/30 animate-pulse',
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
          badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30',
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
            badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
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

  const isLoading = loadingFollowups || loadingOpps;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Dashboard Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">
              🎯 Sales Rep Action Queue — Section I Compliant
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Hello, {user?.name}
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Your prioritized list of required next actions. Overdue & breached items are listed first.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <NavLink
              to="/pipeline"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl transition-all shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
            >
              <span>📋 Kanban Pipeline →</span>
            </NavLink>
          </div>
        </div>

        {/* Action Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Active</p>
              <p className="text-3xl font-extrabold text-white mt-2">{stats?.totalActive ?? opps.length}</p>
              <p className="text-[11px] text-slate-400 mt-1">Assigned leads</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-red-400 uppercase tracking-wider">P1: Urgent Action</p>
              <p className="text-3xl font-extrabold text-red-400 mt-2">
                {priorityQueue.filter((i) => i.priorityLevel === 1).length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Overdue & SLA Breached</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">P2: Hot Deals</p>
              <p className="text-3xl font-extrabold text-indigo-300 mt-2">
                {priorityQueue.filter((i) => i.priorityLevel === 2).length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Site Visit & Negotiation</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 backdrop-blur-xl">
            <CardContent className="p-5">
              <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">P3: Scheduled</p>
              <p className="text-3xl font-extrabold text-emerald-400 mt-2">
                {priorityQueue.filter((i) => i.priorityLevel === 3).length}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">Pending follow-ups</p>
            </CardContent>
          </Card>
        </div>

        {/* Priority Work Queue Table / List */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/80 pb-4">
            <div>
              <CardTitle className="text-lg font-extrabold flex items-center gap-2">
                <span>⚡ Daily Priority Action Queue</span>
              </CardTitle>
              <p className="text-xs text-slate-400 mt-0.5">
                Focus on high-priority items at the top to maintain SLA compliance and pipeline momentum.
              </p>
            </div>

            {/* Filter Pill Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-slate-950 rounded-xl border border-slate-800">
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
          </CardHeader>

          <CardContent className="p-4 sm:p-6 space-y-3">
            {isLoading ? (
              <div className="space-y-3 py-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-20 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : filteredQueue.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <div className="text-4xl">🎉</div>
                <h3 className="text-base font-bold text-slate-200">No Priority Actions Pending</h3>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  You have completed all urgent follow-ups and SLA touchpoints. Check the Pipeline Kanban board to move deals forward!
                </p>
              </div>
            ) : (
              filteredQueue.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 rounded-xl border transition-all duration-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.priorityLevel === 1
                      ? 'border-red-500/30 bg-red-500/5 hover:border-red-500/50'
                      : item.priorityLevel === 2
                      ? 'border-indigo-500/20 bg-indigo-500/5 hover:border-indigo-500/40'
                      : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                  }`}
                >
                  {/* Left Info Column */}
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-extrabold uppercase border ${item.badgeColor}`}>
                        {item.typeLabel}
                      </span>

                      <Badge variant={getStageBadgeVariant(item.stage)}>
                        {item.stage ? item.stage.replace('_', ' ') : 'new'}
                      </Badge>
                    </div>

                    <h4 className="text-base font-bold text-slate-100 hover:text-indigo-300 transition-colors truncate">
                      {item.customerName}
                    </h4>

                    <p className="text-xs text-slate-400">
                      {item.actionText}
                    </p>

                    <div className="flex items-center gap-4 text-[11px] text-slate-500 font-mono pt-1">
                      <span>🏙️ {item.projectName}</span>
                      <span>📱 {item.mobile}</span>
                      {item.dueText && <span>⏰ {item.dueText}</span>}
                    </div>
                  </div>

                  {/* Right Action Button */}
                  <div className="shrink-0 flex items-center gap-2">
                    <Button
                      onClick={() => navigate(`/leads/${item.opportunityId}`)}
                      className={`text-xs h-10 px-4 font-bold shadow-md ${
                        item.priorityLevel === 1
                          ? 'bg-red-600 hover:bg-red-500 text-white shadow-red-600/20'
                          : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/20'
                      }`}
                    >
                      Take Action →
                    </Button>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

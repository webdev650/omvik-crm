import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, Trophy, Users, CheckCircle2, AlertTriangle, Home } from 'lucide-react';
import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getMyPerformance } from '../api/reports';
import { Button } from '../components/ui/button';

export default function MyPerformance() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['myPerformance'],
    queryFn: getMyPerformance
  });

  const perf = data?.performance || {};

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Individual Performance Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Performance Stats
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Personal conversion metrics, call activity, site visit counts, and deals won.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="px-3 py-1.5 rounded-xl bg-[#0b0f19] border border-slate-800 font-mono text-xs text-indigo-400 font-bold">
              ID: {user?.employeeId || '—'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-[#131c31] border border-slate-800/80 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <div className="bg-[#131c31] border border-red-500/30 p-8 rounded-2xl text-center space-y-3">
            <p className="text-red-400 text-xs font-semibold">Failed to load your performance data.</p>
            <Button onClick={() => refetch()} className="bg-slate-800 text-slate-200 text-xs font-bold">
              Retry Load
            </Button>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Top Highlight Banners */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
              
              {/* Conversion Rate Card */}
              <div className="p-6 rounded-2xl bg-[#131c31] border border-indigo-500/30 shadow-sm relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-400">
                    Conversion Rate (Win Ratio)
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-white">{perf.winRate || 0}%</span>
                  <span className="text-xs font-bold text-indigo-300">
                    {perf.opportunitiesWon || 0} Won / {perf.leadsOwned || 0} Total
                  </span>
                </div>
                <p className="text-xs text-slate-400">
                  Percentage of your assigned opportunities successfully closed as Won.
                </p>
              </div>

              {/* Deals Closed Won Card */}
              <div className="p-6 rounded-2xl bg-[#131c31] border border-emerald-500/30 shadow-sm relative overflow-hidden space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400">
                    Deals Closed Won
                  </span>
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-sm" />
                </div>
                <div className="flex items-baseline gap-3">
                  <span className="text-4xl sm:text-5xl font-black text-white">{perf.opportunitiesWon || 0}</span>
                  <span className="text-xs font-bold text-emerald-400">Closed Sales</span>
                </div>
                <p className="text-xs text-slate-400">
                  Total client agreements signed and finalized under your account.
                </p>
              </div>

            </div>

            {/* Grid of 4 Key Stat Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              
              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                  <Users className="w-3.5 h-3.5 text-blue-400" />
                  <span>Total Leads Owned</span>
                </p>
                <p className="text-3xl font-black text-white">{perf.leadsOwned || 0}</p>
                <p className="text-xs text-slate-500">Currently assigned opportunities</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Follow-ups Completed</span>
                </p>
                <p className="text-3xl font-black text-emerald-400">{perf.followupsCompleted || 0}</p>
                <p className="text-xs text-slate-500">Logged client touchpoints</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-400 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                  <span>Overdue Follow-ups</span>
                </p>
                <p className="text-3xl font-black text-red-400">{perf.followupsOverdue || 0}</p>
                <p className="text-xs text-slate-500">Action items requiring immediate call</p>
              </div>

              <div className="p-5 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm space-y-1">
                <p className="text-[10px] font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-1.5">
                  <Home className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Site Visits Driven</span>
                </p>
                <p className="text-3xl font-black text-cyan-300">{perf.siteVisitsCompleted || 0}</p>
                <p className="text-xs text-slate-500">Completed & advanced visits</p>
              </div>

            </div>
          </div>
        )}
      </main>
    </div>
  );
}

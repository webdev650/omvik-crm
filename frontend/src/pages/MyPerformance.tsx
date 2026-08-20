import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getMyPerformance } from '../api/reports';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';

export default function MyPerformance() {
  const { user } = useAuth();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['myPerformance'],
    queryFn: getMyPerformance
  });

  const perf = data?.performance || {};

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background Accent Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
              📊 Individual Performance Metrics
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              My Performance Stats
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Personal conversion metrics, call activity, site visit counts, and deals won.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 font-mono text-xs text-indigo-400 font-bold">
              ID: {user?.employeeId || '—'}
            </span>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-32 bg-slate-900/60 border border-slate-800 rounded-2xl animate-pulse" />
            ))}
          </div>
        ) : isError ? (
          <Card className="border-red-500/30 bg-slate-900/80 p-8 text-center space-y-3">
            <p className="text-red-400 font-medium">Failed to load your performance data.</p>
            <Button onClick={() => refetch()} className="bg-slate-800 text-slate-200 text-xs font-bold">
              Retry Load
            </Button>
          </Card>
        ) : (
          <div className="space-y-6">
            {/* Top Highlight Banner */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="border-indigo-500/30 bg-gradient-to-tr from-indigo-950/60 to-slate-900/90 shadow-2xl backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest">
                    Conversion Rate (Win Ratio)
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white">{perf.winRate || 0}%</span>
                    <span className="text-sm font-bold text-indigo-300">
                      {perf.opportunitiesWon || 0} Won / {perf.leadsOwned || 0} Total
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Percentage of your assigned opportunities successfully closed as Won.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-emerald-500/30 bg-gradient-to-tr from-emerald-950/60 to-slate-900/90 shadow-2xl backdrop-blur-xl">
                <CardHeader className="pb-2">
                  <CardTitle className="text-xs font-extrabold text-emerald-400 uppercase tracking-widest">
                    Deals Closed Won
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <div className="flex items-baseline gap-3">
                    <span className="text-5xl font-black text-white">{perf.opportunitiesWon || 0}</span>
                    <span className="text-sm font-bold text-emerald-400">Closed Sales</span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Total client agreements signed and finalized under your account.
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Grid of Key Stat Tiles */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
                <CardContent className="p-5 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-slate-400">
                    💼 Total Leads Owned
                  </p>
                  <p className="text-3xl font-black text-white">{perf.leadsOwned || 0}</p>
                  <p className="text-xs text-slate-500">Currently assigned opportunities</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
                <CardContent className="p-5 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
                    ✅ Follow-ups Completed
                  </p>
                  <p className="text-3xl font-black text-emerald-400">{perf.followupsCompleted || 0}</p>
                  <p className="text-xs text-slate-500">Logged client touchpoints</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
                <CardContent className="p-5 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                    ⏰ Overdue Follow-ups
                  </p>
                  <p className="text-3xl font-black text-red-400">{perf.followupsOverdue || 0}</p>
                  <p className="text-xs text-slate-500">Action items requiring immediate call</p>
                </CardContent>
              </Card>

              <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
                <CardContent className="p-5 space-y-1">
                  <p className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                    🏡 Site Visits Driven
                  </p>
                  <p className="text-3xl font-black text-cyan-300">{perf.siteVisitsCompleted || 0}</p>
                  <p className="text-xs text-slate-500">Completed & advanced visits</p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

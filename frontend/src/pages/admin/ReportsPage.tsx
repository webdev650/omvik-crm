import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { BarChart3, TrendingUp, Filter, PieChart } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getDashboardSummary } from '../../api/dashboard';
import { Badge } from '../../components/ui/badge';

export default function ReportsPage() {
  const { data: summaryData, isLoading } = useQuery({
    queryKey: ['dashboardSummary'],
    queryFn: getDashboardSummary
  });

  const stats = summaryData?.stats || {};
  const stageCounts = stats.stageCounts || {};
  const sourceBreakdown = stats.sourceBreakdown || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <BarChart3 className="w-3.5 h-3.5" />
              <span>Executive Analytics</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Executive Reports & Analytics
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Organization-wide conversion funnel, lost-lead distribution, and team sales performance.
            </p>
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="h-64 bg-[#131c31] rounded-2xl animate-pulse border border-slate-800/80" />
            <div className="h-64 bg-[#131c31] rounded-2xl animate-pulse border border-slate-800/80" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Funnel Performance Card */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Filter className="w-4 h-4 text-indigo-400" />
                  <span>Opportunity Funnel Breakdown</span>
                </h3>
                <p className="text-xs text-slate-400">Live counts by opportunity stage across all active real estate projects</p>
              </div>

              <div className="space-y-2.5">
                {Object.entries(stageCounts).map(([stage, count]: [string, any]) => (
                  <div key={stage} className="flex items-center justify-between p-3 rounded-xl bg-[#0b0f19] border border-slate-800/80">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {stage.replace('_', ' ')}
                    </span>
                    <Badge variant="outline" className="text-xs font-bold bg-indigo-500/10 text-indigo-300 border-indigo-500/30">
                      {count} deals
                    </Badge>
                  </div>
                ))}
              </div>
            </div>

            {/* Lead Source Breakdown Card */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-emerald-400" />
                  <span>Lead Source Acquisition</span>
                </h3>
                <p className="text-xs text-slate-400">Attribution analysis by lead acquisition channel</p>
              </div>

              <div className="space-y-2.5">
                {sourceBreakdown.length === 0 ? (
                  <p className="text-xs text-slate-500 italic py-6 text-center">No source data recorded yet</p>
                ) : (
                  sourceBreakdown.map((src: any) => (
                    <div key={src._id} className="flex items-center justify-between p-3 rounded-xl bg-[#0b0f19] border border-slate-800/80">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {src._id?.replace('_', ' ') || 'Direct'}
                      </span>
                      <span className="text-xs font-bold font-mono text-emerald-400">
                        {src.count} leads
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

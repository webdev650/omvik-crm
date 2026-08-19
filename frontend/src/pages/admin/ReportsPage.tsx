import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getDashboardSummary } from '../../api/dashboard';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
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
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-black text-slate-100 tracking-tight">
          Executive Reports & Analytics
        </h1>
        <p className="text-sm text-slate-400">
          Organization-wide conversion funnel, lost-lead distribution, and team sales performance.
        </p>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800" />
          <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse border border-slate-800" />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Funnel Performance Card */}
          <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg">Opportunity Funnel Breakdown</CardTitle>
              <CardDescription>Live counts by opportunity stage across all active projects</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(stageCounts).map(([stage, count]: [string, any]) => (
                <div key={stage} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                  <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                    {stage.replace('_', ' ')}
                  </span>
                  <Badge variant="outline" className="text-sm font-bold bg-indigo-500/10 text-indigo-400 border-indigo-500/30">
                    {count}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Lead Source Breakdown Card */}
          <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-lg">Lead Source Acquisition</CardTitle>
              <CardDescription>Attribution analysis by lead acquisition channel</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {sourceBreakdown.length === 0 ? (
                <p className="text-xs text-slate-500 italic py-4 text-center">No source data recorded yet</p>
              ) : (
                sourceBreakdown.map((src: any) => (
                  <div key={src._id} className="flex items-center justify-between p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                      {src._id?.replace('_', ' ') || 'Direct'}
                    </span>
                    <span className="text-sm font-extrabold text-emerald-400">
                      {src.count} leads
                    </span>
                  </div>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

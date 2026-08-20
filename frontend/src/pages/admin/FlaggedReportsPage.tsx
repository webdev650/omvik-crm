import React from 'react';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../../components/Navbar';
import { getFlaggedReports } from '../../api/dailyReports';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

export default function FlaggedReportsPage() {
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['flaggedReports'],
    queryFn: getFlaggedReports
  });

  const reports = data?.reports || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
              🚨 Audit & Verification
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Flagged EOD Activity Reports
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Review End-of-Day submissions where self-reported figures differ significantly from system logs.
            </p>
          </div>
        </div>

        {/* Flagged Reports Table */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>📋 Discrepancy Submissions ({reports.length})</span>
              <Button onClick={() => refetch()} variant="outline" className="h-8 border-slate-800 text-xs text-slate-300">
                Refresh Log
              </Button>
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-red-400 text-sm">
                Failed to load flagged daily reports.
              </div>
            ) : reports.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                ✨ No EOD activity report discrepancies flagged. All self-reported numbers match system activity logs!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead className="text-right">Claimed Calls vs Actual</TableHead>
                    <TableHead className="text-right">Claimed Follow-ups</TableHead>
                    <TableHead className="text-right">Claimed Visits</TableHead>
                    <TableHead>Discrepancy Note</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((r: any) => (
                    <TableRow key={r._id} className="hover:bg-slate-800/50">
                      <TableCell className="font-bold text-white">
                        <div>
                          <p>{r.user?.name || 'Employee'}</p>
                          <p className="text-[10px] text-indigo-400 font-mono">{r.user?.employeeId || 'EMP'}</p>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-slate-300 text-xs">{r.date}</TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="text-amber-400 font-bold">{r.claimedCalls}</span>
                        <span className="text-slate-500"> / {r.systemActivityCount} logged</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="text-amber-400 font-bold">{r.claimedFollowups}</span>
                        <span className="text-slate-500"> / {r.systemFollowupCount} logged</span>
                      </TableCell>
                      <TableCell className="text-right font-mono text-xs">
                        <span className="text-amber-400 font-bold">{r.claimedSiteVisits}</span>
                        <span className="text-slate-500"> / {r.systemSiteVisitCount} logged</span>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        <div className="space-y-1">
                          <Badge variant="destructive" className="text-[10px]">
                            FLAGGED
                          </Badge>
                          <p className="text-slate-400">{r.notes ? `"${r.notes}"` : 'No additional note provided'}</p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

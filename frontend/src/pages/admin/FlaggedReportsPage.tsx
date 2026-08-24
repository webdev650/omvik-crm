import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, RefreshCw, FileWarning } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getFlaggedReports } from '../../api/dailyReports';
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
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <FileWarning className="w-3.5 h-3.5" />
              <span>Audit & Verification</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Flagged EOD Activity Reports
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Review End-of-Day submissions where self-reported figures differ significantly from system logs.
            </p>
          </div>

          <Button
            onClick={() => refetch()}
            variant="outline"
            className="h-11 px-4 border-slate-800 bg-[#0b0f19] text-xs text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl gap-2 min-h-[44px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Refresh Log</span>
          </Button>
        </div>

        {/* Flagged Reports Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">📋 Discrepancy Submissions ({reports.length})</h4>
          </div>

          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400 text-xs font-bold">
              Failed to load flagged daily reports.
            </div>
          ) : reports.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              ✨ No EOD activity report discrepancies flagged. All self-reported numbers match system activity logs!
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#0b0f19]">
                <TableRow className="border-b border-slate-800">
                  <TableHead className="text-slate-400 font-semibold text-xs">Employee</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Date</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs text-right">Claimed Calls vs Actual</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs text-right">Claimed Follow-ups</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs text-right">Claimed Visits</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Discrepancy Note</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((r: any) => (
                  <TableRow key={r._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                    <TableCell className="font-bold text-white text-xs">
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
        </div>
      </main>
    </div>
  );
}

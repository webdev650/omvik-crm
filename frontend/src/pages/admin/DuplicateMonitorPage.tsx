import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, ShieldCheck, AlertTriangle, ArrowRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getDuplicateMonitorMetrics } from '../../api/admin';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';

export default function DuplicateMonitorPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'duplicateMonitor'],
    queryFn: getDuplicateMonitorMetrics
  });

  const dm = data?.duplicateMonitor || {};
  const recentBlockedAttempts = dm.recentBlockedAttempts || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-[11px] font-bold uppercase tracking-wider">
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>Real-Time Protection</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Duplicate Monitor Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Audit duplicate lead creation attempts blocked by the atomic database constraint engine.
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400">
              🛡️ Total Blocked Attempts
            </p>
            <p className="text-2xl font-black text-[#10b981] font-mono">{dm.totalBlockedCount || 0}</p>
            <p className="text-xs text-slate-500">Atomic database duplicate blocks</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              ⚠️ Blocked This Month
            </p>
            <p className="text-2xl font-black text-amber-400 font-mono">{dm.blockedThisMonth || 0}</p>
            <p className="text-xs text-slate-500">Duplicates prevented in current month</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
              ⚡ Overrides Granted
            </p>
            <p className="text-2xl font-black text-indigo-300 font-mono">{dm.overridesCount || 0}</p>
            <p className="text-xs text-slate-500">Super Admin exception overrides</p>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">🚫 Recently Blocked Duplicate Attempts</h4>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : recentBlockedAttempts.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              🎉 Zero duplicate attempts logged in system audit history.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#0b0f19]">
                <TableRow className="border-b border-slate-800">
                  <TableHead className="text-slate-400 font-semibold text-xs">Customer Name</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Normalized Mobile</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Target Project</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Attempted By</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs text-right">Attempt Time</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentBlockedAttempts.map((item: any, idx: number) => (
                  <TableRow key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                    <TableCell className="font-bold text-white text-xs">{item.rawName || '—'}</TableCell>
                    <TableCell className="text-indigo-400 text-xs font-mono">{item.mobile}</TableCell>
                    <TableCell className="text-slate-300 text-xs">{item.project?.name || 'Project'}</TableCell>
                    <TableCell className="text-slate-400 text-xs">{item.user?.name || 'System'}</TableCell>
                    <TableCell className="text-slate-500 text-xs font-mono text-right">
                      {new Date(item.timestamp).toLocaleString()}
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

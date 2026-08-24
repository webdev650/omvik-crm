import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, AlertTriangle, UserX, PhoneOff, CalendarOff, Clock, ArrowRight } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getDataQualityMetrics } from '../../api/admin';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';

export default function DataQualityPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['admin', 'dataQuality'],
    queryFn: getDataQualityMetrics
  });

  const dq = data?.dataQuality || {};
  const noNextActionList = dq.noNextActionList || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin Data Governance</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Data Quality Centre
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Audit missing owners, invalid contacts, next-action rule violations, and stale pipeline leads.
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
              🚫 Unassigned / No Owner
            </p>
            <p className="text-2xl font-black text-white font-mono">{dq.noOwnerCount || 0}</p>
            <p className="text-xs text-slate-500">Leads requiring owner assignment</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
              📱 Invalid / Missing Mobile
            </p>
            <p className="text-2xl font-black text-amber-400 font-mono">{dq.invalidMobileCount || 0}</p>
            <p className="text-xs text-slate-500">Customer records missing phone</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
              ⚡ Missing Next Action
            </p>
            <p className="text-2xl font-black text-indigo-300 font-mono">{dq.noNextActionCount || 0}</p>
            <p className="text-xs text-slate-500">Active leads with no follow-up</p>
          </div>

          <div className="p-5 rounded-2xl border border-slate-800/80 bg-[#131c31] space-y-1">
            <p className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
              ⏰ Stale Leads (14+ Days)
            </p>
            <p className="text-2xl font-black text-cyan-300 font-mono">{dq.stale14DaysCount || 0}</p>
            <p className="text-xs text-slate-500">No activity logged in 2 weeks</p>
          </div>
        </div>

        {/* Violations Detail Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19]">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider">⚡ Active Leads Violating Next Action Rule</h4>
          </div>
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-10 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : noNextActionList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              🎉 Excellent! Zero active leads are violating the Next Action Rule.
            </div>
          ) : (
            <Table>
              <TableHeader className="bg-[#0b0f19]">
                <TableRow className="border-b border-slate-800">
                  <TableHead className="text-slate-400 font-semibold text-xs">Customer</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Project</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Assigned Rep</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Stage</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {noNextActionList.map((opp: any) => (
                  <TableRow key={opp._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                    <TableCell className="font-bold text-white text-xs">{opp.customer?.name || 'Lead'}</TableCell>
                    <TableCell className="text-slate-300 text-xs">{opp.project?.name || 'Project'}</TableCell>
                    <TableCell className="text-slate-400 text-xs">{opp.owner?.name || 'Unassigned'}</TableCell>
                    <TableCell className="text-indigo-400 text-xs font-mono uppercase">{opp.stage}</TableCell>
                    <TableCell className="text-right">
                      <Button
                        onClick={() => navigate(`/leads/${opp._id}`)}
                        variant="outline"
                        className="h-8 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white font-bold rounded-lg"
                      >
                        Fix Lead →
                      </Button>
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

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getDataQualityMetrics } from '../../api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest mb-2">
              🛡️ Admin Data Governance
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Data Quality Centre
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Audit missing owners, invalid contacts, next-action rule violations, and stale pipeline leads.
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-red-400">
                🚫 Unassigned / No Owner
              </p>
              <p className="text-3xl font-black text-white">{dq.noOwnerCount || 0}</p>
              <p className="text-xs text-slate-500">Leads requiring owner assignment</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-amber-400">
                📱 Invalid / Missing Mobile
              </p>
              <p className="text-3xl font-black text-amber-400">{dq.invalidMobileCount || 0}</p>
              <p className="text-xs text-slate-500">Customer records missing phone</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-indigo-400">
                ⚡ Missing Next Action
              </p>
              <p className="text-3xl font-black text-indigo-300">{dq.noNextActionCount || 0}</p>
              <p className="text-xs text-slate-500">Active leads with no follow-up</p>
            </CardContent>
          </Card>

          <Card className="border-slate-800 bg-slate-900/80 shadow-xl backdrop-blur-xl">
            <CardContent className="p-5 space-y-1">
              <p className="text-[10px] font-extrabold uppercase tracking-widest text-cyan-400">
                ⏰ Stale Leads (14+ Days)
              </p>
              <p className="text-3xl font-black text-cyan-300">{dq.stale14DaysCount || 0}</p>
              <p className="text-xs text-slate-500">No activity logged in 2 weeks</p>
            </CardContent>
          </Card>
        </div>

        {/* Violations Detail Table */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <span>⚡ Active Leads Violating Next Action Rule</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
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
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead>Project</TableHead>
                    <TableHead>Assigned Rep</TableHead>
                    <TableHead>Stage</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {noNextActionList.map((opp: any) => (
                    <TableRow key={opp._id} className="hover:bg-slate-800/50">
                      <TableCell className="font-bold text-white">{opp.customer?.name || 'Lead'}</TableCell>
                      <TableCell className="text-slate-300 text-xs">{opp.project?.name || 'Project'}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{opp.owner?.name || 'Unassigned'}</TableCell>
                      <TableCell className="text-indigo-400 text-xs font-mono uppercase">{opp.stage}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          onClick={() => navigate(`/leads/${opp._id}`)}
                          variant="outline"
                          className="h-7 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 font-bold"
                        >
                          Fix Lead →
                        </Button>
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

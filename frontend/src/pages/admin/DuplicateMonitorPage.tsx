import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Navbar from '../../components/Navbar';
import { getDuplicateMonitorMetrics } from '../../api/admin';
import { Card, CardHeader, CardTitle, CardContent } from '../../components/ui/card';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold uppercase tracking-widest mb-2">
              🚫 Real-Time Protection
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Duplicate Monitor Dashboard
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Audit duplicate lead creation attempts blocked by the atomic database constraint engine.
            </p>
          </div>
        </div>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
          <Card className="border-red-500/30 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extrabold text-red-400 uppercase tracking-widest">
                Blocked Attempts Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-white">{dm.blockedTodayCount || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Duplicate submissions safely intercepted</p>
            </CardContent>
          </Card>

          <Card className="border-indigo-500/30 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
            <CardHeader className="pb-2">
              <CardTitle className="text-xs font-extrabold text-indigo-400 uppercase tracking-widest">
                Super Admin Overrides Today
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-black text-white">{dm.overridesTodayCount || 0}</div>
              <p className="text-xs text-slate-400 mt-1">Manual duplicate override approvals executed</p>
            </CardContent>
          </Card>
        </div>

        {/* Blocked Log Table */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
              <span>📋 Recent Blocked Duplicate Log</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-6 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-10 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : recentBlockedAttempts.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                No duplicate lead attempts logged today.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Prospect Name</TableHead>
                    <TableHead>Mobile</TableHead>
                    <TableHead>Target Project</TableHead>
                    <TableHead>Existing Owner</TableHead>
                    <TableHead className="text-right">Blocked Time</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recentBlockedAttempts.map((item: any) => (
                    <TableRow key={item._id} className="hover:bg-slate-800/50">
                      <TableCell className="font-bold text-white">{item.rawName || 'Lead'}</TableCell>
                      <TableCell className="text-slate-300 font-mono text-xs">{item.rawMobile}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{item.project?.name || 'Project'}</TableCell>
                      <TableCell className="text-indigo-400 text-xs font-semibold">
                        {item.existingOpportunity?.owner?.name || 'Assigned'}
                      </TableCell>
                      <TableCell className="text-slate-500 font-mono text-xs text-right">
                        {new Date(item.createdAt).toLocaleString('en-IN', {
                          month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit'
                        })}
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

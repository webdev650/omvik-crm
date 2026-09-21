import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { ClipboardList, RefreshCw, Calendar, CheckCircle2, AlertTriangle, Clock, FileWarning, Layers, MessageSquare, Phone, PhoneCall, MapPin, BookmarkCheck } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getTeamOverviewReport } from '../../api/dailyReports';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';

export default function TeamEODOverviewPage() {
  const navigate = useNavigate();
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['teamEODOverview', selectedDate],
    queryFn: () => getTeamOverviewReport(selectedDate)
  });

  const overviewList = data?.overview || [];
  const submittedCount = data?.submittedCount || 0;
  const pendingCount = data?.pendingCount || 0;
  const discrepantCount = overviewList.filter((item: any) => item.report?.discrepancyFlag).length;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Page Hero Header & Controls */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <ClipboardList className="w-3.5 h-3.5" />
              <span>Management Oversight</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Team EOD Overview
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Monitor daily report submission compliance and compare self-reported accomplishments against system logs.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Date Picker */}
            <div className="flex items-center gap-2 bg-[#0b0f19] border border-slate-800 p-1.5 px-3 rounded-xl">
              <Calendar className="w-4 h-4 text-indigo-400 shrink-0" />
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Date:</span>
              <Input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="h-8 w-36 bg-transparent border-0 text-white font-mono text-xs font-bold focus:outline-none focus:ring-0 p-0"
              />
            </div>

            {/* Quick Link to Flagged Reports */}
            <Button
              onClick={() => navigate('/admin/flagged-reports')}
              variant="outline"
              className="h-11 px-3.5 border-slate-800 bg-[#0b0f19] text-amber-400 hover:bg-slate-800 hover:text-amber-300 rounded-xl gap-2 min-h-[44px] text-xs font-bold"
            >
              <FileWarning className="w-4 h-4 text-amber-400" />
              <span>Flagged Reports ({discrepantCount})</span>
            </Button>

            {/* Refresh Button */}
            <Button
              onClick={() => refetch()}
              variant="outline"
              className="h-11 px-3.5 border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-slate-800 hover:text-white rounded-xl gap-2 min-h-[44px] text-xs font-bold"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Refresh</span>
            </Button>
          </div>
        </div>

        {/* Summary Stat Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#131c31] border border-slate-800/80 space-y-1">
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Active Team</p>
            <p className="text-2xl font-black text-white font-mono">{overviewList.length}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#131c31] border border-emerald-500/20 bg-emerald-500/5 space-y-1">
            <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>EOD Submitted</span>
            </p>
            <p className="text-2xl font-black text-emerald-400 font-mono">{submittedCount}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#131c31] border border-amber-500/20 bg-amber-500/5 space-y-1">
            <p className="text-[11px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>Pending Submission</span>
            </p>
            <p className="text-2xl font-black text-amber-400 font-mono">{pendingCount}</p>
          </div>

          <div className="p-4 rounded-2xl bg-[#131c31] border border-red-500/20 bg-red-500/5 space-y-1">
            <p className="text-[11px] font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Discrepancies Flagged</span>
            </p>
            <p className="text-2xl font-black text-red-400 font-mono">{discrepantCount}</p>
          </div>
        </div>

        {/* Main Team EOD Table */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden space-y-0">
          <div className="p-4 border-b border-slate-800 bg-[#0b0f19] flex items-center justify-between">
            <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>📋 Daily Team Compliance Log ({selectedDate})</span>
              <span className="text-[10px] text-slate-400 font-normal">
                (Unsubmitted telecallers sorted at top)
              </span>
            </h4>
          </div>

          {isLoading ? (
            <div className="p-8 space-y-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center text-red-400 text-xs font-bold">
              Failed to load team EOD overview.
            </div>
          ) : overviewList.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No active team members found for this date.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-400 font-semibold text-xs">Telecaller</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Status</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Active Leads</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">WhatsApp</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Total Calls</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Connected Calls</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Visits</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs text-center">Bookings</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Notes / Discrepancy</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {overviewList.map((item: any) => {
                    const emp = item.user;
                    const report = item.report;
                    const isSubmitted = item.submitted;
                    const isRequired = item.isRequiredSubmitter ?? ['telecaller', 'team_lead'].includes(emp.role);
                    const isDiscrepant = report?.discrepancyFlag;

                    return (
                      <TableRow
                        key={emp._id}
                        className={`border-b border-slate-800/40 transition-colors ${
                          !isSubmitted && isRequired
                            ? 'bg-amber-500/5 hover:bg-amber-500/10'
                            : isDiscrepant
                            ? 'bg-red-500/5 hover:bg-red-500/10'
                            : 'hover:bg-slate-800/40'
                        }`}
                      >
                        {/* Employee Name & ID */}
                        <TableCell className="font-bold text-white text-xs">
                          <div>
                            <p className="text-slate-100">{emp.name}</p>
                            <div className="flex items-center gap-1.5 mt-0.5">
                              <span className="text-[10px] text-indigo-400 font-mono font-semibold">
                                {emp.employeeId || 'EMP'}
                              </span>
                              <span className="text-[9px] uppercase px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-semibold">
                                {emp.role}
                              </span>
                            </div>
                          </div>
                        </TableCell>

                        {/* Status Badge */}
                        <TableCell className="text-center">
                          {!isSubmitted ? (
                            isRequired ? (
                              <Badge className="bg-amber-500/15 text-amber-300 border-amber-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1">
                                Pending
                              </Badge>
                            ) : (
                              <Badge className="bg-slate-800 text-slate-400 border-slate-700 text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5">
                                N/A (Exempt)
                              </Badge>
                            )
                          ) : isDiscrepant ? (
                            <Badge variant="destructive" className="text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1 gap-1">
                              <span>Flagged ⚠️</span>
                            </Badge>
                          ) : (
                            <Badge className="bg-emerald-500/15 text-emerald-400 border-emerald-500/30 text-[10px] uppercase tracking-wider font-extrabold px-2.5 py-1">
                              Submitted ✓
                            </Badge>
                          )}
                        </TableCell>

                        {/* Current Active Leads Assigned */}
                        <TableCell className="text-center font-mono text-xs font-extrabold text-indigo-300">
                          {item.currentLeadsAssigned ?? 0}
                        </TableCell>

                        {/* WhatsApp Messages */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-emerald-400">{report.whatsappMessages ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemWhatsappCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Total Calls */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-blue-400">{report.claimedCalls ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemActivityCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Connected Calls */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-cyan-400">{report.connectedCalls ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemConnectedCallsCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Site Visits */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-purple-400">{report.claimedSiteVisits ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemSiteVisitCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Bookings */}
                        <TableCell className="text-center font-mono text-xs">
                          {isSubmitted ? (
                            <div>
                              <span className="font-extrabold text-amber-400">{report.bookingsToday ?? 0}</span>
                              <span className="text-[10px] text-slate-500 block">/ {report.systemBookingsCount ?? 0} logged</span>
                            </div>
                          ) : (
                            <span className="text-slate-600">—</span>
                          )}
                        </TableCell>

                        {/* Notes & Discrepancies */}
                        <TableCell className="text-xs text-slate-300">
                          {isSubmitted ? (
                            <div className="space-y-1 max-w-xs">
                              {isDiscrepant && (
                                <p className="text-[11px] text-amber-400 font-semibold leading-tight">
                                  ⚠️ {report.discrepancyNote}
                                </p>
                              )}
                              <p className="text-slate-400 truncate">
                                {report.notes ? `"${report.notes}"` : 'No remarks'}
                              </p>
                            </div>
                          ) : isRequired ? (
                            <span className="text-amber-400/80 text-[11px] italic font-semibold">Report not submitted yet</span>
                          ) : (
                            <span className="text-slate-500 text-[11px] italic">Exempt from EOD submission</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

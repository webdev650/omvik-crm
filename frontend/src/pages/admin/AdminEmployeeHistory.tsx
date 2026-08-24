import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useParams, useNavigate } from 'react-router-dom';
import { History, Calendar, UserCheck, PhoneCall, CheckCircle2, AlertTriangle, ArrowRight, User } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getUsers } from '../../api/users';
import { getEmployeeHistory } from '../../api/reports';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';

// Date Helper to format YYYY-MM-DD
function formatDateISO(d: Date) {
  return d.toISOString().split('T')[0];
}

export default function AdminEmployeeHistory() {
  const { userId: urlUserId } = useParams();
  const navigate = useNavigate();

  // Selected Employee & Date State
  const [selectedUserId, setSelectedUserId] = useState<string>(urlUserId || '');

  const now = new Date();
  const tenDaysAgo = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000);

  const [fromDate, setFromDate] = useState<string>(formatDateISO(tenDaysAgo));
  const [toDate, setToDate] = useState<string>(formatDateISO(now));

  // Query User List for Picker Dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  const usersList = usersData?.users || [];

  // Set default selected employee if not set
  useEffect(() => {
    if (!selectedUserId && usersList.length > 0) {
      setSelectedUserId(usersList[0]._id);
    }
  }, [usersList, selectedUserId]);

  // Query Employee Performance History for Selected Range
  const { data: historyData, isLoading, isError, error } = useQuery({
    queryKey: ['employeeHistory', selectedUserId, fromDate, toDate],
    queryFn: () => getEmployeeHistory(selectedUserId, fromDate, toDate),
    enabled: !!selectedUserId && !!fromDate && !!toDate
  });

  const emp = historyData?.employee;
  const summary = historyData?.summary;
  const dailyReports = historyData?.dailyReports || [];

  // Preset Date Handlers
  const applyPreset = (days: number) => {
    const end = new Date();
    const start = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    setFromDate(formatDateISO(start));
    setToDate(formatDateISO(end));
  };

  const applyThisYear = () => {
    const end = new Date();
    const start = new Date(end.getFullYear(), 0, 1);
    setFromDate(formatDateISO(start));
    setToDate(formatDateISO(end));
  };

  const handleUserChange = (id: string) => {
    setSelectedUserId(id);
    navigate(`/admin/employee-history/${id}`);
  };

  const isNoActivity =
    summary &&
    summary.newLeadsInPeriod === 0 &&
    summary.totalOwnedInPeriod === 0 &&
    summary.activitiesCount === 0 &&
    summary.followupsCompleted === 0 &&
    summary.dealsWon === 0;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              <span>Individual Performance Drilldown</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Employee Activity & History Audit
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Filter any team member's performance metrics, activities, and daily reports for any custom date window.
            </p>
          </div>
        </div>

        {/* Controls Card: Employee Picker + Preset Buttons + Custom Date Inputs */}
        <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-5 sm:p-6 shadow-sm space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-end">
            {/* Employee Picker */}
            <div className="space-y-2">
              <Label htmlFor="empPicker" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                👤 Select Employee / Sales Rep
              </Label>
              <select
                id="empPicker"
                value={selectedUserId}
                onChange={(e) => handleUserChange(e.target.value)}
                className="w-full h-11 px-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-sm font-semibold focus:outline-none focus:border-indigo-500"
              >
                {usersList.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    {u.name} ({u.employeeId || 'ID'}) — {u.role?.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* Custom Date Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="fromDate" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  From Date
                </Label>
                <Input
                  id="fromDate"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                  className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs h-11"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="toDate" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  To Date
                </Label>
                <Input
                  id="toDate"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                  className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs h-11"
                />
              </div>
            </div>
          </div>

          {/* Quick Preset Buttons */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-800/80">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 mr-2">Quick Presets:</span>
            <Button
              type="button"
              onClick={() => applyPreset(10)}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Last 10 Days
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset(30)}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Last 30 Days
            </Button>
            <Button
              type="button"
              onClick={() => applyPreset(90)}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              Last 90 Days
            </Button>
            <Button
              type="button"
              onClick={applyThisYear}
              variant="outline"
              className="h-8 text-xs border-slate-800 bg-[#0b0f19] text-slate-300 hover:bg-indigo-600 hover:text-white transition-colors"
            >
              This Year
            </Button>
          </div>
        </div>

        {/* Loading / Error States */}
        {isLoading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
            <p className="text-xs text-slate-400">Loading performance history for date range...</p>
          </div>
        ) : isError ? (
          <div className="border border-red-500/30 bg-red-500/10 p-6 rounded-2xl text-center">
            <p className="text-xs font-bold text-red-400">
              {(error as any)?.response?.data?.message || 'Failed to fetch employee history. Access denied or invalid date range.'}
            </p>
          </div>
        ) : (
          <>
            {/* Employee Banner */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-[#131c31] border border-slate-800/80 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600/20 text-indigo-400 font-bold flex items-center justify-center text-sm">
                  {emp?.name?.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    {emp?.name}
                    <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 font-mono text-[10px]">
                      {emp?.employeeId || 'ID'}
                    </Badge>
                  </h3>
                  <p className="text-xs text-slate-400 font-mono">{emp?.email} • Team: {emp?.teamName}</p>
                </div>
              </div>
              <div className="text-left sm:text-right">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Selected Window</span>
                <span className="text-xs font-mono font-bold text-indigo-400">{fromDate} to {toDate}</span>
              </div>
            </div>

            {/* Empty State Banner */}
            {isNoActivity ? (
              <div className="border border-slate-800/80 bg-[#131c31] p-12 rounded-2xl text-center space-y-3">
                <div className="w-12 h-12 rounded-2xl bg-[#0b0f19] text-slate-400 flex items-center justify-center text-2xl mx-auto">
                  📋
                </div>
                <h3 className="text-sm font-bold text-slate-200">No Activity Recorded in Selected Window</h3>
                <p className="text-xs text-slate-400 max-w-md mx-auto">
                  {emp?.name} has 0 new leads, 0 logged activities, and 0 site visits between <span className="font-mono text-indigo-300">{fromDate}</span> and <span className="font-mono text-indigo-300">{toDate}</span>.
                </p>
              </div>
            ) : (
              <>
                {/* Aggregate Stat Cards Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31]">
                    <p className="text-xs text-indigo-400 uppercase tracking-wider font-semibold">New Leads in Window</p>
                    <div className="text-2xl font-black text-white font-mono mt-1">{summary?.newLeadsInPeriod || 0}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Total active: {summary?.totalOwnedInPeriod || 0}</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31]">
                    <p className="text-xs text-blue-400 uppercase tracking-wider font-semibold">Activities Logged</p>
                    <div className="text-2xl font-black text-white font-mono mt-1">{summary?.activitiesCount || 0}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Calls & interactions</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31]">
                    <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Deals Won / Lost</p>
                    <div className="text-2xl font-black text-emerald-400 font-mono mt-1">
                      {summary?.dealsWon || 0} <span className="text-slate-500 text-xs font-normal">/ {summary?.dealsLost || 0} lost</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">Conversions in period</p>
                  </div>

                  <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31]">
                    <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Site Visits & SLA</p>
                    <div className="text-2xl font-black text-white font-mono mt-1">{summary?.siteVisitsCompleted || 0}</div>
                    <p className="text-[11px] text-slate-400 mt-1">Visits completed • {summary?.slaBreaches || 0} SLA breaches</p>
                  </div>
                </div>

                {/* Call Outcome Breakdown */}
                {summary?.activityOutcomeBreakdown && (
                  <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-5 space-y-3">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">📞 Activity Outcome Breakdown</h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {Object.entries(summary.activityOutcomeBreakdown).map(([outcome, count]) => (
                        <div key={outcome} className="p-3 rounded-xl bg-[#0b0f19] border border-slate-800/80 text-center">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                            {outcome.replace('_', ' ')}
                          </span>
                          <span className="text-base font-bold font-mono text-indigo-300 mt-1 block">
                            {count as number}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Daily Reports Log Table */}
                <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] overflow-hidden shadow-sm">
                  <div className="p-4 border-b border-slate-800 bg-[#0b0f19]">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">📝 Daily EOD Report Log ({dailyReports.length})</h4>
                  </div>
                  {dailyReports.length === 0 ? (
                    <div className="p-8 text-center text-slate-400 text-xs">
                      No Daily EOD Reports submitted by {emp?.name} within this date window.
                    </div>
                  ) : (
                    <Table>
                      <TableHeader className="bg-[#0b0f19]">
                        <TableRow className="border-b border-slate-800">
                          <TableHead className="text-slate-400 font-semibold text-xs">Date</TableHead>
                          <TableHead className="text-slate-400 font-semibold text-xs text-right">Claimed Calls vs Actual</TableHead>
                          <TableHead className="text-slate-400 font-semibold text-xs text-right">Claimed Follow-ups</TableHead>
                          <TableHead className="text-slate-400 font-semibold text-xs text-right">Claimed Visits</TableHead>
                          <TableHead className="text-slate-400 font-semibold text-xs">Notes & Discrepancy Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {dailyReports.map((r: any) => (
                          <TableRow key={r._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                            <TableCell className="font-mono text-slate-200 text-xs font-bold">{r.date}</TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <span className={r.discrepancyFlag ? 'text-amber-400 font-bold' : 'text-slate-200'}>{r.claimedCalls}</span>
                              <span className="text-slate-500"> / {r.systemActivityCount} logged</span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <span className={r.discrepancyFlag ? 'text-amber-400 font-bold' : 'text-slate-200'}>{r.claimedFollowups}</span>
                              <span className="text-slate-500"> / {r.systemFollowupCount} logged</span>
                            </TableCell>
                            <TableCell className="text-right font-mono text-xs">
                              <span className={r.discrepancyFlag ? 'text-amber-400 font-bold' : 'text-slate-200'}>{r.claimedSiteVisits}</span>
                              <span className="text-slate-500"> / {r.systemSiteVisitCount} logged</span>
                            </TableCell>
                            <TableCell className="text-xs text-slate-300">
                              <div className="flex items-center gap-2">
                                {r.discrepancyFlag ? (
                                  <Badge variant="destructive" className="text-[10px]">
                                    ⚠️ FLAGGED
                                  </Badge>
                                ) : (
                                  <Badge variant="success" className="text-[10px]">
                                    ✓ VERIFIED
                                  </Badge>
                                )}
                                <span className="text-slate-400 truncate max-w-xs">{r.notes || '—'}</span>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getEmployeeWorkHistory, getEmployeeBatchSummary } from '../../api/importHistory';
import { getUsers } from '../../api/users';
import Navbar from '../../components/Navbar';
import useAuth from '../../hooks/useAuth';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  History,
  User,
  Calendar,
  Filter,
  Layers,
  TrendingUp,
  CheckCircle2,
  Clock,
  Award,
  X,
  Tag,
  ArrowRight,
  Eye,
  BarChart3
} from 'lucide-react';

export default function EmployeeWorkHistoryPage() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();

  const [selectedEmpId, setSelectedEmpId] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [selectedBatchSummary, setSelectedBatchSummary] = useState<string | null>(null);

  // Fetch Users for Employee Selector Dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });
  const users = usersData?.users || [];

  // Default select current user or first telecaller
  useEffect(() => {
    if (!selectedEmpId && users.length > 0) {
      if (currentUser?._id) {
        setSelectedEmpId(currentUser._id);
      } else {
        setSelectedEmpId(users[0]._id);
      }
    }
  }, [users, currentUser, selectedEmpId]);

  // Fetch Employee Work History Timeline
  const { data: historyData, isLoading } = useQuery({
    queryKey: ['employeeWorkHistory', selectedEmpId, fromDate, toDate],
    queryFn: () => getEmployeeWorkHistory(selectedEmpId, { startDate: fromDate, endDate: toDate }),
    enabled: !!selectedEmpId
  });

  const employee = historyData?.employee;
  const timeline = historyData?.timeline || [];

  // Fetch Employee Single Batch Detailed Performance Summary
  const { data: summaryData, isLoading: isSummaryLoading } = useQuery({
    queryKey: ['employeeBatchSummary', selectedEmpId, selectedBatchSummary],
    queryFn: () => getEmployeeBatchSummary(selectedEmpId, selectedBatchSummary!),
    enabled: !!selectedEmpId && !!selectedBatchSummary
  });

  const performance = summaryData?.performance;
  const batchLeads = summaryData?.leads || [];

  // Calculate Overall Conversion Rate across all batches for timeline sidebar
  const totalLeadsAssigned = timeline.reduce((acc: number, b: any) => acc + (b.leadCount || 0), 0);
  const totalWonDeals = timeline.reduce((acc: number, b: any) => acc + (b.currentStatus?.closedWon || 0), 0);
  const overallConversionRate = totalLeadsAssigned > 0 ? ((totalWonDeals / totalLeadsAssigned) * 100).toFixed(1) : '0';

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <History className="w-3.5 h-3.5" />
              <span>Employee Performance &amp; Assignment Audit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Employee Work History
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Timeline view of batch assignments, lead handling performance, and conversion metrics per employee.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/admin/import-history')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/60 flex items-center gap-1.5"
            >
              <span>Import History Dashboard →</span>
            </Button>
          </div>
        </div>

        {/* Controls Bar: Select Employee + Date Range Filters */}
        <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Employee Selector Dropdown */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                <span>Select Employee</span>
              </label>
              <select
                value={selectedEmpId}
                onChange={(e) => setSelectedEmpId(e.target.value)}
                className="w-full h-10 bg-[#0b0f19] border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
              >
                {users.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    👤 {u.name} ({u.employeeId || u.role}) — {u.role.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-200">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl focus:border-indigo-500 h-10"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-200">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl focus:border-indigo-500 h-10"
              />
            </div>
          </div>
        </div>

        {/* Main Section: Timeline + Performance Comparison Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column (2 cols): Timeline */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Assignment Timeline for {employee?.name || 'Employee'}</span>
                <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 text-xs font-bold">
                  {timeline.length} Batches Received
                </Badge>
              </h2>
            </div>

            {isLoading ? (
              <div className="p-12 text-center text-slate-400 bg-[#131c31] border border-slate-800 rounded-2xl">
                <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                <p className="text-xs font-medium">Loading work history timeline...</p>
              </div>
            ) : timeline.length === 0 ? (
              <div className="p-12 text-center text-slate-400 bg-[#131c31] border border-slate-800 rounded-2xl space-y-2">
                <History className="w-10 h-10 text-slate-600 mx-auto" />
                <p className="text-sm font-semibold text-slate-200">No batch assignment history recorded for this employee</p>
                <p className="text-xs text-slate-500">Assign or import leads for this representative to view timeline stats.</p>
              </div>
            ) : (
              <div className="space-y-4 relative before:absolute before:inset-0 before:left-6 before:w-0.5 before:bg-slate-800">
                {timeline.map((item: any, idx: number) => {
                  const status = item.currentStatus || {};
                  return (
                    <div key={idx} className="relative pl-12">
                      {/* Timeline Node Icon */}
                      <div className="absolute left-3.5 top-3.5 -translate-x-1/2 w-6 h-6 rounded-full bg-indigo-600 border-4 border-[#0b0f19] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                        {idx + 1}
                      </div>

                      {/* Card Box */}
                      <div className="bg-[#131c31] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-5 space-y-3 transition-all shadow-sm">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-indigo-400 font-extrabold text-sm">
                                📋 {item.batchId}
                              </span>
                              <Badge variant="outline" className="bg-slate-900 border-slate-700 text-slate-300 text-[11px] font-bold">
                                {item.leadCount} leads
                              </Badge>
                              <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 text-[11px]">
                                {item.assignmentType}
                              </Badge>
                            </div>
                            <div className="text-[11px] text-slate-400 mt-1 font-mono">
                              Assigned on: {new Date(item.date).toLocaleString('en-IN', {
                                day: '2-digit',
                                month: 'short',
                                year: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })} • Assigned By: {item.assignedBy}
                            </div>
                          </div>

                          <Button
                            size="sm"
                            onClick={() => setSelectedBatchSummary(item.batchId)}
                            className="bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5 self-start sm:self-auto"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Drill Down / View Details</span>
                          </Button>
                        </div>

                        {/* Metrics Row */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1">
                          <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">In Pipeline</span>
                            <span className="text-base font-extrabold text-indigo-400">{status.inPipeline || 0}</span>
                          </div>
                          <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Closed Won</span>
                            <span className="text-base font-extrabold text-emerald-400">{status.closedWon || 0}</span>
                          </div>
                          <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Closed Lost</span>
                            <span className="text-base font-extrabold text-red-400">{status.closedLost || 0}</span>
                          </div>
                          <div className="bg-[#0b0f19] p-3 rounded-xl border border-slate-800 text-center">
                            <span className="text-[10px] font-bold text-slate-400 uppercase block">Batch Conversion</span>
                            <span className="text-base font-extrabold text-amber-400">{status.conversionRate || '0%'}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Right Column (1 col): Performance Comparison Sidebar */}
          <div className="space-y-6">
            <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm sticky top-6">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800 text-sm font-bold text-white">
                <BarChart3 className="w-4 h-4 text-indigo-400" />
                <span>Performance Benchmark</span>
              </div>

              <div className="space-y-4">
                {/* Employee Profile Summary */}
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#0b0f19] border border-slate-800">
                  <div className="w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm border border-indigo-500/30">
                    {employee?.name ? employee.name.charAt(0) : 'U'}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-100">{employee?.name || 'Selected Employee'}</h4>
                    <p className="text-xs text-slate-400">{employee?.role ? employee.role.toUpperCase() : 'Sales Rep'} • ID: {employee?.employeeId || 'N/A'}</p>
                  </div>
                </div>

                {/* Conversion Stats Cards */}
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Total Assigned Leads</span>
                      <strong className="text-indigo-400 font-extrabold text-sm">{totalLeadsAssigned}</strong>
                    </div>
                    <div className="flex justify-between items-center text-xs">
                      <span className="text-slate-400 font-semibold">Total Deals Won</span>
                      <strong className="text-emerald-400 font-extrabold text-sm">{totalWonDeals}</strong>
                    </div>
                  </div>

                  <div className="p-3.5 rounded-xl bg-gradient-to-br from-indigo-900/30 to-purple-900/30 border border-indigo-500/30 space-y-1">
                    <span className="text-[11px] font-bold text-indigo-300 uppercase tracking-wider block">Overall Conversion Rate</span>
                    <div className="text-2xl font-extrabold text-white">{overallConversionRate}%</div>
                    <p className="text-[11px] text-slate-400">Cumulative conversion across all assigned batches</p>
                  </div>

                  {/* Benchmark Bar Comparisons */}
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-3 text-xs">
                    <span className="font-bold text-slate-200 block">Conversion Rate Benchmark</span>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>This Employee</span>
                        <strong className="text-indigo-400">{overallConversionRate}%</strong>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full"
                          style={{ width: `${Math.min(100, Number(overallConversionRate) * 3)}%` }}
                        />
                      </div>
                    </div>

                    <div className="space-y-1">
                      <div className="flex justify-between text-[11px] text-slate-300">
                        <span>Team Average Benchmark</span>
                        <strong className="text-purple-400">15.0%</strong>
                      </div>
                      <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-500 rounded-full" style={{ width: '45%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Single Batch Summary & Lead Drill-Down Modal */}
      {selectedBatchSummary && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131c31] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl text-slate-100 overflow-hidden my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0b0f19]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Tag className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Batch Performance Summary:</span>
                    <span className="font-mono text-indigo-400">{selectedBatchSummary}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Detailed performance metrics for {employee?.name || 'Rep'}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedBatchSummary(null)}
                className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
              {isSummaryLoading ? (
                <div className="p-8 text-center text-slate-400 text-xs">Loading performance summary...</div>
              ) : (
                <>
                  {/* Performance Metric Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    <div className="bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Total Leads</span>
                      <span className="text-lg font-extrabold text-white">{summaryData?.leadCount || 0}</span>
                    </div>

                    <div className="bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Contacted</span>
                      <span className="text-lg font-extrabold text-indigo-400">
                        {performance?.contacted || 0} ({performance?.contactedPercentage || '0%'})
                      </span>
                    </div>

                    <div className="bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Site Visits</span>
                      <span className="text-lg font-extrabold text-purple-400">{performance?.siteVisitsScheduled || 0}</span>
                    </div>

                    <div className="bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800 text-center">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Closed Won</span>
                      <span className="text-lg font-extrabold text-emerald-400">{performance?.closedWon || 0}</span>
                    </div>

                    <div className="bg-[#0b0f19] p-3.5 rounded-xl border border-slate-800 text-center col-span-2 sm:col-span-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Conversion Rate</span>
                      <span className="text-lg font-extrabold text-amber-400">{performance?.conversionRate || '0%'}</span>
                    </div>
                  </div>

                  {/* Leads Table */}
                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">Leads in Batch ({batchLeads.length})</h4>
                    <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0b0f19]">
                      <Table>
                        <TableHeader className="bg-[#131c31]">
                          <TableRow className="border-b border-slate-800">
                            <TableHead className="text-slate-300 font-bold text-xs">Lead Code</TableHead>
                            <TableHead className="text-slate-300 font-bold text-xs">Customer Name</TableHead>
                            <TableHead className="text-slate-300 font-bold text-xs">Phone</TableHead>
                            <TableHead className="text-slate-300 font-bold text-xs">Project</TableHead>
                            <TableHead className="text-slate-300 font-bold text-xs text-center">Stage</TableHead>
                            <TableHead className="text-slate-300 font-bold text-xs text-center">Days in Pipeline</TableHead>
                            <TableHead className="text-slate-300 font-bold text-xs text-right">Last Activity</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody className="divide-y divide-slate-800/60">
                          {batchLeads.map((lead: any) => (
                            <TableRow key={lead._id} className="hover:bg-slate-800/40">
                              <TableCell className="font-mono text-indigo-400 font-bold text-xs">{lead.leadCode}</TableCell>
                              <TableCell className="font-semibold text-slate-100 text-xs">{lead.customerName}</TableCell>
                              <TableCell className="font-mono text-slate-300 text-xs">{lead.phone}</TableCell>
                              <TableCell className="text-slate-300 text-xs">{lead.projectName}</TableCell>
                              <TableCell className="text-center">
                                <Badge variant="outline" className="text-[10px] uppercase font-bold bg-slate-900 border-slate-700 text-slate-200">
                                  {lead.stage}
                                </Badge>
                              </TableCell>
                              <TableCell className="text-center font-mono text-xs font-bold text-amber-400">
                                {lead.daysInPipeline} days
                              </TableCell>
                              <TableCell className="text-right font-mono text-[11px] text-slate-400">
                                {lead.lastActivity ? new Date(lead.lastActivity).toLocaleDateString() : '—'}
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

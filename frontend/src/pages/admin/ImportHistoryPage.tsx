import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getImportHistory, getBatchLeadsDetail } from '../../api/importHistory';
import { getUsers } from '../../api/users';
import Navbar from '../../components/Navbar';
import BatchReassignModal from '../../components/admin/BatchReassignModal';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import {
  FileSpreadsheet,
  Calendar,
  Filter,
  RefreshCw,
  Eye,
  Download,
  Database,
  Search,
  CheckCircle2,
  X,
  Layers,
  Tag,
  ArrowRight
} from 'lucide-react';
import * as XLSX from 'xlsx';

export default function ImportHistoryPage() {
  const navigate = useNavigate();

  // Filters State
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [assignedToFilter, setAssignedToFilter] = useState<string>('all');
  const [dataQualityFilter, setDataQualityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal State
  const [selectedBatchForDrilldown, setSelectedBatchForDrilldown] = useState<string | null>(null);
  const [selectedBatchForReassign, setSelectedBatchForReassign] = useState<string | null>(null);

  // Search inside drilldown modal
  const [drillSearchQuery, setDrillSearchQuery] = useState<string>('');

  // Fetch Users for Assigned To Filter
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });
  const users = usersData?.users || [];

  // Fetch Import History Batches
  const { data: historyData, isLoading, refetch } = useQuery({
    queryKey: ['importHistory', fromDate, toDate, assignedToFilter],
    queryFn: () =>
      getImportHistory({
        startDate: fromDate || undefined,
        endDate: toDate || undefined,
        assignedTo: assignedToFilter || undefined
      })
  });

  const batches = historyData?.batches || [];

  // Fetch Drill-Down Lead Details
  const { data: drillData, isLoading: isDrillLoading } = useQuery({
    queryKey: ['batchLeads', selectedBatchForDrilldown],
    queryFn: () => getBatchLeadsDetail(selectedBatchForDrilldown!),
    enabled: !!selectedBatchForDrilldown
  });

  const drillLeads = drillData?.leads || [];

  // Filtered batches logic
  const filteredBatches = batches.filter((b: any) => {
    if (dataQualityFilter === 'valid' && b.dataQualityStatus !== 'All Valid') return false;
    if (dataQualityFilter === 'errors' && b.dataQualityStatus === 'All Valid') return false;

    if (statusFilter === 'won' && (b.statusCounts?.won || 0) === 0) return false;
    if (statusFilter === 'lost' && (b.statusCounts?.lost || 0) === 0) return false;
    if (statusFilter === 'pipeline' && (b.statusCounts?.inPipeline || 0) === 0) return false;

    return true;
  });

  // Export Batch Leads to CSV / XLSX
  const handleExportBatchCSV = (batchId: string, leadsList: any[]) => {
    if (!leadsList || leadsList.length === 0) return;
    const exportData = leadsList.map((l: any) => ({
      'Lead Code': l.leadCode,
      'Customer Name': l.customerName,
      'Phone Number': l.phone,
      'Email': l.email,
      'City': l.city,
      'Project': l.projectName,
      'Current Owner': l.currentOwner,
      'Stage': l.stage,
      'Intent': l.intent,
      'Last Activity Date': l.lastActivityAt ? new Date(l.lastActivityAt).toLocaleString() : ''
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Batch Leads');
    XLSX.writeFile(workbook, `Batch_${batchId}_Leads.xlsx`);
  };

  const filteredDrillLeads = drillLeads.filter((l: any) => {
    if (!drillSearchQuery) return true;
    const q = drillSearchQuery.toLowerCase();
    return (
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q)) ||
      (l.leadCode && l.leadCode.toLowerCase().includes(q)) ||
      (l.currentOwner && l.currentOwner.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Admin Bulk Import Audit &amp; Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Import History Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Audit all spreadsheet uploads, monitor batch health, drill down into leads, and reassign ownership across reps.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => navigate('/admin/import')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>+ New Import</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/admin/employee-work-history')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl border border-slate-700/60 flex items-center gap-1.5"
            >
              <span>Employee Work History →</span>
            </Button>
          </div>
        </div>

        {/* Filters Bar */}
        <div className="bg-[#131c31] border border-slate-800 rounded-2xl p-4 sm:p-5 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800/80 text-xs font-bold text-slate-300">
            <Filter className="w-4 h-4 text-indigo-400" />
            <span>Search &amp; Filter Import Batches</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* From Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">From Date</label>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl focus:border-indigo-500"
              />
            </div>

            {/* To Date */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">To Date</label>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl focus:border-indigo-500"
              />
            </div>

            {/* Assigned To Dropdown */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Assigned To</label>
              <select
                value={assignedToFilter}
                onChange={(e) => setAssignedToFilter(e.target.value)}
                className="w-full h-9 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
              >
                <option value="all">All Employees</option>
                {users.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    👤 {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Data Quality */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Data Quality</label>
              <select
                value={dataQualityFilter}
                onChange={(e) => setDataQualityFilter(e.target.value)}
                className="w-full h-9 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
              >
                <option value="all">All Quality Statuses</option>
                <option value="valid">Valid Only (Clean)</option>
                <option value="errors">With Errors / Closed Lost</option>
              </select>
            </div>

            {/* Pipeline Status Filter */}
            <div className="space-y-1">
              <label className="text-[11px] font-semibold text-slate-400">Pipeline Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full h-9 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
              >
                <option value="all">All Statuses</option>
                <option value="pipeline">In Pipeline</option>
                <option value="won">Has Closed Won</option>
                <option value="lost">Has Closed Lost</option>
              </select>
            </div>
          </div>
        </div>

        {/* Batches Table Card */}
        <div className="rounded-2xl border border-slate-800 bg-[#131c31] overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Loading import history batches...</p>
            </div>
          ) : filteredBatches.length === 0 ? (
            <div className="p-12 text-center text-slate-400 space-y-3">
              <FileSpreadsheet className="w-12 h-12 text-slate-600 mx-auto" />
              <p className="text-sm font-semibold text-slate-200">No import history batches found</p>
              <p className="text-xs text-slate-500">Try adjusting your date range or filters, or upload a new spreadsheet.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-300 font-bold text-xs">Upload Date</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs">Sheet Code (Batch Tag)</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs">Uploaded By</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs">Assigned To</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs text-center">Lead Count</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs">Data Quality</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs">Status Summary</TableHead>
                    <TableHead className="text-slate-300 font-bold text-xs text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody className="divide-y divide-slate-800/60">
                  {filteredBatches.map((batch: any) => {
                    const isAllValid = batch.dataQualityStatus === 'All Valid';
                    return (
                      <TableRow key={batch.importBatchId} className="hover:bg-slate-800/40 transition-colors">
                        {/* Upload Date */}
                        <TableCell className="text-xs text-slate-300 font-mono font-medium whitespace-nowrap">
                          {batch.uploadedAt ? new Date(batch.uploadedAt).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          }) : '—'}
                        </TableCell>

                        {/* Sheet Code */}
                        <TableCell className="font-mono text-indigo-400 font-extrabold text-xs">
                          {batch.importBatchId}
                        </TableCell>

                        {/* Uploaded By */}
                        <TableCell className="text-xs font-semibold text-slate-200">
                          {typeof batch.uploadedBy === 'object' ? batch.uploadedBy.name : (batch.uploadedBy || 'System Admin')}
                        </TableCell>

                        {/* Assigned To */}
                        <TableCell className="text-xs text-slate-300">
                          {typeof batch.assignedTo === 'string' ? (
                            <Badge variant="outline" className="bg-indigo-500/10 border-indigo-500/30 text-indigo-300 text-[11px] font-bold">
                              ⚡ {batch.assignedTo}
                            </Badge>
                          ) : Array.isArray(batch.assignedTo) ? (
                            <Badge variant="outline" className="bg-purple-500/10 border-purple-500/30 text-purple-300 text-[11px] font-bold">
                              👥 {batch.assignedTo.length} Reps Split
                            </Badge>
                          ) : (
                            <span className="font-semibold text-slate-200">👤 {batch.assignedTo?.name || 'Unassigned'}</span>
                          )}
                        </TableCell>

                        {/* Lead Count (Clickable Drilldown) */}
                        <TableCell className="text-center">
                          <button
                            onClick={() => setSelectedBatchForDrilldown(batch.importBatchId)}
                            className="px-3 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 font-extrabold text-xs rounded-lg transition-all"
                            title="Click to view all leads in this batch"
                          >
                            {batch.leadCount} Leads →
                          </button>
                        </TableCell>

                        {/* Data Quality */}
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={`text-xs font-bold py-0.5 px-2.5 rounded-full ${
                              isAllValid
                                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                : 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                            }`}
                          >
                            {isAllValid ? '✅ All Valid' : `⚠️ ${batch.dataQualityStatus}`}
                          </Badge>
                        </TableCell>

                        {/* Status Summary */}
                        <TableCell className="text-xs text-slate-300 font-medium">
                          <span className="text-slate-200">{batch.currentStatus}</span>
                        </TableCell>

                        {/* Actions */}
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedBatchForDrilldown(batch.importBatchId)}
                              className="h-8 px-2.5 text-xs text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg flex items-center gap-1"
                              title="View Leads"
                            >
                              <Eye className="w-3.5 h-3.5 text-indigo-400" />
                              <span>View</span>
                            </Button>

                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setSelectedBatchForReassign(batch.importBatchId)}
                              className="h-8 px-2.5 text-xs text-amber-400 hover:text-amber-300 hover:bg-amber-500/10 rounded-lg flex items-center gap-1"
                              title="Reassign Batch Leads"
                            >
                              <RefreshCw className="w-3.5 h-3.5" />
                              <span>Reassign</span>
                            </Button>
                          </div>
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

      {/* Drill-Down Modal */}
      {selectedBatchForDrilldown && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#131c31] border border-slate-800 rounded-2xl w-full max-w-5xl shadow-2xl text-slate-100 overflow-hidden my-8">
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0b0f19]">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
                  <Tag className="w-5 h-5 text-indigo-400" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <span>Batch Drill-Down:</span>
                    <span className="font-mono text-indigo-400">{selectedBatchForDrilldown}</span>
                  </h3>
                  <p className="text-xs text-slate-400">Total {drillLeads.length} leads imported in this batch</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleExportBatchCSV(selectedBatchForDrilldown, drillLeads)}
                  className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </Button>
                <button
                  onClick={() => setSelectedBatchForDrilldown(null)}
                  className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {/* Search Bar */}
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Search by lead code, customer name, phone, owner..."
                  value={drillSearchQuery}
                  onChange={(e) => setDrillSearchQuery(e.target.value)}
                  className="bg-[#0b0f19] border-slate-700 text-slate-100 text-xs rounded-xl pl-9"
                />
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
              </div>

              {/* Leads Table */}
              <div className="rounded-xl border border-slate-800 overflow-hidden bg-[#0b0f19]">
                {isDrillLoading ? (
                  <div className="p-8 text-center text-slate-400 text-xs">Loading batch leads...</div>
                ) : filteredDrillLeads.length === 0 ? (
                  <div className="p-8 text-center text-slate-400 text-xs">No matching leads found</div>
                ) : (
                  <Table>
                    <TableHeader className="bg-[#131c31]">
                      <TableRow className="border-b border-slate-800">
                        <TableHead className="text-slate-300 font-bold text-xs">Lead Code</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs">Customer Name</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs">Phone</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs">Project</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs">Current Owner</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs text-center">Stage</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs text-center">Intent</TableHead>
                        <TableHead className="text-slate-300 font-bold text-xs text-right">Last Activity</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody className="divide-y divide-slate-800/60">
                      {filteredDrillLeads.map((lead: any) => (
                        <TableRow key={lead._id} className="hover:bg-slate-800/40">
                          <TableCell className="font-mono text-indigo-400 font-bold text-xs">
                            {lead.leadCode}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-100 text-xs">
                            {lead.customerName}
                          </TableCell>
                          <TableCell className="font-mono text-slate-300 text-xs">
                            {lead.phone}
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs">
                            {lead.projectName}
                          </TableCell>
                          <TableCell className="text-slate-200 text-xs font-semibold">
                            👤 {lead.currentOwner}
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge variant="outline" className="text-[11px] uppercase font-bold bg-slate-900 border-slate-700 text-slate-200">
                              {lead.stage}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-center">
                            <Badge
                              variant="outline"
                              className={`text-[10px] uppercase font-extrabold ${
                                lead.intent === 'high'
                                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
                                  : lead.intent === 'medium'
                                  ? 'bg-amber-500/10 border-amber-500/30 text-amber-400'
                                  : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                            >
                              {lead.intent || 'medium'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono text-[11px] text-slate-400">
                            {lead.lastActivityAt ? new Date(lead.lastActivityAt).toLocaleDateString() : '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Batch Reassignment Modal */}
      {selectedBatchForReassign && (
        <BatchReassignModal
          batchId={selectedBatchForReassign}
          isOpen={!!selectedBatchForReassign}
          onClose={() => setSelectedBatchForReassign(null)}
        />
      )}
    </div>
  );
}

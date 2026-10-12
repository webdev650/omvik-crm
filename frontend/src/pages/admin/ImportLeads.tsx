import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import {
  FileSpreadsheet,
  Upload,
  CheckCircle2,
  ArrowRight,
  Database,
  Tag,
  UserCheck,
  Download,
  AlertTriangle,
  Search,
  RefreshCw,
  FileCheck,
  Filter,
  Check
} from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Navbar from '../../components/Navbar';
import { uploadAndAutoSaveImportLeads } from '../../api/opportunities';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';
import { getProjects } from '../../api/projects';
import { getUsers } from '../../api/users';
import { formatProjectName } from '../../utils/formatProjectName';

const getYYMMDDStr = () => {
  const d = new Date();
  const yy = String(d.getFullYear()).slice(-2);
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yy}${mm}${dd}`;
};

export default function ImportLeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [batchName, setBatchName] = useState<string>('');
  const [isCustomBatchName, setIsCustomBatchName] = useState<boolean>(false);
  
  // Results state after auto-save import completes
  const [importResult, setImportResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [resultsTab, setResultsTab] = useState<'imported' | 'skipped'>('imported');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Fetch Projects for Target Project selector
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'flat'],
    queryFn: () => getProjects({ flat: true })
  });
  const projects = projectsData?.projects || [];

  // Fetch Users for Target Employee selector
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });
  const users = usersData?.users || [];

  const updateSheetCodeForProject = (projId: string) => {
    setSelectedProjectId(projId);
    if (projId && !isCustomBatchName) {
      const proj = projects.find((p: any) => p._id === projId);
      const code = (proj?.projectCode || proj?.code || 'PRJ').toUpperCase();
      setBatchName(`NEW_${code}_${getYYMMDDStr()}`);
    }
  };

  const handleDownloadSampleTemplate = () => {
    const sampleData = [
      {
        'FULL NAMEE': 'Ramesh Kumar',
        'Phone Number': '9876543210',
        'Project': 'Om Sai Ashraya',
        'Intent': 'High',
        'Address': 'Mumbai, Maharashtra',
        'Source of Client': 'META_ADS',
        'Call Date': '2026-10-10',
        'Call Status': 'Connected',
        'Follow up Call Date': '2026-10-12',
        'Follow up Call Status': 'Scheduled',
        'Remarks': 'Interested in 2BHK flat, budget 75L',
        'Whatsapp Text Status': 'Sent',
        'Visit Date(Scheduled)': '2026-10-15',
        'Visited': 'No',
        'Conversation Remark': 'Customer requested brochure on WhatsApp',
        'Call Remark': 'Good response, warm lead',
        'Status': 'New'
      },
      {
        'FULL NAMEE': 'Priya Sharma',
        'Phone Number': '9123456789',
        'Project': 'Om Sai Ashraya',
        'Intent': 'Medium',
        'Address': 'Delhi, NCR',
        'Source of Client': 'WALK_IN',
        'Call Date': '2026-10-09',
        'Call Status': 'Connected',
        'Follow up Call Date': '2026-10-11',
        'Follow up Call Status': 'Pending',
        'Remarks': 'Looking for investment property',
        'Whatsapp Text Status': 'Delivered',
        'Visit Date(Scheduled)': '2026-10-14',
        'Visited': 'Yes',
        'Conversation Remark': 'Site visit done with family',
        'Call Remark': 'Follow up for booking amount',
        'Status': 'In Progress'
      },
      {
        'FULL NAMEE': 'Amit Verma',
        'Phone Number': '9988776655',
        'Project': 'Om Sai Ashraya',
        'Intent': 'Low',
        'Address': 'Bangalore, Karnataka',
        'Source of Client': 'BULK_IMPORT',
        'Call Date': '2026-10-08',
        'Call Status': 'Ringing / No Answer',
        'Follow up Call Date': '2026-10-13',
        'Follow up Call Status': 'Scheduled',
        'Remarks': 'Call back after 5 PM',
        'Whatsapp Text Status': 'Not Sent',
        'Visit Date(Scheduled)': '',
        'Visited': 'No',
        'Conversation Remark': 'Number busy during first attempt',
        'Call Remark': 'Retry call scheduled',
        'Status': 'New'
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(sampleData);
    worksheet['!cols'] = [
      { wch: 18 }, // FULL NAMEE
      { wch: 15 }, // Phone Number
      { wch: 20 }, // Project
      { wch: 10 }, // Intent
      { wch: 22 }, // Address
      { wch: 18 }, // Source of Client
      { wch: 12 }, // Call Date
      { wch: 18 }, // Call Status
      { wch: 18 }, // Follow up Call Date
      { wch: 18 }, // Follow up Call Status
      { wch: 30 }, // Remarks
      { wch: 20 }, // Whatsapp Text Status
      { wch: 20 }, // Visit Date(Scheduled)
      { wch: 10 }, // Visited
      { wch: 32 }, // Conversation Remark
      { wch: 25 }, // Call Remark
      { wch: 12 }  // Status
    ];
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sample Leads');
    XLSX.writeFile(workbook, 'OMVIK_Sample_Lead_Import_Template.xlsx');
    toast.success('Downloaded OMVIK_Sample_Lead_Import_Template.xlsx!');
  };

  // Direct Auto-Save Mutation to MongoDB
  const importMutation = useMutation({
    mutationFn: ({
      file,
      name,
      userId,
      projectId
    }: {
      file: File;
      name?: string;
      userId?: string;
      projectId?: string;
    }) => uploadAndAutoSaveImportLeads(file, name, userId, projectId),
    onSuccess: (data) => {
      setImportResult(data);
      setErrorMessage(null);
      toast.success(data.message || `Successfully imported and saved ${data.imported || 0} leads directly to MongoDB!`);
      // Invalidate relevant queries so the rest of the CRM updates immediately
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['leadBatches'] });
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || 'Failed to import and save spreadsheet to MongoDB.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      if (!batchName) {
        const selectedProj = projects.find((p: any) => p._id === selectedProjectId);
        const code = (selectedProj?.projectCode || selectedProj?.code || 'DDV').toUpperCase();
        setBatchName(`NEW_${code}_${getYYMMDDStr()}`);
      }
      setErrorMessage(null);
    }
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      setSelectedFile(file);
      if (!batchName) {
        const selectedProj = projects.find((p: any) => p._id === selectedProjectId);
        const code = (selectedProj?.projectCode || selectedProj?.code || 'DDV').toUpperCase();
        setBatchName(`NEW_${code}_${getYYMMDDStr()}`);
      }
      setErrorMessage(null);
    }
  };

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) {
      toast.error('Please select an Excel or CSV file to upload.');
      return;
    }
    setErrorMessage(null);
    importMutation.mutate({
      file: selectedFile,
      name: batchName.trim() || undefined,
      userId: selectedUserId || undefined,
      projectId: selectedProjectId || undefined
    });
  };

  const handleExportImportedLeads = () => {
    if (!importResult?.leads || importResult.leads.length === 0) {
      toast.error('No leads available to export.');
      return;
    }

    const exportData = importResult.leads.map((l: any, idx: number) => ({
      'S.No': idx + 1,
      'Lead Code': l.leadCode || '—',
      'Customer Name': l.customerName || '—',
      'Phone Number': l.phone || '—',
      'Project': l.project || '—',
      'Assigned Employee': l.currentOwner || '—',
      'Stage': l.stage || 'new',
      'Intent': l.intent || 'medium',
      'Import Status': l.status || 'Saved',
      'Batch Code': importResult.importBatchId
    }));

    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Imported Leads');
    XLSX.writeFile(wb, `Imported_Leads_${importResult.importBatchId || 'batch'}.xlsx`);
    toast.success('Downloaded imported leads Excel sheet!');
  };

  const handleResetForNewImport = () => {
    setSelectedFile(null);
    setImportResult(null);
    setSearchQuery('');
    setErrorMessage(null);
  };

  // Filter imported leads by search query
  const filteredLeads = (importResult?.leads || []).filter((l: any) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (l.leadCode && l.leadCode.toLowerCase().includes(q)) ||
      (l.customerName && l.customerName.toLowerCase().includes(q)) ||
      (l.phone && l.phone.includes(q)) ||
      (l.project && l.project.toLowerCase().includes(q)) ||
      (l.currentOwner && l.currentOwner.toLowerCase().includes(q)) ||
      (l.status && l.status.toLowerCase().includes(q))
    );
  });

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Direct Auto-Save to MongoDB</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Import Leads & Data
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Upload Excel (.xlsx, .xls) or CSV files. Leads are verified, auto-assigned, and saved directly to MongoDB immediately—no separate confirmation step needed.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleDownloadSampleTemplate}
              className="bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border-emerald-500/30 text-xs font-bold rounded-xl flex items-center gap-2 transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span>Sample Excel Template (.xlsx)</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/admin/import-history')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700/60"
            >
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>Import History Dashboard →</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/leads')}
              className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl flex items-center gap-2 shadow-sm"
            >
              <span>View All Leads →</span>
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button onClick={() => setErrorMessage(null)} className="text-xs text-red-400 underline ml-4">Dismiss</button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* POST-IMPORT RESULTS VIEW: Shown immediately after auto-save completes */}
        {/* ========================================================================= */}
        {importResult ? (
          <div className="space-y-6">
            {/* Success Summary Hero Card */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-[#131c31] to-[#131c31] border-2 border-emerald-500/50 shadow-xl shadow-emerald-500/10 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 text-xs font-extrabold uppercase tracking-wide">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Auto-Save Complete — Saved in MongoDB</span>
                  </div>
                  <h2 className="text-2xl font-black text-white">
                    ✅ {importResult.imported} Leads Imported Successfully!
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-300">
                    Saved directly to MongoDB under Sheet Code:{' '}
                    <span className="font-mono font-bold text-emerald-400 bg-slate-900/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                      "{importResult.importBatchId}"
                    </span>
                    . All records are permanently stored and assigned. They will persist across logouts and page refreshes.
                  </p>
                </div>

                {/* Primary Action Buttons */}
                <div className="flex flex-wrap items-center gap-3">
                  <Button
                    size="default"
                    onClick={() => navigate('/leads')}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30 flex items-center gap-2 h-11 px-5"
                  >
                    <Check className="w-4 h-4" />
                    <span>Done (View All Leads →)</span>
                  </Button>
                  <Button
                    size="default"
                    onClick={() => navigate('/admin/import-history')}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-600/20 flex items-center gap-2 h-11 px-5"
                  >
                    <Tag className="w-4 h-4" />
                    <span>View in Import History →</span>
                  </Button>
                  <Button
                    size="default"
                    variant="outline"
                    onClick={handleExportImportedLeads}
                    className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs font-bold rounded-xl flex items-center gap-2 h-11 px-4"
                  >
                    <Download className="w-4 h-4 text-indigo-400" />
                    <span>Export Leads (.xlsx)</span>
                  </Button>
                  <Button
                    size="default"
                    variant="ghost"
                    onClick={handleResetForNewImport}
                    className="text-slate-400 hover:text-slate-200 text-xs font-semibold rounded-xl flex items-center gap-2 h-11 px-3"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Import Another File</span>
                  </Button>
                </div>
              </div>

              {/* KPI Badges Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-800/80">
                <div className="p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800">
                  <p className="text-[11px] text-slate-400 uppercase font-semibold">Total Rows Processed</p>
                  <p className="text-xl font-black text-slate-100 mt-0.5">{importResult.totalRows || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <p className="text-[11px] text-emerald-400 uppercase font-semibold">Saved in MongoDB</p>
                  <p className="text-xl font-black text-emerald-400 mt-0.5">{importResult.imported || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30">
                  <p className="text-[11px] text-amber-400 uppercase font-semibold">Skipped / Duplicates</p>
                  <p className="text-xl font-black text-amber-400 mt-0.5">{importResult.skipped || 0}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-indigo-500/10 border border-indigo-500/30">
                  <p className="text-[11px] text-indigo-400 uppercase font-semibold">Sheet Code</p>
                  <p className="text-sm font-mono font-bold text-indigo-300 mt-1 truncate" title={importResult.importBatchId}>
                    {importResult.importBatchId}
                  </p>
                </div>
              </div>
            </div>

            {/* Results Table Section */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
              {/* Header with Search and Tabs */}
              <div className="p-4 bg-[#0e1628] border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setResultsTab('imported')}
                    className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                      resultsTab === 'imported'
                        ? 'border-emerald-500 text-emerald-400'
                        : 'border-transparent text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    Successfully Imported Leads ({importResult.leads?.length || 0})
                  </button>
                  {importResult.skippedDetails?.length > 0 && (
                    <button
                      onClick={() => setResultsTab('skipped')}
                      className={`text-xs font-bold pb-1 border-b-2 transition-all ${
                        resultsTab === 'skipped'
                          ? 'border-amber-500 text-amber-400'
                          : 'border-transparent text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Skipped Rows & Conflicts ({importResult.skippedDetails.length})
                    </button>
                  )}
                </div>

                {resultsTab === 'imported' && (
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <Input
                      type="text"
                      placeholder="Search imported leads..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="h-9 pl-9 bg-[#0b0f19] border-slate-700 text-xs text-slate-200 rounded-xl focus:border-indigo-500"
                    />
                  </div>
                )}
              </div>

              {/* Imported Leads Table */}
              {resultsTab === 'imported' && (
                <Table>
                  <TableHeader className="bg-[#0b0f19]">
                    <TableRow className="border-b border-slate-800">
                      <TableHead className="text-slate-400 font-semibold text-xs">#</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Lead Code</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Customer Name</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Mobile Number</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Target Project</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Assigned Rep</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Stage</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Intent</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredLeads.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="text-center py-8 text-slate-500 text-xs">
                          {searchQuery ? 'No leads matched your search query.' : 'No leads imported.'}
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredLeads.map((item: any, idx: number) => (
                        <TableRow
                          key={idx}
                          className="border-b border-slate-800/40 hover:bg-slate-800/40 border-l-4 border-l-emerald-500 bg-emerald-500/5 transition-colors"
                        >
                          <TableCell className="text-slate-500 text-xs font-mono">{idx + 1}</TableCell>
                          <TableCell className="font-mono text-xs font-bold text-indigo-400">
                            {item.leadCode || 'OMV-NEW'}
                          </TableCell>
                          <TableCell className="font-semibold text-slate-200 text-xs">
                            {item.customerName}
                          </TableCell>
                          <TableCell className="text-slate-300 font-mono text-xs">
                            {item.phone}
                          </TableCell>
                          <TableCell className="text-slate-300 text-xs font-medium">
                            {item.project}
                          </TableCell>
                          <TableCell className="text-emerald-400 text-xs font-semibold">
                            👤 {item.currentOwner || 'Assigned Rep'}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-slate-800 text-slate-300 border-slate-700 text-[10px] uppercase">
                              {item.stage || 'new'}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs capitalize font-semibold">
                            <span className={item.intent === 'high' ? 'text-emerald-400' : item.intent === 'low' ? 'text-red-400' : 'text-amber-400'}>
                              {item.intent || 'Medium'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                              {item.status || 'Saved'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}

              {/* Skipped Details Table */}
              {resultsTab === 'skipped' && (
                <Table>
                  <TableHeader className="bg-[#0b0f19]">
                    <TableRow className="border-b border-slate-800">
                      <TableHead className="text-slate-400 font-semibold text-xs">Row #</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Customer Name</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Mobile</TableHead>
                      <TableHead className="text-slate-400 font-semibold text-xs">Reason Skipped</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {importResult.skippedDetails?.map((item: any, idx: number) => (
                      <TableRow
                        key={idx}
                        className="border-b border-slate-800/40 hover:bg-slate-800/40 border-l-4 border-l-amber-500 bg-amber-500/5"
                      >
                        <TableCell className="text-slate-500 text-xs font-mono">{item.rowNumber}</TableCell>
                        <TableCell className="font-semibold text-slate-200 text-xs">{item.customerName || 'Unknown'}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">{item.mobile || '—'}</TableCell>
                        <TableCell className="text-amber-400 text-xs font-semibold">
                          ⚠️ {item.reason || 'Duplicate active opportunity or invalid data'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        ) : (
          /* ========================================================================= */
          /* SINGLE-STEP IMPORT FORM (Upload -> Auto-Save to MongoDB)                   */
          /* ========================================================================= */
          <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm p-6 space-y-6">
            <form onSubmit={handleImportSubmit} className="space-y-6">
              {/* Configuration Inputs Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pb-2 border-b border-slate-800/60">
                {/* Target Project Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Target Real-Estate Project</span>
                  </Label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => updateSheetCodeForProject(e.target.value)}
                    className="w-full h-10 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Target Project (Auto-suggests Sheet Code)</option>
                    {projects.map((proj: any) => (
                      <option key={proj._id} value={proj._id}>
                        {formatProjectName(proj)} ({proj.projectCode || proj.code || 'NO CODE'})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">Selecting a project auto-generates the pre-filled Sheet Code.</p>
                </div>

                {/* Batch Name / Sheet Code Input */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Sheet Code (Batch Tag)</span>
                  </Label>
                  <Input
                    type="text"
                    placeholder="e.g. NEW_DDV_261012"
                    value={batchName}
                    onChange={(e) => {
                      setBatchName(e.target.value);
                      setIsCustomBatchName(true);
                    }}
                    className="bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl focus:border-indigo-500 font-mono font-bold h-10"
                  />
                  <p className="text-[11px] text-slate-400">Format: [PROJECT_CODE]_[YYMMDD] (e.g. NEW_DDV_261012). Pre-filled but editable.</p>
                </div>

                {/* Target Employee Assignment Selector */}
                <div className="space-y-1.5">
                  <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <UserCheck className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Target Employee Assignment</span>
                  </Label>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="w-full h-10 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">⚡ Auto Round-Robin (All Telecallers)</option>
                    {users.map((u: any) => (
                      <option key={u._id} value={u._id}>
                        👤 {u.name} ({u.employeeId || u.role})
                      </option>
                    ))}
                  </select>
                  <p className="text-[11px] text-slate-400">Assign sheet to a specific employee or auto round-robin across reps.</p>
                </div>
              </div>

              {/* Drag & Drop File Upload Box */}
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className={`border-2 border-dashed rounded-2xl p-8 text-center bg-[#0b0f19] transition-all cursor-pointer ${
                  selectedFile
                    ? 'border-emerald-500/60 bg-emerald-500/5'
                    : 'border-slate-700 hover:border-indigo-500/60'
                }`}
              >
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3 ${
                  selectedFile ? 'bg-emerald-500/20 text-emerald-400' : 'bg-indigo-500/10 text-indigo-400'
                }`}>
                  <FileSpreadsheet className="w-6 h-6" />
                </div>
                <p className="text-sm font-semibold text-slate-200">
                  {selectedFile ? (
                    <span className="text-emerald-400 font-bold flex items-center justify-center gap-2">
                      <FileCheck className="w-4 h-4" />
                      {selectedFile.name}
                    </span>
                  ) : (
                    'Drag & Drop your Excel (.xlsx, .xls) or CSV file here'
                  )}
                </p>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedFile ? (
                    `${(selectedFile.size / 1024).toFixed(1)} KB — Ready to upload and auto-save directly to MongoDB`
                  ) : (
                    <span>
                      Supported columns: Name, Mobile, Email, City, Project, Source, Intent.{' '}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadSampleTemplate();
                        }}
                        className="text-indigo-400 hover:text-indigo-300 font-bold underline inline-flex items-center gap-1"
                      >
                        <Download className="w-3 h-3" /> Download Sample .xlsx
                      </button>
                    </span>
                  )}
                </p>
                <input
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  onChange={handleFileChange}
                  className="hidden"
                  id="file-upload-input"
                />
                <label
                  htmlFor="file-upload-input"
                  className="inline-block mt-4 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors min-h-[44px]"
                >
                  {selectedFile ? 'Change File' : 'Browse File'}
                </label>
              </div>

              {/* Upload & Import Button with Loader */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-2">
                <div className="text-xs text-slate-400">
                  <span className="font-semibold text-slate-300">⚡ Single-step auto-save:</span> Leads are saved directly to MongoDB upon upload. No secondary confirmation step required.
                </div>

                <Button
                  type="submit"
                  disabled={!selectedFile || importMutation.isPending}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs gap-2 rounded-xl h-12 px-6 shadow-xl shadow-emerald-600/30 min-w-[220px]"
                >
                  {importMutation.isPending ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-white" />
                      <span>Importing & Saving to DB...</span>
                    </>
                  ) : (
                    <>
                      <Upload className="w-4 h-4" />
                      <span>Upload & Import</span>
                    </>
                  )}
                </Button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}

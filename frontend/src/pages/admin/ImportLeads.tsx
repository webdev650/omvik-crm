import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileSpreadsheet, Upload, CheckCircle2, ArrowRight, Database, Tag, UserCheck, Download } from 'lucide-react';
import { toast } from 'sonner';
import * as XLSX from 'xlsx';
import Navbar from '../../components/Navbar';
import { previewImportLeads, confirmImportLeads } from '../../api/opportunities';
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
  const [activeTab, setActiveTab] = useState<'valid' | 'duplicates' | 'invalid'>('valid');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  // Preview Mutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => previewImportLeads(file),
    onSuccess: (data) => {
      setPreviewResult(data);
      setErrorMessage(null);
      setImportSummary(null);
      const validCnt = data.summary?.validCount || 0;
      toast.success(`Spreadsheet parsed! ${validCnt} valid lead${validCnt !== 1 ? 's' : ''} ready.`);
      if (data.summary?.validCount > 0) {
        setActiveTab('valid');
      } else if (data.summary?.duplicateCount > 0) {
        setActiveTab('duplicates');
      } else {
        setActiveTab('invalid');
      }
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to parse spreadsheet file.';
      setErrorMessage(msg);
      toast.error(msg);
    }
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: ({ validLeads, name, targetUserId, targetProjectId }: { validLeads: any[]; name?: string; targetUserId?: string; targetProjectId?: string }) =>
      confirmImportLeads(validLeads, name, targetUserId, targetProjectId),
    onSuccess: (data) => {
      setImportSummary(data);
      toast.success(`Import complete! ${data.imported || 0} leads created under ${data.importBatchId}`);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['leadBatches'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to confirm bulk lead import.';
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
      setPreviewResult(null);
      setImportSummary(null);
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
      setPreviewResult(null);
      setImportSummary(null);
      setErrorMessage(null);
    }
  };

  const handlePreviewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFile) return;
    setErrorMessage(null);
    previewMutation.mutate(selectedFile);
  };

  const handleConfirmImport = () => {
    if (!previewResult || !previewResult.valid || previewResult.valid.length === 0) return;
    setErrorMessage(null);
    confirmMutation.mutate({
      validLeads: previewResult.valid,
      name: batchName.trim() || `NEW_DDV_${getYYMMDDStr()}`,
      targetUserId: selectedUserId || undefined,
      targetProjectId: selectedProjectId || undefined
    });
  };

  const summary = previewResult?.summary;

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Database className="w-3.5 h-3.5" />
              <span>Bulk Data Import & Sanitization</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Import Leads & Data
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Upload Excel (.xlsx, .xls) or CSV spreadsheet files to preview, verify duplicates, tag batch names, and bulk import leads into Omvik CRM.
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
              <span>Download Sample Excel Template (.xlsx)</span>
            </Button>
            <Button
              size="sm"
              onClick={() => navigate('/admin/lead-batches')}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2 border border-slate-700/60"
            >
              <Tag className="w-4 h-4 text-indigo-400" />
              <span>View All Lead Batches →</span>
            </Button>
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorMessage}</span>
            <button onClick={() => setErrorMessage(null)} className="text-xs text-red-400 underline">Dismiss</button>
          </div>
        )}

        {/* Import Completed Toast / Summary */}
        {importSummary && (
          <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <span>Bulk Import Complete — Sheet Code Tagged: "{importSummary.importBatchId}"</span>
              </h3>
              <div className="flex items-center gap-3">
                <Button
                  size="sm"
                  onClick={() => navigate('/admin/lead-batches')}
                  className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl"
                >
                  Lead Batches
                </Button>
                <Button
                  size="sm"
                  onClick={() => navigate('/pipeline')}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl"
                >
                  View Pipeline Dashboard →
                </Button>
              </div>
            </div>
            <p className="text-xs text-slate-300">
              Successfully created and auto-assigned <strong className="text-emerald-400">{importSummary.imported}</strong> new leads to sales pod members. (Skipped: {importSummary.skipped})
            </p>
          </div>
        )}

        {/* Step 1: Upload Zone */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm p-6 space-y-4">
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
                className="w-full h-10 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
              >
                <option value="">Select Target Project (Auto-suggest Sheet Code)</option>
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
                placeholder="e.g. NEW_DDV_260916"
                value={batchName}
                onChange={(e) => {
                  setBatchName(e.target.value);
                  setIsCustomBatchName(true);
                }}
                className="bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl focus:border-indigo-500 font-mono font-bold"
              />
              <p className="text-[11px] text-slate-400">Format: [PROJECT_CODE]_[YYMMDD] (e.g. NEW_DDV_260916). Pre-filled but editable.</p>
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
                className="w-full h-10 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
              >
                <option value="">⚡ Auto Round-Robin (All Telecallers)</option>
                {users.map((u: any) => (
                  <option key={u._id} value={u._id}>
                    👤 {u.name} ({u.employeeId || u.role})
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-slate-400">Assign sheet to a specific employee or auto round-robin.</p>
            </div>
          </div>


          <form onSubmit={handlePreviewSubmit} className="space-y-4">
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 transition-colors rounded-2xl p-8 text-center bg-[#0b0f19] cursor-pointer"
            >
              <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3">
                <FileSpreadsheet className="w-6 h-6 text-indigo-400" />
              </div>
              <p className="text-sm font-semibold text-slate-200">
                {selectedFile ? selectedFile.name : 'Drag & Drop your Excel (.xlsx, .xls) or CSV file here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : (
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

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={!selectedFile || previewMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2 rounded-xl h-11 px-5 shadow-md shadow-indigo-600/20"
              >
                <Upload className="w-4 h-4" />
                <span>{previewMutation.isPending ? 'Analyzing Spreadsheet...' : 'Preview & Verify Spreadsheet'}</span>
              </Button>
            </div>
          </form>
        </div>

        {/* Step 2: Preview Results & Summary */}
        {previewResult && (
          <div className="space-y-6">
            {/* KPI Summary Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <div className="p-4 rounded-2xl border border-slate-800/80 bg-[#131c31]">
                <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Rows</p>
                <p className="text-2xl font-black text-slate-100 mt-1">{summary?.totalRows || 0}</p>
              </div>

              <div
                onClick={() => setActiveTab('valid')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeTab === 'valid'
                    ? 'border-emerald-500 bg-emerald-500/10'
                    : 'border-slate-800/80 bg-[#131c31] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-emerald-400 uppercase tracking-wider font-semibold">Valid Leads</p>
                  <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-xs">Ready</Badge>
                </div>
                <p className="text-2xl font-black text-emerald-400 mt-1">{summary?.validCount || 0}</p>
              </div>

              <div
                onClick={() => setActiveTab('duplicates')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeTab === 'duplicates'
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-slate-800/80 bg-[#131c31] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-amber-400 uppercase tracking-wider font-semibold">Duplicate Conflicts</p>
                  <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-xs">Blocked</Badge>
                </div>
                <p className="text-2xl font-black text-amber-400 mt-1">{summary?.duplicateCount || 0}</p>
              </div>

              <div
                onClick={() => setActiveTab('invalid')}
                className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                  activeTab === 'invalid'
                    ? 'border-red-500 bg-red-500/10'
                    : 'border-slate-800/80 bg-[#131c31] hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs text-red-400 uppercase tracking-wider font-semibold">Invalid Rows</p>
                  <Badge className="bg-red-500/20 text-red-400 border-red-500/40 text-xs">Error</Badge>
                </div>
                <p className="text-2xl font-black text-red-400 mt-1">{summary?.invalidCount || 0}</p>
              </div>
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-2xl border border-slate-800/80 bg-[#131c31]">
              <div>
                <p className="text-sm font-bold text-slate-200">
                  Ready to Process {summary?.validCount || 0} Valid Leads into Batch: <span className="text-indigo-400 font-mono">"{batchName || 'Default Batch'}"</span>
                </p>
                <p className="text-xs text-slate-400">
                  Duplicate conflicts ({summary?.duplicateCount}) and invalid rows ({summary?.invalidCount}) will be safely skipped.
                </p>
              </div>

              <Button
                onClick={handleConfirmImport}
                disabled={
                  !summary?.validCount ||
                  summary.validCount === 0 ||
                  confirmMutation.isPending
                }
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2 rounded-xl h-11 px-5 shadow-md shadow-emerald-600/20"
              >
                {confirmMutation.isPending ? 'Importing Leads...' : `Import ${summary?.validCount || 0} Valid Leads →`}
              </Button>
            </div>

            {/* Detailed Data Tabs */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
              {/* Tab Header */}
              <div className="flex border-b border-slate-800 bg-[#0b0f19] px-4 pt-3 gap-4 text-xs font-bold overflow-x-auto no-scrollbar">
                <button
                  onClick={() => setActiveTab('valid')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'valid'
                      ? 'border-emerald-500 text-emerald-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Valid Leads ({previewResult.valid?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('duplicates')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'duplicates'
                      ? 'border-amber-500 text-amber-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Duplicate Conflicts ({previewResult.duplicates?.length || 0})
                </button>

                <button
                  onClick={() => setActiveTab('invalid')}
                  className={`pb-3 border-b-2 transition-colors whitespace-nowrap ${
                    activeTab === 'invalid'
                      ? 'border-red-500 text-red-400'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Invalid Rows ({previewResult.invalid?.length || 0})
                </button>
              </div>

              {/* Tab Content Tables */}
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-400 font-semibold text-xs">Row #</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Customer Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Mobile</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Target Project</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Intent</TableHead>
                    {activeTab === 'duplicates' ? (
                      <>
                        <TableHead className="text-slate-400 font-semibold text-xs">Existing Owner</TableHead>
                        <TableHead className="text-slate-400 font-semibold text-xs">Stage</TableHead>
                      </>
                    ) : activeTab === 'invalid' ? (
                      <TableHead className="text-slate-400 font-semibold text-xs">Validation Reason</TableHead>
                    ) : (
                      <TableHead className="text-slate-400 font-semibold text-xs">Status</TableHead>
                    )}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activeTab === 'valid' && (
                    previewResult.valid?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                          No valid leads found in spreadsheet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewResult.valid?.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40 border-l-4 border-l-emerald-500 bg-emerald-500/5">
                          <TableCell className="text-slate-500 text-xs font-mono">{item.rowNumber}</TableCell>
                          <TableCell className="font-semibold text-slate-200 text-xs">{item.rawName}</TableCell>
                          <TableCell className="text-slate-300 font-mono text-xs">{item.mobile}</TableCell>
                          <TableCell className="text-indigo-400 text-xs font-medium">{item.project}</TableCell>
                          <TableCell className="text-xs capitalize font-semibold">
                            <span className={item.intent === 'high' ? 'text-emerald-400' : item.intent === 'low' ? 'text-red-400' : 'text-amber-400'}>
                              {item.intent || 'Medium'}
                            </span>
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                              {item.isExistingCustomer ? 'Existing Customer' : 'New Customer'}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}

                  {activeTab === 'duplicates' && (
                    previewResult.duplicates?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-6 text-slate-500 text-xs">
                          Zero duplicate conflicts detected!
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewResult.duplicates?.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40 border-l-4 border-l-amber-500 bg-amber-500/5">
                          <TableCell className="text-slate-500 text-xs font-mono">{item.rowNumber}</TableCell>
                          <TableCell className="font-semibold text-slate-200 text-xs">{item.rawName}</TableCell>
                          <TableCell className="text-slate-300 font-mono text-xs">{item.mobile}</TableCell>
                          <TableCell className="text-indigo-400 text-xs font-medium">{item.project}</TableCell>
                          <TableCell className="text-xs capitalize font-semibold">
                            <span className={item.intent === 'high' ? 'text-emerald-400' : item.intent === 'low' ? 'text-red-400' : 'text-amber-400'}>
                              {item.intent || 'Medium'}
                            </span>
                          </TableCell>
                          <TableCell className="text-amber-400 text-xs font-semibold">
                            🛡️ {item.existingOpportunity?.owner?.name || 'Assigned Rep'}
                          </TableCell>
                          <TableCell>
                            <Badge className="bg-amber-500/20 text-amber-400 border-amber-500/40 text-[10px] uppercase">
                              {item.existingOpportunity?.stage}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}

                  {activeTab === 'invalid' && (
                    previewResult.invalid?.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-6 text-slate-500 text-xs">
                          Zero invalid rows!
                        </TableCell>
                      </TableRow>
                    ) : (
                      previewResult.invalid?.map((item: any, idx: number) => (
                        <TableRow key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40 border-l-4 border-l-red-500 bg-red-500/5">
                          <TableCell className="text-slate-500 text-xs font-mono">{item.rowNumber}</TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">
                            {item.rawRow?.name || item.rawRow?.Name || '—'}
                          </TableCell>
                          <TableCell className="text-slate-400 font-mono text-xs">
                            {item.rawRow?.mobile || item.rawRow?.Phone || '—'}
                          </TableCell>
                          <TableCell className="text-slate-400 text-xs">
                            {item.rawRow?.project || item.rawRow?.Project || '—'}
                          </TableCell>
                          <TableCell className="text-slate-500 text-xs">—</TableCell>
                          <TableCell className="text-red-400 text-xs font-semibold">
                            ⚠️ {item.reason}
                          </TableCell>
                        </TableRow>
                      ))
                    )
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

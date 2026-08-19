import React, { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { previewImportLeads, confirmImportLeads } from '../../api/opportunities';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

export default function ImportLeadsPage() {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [activeTab, setActiveTab] = useState<'valid' | 'duplicates' | 'invalid'>('valid');
  const [previewResult, setPreviewResult] = useState<any>(null);
  const [importSummary, setImportSummary] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Preview Mutation
  const previewMutation = useMutation({
    mutationFn: (file: File) => previewImportLeads(file),
    onSuccess: (data) => {
      setPreviewResult(data);
      setErrorMessage(null);
      setImportSummary(null);
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
    }
  });

  // Confirm Mutation
  const confirmMutation = useMutation({
    mutationFn: (validLeads: any[]) => confirmImportLeads(validLeads),
    onSuccess: (data) => {
      setImportSummary(data);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to confirm bulk lead import.';
      setErrorMessage(msg);
    }
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
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
      setSelectedFile(e.dataTransfer.files[0]);
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
    confirmMutation.mutate(previewResult.valid);
  };

  const summary = previewResult?.summary;

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            📥 Bulk Lead Import & Sanitization Engine
          </h1>
          <p className="text-sm text-slate-400">
            Upload Excel (.xlsx) or CSV files for check-only duplicate verification before bulk importing.
          </p>
        </div>
      </div>

      {/* Global Error Banner */}
      {errorMessage && (
        <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-400 text-sm font-semibold flex items-center justify-between">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-xs text-red-400 underline">Dismiss</button>
        </div>
      )}

      {/* Import Completed Toast / Summary */}
      {importSummary && (
        <div className="p-5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 backdrop-blur-xl space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-bold text-emerald-400 flex items-center gap-2">
              <span>✅</span> Bulk Import Complete
            </h3>
            <Button
              size="sm"
              onClick={() => navigate('/pipeline')}
              className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
            >
              View Pipeline Dashboard →
            </Button>
          </div>
          <p className="text-sm text-slate-300">
            Successfully created and auto-assigned <strong className="text-emerald-400">{importSummary.imported}</strong> new leads to sales pod members. (Skipped: {importSummary.skipped})
          </p>
        </div>
      )}

      {/* Step 1: Upload Zone */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl p-6 backdrop-blur-xl">
        <form onSubmit={handlePreviewSubmit} className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className="border-2 border-dashed border-slate-700 hover:border-indigo-500/60 transition-colors rounded-2xl p-8 text-center bg-slate-950/40 cursor-pointer"
          >
            <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto mb-3 text-2xl font-bold">
              📄
            </div>
            <p className="text-sm font-semibold text-slate-200">
              {selectedFile ? selectedFile.name : 'Drag & Drop your Excel (.xlsx, .xls) or CSV file here'}
            </p>
            <p className="text-xs text-slate-500 mt-1">
              {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Supports columns: Name, Mobile, Project, Source'}
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
              className="inline-block mt-4 px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold cursor-pointer transition-colors"
            >
              {selectedFile ? 'Change File' : 'Browse File'}
            </label>
          </div>

          <div className="flex justify-end">
            <Button
              type="submit"
              disabled={!selectedFile || previewMutation.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-2"
            >
              {previewMutation.isPending ? 'Analyzing Spreadsheet...' : 'Preview & Verify Spreadsheet'}
            </Button>
          </div>
        </form>
      </div>

      {/* Step 2: Preview Results & Summary */}
      {previewResult && (
        <div className="space-y-6">
          {/* KPI Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl">
              <p className="text-xs text-slate-400 uppercase tracking-wider font-semibold">Total Rows</p>
              <p className="text-2xl font-black text-slate-100 mt-1">{summary?.totalRows || 0}</p>
            </div>

            <div
              onClick={() => setActiveTab('valid')}
              className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                activeTab === 'valid'
                  ? 'border-emerald-500 bg-emerald-500/10'
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
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
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
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
                  : 'border-slate-800 bg-slate-900/90 hover:border-slate-700'
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
          <div className="flex items-center justify-between p-4 rounded-2xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl">
            <div>
              <p className="text-sm font-bold text-slate-200">
                Ready to Process {summary?.validCount || 0} Valid Leads
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
              className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-2"
            >
              {confirmMutation.isPending ? 'Importing Leads...' : `Import ${summary?.validCount || 0} Valid Leads →`}
            </Button>
          </div>

          {/* Detailed Data Tabs */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
            {/* Tab Header */}
            <div className="flex border-b border-slate-800 bg-slate-950/60 px-4 pt-3 gap-4 text-xs font-bold">
              <button
                onClick={() => setActiveTab('valid')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'valid'
                    ? 'border-emerald-500 text-emerald-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Valid Leads ({previewResult.valid?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('duplicates')}
                className={`pb-3 border-b-2 transition-colors ${
                  activeTab === 'duplicates'
                    ? 'border-amber-500 text-amber-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Duplicate Conflicts ({previewResult.duplicates?.length || 0})
              </button>

              <button
                onClick={() => setActiveTab('invalid')}
                className={`pb-3 border-b-2 transition-colors ${
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
              <TableHeader className="bg-slate-950/40">
                <TableRow className="border-slate-800 hover:bg-transparent">
                  <TableHead className="text-slate-400 font-semibold">Row #</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Customer Name</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Normalized Mobile</TableHead>
                  <TableHead className="text-slate-400 font-semibold">Target Project</TableHead>
                  {activeTab === 'duplicates' ? (
                    <>
                      <TableHead className="text-slate-400 font-semibold">Existing Active Owner</TableHead>
                      <TableHead className="text-slate-400 font-semibold">Stage</TableHead>
                    </>
                  ) : activeTab === 'invalid' ? (
                    <TableHead className="text-slate-400 font-semibold">Validation Reason</TableHead>
                  ) : (
                    <TableHead className="text-slate-400 font-semibold">Customer Status</TableHead>
                  )}
                </TableRow>
              </TableHeader>
              <TableBody>
                {activeTab === 'valid' && (
                  previewResult.valid?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                        No valid leads found in spreadsheet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewResult.valid?.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-850/50">
                        <TableCell className="text-slate-500 text-xs font-mono">{item.rowNumber}</TableCell>
                        <TableCell className="font-semibold text-slate-200">{item.rawName}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">{item.mobile}</TableCell>
                        <TableCell className="text-indigo-400 text-xs font-medium">{item.project}</TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/20 text-emerald-400 border-emerald-500/40 text-[10px]">
                            {item.isExistingCustomer ? 'Existing Customer (New Slot)' : 'New Customer'}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )
                )}

                {activeTab === 'duplicates' && (
                  previewResult.duplicates?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-6 text-slate-500">
                        Zero duplicate conflicts detected!
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewResult.duplicates?.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-850/50">
                        <TableCell className="text-slate-500 text-xs font-mono">{item.rowNumber}</TableCell>
                        <TableCell className="font-semibold text-slate-200">{item.rawName}</TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">{item.mobile}</TableCell>
                        <TableCell className="text-indigo-400 text-xs font-medium">{item.project}</TableCell>
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
                      <TableCell colSpan={5} className="text-center py-6 text-slate-500">
                        Zero invalid rows!
                      </TableCell>
                    </TableRow>
                  ) : (
                    previewResult.invalid?.map((item: any, idx: number) => (
                      <TableRow key={idx} className="border-slate-800/60 hover:bg-slate-850/50">
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
    </div>
  );
}

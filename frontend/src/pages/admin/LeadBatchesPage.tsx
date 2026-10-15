import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Tag,
  Search,
  ArrowLeft,
  Users,
  Trophy,
  ChevronRight,
  Eye,
  Trash2,
  UserCheck,
  RefreshCw,
  CheckSquare,
  Square,
  Download,
  AlertTriangle,
  X,
  ShieldAlert
} from 'lucide-react';
import { toast } from 'sonner';
import Navbar from '../../components/Navbar';
import api from '../../api/axios';
import { getUsers } from '../../api/users';
import useAuthStore from '../../store/authStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import { Label } from '../../components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

export default function LeadBatchesPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isAdmin = currentUser?.role === 'admin' || currentUser?.role === 'super_admin';

  const [search, setSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [reassignUserId, setReassignUserId] = useState<string>('');
  const [isReassigning, setIsReassigning] = useState<boolean>(false);

  // Deletion Modal States (Admin only)
  const [batchToDelete, setBatchToDelete] = useState<{ batchId: string; totalLeads?: number } | null>(null);
  const [isDeletingSelectedLeads, setIsDeletingSelectedLeads] = useState<boolean>(false);

  // Fetch Users for Reassignment Dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });
  const users = usersData?.users || [];

  // Fetch batches list
  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['leadBatches'],
    queryFn: async () => {
      const res = await api.get('/admin/lead-batches');
      return res.data;
    }
  });

  // Delete Batch / Leads Mutation (Strictly Admin only)
  const deleteBatchMutation = useMutation({
    mutationFn: async ({ batchId, leadIds }: { batchId: string; leadIds?: string[] }) => {
      const res = await api.delete(`/admin/lead-batches/${encodeURIComponent(batchId)}`, {
        data: { leadIds }
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Leads deleted successfully');
      setBatchToDelete(null);
      setIsDeletingSelectedLeads(false);
      setSelectedLeadIds([]);
      if (!isDeletingSelectedLeads) {
        setSelectedBatchId(null);
      }
      queryClient.invalidateQueries({ queryKey: ['leadBatches'] });
      queryClient.invalidateQueries({ queryKey: ['batchLeads'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to delete lead batch';
      toast.error(msg);
    }
  });

  // Reassign Batch Leads Mutation
  const reassignBatchMutation = useMutation({
    mutationFn: async ({ batchId, newOwnerId, leadIds }: { batchId: string; newOwnerId: string; leadIds?: string[] }) => {
      const res = await api.post(`/admin/lead-batches/${encodeURIComponent(batchId)}/reassign`, {
        newOwnerId,
        leadIds
      });
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || 'Leads reassigned successfully');
      setIsReassigning(false);
      setSelectedLeadIds([]);
      queryClient.invalidateQueries({ queryKey: ['batchLeads', selectedBatchId] });
      queryClient.invalidateQueries({ queryKey: ['leadBatches'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to reassign leads';
      toast.error(msg);
    }
  });

  // Fetch selected batch leads
  const { data: batchLeadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['batchLeads', selectedBatchId, leadSearch],
    queryFn: async () => {
      if (!selectedBatchId) return null;
      const res = await api.get(`/admin/lead-batches/${encodeURIComponent(selectedBatchId)}`, {
        params: { search: leadSearch }
      });
      return res.data;
    },
    enabled: !!selectedBatchId
  });

  const batches = batchesData?.batches || [];
  const filteredBatches = batches.filter((b: any) =>
    (b.batchName || '').toLowerCase().includes(search.toLowerCase())
  );

  const batchOpportunities = batchLeadsData?.opportunities || [];

  const handleDeleteBatch = (batchId: string, totalLeads?: number) => {
    if (!isAdmin) {
      toast.error('Only administrators are allowed to delete lead lists');
      return;
    }
    setBatchToDelete({ batchId, totalLeads });
  };

  const handleSelectAllLeads = () => {
    if (selectedLeadIds.length === batchOpportunities.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(batchOpportunities.map((o: any) => o._id));
    }
  };

  const handleToggleLeadSelect = (id: string) => {
    setSelectedLeadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleExecuteReassign = () => {
    if (!selectedBatchId || !reassignUserId) {
      toast.error('Please select a target employee to reassign leads');
      return;
    }
    const targetUser = users.find((u: any) => u._id === reassignUserId);
    const targetName = targetUser ? `${targetUser.name} (${targetUser.employeeId || targetUser.role})` : 'selected employee';
    const countText = selectedLeadIds.length > 0 ? `${selectedLeadIds.length} selected leads` : `ALL leads in batch "${selectedBatchId}"`;

    if (window.confirm(`Reassign ${countText} to ${targetName}?`)) {
      reassignBatchMutation.mutate({
        batchId: selectedBatchId,
        newOwnerId: reassignUserId,
        leadIds: selectedLeadIds.length > 0 ? selectedLeadIds : undefined
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>Import History & Batch Reassignment</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {selectedBatchId ? `Batch: ${selectedBatchId}` : 'Lead Import History & Batches'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {selectedBatchId
                ? 'Drill-down view of leads imported under this sheet tag. Reassign or track current status.'
                : 'Complete audit view of all uploaded spreadsheets, assigned employees, lead counts, and dates.'}
            </p>
          </div>

          {selectedBatchId && (
            <div className="flex items-center gap-2">
              {isAdmin && (
                <Button
                  size="sm"
                  onClick={() =>
                    handleDeleteBatch(
                      selectedBatchId,
                      batchLeadsData?.total || batchOpportunities.length
                    )
                  }
                  disabled={deleteBatchMutation.isPending}
                  className="bg-red-500/20 hover:bg-red-600 text-red-300 hover:text-white text-xs font-bold rounded-xl flex items-center gap-1.5 border border-red-500/30 transition-colors shadow-sm"
                  title="Permanently delete this lead list (Admin only)"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Lead List</span>
                </Button>
              )}
              <Button
                size="sm"
                onClick={() => {
                  setSelectedBatchId(null);
                  setSelectedLeadIds([]);
                  setIsReassigning(false);
                }}
                className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Back to All Batches</span>
              </Button>
            </div>
          )}
        </div>

        {/* VIEW 1: ALL BATCHES SUMMARY LIST */}
        {!selectedBatchId ? (
          <div className="space-y-4">
            {/* Search Filter Bar */}
            <div className="flex items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search batch by name (e.g. NEW_DDV_261009)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl"
                />
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Showing {filteredBatches.length} batch{filteredBatches.length === 1 ? '' : 'es'}
              </span>
            </div>

            {/* Batches Table */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] overflow-hidden">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-400 font-semibold text-xs">Sheet Code (Batch Tag)</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Total Leads</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Assigned Employee(s)</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Active Pipeline</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Deals Won</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Upload Date</TableHead>
                    <TableHead className="text-right text-slate-400 font-semibold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBatches ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                        Loading lead import batches...
                      </TableCell>
                    </TableRow>
                  ) : filteredBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-slate-500 text-xs">
                        No import batches found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBatches.map((b: any, idx: number) => (
                      <TableRow key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                        <TableCell className="font-bold text-white text-xs flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                          <span className="font-mono text-indigo-300">{b.batchName}</span>
                        </TableCell>
                        <TableCell className="font-extrabold text-indigo-300 text-xs">{b.totalLeads} leads</TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap items-center gap-1 max-w-xs">
                            {b.assignedOwners && b.assignedOwners.length > 0 ? (
                              b.assignedOwners.map((owner: any) => (
                                <Badge key={owner._id} className="bg-indigo-500/15 text-indigo-300 border-indigo-500/30 text-[10px] font-medium">
                                  👤 {owner.name} ({owner.employeeId || owner.role})
                                </Badge>
                              ))
                            ) : (
                              <span className="text-slate-500 italic text-[11px]">Unassigned</span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                            {b.activeLeads} active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                            🏆 {b.wonDeals} won
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs font-mono">
                          {b.lastImportedAt ? new Date(b.lastImportedAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right flex items-center justify-end gap-2">
                          <Button
                            size="sm"
                            onClick={() => setSelectedBatchId(b.batchName)}
                            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold rounded-xl h-8 px-3 border border-indigo-500/30"
                          >
                            <span>Drill Down</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                          {isAdmin && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleDeleteBatch(b.batchName, b.totalLeads)}
                              disabled={deleteBatchMutation.isPending}
                              className="bg-red-500/10 hover:bg-red-600 text-red-400 hover:text-white border-red-500/30 text-xs font-bold rounded-xl h-8 px-2.5 transition-colors shadow-sm"
                              title="Delete this lead list (Admin only)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* VIEW 2: BATCH LEADS DRILL-DOWN & REASSIGNMENT INTERFACE */
          <div className="space-y-4">
            {/* Action Bar & Reassignment Panel */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Filter leads by customer, mobile, or owner..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-9 bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl"
                />
              </div>

              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-400 font-semibold hidden md:inline">
                  Total Leads: <strong className="text-indigo-400">{batchLeadsData?.total || 0}</strong>
                </span>

                {/* Reassignment Control Button */}
                <Button
                  size="sm"
                  onClick={() => setIsReassigning(!isReassigning)}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 h-9"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>{isReassigning ? 'Cancel Reassignment' : 'Reassign Leads'}</span>
                </Button>
              </div>
            </div>

            {/* Reassignment Drawer Box */}
            {isReassigning && (
              <div className="p-4 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="w-4 h-4 text-indigo-400" />
                      <span>Reassign Leads in Batch "{selectedBatchId}"</span>
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {selectedLeadIds.length > 0
                        ? `Selected ${selectedLeadIds.length} lead(s) for reassignment.`
                        : `No specific lead selected. Target employee will receive ALL ${batchOpportunities.length} leads in this batch.`}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <select
                      value={reassignUserId}
                      onChange={(e) => setReassignUserId(e.target.value)}
                      className="h-9 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500 min-w-[220px]"
                    >
                      <option value="">Select Target New Owner...</option>
                      {users.map((u: any) => (
                        <option key={u._id} value={u._id}>
                          👤 {u.name} ({u.employeeId || u.role})
                        </option>
                      ))}
                    </select>

                    <Button
                      size="sm"
                      onClick={handleExecuteReassign}
                      disabled={!reassignUserId || reassignBatchMutation.isPending}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl h-9 px-4 shadow-sm"
                    >
                      {reassignBatchMutation.isPending ? 'Reassigning...' : 'Confirm Reassign'}
                    </Button>

                    {isAdmin && selectedLeadIds.length > 0 && (
                      <Button
                        size="sm"
                        type="button"
                        onClick={() => setIsDeletingSelectedLeads(true)}
                        disabled={deleteBatchMutation.isPending}
                        className="bg-red-600/20 hover:bg-red-600 text-red-300 hover:text-white border border-red-500/30 text-xs font-bold rounded-xl h-9 px-3 flex items-center gap-1.5 transition-colors shadow-sm"
                        title="Permanently delete selected leads from this list (Admin only)"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete Selected ({selectedLeadIds.length})</span>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Batch Leads Table */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] overflow-hidden">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    {isReassigning && (
                      <TableHead className="w-10 text-center">
                        <button type="button" onClick={handleSelectAllLeads} className="text-indigo-400 hover:text-white">
                          {selectedLeadIds.length === batchOpportunities.length && batchOpportunities.length > 0 ? (
                            <CheckSquare className="w-4 h-4" />
                          ) : (
                            <Square className="w-4 h-4" />
                          )}
                        </button>
                      </TableHead>
                    )}
                    <TableHead className="text-slate-400 font-semibold text-xs">Customer Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Mobile</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Target Project</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Current Owner Rep</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Stage</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Intent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLeads ? (
                    <TableRow>
                      <TableCell colSpan={isReassigning ? 7 : 6} className="text-center py-8 text-slate-500 text-xs">
                        Loading leads for batch "{selectedBatchId}"...
                      </TableCell>
                    </TableRow>
                  ) : batchOpportunities.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={isReassigning ? 7 : 6} className="text-center py-8 text-slate-500 text-xs">
                        No opportunities found in this batch matching filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    batchOpportunities.map((opp: any) => (
                      <TableRow key={opp._id} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                        {isReassigning && (
                          <TableCell className="text-center">
                            <button
                              type="button"
                              onClick={() => handleToggleLeadSelect(opp._id)}
                              className="text-indigo-400 hover:text-white"
                            >
                              {selectedLeadIds.includes(opp._id) ? (
                                <CheckSquare className="w-4 h-4 text-emerald-400" />
                              ) : (
                                <Square className="w-4 h-4 text-slate-500" />
                              )}
                            </button>
                          </TableCell>
                        )}
                        <TableCell className="font-bold text-white text-xs">
                          {opp.customer?.name || 'Prospect'}
                        </TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">
                          {opp.customer?.primaryMobile || '—'}
                        </TableCell>
                        <TableCell className="text-indigo-400 text-xs font-semibold">
                          {opp.project?.name || '—'}
                        </TableCell>
                        <TableCell className="text-slate-200 text-xs font-semibold">
                          <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 text-xs">
                            👤 {opp.owner?.name || 'Unassigned'} ({opp.owner?.employeeId || 'ID'})
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px] uppercase">
                            {opp.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize font-bold">
                          <span className={opp.intent === 'high' ? 'text-emerald-400' : opp.intent === 'low' ? 'text-red-400' : 'text-amber-400'}>
                            {opp.intent || 'Medium'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* MODAL 1: FULL LEAD LIST / BATCH DELETION MODAL (ADMIN ONLY) */}
        {batchToDelete && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#131c31] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Permanently Delete Lead List?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You are about to delete batch <strong className="text-red-300 font-mono">{batchToDelete.batchId}</strong>
                    {batchToDelete.totalLeads !== undefined ? ` containing ${batchToDelete.totalLeads} lead(s)` : ''}.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 leading-relaxed space-y-1">
                <div className="font-bold flex items-center gap-1.5 text-red-400">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Admin Authority Deletion</span>
                </div>
                <p className="text-[11px] text-red-200/80">
                  All leads, interaction logs, follow-ups, and rep assignments linked to this sheet tag will be permanently deleted from the database. This action cannot be undone.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={deleteBatchMutation.isPending}
                  onClick={() => setBatchToDelete(null)}
                  className="text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteBatchMutation.isPending}
                  onClick={() => deleteBatchMutation.mutate({ batchId: batchToDelete.batchId })}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl px-4 h-9 shadow-lg shadow-red-900/30 flex items-center gap-2"
                >
                  {deleteBatchMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Batch...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Permanently</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL 2: SELECTIVE LEADS DELETION MODAL (ADMIN ONLY) */}
        {isDeletingSelectedLeads && (
          <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in duration-150">
            <div className="bg-[#131c31] border border-red-500/30 rounded-2xl w-full max-w-md shadow-2xl p-6 text-slate-100 space-y-5 animate-in zoom-in-95 duration-150">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                  <Trash2 className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-bold text-white">Delete Selected Leads?</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You are about to delete <strong className="text-red-300 font-bold">{selectedLeadIds.length}</strong> selected lead(s) from batch <strong className="text-indigo-300 font-mono">{selectedBatchId}</strong>.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-xs text-red-300 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 text-red-400 mb-1">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Irreversible Action</span>
                </div>
                <p className="text-[11px] text-red-200/80">
                  The selected leads will be permanently purged from the system.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  type="button"
                  variant="ghost"
                  disabled={deleteBatchMutation.isPending}
                  onClick={() => setIsDeletingSelectedLeads(false)}
                  className="text-slate-400 hover:text-white text-xs font-semibold rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  disabled={deleteBatchMutation.isPending}
                  onClick={() => {
                    if (selectedBatchId) {
                      deleteBatchMutation.mutate({ batchId: selectedBatchId, leadIds: selectedLeadIds });
                    }
                  }}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs font-bold rounded-xl px-4 h-9 shadow-lg shadow-red-900/30 flex items-center gap-2"
                >
                  {deleteBatchMutation.isPending ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Deleting Selected...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Yes, Delete Selected</span>
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}


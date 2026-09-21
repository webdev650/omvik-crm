import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { Palmtree, Clock, CheckCircle2, XCircle, Scale, ShieldCheck, Search } from 'lucide-react';
import Navbar from '../components/Navbar';
import useAuthStore from '../store/authStore';
import { getLeaves, requestLeave, decideLeave } from '../api/leave';
import { getUsers } from '../api/users';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';
import SlaTermsModal, { SERVICE_STANDARDS_DATA, SLA_TERMS_CONDITIONS_DATA } from '../components/SlaTermsModal';

export default function LeavePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  const isAdmin = ['admin', 'super_admin', 'director'].includes(user?.role || '');

  // Tab state derived from URL or state
  const paramTab = searchParams.get('tab');
  const activeTab = paramTab === 'sla-standards' ? 'sla-standards' : paramTab === 'sla-terms' ? 'sla-terms' : 'leave';

  const setTab = (tab: 'leave' | 'sla-standards' | 'sla-terms') => {
    setSearchParams({ tab });
  };

  // Search filter for SLA rules
  const [slaSearch, setSlaSearch] = useState('');

  // Form states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [targetUserId, setTargetUserId] = useState('');

  // Fetch Leaves
  const { data: leaveData, isLoading, isError } = useQuery({
    queryKey: ['leaves'],
    queryFn: getLeaves
  });

  // Fetch Users for Admin Quick-Add Dropdown
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers,
    enabled: isAdmin
  });

  const leaves = leaveData?.leaves || [];
  const usersList = usersData?.users || [];

  // Request / Log Leave Mutation
  const requestMutation = useMutation({
    mutationFn: requestLeave,
    onSuccess: (res) => {
      toast.success(res.message);
      setStartDate('');
      setEndDate('');
      setReason('');
      setTargetUserId('');
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to record leave.');
    }
  });

  // Decision Mutation (Approve / Reject)
  const decideMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: 'approved' | 'rejected' }) => decideLeave(id, status),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['leaves'] });
      queryClient.invalidateQueries({ queryKey: ['activeLeaves'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update leave status.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!startDate || !endDate) {
      toast.error('Please select both start and end dates.');
      return;
    }

    requestMutation.mutate({
      startDate,
      endDate,
      reason,
      userId: isAdmin && targetUserId ? targetUserId : undefined
    });
  };

  const filteredStandards = SERVICE_STANDARDS_DATA.filter(
    (s) =>
      s.activity.toLowerCase().includes(slaSearch.toLowerCase()) ||
      s.sla.toLowerCase().includes(slaSearch.toLowerCase()) ||
      s.requirement.toLowerCase().includes(slaSearch.toLowerCase())
  );

  const filteredTerms = SLA_TERMS_CONDITIONS_DATA.filter(
    (t) =>
      t.term.toLowerCase().includes(slaSearch.toLowerCase()) ||
      t.rule.toLowerCase().includes(slaSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Palmtree className="w-3.5 h-3.5" />
              <span>SLA Clock & Governance Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Leave & SLA Governance Standards
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage leave records, review official 14 Milestone Service Standards, and reference all 24 SLA Breach Terms & Conditions.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={() => setTab('sla-terms')}
              variant="outline"
              className="border-amber-500/30 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 font-bold text-xs h-10 px-4 rounded-xl gap-1.5 min-h-[40px]"
            >
              <Scale className="w-4 h-4 text-amber-400" />
              <span>SLA Terms & Conditions</span>
            </Button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-800/80 pb-3">
          <button
            type="button"
            onClick={() => setTab('leave')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'leave'
                ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Palmtree className="w-4 h-4 text-emerald-400" />
            <span>Employee Leave Management</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('sla-standards')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sla-standards'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Clock className="w-4 h-4 text-indigo-400" />
            <span>Service Standards & Timeframes</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
              14 Standards
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('sla-terms')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'sla-terms'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>SLA Breach Terms & Conditions</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              24 Rules
            </span>
          </button>
        </div>

        {/* ── TAB 1: EMPLOYEE LEAVE MANAGEMENT ────────────────────────────── */}
        {activeTab === 'leave' && (
          <div className="space-y-6">
            {/* Leave Request / Quick-Add Form Card */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
              <div className="border-b border-slate-800/60 pb-3">
                <h3 className="text-lg font-bold text-white">
                  {isAdmin ? '🌴 Log Leave Record / Pre-Approve' : '📝 Request Time-Off / Leave'}
                </h3>
                <p className="text-xs text-slate-400">
                  {isAdmin
                    ? 'Record pre-approved leave for yourself or another team member.'
                    : 'Submit your leave request for administrative review.'}
                </p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {/* Admin Select Employee Dropdown */}
                  {isAdmin && (
                    <div className="space-y-1.5 md:col-span-3">
                      <Label htmlFor="targetUser" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        👤 Employee (Select Self or Team Member)
                      </Label>
                      <select
                        id="targetUser"
                        value={targetUserId}
                        onChange={(e) => setTargetUserId(e.target.value)}
                        className="w-full h-11 px-3 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-xs font-semibold focus:outline-none focus:border-emerald-500"
                      >
                        <option value="">Myself ({user?.name})</option>
                        {usersList.map((u: any) => (
                          <option key={u._id} value={u._id}>
                            {u.name} ({u.employeeId || 'ID'}) — {u.role?.toUpperCase()}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}

                  {/* Start Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="startDate" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Start Date
                    </Label>
                    <Input
                      id="startDate"
                      type="date"
                      value={startDate}
                      onChange={(e) => setStartDate(e.target.value)}
                      className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs h-11 rounded-xl"
                    />
                  </div>

                  {/* End Date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="endDate" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      End Date
                    </Label>
                    <Input
                      id="endDate"
                      type="date"
                      value={endDate}
                      onChange={(e) => setEndDate(e.target.value)}
                      className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xs h-11 rounded-xl"
                    />
                  </div>

                  {/* Reason */}
                  <div className="space-y-1.5">
                    <Label htmlFor="reason" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Reason / Details
                    </Label>
                    <Input
                      id="reason"
                      type="text"
                      placeholder="Annual Leave, Personal, Medical..."
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      className="bg-[#0b0f19] border-slate-800 text-slate-100 text-xs h-11 rounded-xl"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  disabled={requestMutation.isPending}
                  className="w-full h-11 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase tracking-wider rounded-xl shadow-md shadow-emerald-600/20"
                >
                  {requestMutation.isPending ? 'Recording Leave...' : isAdmin ? 'Record Approved Leave' : 'Submit Leave Request'}
                </Button>
              </form>
            </div>

            {/* Leave History / Approval Queue Table Container */}
            <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
              <div className="p-4 border-b border-slate-800/80">
                <h3 className="text-base font-bold text-white">
                  📋 Leave Records & Approval Queue ({leaves.length})
                </h3>
              </div>

              {isLoading ? (
                <div className="p-8 space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="h-12 bg-slate-900/60 rounded-xl animate-pulse" />
                  ))}
                </div>
              ) : isError ? (
                <div className="p-12 text-center text-red-400 text-xs font-semibold">Failed to load leave records.</div>
              ) : leaves.length === 0 ? (
                <div className="p-12 text-center text-slate-400 text-xs">
                  ✨ No leave records found.
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-800/80 bg-[#0b0f19]">
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Employee</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Start Date</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">End Date</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Reason</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Status</TableHead>
                      {isAdmin && <TableHead className="text-slate-400 text-xs font-bold uppercase text-right">Actions</TableHead>}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {leaves.map((l: any) => {
                      const startStr = new Date(l.startDate).toLocaleDateString();
                      const endStr = new Date(l.endDate).toLocaleDateString();

                      return (
                        <TableRow key={l._id} className="hover:bg-slate-800/40 border-b border-slate-800/40 transition-colors">
                          <TableCell className="font-bold text-white">
                            <div>
                              <p>{l.user?.name || 'Staff Member'}</p>
                              <p className="text-[10px] text-indigo-400 font-mono">{l.user?.employeeId || 'EMP'}</p>
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-slate-300 text-xs">{startStr}</TableCell>
                          <TableCell className="font-mono text-slate-300 text-xs">{endStr}</TableCell>
                          <TableCell className="text-xs text-slate-300">{l.reason || '—'}</TableCell>
                          <TableCell>
                            {l.status === 'approved' ? (
                              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] font-bold">
                                ✓ APPROVED
                              </Badge>
                            ) : l.status === 'rejected' ? (
                              <Badge variant="destructive" className="text-[10px] font-bold">
                                ✕ REJECTED
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-bold">
                                ⏳ PENDING
                              </Badge>
                            )}
                          </TableCell>
                          {isAdmin && (
                            <TableCell className="text-right">
                              {l.status === 'pending' && (
                                <div className="flex items-center justify-end gap-2">
                                  <Button
                                    onClick={() => decideMutation.mutate({ id: l._id, status: 'approved' })}
                                    size="sm"
                                    className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-bold rounded-lg"
                                  >
                                    Approve
                                  </Button>
                                  <Button
                                    onClick={() => decideMutation.mutate({ id: l._id, status: 'rejected' })}
                                    size="sm"
                                    variant="destructive"
                                    className="h-7 text-[11px] font-bold rounded-lg"
                                  >
                                    Reject
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          )}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              )}
            </div>
          </div>
        )}

        {/* ── TAB 2: SERVICE STANDARDS & TIMEFRAMES TABLE ─────────────────── */}
        {activeTab === 'sla-standards' && (
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>⚡ Activity / Milestone SLA & Timeframe Standards</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Mandatory operational response deadlines & follow-up frequencies defined by Omvik Realcon management.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Filter standards..."
                  value={slaSearch}
                  onChange={(e) => setSlaSearch(e.target.value)}
                  className="pl-8 h-9 text-xs bg-[#0b0f19] border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <Table>
              <TableHeader className="bg-[#0b0f19]">
                <TableRow className="border-b border-slate-800">
                  <TableHead className="text-slate-400 font-bold text-xs w-12 text-center">#</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs">Activity / Milestone</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs">SLA / Timeframe</TableHead>
                  <TableHead className="text-slate-400 font-bold text-xs">Requirement & Mandatory Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredStandards.map((item) => (
                  <TableRow key={item.id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                    <TableCell className="text-center font-mono text-slate-400 text-xs font-bold">{item.id}</TableCell>
                    <TableCell className="font-bold text-white text-xs">{item.activity}</TableCell>
                    <TableCell>
                      <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-mono font-bold whitespace-nowrap">
                        ⏱️ {item.sla}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-slate-300 text-xs">{item.requirement}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── TAB 3: SLA BREACH TERMS & CONDITIONS RULES (24 RULES) ─────────── */}
        {activeTab === 'sla-terms' && (
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800/60 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <span>📜 Terms & Conditions Rules for SLA Breach</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Complete 24-rule policy framework governing SLA calculation, delays, reassignment, audit trails, and super admin approvals.
                </p>
              </div>

              <div className="relative w-full sm:w-72">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Filter 24 terms & conditions..."
                  value={slaSearch}
                  onChange={(e) => setSlaSearch(e.target.value)}
                  className="pl-8 h-9 text-xs bg-[#0b0f19] border-slate-800 rounded-xl"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTerms.map((item) => (
                <div
                  key={item.id}
                  className="p-4 rounded-2xl bg-[#0b0f19] border border-slate-800/90 hover:border-amber-500/40 transition-all space-y-2 flex flex-col justify-between"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                    <span className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-xs font-mono font-black">
                        {item.id}
                      </span>
                      {item.term}
                    </span>
                    {(item.id === 9 || item.id === 12 || item.id === 15) && (
                      <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                        SUPER ADMIN APPROVAL
                      </span>
                    )}
                    {(item.id === 18 || item.id === 20) && (
                      <span className="px-2 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-bold">
                        NO BACKDATING / SILENT CLOSURE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-300 leading-relaxed">{item.rule}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

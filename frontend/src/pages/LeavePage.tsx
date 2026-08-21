import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Palmtree, Clock, CheckCircle2, XCircle } from 'lucide-react';
import Navbar from '../components/Navbar';
import useAuthStore from '../store/authStore';
import { getLeaves, requestLeave, decideLeave } from '../api/leave';
import { getUsers } from '../api/users';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Badge } from '../components/ui/badge';

export default function LeavePage() {
  const { user } = useAuthStore();
  const queryClient = useQueryClient();
  const isAdmin = ['admin', 'super_admin', 'director'].includes(user?.role || '');

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

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-bold uppercase tracking-wider">
              <Palmtree className="w-3.5 h-3.5" />
              <span>SLA Clock & Leave Management</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Employee Leave Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Log planned leave or approve employee requests. Approved leave hours automatically pause & adjust lead SLA breach deadlines.
            </p>
          </div>
        </div>

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
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import useAuthStore from '../store/authStore';
import { getLeaves, requestLeave, decideLeave } from '../api/leave';
import { getUsers } from '../api/users';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-widest mb-2">
              🌴 Leave & SLA Clock Adjustment
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Employee Leave Management
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Log planned leave or approve employee requests. Approved leave hours automatically pause & adjust lead SLA breach deadlines.
            </p>
          </div>
        </div>

        {/* Leave Request / Quick-Add Card */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>{isAdmin ? '🌴 Log Leave Record / Pre-Approve' : '📝 Request Time-Off / Leave'}</CardTitle>
            <CardDescription>
              {isAdmin
                ? 'Record pre-approved leave for yourself or another team member.'
                : 'Submit your leave request for administrative review.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                
                {/* Admin Select Employee Dropdown */}
                {isAdmin && (
                  <div className="space-y-2 md:col-span-3">
                    <Label htmlFor="targetUser" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                      👤 Employee (Select Self or Team Member)
                    </Label>
                    <select
                      id="targetUser"
                      value={targetUserId}
                      onChange={(e) => setTargetUserId(e.target.value)}
                      className="w-full h-11 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-semibold focus:outline-none focus:border-emerald-500"
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
                <div className="space-y-2">
                  <Label htmlFor="startDate" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Start Date & Time
                  </Label>
                  <Input
                    id="startDate"
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs h-11"
                  />
                </div>

                {/* End Date */}
                <div className="space-y-2">
                  <Label htmlFor="endDate" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    End Date & Time
                  </Label>
                  <Input
                    id="endDate"
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-xs h-11"
                  />
                </div>

                {/* Reason */}
                <div className="space-y-2">
                  <Label htmlFor="reason" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    Reason / Details
                  </Label>
                  <Input
                    id="reason"
                    type="text"
                    placeholder="Annual Leave, Personal, Medical..."
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="bg-slate-950 border-slate-800 text-slate-100 text-xs h-11"
                  />
                </div>

              </div>

              <Button
                type="submit"
                disabled={requestMutation.isPending}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-bold h-11 text-xs uppercase tracking-wider"
              >
                {requestMutation.isPending ? 'Recording Leave...' : isAdmin ? 'Record Approved Leave' : 'Submit Leave Request'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Leave History / Approval Queue Table */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader className="border-b border-slate-800 pb-4">
            <CardTitle className="text-base font-bold text-white flex items-center justify-between">
              <span>📋 Leave Records & Approval Queue ({leaves.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-12 text-center text-red-400 text-sm">Failed to load leave records.</div>
            ) : leaves.length === 0 ? (
              <div className="p-12 text-center text-slate-400 text-xs">
                ✨ No leave records found.
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Start Date</TableHead>
                    <TableHead>End Date</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((l: any) => {
                    const startStr = new Date(l.startDate).toLocaleDateString();
                    const endStr = new Date(l.endDate).toLocaleDateString();

                    return (
                      <TableRow key={l._id} className="hover:bg-slate-800/50">
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
                            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                              ✓ APPROVED
                            </Badge>
                          ) : l.status === 'rejected' ? (
                            <Badge variant="destructive" className="text-[10px]">
                              ✕ REJECTED
                            </Badge>
                          ) : (
                            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px]">
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
                                  className="h-7 bg-emerald-600 hover:bg-emerald-500 text-white text-[11px]"
                                >
                                  Approve
                                </Button>
                                <Button
                                  onClick={() => decideMutation.mutate({ id: l._id, status: 'rejected' })}
                                  size="sm"
                                  variant="destructive"
                                  className="h-7 text-[11px]"
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
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

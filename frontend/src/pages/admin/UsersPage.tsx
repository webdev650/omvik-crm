import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { getUsers, createUser, updateUser, getUserActiveOppCount, offboardUser } from '../../api/users';
import { getTeams } from '../../api/teams';
import useAuthStore from '../../store/authStore';
import Navbar from '../../components/Navbar';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge, getRoleBadgeVariant } from '../../components/ui/badge';
import { Switch } from '../../components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from '../../components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

const createUserSchema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Temporary password must be at least 6 characters'),
  role: z.string().min(1, 'Please select a role'),
  teamId: z.string().optional()
});

type CreateUserFormValues = z.infer<typeof createUserSchema>;

export default function UsersPage() {
  const queryClient = useQueryClient();
  const { user: currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [offboardUserModal, setOffboardUserModal] = useState<any | null>(null);
  const [newOwnerId, setNewOwnerId] = useState('');
  const [offboardReason, setOffboardReason] = useState('');

  // Fetch Users
  const { data: usersData, isLoading: isLoadingUsers } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  // Fetch Teams for selection dropdown
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams
  });

  const users = usersData?.users || [];
  const teams = teamsData?.teams || [];

  // Active Opportunity Count Query for Offboarding User
  const { data: oppCountData, isLoading: isLoadingOppCount } = useQuery({
    queryKey: ['userOppCount', offboardUserModal?._id],
    queryFn: () => getUserActiveOppCount(offboardUserModal._id),
    enabled: !!offboardUserModal?._id
  });

  const activeOppCount = oppCountData?.count ?? 0;

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateUserFormValues>({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      name: '',
      email: '',
      password: '',
      role: 'telecaller',
      teamId: ''
    }
  });

  // Create User Mutation
  const createMutation = useMutation({
    mutationFn: createUser,
    onSuccess: (res) => {
      toast.success(res.message || 'User created successfully');
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddOpen(false);
      setFormError(null);
      reset();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create user.';
      setFormError(msg);
    }
  });

  // Toggle Active Status Mutation
  const toggleActiveMutation = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      updateUser(id, { isActive }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success('User status updated');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update status');
    }
  });

  // Offboard User Mutation
  const offboardMutation = useMutation({
    mutationFn: ({ id, newOwnerId, reason }: { id: string; newOwnerId: string; reason: string }) =>
      offboardUser(id, { newOwnerId, reason }),
    onSuccess: (res) => {
      toast.success(res.message);
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      setOffboardUserModal(null);
      setNewOwnerId('');
      setOffboardReason('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Offboarding failed');
    }
  });

  const onSubmit = (data: CreateUserFormValues) => {
    setFormError(null);
    createMutation.mutate(data);
  };

  const handleConfirmOffboard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOwnerId) {
      toast.error('Please select a replacement owner for reassignment.');
      return;
    }
    if (!offboardReason.trim()) {
      toast.error('Please enter an offboarding reason.');
      return;
    }

    offboardMutation.mutate({
      id: offboardUserModal._id,
      newOwnerId,
      reason: offboardReason.trim()
    });
  };

  const activeReplacementUsers = users.filter(
    (u: any) => u.isActive && u._id !== offboardUserModal?._id
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <span>👥 User Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              User & Employee Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage organization employees, role permissions, team assignments, and offboarding.
            </p>
          </div>

          <Button
            onClick={() => setIsAddOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs h-11 px-5 rounded-xl shadow-md shadow-indigo-600/20 min-h-[44px]"
          >
            <span>+ Add User</span>
          </Button>
        </div>

        {/* Users Container */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
        {isLoadingUsers ? (
          <div className="p-8 text-center text-xs text-slate-400">
            Loading user directory...
          </div>
        ) : users.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">
            No users found in database.
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block">
              <Table>
                <TableHeader>
                  <TableRow className="border-b border-slate-800 bg-[#0b0f19]">
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">ID</TableHead>
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">Employee Name</TableHead>
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">Email Address</TableHead>
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">Role</TableHead>
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">Assigned Team</TableHead>
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">Last Login</TableHead>
                    <TableHead className="text-slate-400 text-xs font-bold uppercase">Status & Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u: any) => (
                    <TableRow key={u._id} className="hover:bg-slate-800/40 border-b border-slate-800/40 transition-colors">
                      <TableCell className="font-mono text-xs text-indigo-400 font-bold">
                        {u.employeeId || 'SYS'}
                      </TableCell>
                      <TableCell className="font-bold text-white">
                        {u.name}
                        {u._id === currentUser?._id && (
                          <span className="ml-2 text-[10px] text-indigo-400 font-normal">(You)</span>
                        )}
                      </TableCell>
                      <TableCell className="font-mono text-xs text-slate-300">
                        {u.email}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getRoleBadgeVariant(u.role)} className="text-[10px] uppercase font-bold">
                          {u.role}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-slate-300">
                        {u.teamId?.name || <span className="text-slate-500 italic">Unassigned</span>}
                      </TableCell>
                      <TableCell className="text-xs font-mono">
                        {u.lastLogin ? (
                          <span className="text-indigo-300 font-semibold" title={new Date(u.lastLogin).toLocaleString()}>
                            ⏰ {new Date(u.lastLogin).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}{' '}
                            {new Date(u.lastLogin).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        ) : (
                          <span className="text-slate-500 italic">Never</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className={`text-[10px] font-semibold ${u.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                              {u.isActive ? 'Active' : 'Inactive'}
                            </span>
                            <Switch
                              checked={u.isActive}
                              onCheckedChange={(checked) => {
                                toggleActiveMutation.mutate({ id: u._id, isActive: checked });
                              }}
                              disabled={u._id === currentUser?._id}
                            />
                          </div>

                          {u.isActive && u._id !== currentUser?._id && (
                            <Button
                              onClick={() => {
                                setOffboardUserModal(u);
                                setNewOwnerId('');
                                setOffboardReason('');
                              }}
                              variant="outline"
                              className="h-8 px-2.5 text-[11px] font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg"
                            >
                              🚪 Offboard
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>

            {/* Mobile Stacked Card View (< md:) */}
            <div className="block md:hidden divide-y divide-slate-800/80">
              {users.map((u: any) => (
                <div key={u._id} className="p-4 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-1.5">
                        <span>{u.name}</span>
                        {u._id === currentUser?._id && <span className="text-[10px] text-indigo-400">(You)</span>}
                      </h4>
                      <p className="text-xs font-mono text-indigo-400">{u.employeeId || 'SYS'}</p>
                    </div>
                    <Badge variant={getRoleBadgeVariant(u.role)} className="text-[10px] uppercase font-bold">
                      {u.role}
                    </Badge>
                  </div>

                  <div className="text-xs text-slate-300 space-y-1 font-mono">
                    <p className="truncate">📧 {u.email}</p>
                    <p className="text-slate-400">🛡️ Pod: {u.teamId?.name || 'Unassigned'}</p>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-slate-800/60">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-semibold ${u.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {u.isActive ? 'Active' : 'Inactive'}
                      </span>
                      <Switch
                        checked={u.isActive}
                        onCheckedChange={(checked) => {
                          toggleActiveMutation.mutate({ id: u._id, isActive: checked });
                        }}
                        disabled={u._id === currentUser?._id}
                      />
                    </div>

                    {u.isActive && u._id !== currentUser?._id && (
                      <Button
                        onClick={() => {
                          setOffboardUserModal(u);
                          setNewOwnerId('');
                          setOffboardReason('');
                        }}
                        variant="outline"
                        className="h-8 px-2.5 text-[11px] font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-lg min-h-[36px]"
                      >
                        🚪 Offboard
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md bg-[#131c31] border-slate-800 text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-white">Add New Employee User</DialogTitle>
            <DialogDescription className="text-slate-400">
              Create an account for a new team member. Role & team dictate data access boundaries.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="name" className="text-xs text-slate-300">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Vikram Malhotra"
                {...register('name')}
                className="bg-[#0b0f19] border-slate-800 text-xs h-11 rounded-xl"
              />
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs text-slate-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="vikram@omvik.com"
                {...register('email')}
                className="bg-[#0b0f19] border-slate-800 text-xs h-11 rounded-xl"
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs text-slate-300">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
                className="bg-[#0b0f19] border-slate-800 text-xs h-11 rounded-xl"
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role" className="text-xs text-slate-300">Role</Label>
                <select
                  id="role"
                  {...register('role')}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="telecaller">Telecaller / Rep</option>
                  <option value="team_lead">Team Lead</option>
                  <option value="admin">Admin</option>
                  {isSuperAdmin && (
                    <option value="super_admin">Super Admin</option>
                  )}
                  <option value="marketing">Marketing</option>
                  <option value="finance">Finance</option>
                </select>
                {errors.role && (
                  <p className="text-xs text-red-400">{errors.role.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teamId" className="text-xs text-slate-300">Assigned Team (Optional)</Label>
                <select
                  id="teamId"
                  {...register('teamId')}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">No Team (Unassigned)</option>
                  {teams.map((t: any) => (
                    <option key={t._id} value={t._id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-slate-800/80">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="h-10 text-xs border-slate-800 rounded-xl"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="h-10 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl"
              >
                {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offboard User Confirmation & Reassignment Modal */}
      {offboardUserModal && (
        <Dialog open={!!offboardUserModal} onOpenChange={() => setOffboardUserModal(null)}>
          <DialogContent className="max-w-lg bg-[#131c31] border-red-500/30 text-slate-100">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2 text-base">
                <span>🚨 Offboard Employee: {offboardUserModal.name}</span>
              </DialogTitle>
              <DialogDescription className="text-slate-400 text-xs">
                Reassign all active opportunities, pipeline deals, and scheduled follow-ups to another active team member in one atomic action.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmOffboard} className="space-y-5 pt-2">
              <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800 space-y-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  Active Workload Audit
                </span>
                {isLoadingOppCount ? (
                  <p className="text-xs text-slate-500 animate-pulse">Calculating active workload...</p>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-white">
                      Active Opportunities Owned:
                    </span>
                    <Badge className={activeOppCount > 0 ? 'bg-indigo-500/20 text-indigo-300 font-mono text-xs font-bold' : 'bg-slate-800 text-slate-400 font-mono text-xs'}>
                      {activeOppCount} {activeOppCount === 1 ? 'deal' : 'deals'}
                    </Badge>
                  </div>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="replacementOwner" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Replacement Owner <span className="text-red-400">*</span>
                </Label>
                <select
                  id="replacementOwner"
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs text-slate-100 font-semibold focus:border-red-500 focus:outline-none"
                  required
                >
                  <option value="">-- Choose Active Employee / Rep --</option>
                  {activeReplacementUsers.map((u: any) => (
                    <option key={u._id} value={u._id}>
                      {u.name} ({u.employeeId || 'ID'}) — {u.role?.toUpperCase()}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="offboardReason" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Offboarding Reason <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="offboardReason"
                  placeholder="e.g. Resigned, Role reassignment, Department transfer..."
                  value={offboardReason}
                  onChange={(e) => setOffboardReason(e.target.value)}
                  className="bg-[#0b0f19] border-slate-800 text-xs h-11 text-slate-100 rounded-xl"
                  required
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOffboardUserModal(null)}
                  className="h-10 text-xs border-slate-800 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={offboardMutation.isPending}
                  className="h-10 text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-4 rounded-xl"
                >
                  {offboardMutation.isPending ? 'Reassigning...' : 'Confirm Offboard'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import { getUsers, createUser, updateUser, getUserActiveOppCount, offboardUser } from '../../api/users';
import { getTeams } from '../../api/teams';
import useAuthStore from '../../store/authStore';
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
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white">
            User & Employee Directory
          </h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage organization employees, role permissions, team assignments, and offboarding.
          </p>
        </div>

        <Button
          onClick={() => setIsAddOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs h-10 shadow-lg shadow-indigo-600/20"
        >
          <span>+ Add User</span>
        </Button>
      </div>

      {/* Users Table */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>ID</TableHead>
              <TableHead>Employee Name</TableHead>
              <TableHead>Email Address</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Assigned Team</TableHead>
              <TableHead>Status & Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-400">
                  Loading user directory...
                </TableCell>
              </TableRow>
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-xs text-slate-400">
                  No users found in database.
                </TableCell>
              </TableRow>
            ) : (
              users.map((u: any) => (
                <TableRow key={u._id} className="hover:bg-slate-800/50 transition-colors">
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
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {/* Active Status Switch */}
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

                      {/* One-Click Offboard Action Button */}
                      {u.isActive && u._id !== currentUser?._id && (
                        <Button
                          onClick={() => {
                            setOffboardUserModal(u);
                            setNewOwnerId('');
                            setOffboardReason('');
                          }}
                          variant="outline"
                          className="h-7 px-2.5 text-[11px] font-bold border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300"
                        >
                          🚪 Offboard
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add User Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Employee User</DialogTitle>
            <DialogDescription>
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
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="e.g. Vikram Malhotra"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-xs text-red-400">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="email">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="vikram@omvik.com"
                {...register('email')}
              />
              {errors.email && (
                <p className="text-xs text-red-400">{errors.email.message}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Temporary Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                {...register('password')}
              />
              {errors.password && (
                <p className="text-xs text-red-400">{errors.password.message}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  {...register('role')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
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
                <Label htmlFor="teamId">Assigned Team (Optional)</Label>
                <select
                  id="teamId"
                  {...register('teamId')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
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

            <DialogFooter className="pt-4 border-t border-slate-800">
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsAddOpen(false)}
                className="h-9 text-xs"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="h-9 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
              >
                {isSubmitting || createMutation.isPending ? 'Creating...' : 'Create Employee Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Offboard User Confirmation & Reassignment Modal */}
      {offboardUserModal && (
        <Dialog open={!!offboardUserModal} onOpenChange={() => setOffboardUserModal(null)}>
          <DialogContent className="max-w-lg border-red-500/30">
            <DialogHeader>
              <DialogTitle className="text-red-400 flex items-center gap-2">
                <span>🚨 Offboard Employee: {offboardUserModal.name}</span>
              </DialogTitle>
              <DialogDescription>
                Reassign all active opportunities, pipeline deals, and scheduled follow-ups to another active team member in one atomic action.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleConfirmOffboard} className="space-y-5 pt-2">
              {/* Active Opportunities Counter Badge */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-1">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
                  Active Workload Audit
                </span>
                {isLoadingOppCount ? (
                  <p className="text-xs text-slate-500 animate-pulse">Calculating active workload...</p>
                ) : (
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-white">
                      Active Opportunities Owned:
                    </span>
                    <Badge className={activeOppCount > 0 ? 'bg-indigo-500/20 text-indigo-300 font-mono text-sm font-bold' : 'bg-slate-800 text-slate-400 font-mono text-sm'}>
                      {activeOppCount} {activeOppCount === 1 ? 'deal' : 'deals'}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Replacement Owner Selector */}
              <div className="space-y-1.5">
                <Label htmlFor="replacementOwner" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Select Replacement Owner <span className="text-red-400">*</span>
                </Label>
                <select
                  id="replacementOwner"
                  value={newOwnerId}
                  onChange={(e) => setNewOwnerId(e.target.value)}
                  className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-slate-100 font-semibold focus:border-red-500 focus:outline-none"
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

              {/* Offboarding Reason Input */}
              <div className="space-y-1.5">
                <Label htmlFor="offboardReason" className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                  Offboarding Reason <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="offboardReason"
                  placeholder="e.g. Resigned, Role reassignment, Department transfer..."
                  value={offboardReason}
                  onChange={(e) => setOffboardReason(e.target.value)}
                  className="bg-slate-950 border-slate-800 text-xs h-11 text-slate-100"
                  required
                />
              </div>

              <DialogFooter className="pt-4 border-t border-slate-800">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setOffboardUserModal(null)}
                  className="h-10 text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={offboardMutation.isPending}
                  className="h-10 text-xs bg-red-600 hover:bg-red-500 text-white font-bold px-4"
                >
                  {offboardMutation.isPending ? 'Reassigning Work & Deactivating...' : 'Confirm One-Click Offboard'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}

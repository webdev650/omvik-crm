import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getUsers, createUser, updateUser } from '../../api/users';
import { getTeams } from '../../api/teams';
import useAuthStore from '../../store/authStore';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
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
import { AlertDialog } from '../../components/ui/alert-dialog';

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
  const [deactivateUserModal, setDeactivateUserModal] = useState<any | null>(null);

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
    onSuccess: () => {
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
    }
  });

  const onSubmit = (values: CreateUserFormValues) => {
    setFormError(null);
    createMutation.mutate(values);
  };

  const getRoleBadgeVariant = (role: string) => {
    switch (role) {
      case 'super_admin':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      case 'admin':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
      case 'team_lead':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'telecaller':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'marketing':
        return 'bg-pink-500/20 text-pink-400 border-pink-500/40';
      case 'finance':
        return 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            User & Employee Directory
          </h1>
          <p className="text-sm text-slate-400">
            Manage organization employees, role permissions, team assignments, and access status.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 self-start sm:self-auto"
        >
          <span className="text-lg leading-none">+</span> Add User
        </Button>
      </div>

      {/* Users Table Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
        <Table>
          <TableHeader className="bg-slate-950/60">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-semibold">Employee Name</TableHead>
              <TableHead className="text-slate-400 font-semibold">Email Address</TableHead>
              <TableHead className="text-slate-400 font-semibold">Role</TableHead>
              <TableHead className="text-slate-400 font-semibold">Assigned Team</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">Active Access</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingUsers ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="border-slate-800/60">
                  <TableCell colSpan={5}>
                    <div className="h-8 w-full bg-slate-800/40 rounded-xl animate-pulse" />
                  </TableCell>
                </TableRow>
              ))
            ) : users.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12">
                  <div className="max-w-sm mx-auto space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mx-auto">
                      👥
                    </div>
                    <h3 className="text-base font-bold text-slate-200">No Employees Found</h3>
                    <p className="text-xs text-slate-400">
                      Your employee directory is empty. Add your first telecaller or manager to assign leads and manage access.
                    </p>
                    <Button
                      onClick={() => {
                        setFormError(null);
                        setIsAddOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
                    >
                      + Add First User
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              users.map((u: any) => (
                <TableRow key={u._id} className="border-slate-800/60 hover:bg-slate-850/50">
                  <TableCell className="font-semibold text-slate-200">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {u.name?.charAt(0).toUpperCase() || 'U'}
                      </div>
                      <div>
                        <p>{u.name}</p>
                        <p className="text-[10px] text-slate-500 font-mono sm:hidden">{u.email}</p>
                      </div>
                    </div>
                  </TableCell>

                  <TableCell className="text-slate-400 text-sm">{u.email}</TableCell>

                  <TableCell>
                    <Badge className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider border ${getRoleBadgeVariant(u.role)}`}>
                      {u.role?.replace('_', ' ')}
                    </Badge>
                  </TableCell>

                  <TableCell className="text-slate-300 text-sm">
                    {u.teamId?.name ? (
                      <span className="inline-flex items-center gap-1.5 font-medium text-slate-200">
                        <span className="w-2 h-2 rounded-full bg-indigo-400" />
                        {u.teamId.name}
                      </span>
                    ) : (
                      <span className="text-slate-500 italic text-xs">Unassigned</span>
                    )}
                  </TableCell>

                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-2">
                      <span className={`text-xs font-medium ${u.isActive ? 'text-emerald-400' : 'text-slate-500'}`}>
                        {u.isActive ? 'Active' : 'Disabled'}
                      </span>
                      <Switch
                        checked={u.isActive !== false}
                        onCheckedChange={(checked) => {
                          if (!checked) {
                            setDeactivateUserModal(u);
                          } else {
                            toggleActiveMutation.mutate({ id: u._id, isActive: true });
                          }
                        }}
                      />
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
                  {/* Super Admin option strictly restricted to existing Super Admin callers */}
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

            <DialogFooter>
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsAddOpen(false)}
                className="text-xs text-slate-400"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isSubmitting || createMutation.isPending}
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold"
              >
                {createMutation.isPending ? 'Creating User...' : 'Create Account'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Deactivate Account Confirmation Dialog */}
      <AlertDialog
        open={!!deactivateUserModal}
        onOpenChange={() => setDeactivateUserModal(null)}
        title="Deactivate Employee Account?"
        description={`Are you sure you want to deactivate ${deactivateUserModal?.name} (${deactivateUserModal?.email})? This employee will be immediately blocked from logging into the CRM.`}
        confirmLabel="Deactivate Account"
        variant="destructive"
        onConfirm={() => {
          if (deactivateUserModal) {
            toggleActiveMutation.mutate({ id: deactivateUserModal._id, isActive: false });
            setDeactivateUserModal(null);
          }
        }}
        isPending={toggleActiveMutation.isPending}
      />
    </div>
  );
}

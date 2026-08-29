import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ShieldCheck, Plus, Crown, Users, Building2 } from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getTeams, createTeam, updateTeam } from '../../api/teams';
import { getUsers } from '../../api/users';
import { getProjects } from '../../api/projects';
import { formatProjectName } from '../../utils/formatProjectName';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { Badge } from '../../components/ui/badge';
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

const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional(),
  teamLeadId: z.string().optional(),
  projectId: z.string().optional()
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

export default function TeamsPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // Fetch Teams
  const { data: teamsData, isLoading: isLoadingTeams } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams
  });

  // Fetch Users for team lead and member selections
  const { data: usersData } = useQuery({
    queryKey: ['users'],
    queryFn: getUsers
  });

  // Fetch Projects for project assignment dropdown (flat list with hierarchy labels)
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'flat'],
    queryFn: () => getProjects({ flat: true })
  });

  const teams = teamsData?.teams || [];
  const users = usersData?.users || [];
  const projects = projectsData?.projects || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
      teamLeadId: '',
      projectId: ''
    }
  });

  // Create Team Mutation
  const createMutation = useMutation({
    mutationFn: (values: CreateTeamFormValues) =>
      createTeam({ ...values, memberIds: selectedMembers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddOpen(false);
      setFormError(null);
      setSelectedMembers([]);
      reset();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create team.';
      setFormError(msg);
    }
  });

  const onSubmit = (values: CreateTeamFormValues) => {
    setFormError(null);
    createMutation.mutate(values);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-[11px] font-bold uppercase tracking-wider">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sales Pods & Teams</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Sales Teams & Pods Directory
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Structure organizational telecaller pods, assign team leads, and map sales teams to real-estate projects.
            </p>
          </div>

          <Button
            onClick={() => {
              setFormError(null);
              setSelectedMembers([]);
              setIsAddOpen(true);
            }}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 h-11 px-5 rounded-xl shadow-md shadow-indigo-600/20 min-h-[44px]"
          >
            <Plus className="w-4 h-4" />
            <span>Create Team Pod</span>
          </Button>
        </div>

        {/* Teams Table Card */}
        <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
          <Table>
            <TableHeader className="bg-[#0b0f19]">
              <TableRow className="border-b border-slate-800">
                <TableHead className="text-slate-400 font-semibold text-xs">Team Name & Description</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs">Team Lead</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs">Assigned Project</TableHead>
                <TableHead className="text-slate-400 font-semibold text-xs text-right">Team Members</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTeams ? (
                [1, 2, 3, 4, 5].map((i) => (
                  <TableRow key={i} className="border-b border-slate-800/40">
                    <TableCell colSpan={4}>
                      <div className="h-10 w-full bg-slate-800/40 rounded-xl animate-pulse" />
                    </TableCell>
                  </TableRow>
                ))
              ) : teams.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={4} className="text-center py-12">
                    <div className="max-w-sm mx-auto space-y-3">
                      <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto">
                        🛡️
                      </div>
                      <h3 className="text-sm font-bold text-slate-200">No Sales Pods Found</h3>
                      <p className="text-xs text-slate-400">
                        Create your first telecaller team pod, assign a Team Lead, and target specific property projects.
                      </p>
                      <Button
                        onClick={() => {
                          setFormError(null);
                          setSelectedMembers([]);
                          setIsAddOpen(true);
                        }}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 rounded-xl"
                      >
                        + Create First Team Pod
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                teams.map((t: any) => (
                  <TableRow key={t._id} className="border-b border-slate-800/40 hover:bg-slate-800/40">
                    <TableCell className="font-semibold text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-xs">
                          🛡️
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-100">{t.name}</p>
                          <p className="text-[10px] text-slate-400">{t.description || 'General Sales Pod'}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-slate-300 text-xs font-medium">
                      {t.teamLeadId ? (
                        <span className="inline-flex items-center gap-1.5 font-bold text-amber-300">
                          👑 {t.teamLeadId.name || t.teamLeadId.email}
                        </span>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No Lead Assigned</span>
                      )}
                    </TableCell>

                    <TableCell className="text-slate-300 text-xs">
                      {t.projectId ? (
                        <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px]">
                          🏢 {t.projectId.name || t.projectId.code || 'Project'}
                        </Badge>
                      ) : (
                        <span className="text-slate-500 italic text-xs">All Projects</span>
                      )}
                    </TableCell>

                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <Badge variant="outline" className="bg-slate-800 text-slate-300 border-slate-700 text-[10px]">
                          👥 {t.memberIds?.length || 0} Members
                        </Badge>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>

        {/* Add Team Dialog */}
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Sales Team / Pod</DialogTitle>
              <DialogDescription>
                Group telecallers under a Team Lead and optionally assign them to a dedicated property project.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
              {formError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                  ⚠️ {formError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="name">Team / Pod Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Executive Sales Pod Alpha"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="teamLeadId">Team Lead</Label>
                  <select
                    id="teamLeadId"
                    {...register('teamLeadId')}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">Select Team Lead...</option>
                    {users.map((u: any) => (
                      <option key={u._id} value={u._id}>
                        {u.name} ({u.role})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="projectId">Target Project</Label>
                  <select
                    id="projectId"
                    {...register('projectId')}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">All Projects / Unassigned</option>
                    {projects.map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {formatProjectName(p)} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Pod Description (Optional)</Label>
                <Input
                  id="description"
                  placeholder="e.g. Responsible for luxury apartment conversions in Bhubaneswar"
                  {...register('description')}
                />
              </div>

              {/* Member Selection Checkbox List */}
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold text-slate-300">
                  Select Initial Team Members ({selectedMembers.length} selected)
                </Label>
                <div className="max-h-40 overflow-y-auto rounded-xl border border-slate-800 bg-[#0b0f19] p-2 space-y-1">
                  {users.map((u: any) => (
                    <label
                      key={u._id}
                      className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-slate-900 cursor-pointer text-xs text-slate-200"
                    >
                      <input
                        type="checkbox"
                        checked={selectedMembers.includes(u._id)}
                        onChange={() => toggleMemberSelection(u._id)}
                        className="rounded border-slate-800 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className="font-semibold">{u.name}</span>
                      <span className="text-[10px] text-slate-500">({u.role})</span>
                    </label>
                  ))}
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  {createMutation.isPending ? 'Creating Team...' : 'Create Team'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

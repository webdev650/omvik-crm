import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Building2,
  ShieldCheck,
  Plus,
  CornerDownRight,
  Crown,
  Users,
  Layers,
  Sparkles
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import { getProjects, createProject } from '../../api/projects';
import { getTeams, createTeam } from '../../api/teams';
import { getUsers } from '../../api/users';
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

// Schemas
const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  parentProject: z.string().optional(),
  builder: z.string().optional(),
  location: z.string().min(1, 'Please select or enter a location'),
  propertyType: z.string().min(1, 'Please select a property type'),
  status: z.string().min(1, 'Please select a status'),
  description: z.string().optional()
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

const createTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional(),
  teamLeadId: z.string().optional(),
  projectId: z.string().optional()
});

type CreateTeamFormValues = z.infer<typeof createTeamSchema>;

interface ProjectsAndTeamsPageProps {
  initialTab?: 'projects' | 'teams';
}

export default function ProjectsAndTeamsPage({ initialTab = 'projects' }: ProjectsAndTeamsPageProps) {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Tab state derived from URL or prop
  const currentTab = searchParams.get('tab') === 'teams' || initialTab === 'teams' ? 'teams' : 'projects';
  const setTab = (tab: 'projects' | 'teams') => {
    setSearchParams({ tab });
  };

  // Modals state
  const [isAddProjectOpen, setIsAddProjectOpen] = useState(false);
  const [projectFormError, setProjectFormError] = useState<string | null>(null);

  const [isAddTeamOpen, setIsAddTeamOpen] = useState(false);
  const [teamFormError, setTeamFormError] = useState<string | null>(null);
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  // ── DATA QUERIES ──────────────────────────────────────────────────────────
  // Fetch Projects Hierarchy
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects', 'nested'],
    queryFn: () => getProjects()
  });

  // Fetch Flat Projects list
  const { data: flatProjectsData } = useQuery({
    queryKey: ['projects', 'flat'],
    queryFn: () => getProjects({ flat: true })
  });

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

  const projects = projectsData?.projects || [];
  const flatProjects = flatProjectsData?.projects || [];
  const teams = teamsData?.teams || [];
  const users = usersData?.users || [];

  // Helper to find assigned teams for a project
  const getAssignedTeams = (projectId: string) => {
    return teams.filter(
      (t: any) => t.projectId === projectId || t.projectId?._id === projectId
    );
  };

  // ── FORMS & MUTATIONS ──────────────────────────────────────────────────────
  // Project Form
  const {
    register: registerProject,
    handleSubmit: handleSubmitProject,
    reset: resetProject,
    formState: { errors: projectErrors, isSubmitting: isSubmittingProject }
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      code: '',
      parentProject: '',
      builder: 'Omvik Realcon',
      location: 'Bhubaneswar',
      propertyType: 'Apartment',
      status: 'active',
      description: ''
    }
  });

  const createProjectMutation = useMutation({
    mutationFn: (values: CreateProjectFormValues) =>
      createProject({
        ...values,
        parentProject: values.parentProject || null
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsAddProjectOpen(false);
      setProjectFormError(null);
      resetProject();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create project.';
      setProjectFormError(msg);
    }
  });

  const onProjectSubmit = (values: CreateProjectFormValues) => {
    setProjectFormError(null);
    createProjectMutation.mutate(values);
  };

  // Team Form
  const {
    register: registerTeam,
    handleSubmit: handleSubmitTeam,
    reset: resetTeam,
    formState: { errors: teamErrors, isSubmitting: isSubmittingTeam }
  } = useForm<CreateTeamFormValues>({
    resolver: zodResolver(createTeamSchema),
    defaultValues: {
      name: '',
      description: '',
      teamLeadId: '',
      projectId: ''
    }
  });

  const createTeamMutation = useMutation({
    mutationFn: (values: CreateTeamFormValues) =>
      createTeam({ ...values, memberIds: selectedMembers }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['teams'] });
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setIsAddTeamOpen(false);
      setTeamFormError(null);
      setSelectedMembers([]);
      resetTeam();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create team.';
      setTeamFormError(msg);
    }
  });

  const onTeamSubmit = (values: CreateTeamFormValues) => {
    setTeamFormError(null);
    createTeamMutation.mutate(values);
  };

  const toggleMemberSelection = (userId: string) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getStatusBadgeVariant = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40';
      case 'upcoming':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/40';
      case 'completed':
        return 'bg-indigo-500/20 text-indigo-400 border-indigo-500/40';
      case 'sold_out':
        return 'bg-purple-500/20 text-purple-400 border-purple-500/40';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Unified Hero Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Layers className="w-3.5 h-3.5" />
              <span>Projects & Sales Pods Hub</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Projects & Sales Pods Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Manage real-estate property catalogs, sub-project hierarchies, and sales team assignments in one unified location.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
            <Button
              onClick={() => {
                setProjectFormError(null);
                setIsAddProjectOpen(true);
              }}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 h-11 px-4 rounded-xl shadow-md shadow-indigo-600/20 min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Project</span>
            </Button>

            <Button
              onClick={() => {
                setTeamFormError(null);
                setSelectedMembers([]);
                setIsAddTeamOpen(true);
              }}
              variant="outline"
              className="border-slate-700 bg-slate-800/80 text-amber-300 hover:bg-slate-800 font-bold text-xs gap-1.5 h-11 px-4 rounded-xl min-h-[44px]"
            >
              <ShieldCheck className="w-4 h-4 text-amber-400" />
              <span>Create Sales Pod</span>
            </Button>
          </div>
        </div>

        {/* Tab Selector Bar */}
        <div className="flex items-center gap-2 border-b border-slate-800/80 pb-3">
          <button
            type="button"
            onClick={() => setTab('projects')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'projects'
                ? 'bg-indigo-600/20 text-indigo-300 border border-indigo-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <Building2 className="w-4 h-4 text-indigo-400" />
            <span>Real-Estate Projects Catalog</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono">
              {projects.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setTab('teams')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              currentTab === 'teams'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/50'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-amber-400" />
            <span>Teams & Sales Pods</span>
            <span className="ml-1 px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-mono">
              {teams.length}
            </span>
          </button>
        </div>

        {/* ── TAB 1: REAL-ESTATE PROJECTS CATALOG ──────────────────────────── */}
        {currentTab === 'projects' && (
          <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] shadow-sm overflow-hidden">
            <Table>
              <TableHeader className="bg-[#0b0f19]">
                <TableRow className="border-b border-slate-800">
                  <TableHead className="text-slate-400 font-semibold text-xs">Project Hierarchy & Code</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Builder / Developer</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Location & Type</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs">Status</TableHead>
                  <TableHead className="text-slate-400 font-semibold text-xs text-right">Assigned Teams</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoadingProjects ? (
                  [1, 2, 3, 4, 5].map((i) => (
                    <TableRow key={i} className="border-b border-slate-800/40">
                      <TableCell colSpan={5}>
                        <div className="h-10 w-full bg-slate-800/40 rounded-xl animate-pulse" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : projects.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-12">
                      <div className="max-w-sm mx-auto space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mx-auto">
                          🏢
                        </div>
                        <h3 className="text-sm font-bold text-slate-200">No Real-Estate Projects Found</h3>
                        <p className="text-xs text-slate-400">
                          Create your first project development catalog to map property leads, inventory, and sales pod routing.
                        </p>
                        <Button
                          onClick={() => {
                            setProjectFormError(null);
                            setIsAddProjectOpen(true);
                          }}
                          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 rounded-xl"
                        >
                          + Add First Project
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  projects.map((p: any) => {
                    const assignedTeams = getAssignedTeams(p._id);
                    const subProjects = p.subProjects || [];
                    return (
                      <React.Fragment key={p._id}>
                        {/* Top-Level Parent Project Row */}
                        <TableRow className="border-b border-slate-800/40 hover:bg-slate-800/40">
                          <TableCell className="font-semibold text-slate-200">
                            <div className="flex items-center gap-3">
                              <div className="w-9 h-9 rounded-xl bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs">
                                {p.code || 'PRJ'}
                              </div>
                              <div>
                                <div className="flex items-center gap-2">
                                  <p className="text-xs font-bold text-slate-100">{p.name}</p>
                                  {subProjects.length > 0 && (
                                    <span className="px-1.5 py-0.2 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold">
                                      {subProjects.length} SUB-PROJECTS
                                    </span>
                                  )}
                                </div>
                                <p className="text-[10px] text-slate-400 font-mono">CODE: {p.code} | Top-Level Project</p>
                              </div>
                            </div>
                          </TableCell>

                          <TableCell className="text-slate-300 text-xs font-medium">
                            {p.builder || 'Omvik Realcon'}
                          </TableCell>

                          <TableCell className="text-slate-300 text-xs">
                            <div className="space-y-0.5">
                              <p className="font-medium text-slate-200">{p.location || 'Bhubaneswar'}</p>
                              <p className="text-[10px] text-slate-400">{p.propertyType || 'Apartment'}</p>
                            </div>
                          </TableCell>

                          <TableCell>
                            <Badge className={`text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider border ${getStatusBadgeVariant(p.status || 'active')}`}>
                              {(p.status || 'active').replace('_', ' ')}
                            </Badge>
                          </TableCell>

                          <TableCell className="text-right">
                            {assignedTeams.length > 0 ? (
                              <div className="flex flex-wrap items-center justify-end gap-1.5">
                                {assignedTeams.map((t: any) => (
                                  <span key={t._id} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold">
                                    🛡️ {t.name}
                                  </span>
                                ))}
                              </div>
                            ) : (
                              <span className="text-slate-500 italic text-xs">No Team Assigned</span>
                            )}
                          </TableCell>
                        </TableRow>

                        {/* Nested Sub-Projects Rows (Indented under Parent) */}
                        {subProjects.map((sub: any) => {
                          const subAssignedTeams = getAssignedTeams(sub._id);
                          return (
                            <TableRow key={sub._id} className="bg-slate-900/50 border-b border-slate-800/40 hover:bg-slate-800/50">
                              <TableCell className="font-semibold text-slate-200 pl-10">
                                <div className="flex items-center gap-3">
                                  <CornerDownRight className="w-4 h-4 text-purple-400 shrink-0" />
                                  <div className="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center font-bold text-purple-400 text-[10px]">
                                    {sub.code || 'SUB'}
                                  </div>
                                  <div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-xs font-bold text-slate-100">{sub.name}</p>
                                      <span className="px-1.5 py-0.2 rounded bg-purple-500/10 border border-purple-500/20 text-purple-300 text-[9px] font-mono font-bold">
                                        SUB-PROJECT
                                      </span>
                                    </div>
                                    <p className="text-[10px] text-slate-400 font-mono">
                                      CODE: {sub.code} | Parent: {p.name}
                                    </p>
                                  </div>
                                </div>
                              </TableCell>

                              <TableCell className="text-slate-300 text-xs font-medium">
                                {sub.builder || p.builder || 'Omvik Realcon'}
                              </TableCell>

                              <TableCell className="text-slate-300 text-xs">
                                <div className="space-y-0.5">
                                  <p className="font-medium text-slate-200">{sub.location || p.location || 'Bhubaneswar'}</p>
                                  <p className="text-[10px] text-slate-400">{sub.propertyType || 'Apartment'}</p>
                                </div>
                              </TableCell>

                              <TableCell>
                                <Badge className={`text-[10px] px-2.5 py-0.5 font-bold uppercase tracking-wider border ${getStatusBadgeVariant(sub.status || 'active')}`}>
                                  {(sub.status || 'active').replace('_', ' ')}
                                </Badge>
                              </TableCell>

                              <TableCell className="text-right">
                                {subAssignedTeams.length > 0 ? (
                                  <div className="flex flex-wrap items-center justify-end gap-1.5">
                                    {subAssignedTeams.map((t: any) => (
                                      <span key={t._id} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-amber-300 text-xs font-semibold">
                                        🛡️ {t.name}
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-slate-500 italic text-xs">No Team Assigned</span>
                                )}
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </React.Fragment>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* ── TAB 2: TEAMS & SALES PODS DIRECTORY ─────────────────────────── */}
        {currentTab === 'teams' && (
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
                            setTeamFormError(null);
                            setSelectedMembers([]);
                            setIsAddTeamOpen(true);
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
        )}

        {/* ── ADD PROJECT DIALOG ───────────────────────────────────────────── */}
        <Dialog open={isAddProjectOpen} onOpenChange={setIsAddProjectOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Real-Estate Project / Sub-Project</DialogTitle>
              <DialogDescription>
                Create a top-level property development or nest a sub-project (tower/phase) under an existing parent project.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitProject(onProjectSubmit)} className="space-y-4 pt-2">
              {projectFormError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                  ⚠️ {projectFormError}
                </div>
              )}

              {/* Parent Project Dropdown */}
              <div className="space-y-1.5">
                <Label htmlFor="parentProject">Parent Project (Optional Sub-Project Mapping)</Label>
                <select
                  id="parentProject"
                  {...registerProject('parentProject')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="">None (Top-Level Independent Project)</option>
                  {flatProjects.map((p: any) => (
                    <option key={p._id} value={p._id}>
                      {formatProjectName(p)}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-500">
                  Select a parent project if this is a sub-project, tower, or phase development.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="name">Project / Sub-Project Name</Label>
                  <Input
                    id="name"
                    placeholder="e.g. Tower A / Phase 1"
                    {...registerProject('name')}
                  />
                  {projectErrors.name && (
                    <p className="text-xs text-red-400">{projectErrors.name.message}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="code">Unique Code</Label>
                  <Input
                    id="code"
                    placeholder="e.g. OGR-TWA"
                    {...registerProject('code')}
                  />
                  {projectErrors.code && (
                    <p className="text-xs text-red-400">{projectErrors.code.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="builder">Builder / Developer</Label>
                  <Input
                    id="builder"
                    placeholder="e.g. Omvik Realcon Pvt Ltd"
                    {...registerProject('builder')}
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="location">City / Location</Label>
                  <select
                    id="location"
                    {...registerProject('location')}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Bhubaneswar">Bhubaneswar</option>
                    <option value="Cuttack">Cuttack</option>
                    <option value="Puri">Puri</option>
                    <option value="Sambalpur">Sambalpur</option>
                    <option value="Rourkela">Rourkela</option>
                  </select>
                  {projectErrors.location && (
                    <p className="text-xs text-red-400">{projectErrors.location.message}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="propertyType">Property Type</Label>
                  <select
                    id="propertyType"
                    {...registerProject('propertyType')}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="Apartment">Residential Apartment</option>
                    <option value="Township">Integrated Township</option>
                    <option value="Villa">Luxury Villa</option>
                    <option value="Plot">Plotted Development</option>
                    <option value="Commercial">Commercial / Office</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="status">Development Status</Label>
                  <select
                    id="status"
                    {...registerProject('status')}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="active">Active Sales</option>
                    <option value="upcoming">Upcoming Launch</option>
                    <option value="completed">Completed / Delivered</option>
                    <option value="sold_out">Sold Out</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Short Description (Optional)</Label>
                <textarea
                  id="description"
                  rows={2}
                  placeholder="Overview of project amenities, phase details, or pricing range..."
                  {...registerProject('description')}
                  className="w-full rounded-xl border border-slate-800 bg-[#0b0f19] p-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setIsAddProjectOpen(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingProject || createProjectMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  {createProjectMutation.isPending ? 'Creating Project...' : 'Create Project'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>

        {/* ── CREATE TEAM POD DIALOG ────────────────────────────────────────── */}
        <Dialog open={isAddTeamOpen} onOpenChange={setIsAddTeamOpen}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <DialogTitle>Create Sales Team / Pod</DialogTitle>
              <DialogDescription>
                Group telecallers under a Team Lead and optionally assign them to a dedicated property project.
              </DialogDescription>
            </DialogHeader>

            <form onSubmit={handleSubmitTeam(onTeamSubmit)} className="space-y-4 pt-2">
              {teamFormError && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                  ⚠️ {teamFormError}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="teamName">Team / Pod Name</Label>
                <Input
                  id="teamName"
                  placeholder="e.g. Executive Sales Pod Alpha"
                  {...registerTeam('name')}
                />
                {teamErrors.name && (
                  <p className="text-xs text-red-400">{teamErrors.name.message}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="teamLeadId">Team Lead</Label>
                  <select
                    id="teamLeadId"
                    {...registerTeam('teamLeadId')}
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
                    {...registerTeam('projectId')}
                    className="flex h-10 w-full rounded-xl border border-slate-800 bg-[#0b0f19] px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="">All Projects / Unassigned</option>
                    {flatProjects.map((p: any) => (
                      <option key={p._id} value={p._id}>
                        {formatProjectName(p)} ({p.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="teamDescription">Pod Description (Optional)</Label>
                <Input
                  id="teamDescription"
                  placeholder="e.g. Responsible for luxury apartment conversions in Bhubaneswar"
                  {...registerTeam('description')}
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
                  onClick={() => setIsAddTeamOpen(false)}
                  className="text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isSubmittingTeam || createTeamMutation.isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl"
                >
                  {createTeamMutation.isPending ? 'Creating Team...' : 'Create Team'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}

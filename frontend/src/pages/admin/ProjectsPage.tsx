import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { getProjects, createProject } from '../../api/projects';
import { getTeams } from '../../api/teams';
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

const createProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  code: z.string().min(2, 'Code must be at least 2 characters'),
  builder: z.string().optional(),
  location: z.string().min(1, 'Please select or enter a location'),
  propertyType: z.string().min(1, 'Please select a property type'),
  status: z.string().min(1, 'Please select a status'),
  description: z.string().optional()
});

type CreateProjectFormValues = z.infer<typeof createProjectSchema>;

export default function ProjectsPage() {
  const queryClient = useQueryClient();
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Fetch Projects
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects
  });

  // Fetch Teams to display assigned teams for each project
  const { data: teamsData } = useQuery({
    queryKey: ['teams'],
    queryFn: getTeams
  });

  const projects = projectsData?.projects || [];
  const teams = teamsData?.teams || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<CreateProjectFormValues>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: '',
      code: '',
      builder: 'Omvik Realcon',
      location: 'Bhubaneswar',
      propertyType: 'Apartment',
      status: 'active',
      description: ''
    }
  });

  // Create Project Mutation
  const createMutation = useMutation({
    mutationFn: createProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      setIsAddOpen(false);
      setFormError(null);
      reset();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to create project.';
      setFormError(msg);
    }
  });

  const onSubmit = (values: CreateProjectFormValues) => {
    setFormError(null);
    createMutation.mutate(values);
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

  // Helper to find assigned teams for a project
  const getAssignedTeams = (projectId: string) => {
    return teams.filter(
      (t: any) => t.projectId === projectId || t.projectId?._id === projectId
    );
  };

  return (
    <div className="space-y-6 p-6 max-w-7xl mx-auto">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black text-slate-100 tracking-tight">
            Real Estate Projects Catalog
          </h1>
          <p className="text-sm text-slate-400">
            Manage residential & commercial project developments, status, location, and sales team assignments.
          </p>
        </div>

        <Button
          onClick={() => {
            setFormError(null);
            setIsAddOpen(true);
          }}
          className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold gap-2 self-start sm:self-auto"
        >
          <span className="text-lg leading-none">+</span> Add Project
        </Button>
      </div>

      {/* Projects Table Card */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/90 shadow-2xl overflow-hidden backdrop-blur-xl">
        <Table>
          <TableHeader className="bg-slate-950/60">
            <TableRow className="border-slate-800 hover:bg-transparent">
              <TableHead className="text-slate-400 font-semibold">Project Name & Code</TableHead>
              <TableHead className="text-slate-400 font-semibold">Builder / Developer</TableHead>
              <TableHead className="text-slate-400 font-semibold">Location & Type</TableHead>
              <TableHead className="text-slate-400 font-semibold">Status</TableHead>
              <TableHead className="text-slate-400 font-semibold text-right">Assigned Teams</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoadingProjects ? (
              [1, 2, 3, 4, 5].map((i) => (
                <TableRow key={i} className="border-slate-800/60">
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
                    <h3 className="text-base font-bold text-slate-200">No Real-Estate Projects Found</h3>
                    <p className="text-xs text-slate-400">
                      Create your first project development catalog to map property leads, inventory, and sales pod routing.
                    </p>
                    <Button
                      onClick={() => {
                        setFormError(null);
                        setIsAddOpen(true);
                      }}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5"
                    >
                      + Add First Project
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              projects.map((p: any) => {
                const assignedTeams = getAssignedTeams(p._id);
                return (
                  <TableRow key={p._id} className="border-slate-800/60 hover:bg-slate-850/50">
                    <TableCell className="font-semibold text-slate-200">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-600/30 to-blue-600/30 border border-indigo-500/30 flex items-center justify-center font-bold text-indigo-400 text-xs">
                          {p.code || 'PRJ'}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-100">{p.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">CODE: {p.code}</p>
                        </div>
                      </div>
                    </TableCell>

                    <TableCell className="text-slate-300 text-sm font-medium">
                      {p.builder || 'Omvik Realcon'}
                    </TableCell>

                    <TableCell className="text-slate-300 text-sm">
                      <div className="space-y-0.5">
                        <p className="font-medium text-slate-200">{p.location || 'Bhubaneswar'}</p>
                        <p className="text-[11px] text-slate-400">{p.propertyType || 'Apartment'}</p>
                      </div>
                    </TableCell>

                    <TableCell>
                      <Badge className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider border ${getStatusBadgeVariant(p.status || 'active')}`}>
                        {(p.status || 'active').replace('_', ' ')}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-right">
                      {assignedTeams.length > 0 ? (
                        <div className="flex flex-wrap items-center justify-end gap-1.5">
                          {assignedTeams.map((t: any) => (
                            <span key={t._id} className="px-2 py-0.5 rounded-md bg-slate-800 border border-slate-700 text-slate-300 text-xs font-semibold">
                              👥 {t.name}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-slate-500 italic text-xs">No Team Assigned</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })
            )}
          </TableBody>
        </Table>
      </div>

      {/* Add Project Dialog */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Add New Real-Estate Project</DialogTitle>
            <DialogDescription>
              Add a property project development to enable lead routing, site visits, and inventory mapping.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">
            {formError && (
              <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold">
                ⚠️ {formError}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="name">Project Name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Omvik Grand Residency"
                  {...register('name')}
                />
                {errors.name && (
                  <p className="text-xs text-red-400">{errors.name.message}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="code">Unique Code</Label>
                <Input
                  id="code"
                  placeholder="e.g. OGR"
                  {...register('code')}
                />
                {errors.code && (
                  <p className="text-xs text-red-400">{errors.code.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="builder">Builder / Developer</Label>
                <Input
                  id="builder"
                  placeholder="e.g. Omvik Realcon Pvt Ltd"
                  {...register('builder')}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="location">City / Location</Label>
                <select
                  id="location"
                  {...register('location')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="Bhubaneswar">Bhubaneswar</option>
                  <option value="Cuttack">Cuttack</option>
                  <option value="Puri">Puri</option>
                  <option value="Sambalpur">Sambalpur</option>
                  <option value="Rourkela">Rourkela</option>
                </select>
                {errors.location && (
                  <p className="text-xs text-red-400">{errors.location.message}</p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="propertyType">Property Type</Label>
                <select
                  id="propertyType"
                  {...register('propertyType')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
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
                  {...register('status')}
                  className="flex h-10 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-3 py-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
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
                {...register('description')}
                className="w-full rounded-xl border border-slate-800 bg-slate-950/60 p-2.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
              />
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
                {createMutation.isPending ? 'Creating Project...' : 'Create Project'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

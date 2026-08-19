import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { submitLead, overrideDuplicateLead } from '../../api/opportunities';
import { getProjects } from '../../api/projects';
import useAuthStore from '../../store/authStore';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../../components/ui/card';
import { Input } from '../../components/ui/input';
import { Button } from '../../components/ui/button';
import { Label } from '../../components/ui/label';
import { AlertDialog } from '../../components/ui/alert-dialog';

const newLeadSchema = z.object({
  rawName: z.string().min(2, 'Full name must be at least 2 characters'),
  rawMobile: z.string().min(10, 'Mobile number must be at least 10 digits'),
  project: z.string().min(1, 'Please select a project'),
  source: z.string().optional()
});

type NewLeadFormValues = z.infer<typeof newLeadSchema>;

export default function NewLeadForm() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const isSuperAdmin = user?.role === 'super_admin';

  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [duplicateData, setDuplicateData] = useState<{
    customerId: string;
    projectId: string;
    ownerName: string;
    stage: string;
  } | null>(null);

  const [showOverrideForm, setShowOverrideForm] = useState(false);
  const [overrideReason, setOverrideReason] = useState('');
  const [overrideError, setOverrideError] = useState<string | null>(null);
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  // Fetch Projects for Dropdown Selection
  const { data: projectsData, isLoading: isLoadingProjects } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects
  });

  const projects = projectsData?.projects || [];

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting }
  } = useForm<NewLeadFormValues>({
    resolver: zodResolver(newLeadSchema),
    defaultValues: {
      rawName: '',
      rawMobile: '',
      project: '',
      source: 'website'
    }
  });

  const mutation = useMutation({
    mutationFn: submitLead,
    onSuccess: (data) => {
      setErrorMessage(null);
      setDuplicateData(null);
      setShowOverrideForm(false);
      const ownerName = data.opportunity?.owner?.name || 'assigned agent';
      setSuccessMessage(
        `Lead created successfully! Auto-assigned to ${ownerName}.`
      );
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      reset();
    },
    onError: (error: any) => {
      setSuccessMessage(null);
      if (error.response?.status === 409) {
        const detail = error.response.data;
        const ownerName =
          detail.owner?.name ||
          detail.existingOpportunity?.owner?.name ||
          'another team member';
        const stage =
          detail.stage || detail.existingOpportunity?.stage || 'active';
        const customerId = detail.customer?._id || detail.existingOpportunity?.customer;
        const projectId = detail.existingOpportunity?.project;

        setErrorMessage(
          `Already owned by ${ownerName} — stage: ${stage}`
        );

        if (customerId && projectId) {
          setDuplicateData({ customerId, projectId, ownerName, stage });
        }
      } else {
        const msg =
          error.response?.data?.message || 'Failed to submit lead. Please try again.';
        setErrorMessage(msg);
      }
    }
  });

  const overrideMutation = useMutation({
    mutationFn: overrideDuplicateLead,
    onSuccess: (data) => {
      setErrorMessage(null);
      setDuplicateData(null);
      setShowOverrideForm(false);
      setOverrideReason('');
      setOverrideError(null);
      const ownerName = data.opportunity?.owner?.name || 'assigned agent';
      setSuccessMessage(`✓ Super Admin Override Successful! Lead created and assigned to ${ownerName}.`);
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      reset();
    },
    onError: (error: any) => {
      const msg = error.response?.data?.message || 'Failed to override duplicate lead.';
      setOverrideError(msg);
    }
  });

  const onSubmit = (values: NewLeadFormValues) => {
    mutation.mutate(values);
  };

  const handleOverrideSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!overrideReason.trim()) {
      setOverrideError('Override reason is required and cannot be empty.');
      return;
    }
    if (!duplicateData) return;

    setOverrideError(null);
    setShowConfirmDialog(true);
  };

  const executeConfirmedOverride = () => {
    setShowConfirmDialog(false);
    if (!duplicateData) return;

    overrideMutation.mutate({
      customerId: duplicateData.customerId,
      projectId: duplicateData.projectId,
      reason: overrideReason.trim()
    });
  };

  return (
    <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
      <CardHeader>
        <CardTitle>Create New Lead</CardTitle>
        <CardDescription>
          Submit a new prospect. Duplicate leads are atomically checked and blocked.
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {successMessage && (
            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
              {successMessage}
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold space-y-2">
              <div>⚠️ {errorMessage}</div>

              {/* SUPER ADMIN OVERRIDE BUTTON (Only visible to super_admin role) */}
              {isSuperAdmin && duplicateData && (
                <div className="pt-2 border-t border-red-500/20">
                  <button
                    type="button"
                    onClick={() => setShowOverrideForm(!showOverrideForm)}
                    className="px-3 py-1.5 rounded-lg bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
                  >
                    {showOverrideForm ? 'Hide Override Form' : '⚡ Override Duplicate Block (Super Admin)'}
                  </button>

                  {showOverrideForm && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-950/80 border border-amber-500/30 text-slate-200 text-xs space-y-2">
                      <Label htmlFor="overrideReason" className="text-amber-300 font-semibold">
                        Justification / Reason (Required)
                      </Label>
                      <textarea
                        id="overrideReason"
                        rows={3}
                        value={overrideReason}
                        onChange={(e) => setOverrideReason(e.target.value)}
                        placeholder="State why this duplicate block is being overridden by Super Admin..."
                        className="w-full rounded-lg border border-slate-800 bg-slate-900 p-2 text-xs text-slate-100 focus:border-amber-500 focus:outline-none"
                      />

                      {overrideError && (
                        <p className="text-xs text-red-400 font-semibold">{overrideError}</p>
                      )}

                      <div className="flex justify-end gap-2 pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          onClick={() => setShowOverrideForm(false)}
                          className="h-8 text-xs text-slate-400"
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          disabled={overrideMutation.isPending}
                          onClick={handleOverrideSubmit}
                          className="h-8 text-xs bg-amber-600 hover:bg-amber-500 text-white font-bold"
                        >
                          {overrideMutation.isPending ? 'Executing Override...' : 'Confirm Override'}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="rawName">Customer Full Name</Label>
            <Input
              id="rawName"
              placeholder="e.g. Rahul Sharma"
              {...register('rawName')}
            />
            {errors.rawName && (
              <p className="text-xs text-red-400">{errors.rawName.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="rawMobile">Primary Mobile Number</Label>
            <Input
              id="rawMobile"
              placeholder="+91 98765 43210"
              {...register('rawMobile')}
            />
            {errors.rawMobile && (
              <p className="text-xs text-red-400">{errors.rawMobile.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="project">Target Real-Estate Project</Label>
            <select
              id="project"
              disabled={isLoadingProjects}
              {...register('project')}
              className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
            >
              <option value="">Select a Project...</option>
              {projects.map((proj: any) => (
                <option key={proj._id} value={proj._id}>
                  {proj.name} ({proj.code})
                </option>
              ))}
            </select>
            {errors.project && (
              <p className="text-xs text-red-400">{errors.project.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Lead Source (Optional)</Label>
            <select
              id="source"
              {...register('source')}
              className="flex h-11 w-full rounded-xl border border-slate-800 bg-slate-950/60 px-4 py-2 text-sm text-slate-100 focus:border-indigo-500 focus:outline-none"
            >
              <option value="website">Website Direct</option>
              <option value="google_ads">Google Ads</option>
              <option value="facebook_ads">Facebook / Meta</option>
              <option value="referral">Referral</option>
              <option value="walk_in">Walk-in</option>
            </select>
          </div>

          <Button
            type="submit"
            disabled={isSubmitting || mutation.isPending}
            className="w-full mt-2"
          >
            {mutation.isPending ? 'Processing Lead...' : 'Submit Prospect'}
          </Button>
        </form>

        {/* Super Admin Override Confirmation Dialog */}
        <AlertDialog
          open={showConfirmDialog}
          onOpenChange={setShowConfirmDialog}
          title="Confirm Super Admin Duplicate Override?"
          description="Are you sure you want to override this active opportunity? The existing owner's active opportunity will be marked as superseded and a new opportunity created and auto-assigned."
          confirmLabel="Execute Override"
          variant="amber"
          onConfirm={executeConfirmedOverride}
          isPending={overrideMutation.isPending}
        />
      </CardContent>
    </Card>
  );
}

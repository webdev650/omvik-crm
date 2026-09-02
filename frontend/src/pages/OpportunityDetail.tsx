import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import { getOpportunityById, updateOpportunityIntent } from '../api/opportunities';
import { Badge, getStageBadgeVariant } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import ActivityTimeline from '../features/activities/ActivityTimeline';
import LogActivityForm from '../features/activities/LogActivityForm';
import OpportunitySiteVisits from '../features/siteVisits/OpportunitySiteVisits';
import { toast } from 'sonner';

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => getOpportunityById(id!),
    enabled: !!id,
    retry: 1
  });

  const intentMutation = useMutation({
    mutationFn: (newIntent: 'high' | 'medium' | 'low') => updateOpportunityIntent(id!, newIntent),
    onSuccess: (res) => {
      toast.success(res.message || 'Intent updated');
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update intent.');
    }
  });

  const opp = data?.opportunity;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <Navbar />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/leads" className="hover:text-indigo-400 transition-colors">
            ← Leads & Pipeline
          </Link>
          <span>/</span>
          <span className="text-slate-300 font-medium">
            {opp?.customer?.name ?? 'Opportunity Detail'}
          </span>
        </nav>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-40 w-full bg-slate-800/40 rounded-2xl animate-pulse" />
            <div className="h-64 w-full bg-slate-800/40 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Error / 404 */}
        {isError && !isLoading && (
          <div className="p-12 rounded-2xl border border-red-500/20 bg-red-500/5 text-center space-y-3">
            <p className="text-red-400 font-semibold text-lg">Opportunity not found</p>
            <p className="text-slate-500 text-sm">
              This record doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => navigate('/leads')}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              Return to Leads
            </button>
          </div>
        )}

        {/* Opportunity Header Card */}
        {opp && (
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                  {/* Left: Customer & Project Info */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Customer
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                          {opp.customer?.name}
                        </h1>
                        {opp.customer?._id && (
                          <Button
                            onClick={() => navigate(`/customers/${opp.customer._id}`)}
                            variant="outline"
                            className="h-7 text-[11px] font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                          >
                            View Customer 360 →
                          </Button>
                        )}
                      </div>
                      <p className="text-slate-400 font-mono text-sm mt-1">
                        {opp.customer?.primaryMobile}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Project
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                          {opp.project?.name}
                        </p>
                        {opp.project?.location && (
                          <p className="text-xs text-slate-400">{opp.project.location}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Assigned To
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                          {opp.owner?.name ?? 'Unassigned'}
                        </p>
                        {opp.owner?.role && (
                          <p className="text-xs text-slate-400 capitalize">{opp.owner.role}</p>
                        )}
                      </div>

                      {opp.source && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Source
                          </p>
                          <p className="text-sm text-slate-300 font-bold uppercase">
                            {opp.source.replace('_', ' ')}
                          </p>
                        </div>
                      )}

                      {/* Intent Level Dropdown */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Lead Intent
                        </p>
                        <select
                          value={opp.intent || 'medium'}
                          onChange={(e) => intentMutation.mutate(e.target.value as any)}
                          disabled={intentMutation.isPending}
                          className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:border-indigo-500"
                        >
                          <option value="high">🟢 High Intent (Active)</option>
                          <option value="medium">🟡 Medium Intent (Active)</option>
                          <option value="low">🔴 Low Intent (Inactive)</option>
                        </select>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Created
                        </p>
                        <p className="text-sm text-slate-300">
                          {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stage & SLA Badges */}
                  <div className="flex flex-col items-start sm:items-end gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Stage
                      </p>
                      <Badge variant={getStageBadgeVariant(opp.stage)} className="text-sm px-3 py-1">
                        {opp.stage?.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        SLA Status (48h Threshold)
                      </p>
                      {opp.slaBreached ? (
                        <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1">
                          ⚠️ SLA BREACHED (&gt;48h)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-sm px-3 py-1">
                          ✓ ON TRACK
                        </Badge>
                      )}
                    </div>

                    {opp.lastContactedAt && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Last Contacted
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {new Date(opp.lastContactedAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Tabs Shell */}
            <Tabs defaultValue="activities">
              <TabsList>
                <TabsTrigger value="activities">Activity Timeline</TabsTrigger>
                <TabsTrigger value="log">Log Activity</TabsTrigger>
                <TabsTrigger value="siteVisits">🏡 Site Visits</TabsTrigger>
                <TabsTrigger value="followups">Follow-ups</TabsTrigger>
              </TabsList>

              <TabsContent value="activities">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityTimeline opportunityId={id!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="log">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Log New Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LogActivityForm
                      opportunityId={id!}
                      currentStage={opp.stage}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="siteVisits">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <OpportunitySiteVisits opportunityId={id!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="followups">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Scheduled Follow-ups</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 italic">
                      Scheduled follow-ups and touchpoints for this lead.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}
      </div>
    </div>
  );
}

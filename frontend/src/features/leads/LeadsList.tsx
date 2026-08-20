import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getOpportunities, exportLeads } from '../../api/opportunities';
import { getProjects } from '../../api/projects';
import useAuthStore from '../../store/authStore';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge, getStageBadgeVariant } from '../../components/ui/badge';
import { Card, CardContent } from '../../components/ui/card';
import { Button } from '../../components/ui/button';

export default function LeadsList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canExport = !!currentUser;

  // Fetch Projects for Filter Dropdown
  const { data: projectsData } = useQuery({
    queryKey: ['projects'],
    queryFn: getProjects
  });

  const projects = projectsData?.projects || [];

  // Fetch Opportunities List
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['opportunities', selectedStage, selectedProject],
    queryFn: () =>
      getOpportunities({
        stage: selectedStage || undefined,
        project: selectedProject || undefined
      })
  });

  const opportunities = data?.opportunities || [];

  const handleExport = async () => {
    try {
      setIsExporting(true);
      await exportLeads({
        stage: selectedStage || undefined,
        project: selectedProject || undefined
      });
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-white">
            Lead Ownership & Opportunities
          </h2>
          <p className="text-sm text-slate-400">
            Real-time pipeline of active opportunities and stage progression.
          </p>
        </div>

        {/* Filter Dropdowns & Export Action */}
        <div className="flex flex-wrap items-center gap-3">
          <select
            value={selectedStage}
            onChange={(e) => setSelectedStage(e.target.value)}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Stages</option>
            <option value="new">New</option>
            <option value="contacted">Contacted</option>
            <option value="qualified">Qualified</option>
            <option value="site_visit">Site Visit</option>
            <option value="negotiation">Negotiation</option>
            <option value="nurture">Nurture</option>
            <option value="won">Won</option>
            <option value="lost">Lost</option>
          </select>

          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="h-10 rounded-xl border border-slate-800 bg-slate-900 px-3 py-1.5 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none"
          >
            <option value="">All Projects</option>
            {projects.map((proj: any) => (
              <option key={proj._id} value={proj._id}>
                {proj.name}
              </option>
            ))}
          </select>

          {/* Export Button (Restricted to Authorized Roles) */}
          {canExport && (
            <Button
              onClick={handleExport}
              disabled={isExporting || opportunities.length === 0}
              className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5"
            >
              📥 {isExporting ? 'Exporting...' : 'Export Excel'}
            </Button>
          )}
        </div>
      </div>

      {/* Main Content Card */}
      <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
        <CardContent className="p-0">
          {isLoading ? (
            /* Loading Skeleton */
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 w-full bg-slate-800/40 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            /* Error State */
            <div className="p-12 text-center space-y-3">
              <p className="text-red-400 font-medium">Failed to load opportunities list.</p>
              <button
                onClick={() => refetch()}
                className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Retry Request
              </button>
            </div>
          ) : opportunities.length === 0 ? (
            /* Empty State */
            <div className="p-12 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-slate-800/60 text-slate-400 mb-2">
                📂
              </div>
              <h3 className="text-lg font-semibold text-slate-200">No Opportunities Found</h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                No active leads or opportunities match the selected stage and project filters.
              </p>
            </div>
          ) : (
            /* Data Table */
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Mobile</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Stage</TableHead>
                  <TableHead>Owner</TableHead>
                  <TableHead>SLA Status</TableHead>
                  <TableHead>Created Date</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>

              <TableBody>
                {opportunities.map((opp: any) => (
                  <TableRow
                    key={opp._id}
                    onClick={() => navigate(`/leads/${opp._id}`)}
                    className="cursor-pointer"
                  >
                    <TableCell className="font-semibold text-slate-100">
                      {opp.customer?.name || 'N/A'}
                    </TableCell>

                    <TableCell className="font-mono text-slate-400">
                      {opp.customer?.primaryMobile || 'N/A'}
                    </TableCell>

                    <TableCell className="text-slate-300">
                      {opp.project?.name || 'N/A'}
                    </TableCell>

                    <TableCell>
                      <Badge variant={getStageBadgeVariant(opp.stage)}>
                        {opp.stage ? opp.stage.replace('_', ' ') : 'N/A'}
                      </Badge>
                    </TableCell>

                    <TableCell className="text-slate-300 font-medium">
                      {opp.owner?.name || 'Unassigned'}
                    </TableCell>

                    <TableCell>
                      {opp.slaBreached ? (
                        <Badge variant="destructive" className="animate-pulse">
                          ⚠️ SLA BREACHED
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          ✓ ON TRACK
                        </Badge>
                      )}
                    </TableCell>

                    <TableCell className="text-xs text-slate-400">
                      {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString() : 'N/A'}
                    </TableCell>

                    <TableCell>
                      <span className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold">
                        View →
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

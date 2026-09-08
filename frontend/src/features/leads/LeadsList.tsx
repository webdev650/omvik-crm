import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getOpportunities, exportLeads } from '../../api/opportunities';
import { getProjects } from '../../api/projects';
import { formatProjectName } from '../../utils/formatProjectName';
import useAuthStore from '../../store/authStore';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../../components/ui/table';
import { Badge, getStageBadgeVariant } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';
import { ArrowRight, Phone, Building2, User, Hash } from 'lucide-react';
import ProjectTeamPanel from './ProjectTeamPanel';

export default function LeadsList() {
  const navigate = useNavigate();
  const { user: currentUser } = useAuthStore();
  const [selectedStage, setSelectedStage] = useState<string>('');
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [fromDate, setFromDate] = useState<string>('');
  const [toDate, setToDate] = useState<string>('');
  const [isExporting, setIsExporting] = useState<boolean>(false);

  const canExport = !!currentUser;

  // Fetch Projects for Filter Dropdown (flat list with hierarchy labels)
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'flat'],
    queryFn: () => getProjects({ flat: true })
  });

  const projects = projectsData?.projects || [];

  // Fetch Opportunities List
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['opportunities', selectedStage, selectedProject, fromDate, toDate],
    queryFn: () =>
      getOpportunities({
        stage: selectedStage || undefined,
        project: selectedProject || undefined,
        fromDate: fromDate || undefined,
        toDate: toDate || undefined
      })
  });

  const opportunities = data?.opportunities || [];
  const totalCount = data?.count ?? 0;

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

  const clearDateFilters = () => {
    setFromDate('');
    setToDate('');
  };

  return (
    <div className="space-y-4">
      {/* Project Team Workload Panel — visible only when a specific project is selected */}
      {selectedProject && <ProjectTeamPanel projectId={selectedProject} />}

      <div className="space-y-6">
        {/* Header & Filter Controls */}
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                Lead Ownership &amp; Opportunities
              </h2>
              <p className="text-xs sm:text-sm text-slate-400">
                Real-time pipeline of active opportunities and stage progression.
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2.5 shrink-0">
              {canExport && (
                <Button
                  onClick={() => navigate('/admin/import')}
                  className="h-10 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm min-h-[40px]"
                >
                  📥 Import Data
                </Button>
              )}

              {canExport && (
                <Button
                  onClick={handleExport}
                  disabled={isExporting || opportunities.length === 0}
                  className="h-10 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs gap-1.5 rounded-xl shadow-sm min-h-[40px]"
                >
                  📊 {isExporting ? 'Exporting...' : 'Export'}
                </Button>
              )}
            </div>
          </div>

          {/* Filter Row */}
          <div className="flex flex-wrap items-end gap-2.5">
            {/* Stage filter */}
            <div className="flex flex-col gap-1 flex-1 min-w-[120px]">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">Stage</label>
              <select
                value={selectedStage}
                onChange={(e) => setSelectedStage(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none"
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
            </div>

            {/* Project filter */}
            <div className="flex flex-col gap-1 flex-1 min-w-[130px]">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">Project</label>
              <select
                value={selectedProject}
                onChange={(e) => setSelectedProject(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none"
              >
                <option value="">All Projects</option>
                {projects.map((proj: any) => (
                  <option key={proj._id} value={proj._id}>
                    {formatProjectName(proj)}
                  </option>
                ))}
              </select>
            </div>

            {/* From Date */}
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">From Date</label>
              <input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* To Date */}
            <div className="flex flex-col gap-1 flex-1 min-w-[140px]">
              <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider px-1">To Date</label>
              <input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
                className="h-10 rounded-xl border border-slate-800 bg-[#0b0f19] px-3 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none [color-scheme:dark]"
              />
            </div>

            {/* Clear dates button */}
            {(fromDate || toDate) && (
              <button
                onClick={clearDateFilters}
                className="h-10 px-3 rounded-xl border border-slate-700 bg-slate-800/60 text-xs text-slate-400 hover:text-slate-200 hover:border-slate-600 transition-colors self-end"
              >
                Clear dates
              </button>
            )}
          </div>
        </div>

        {/* Total Count Strip */}
        <div className="flex items-center gap-2 px-1">
          <div className="flex items-center gap-1.5 bg-indigo-500/10 border border-indigo-500/20 rounded-lg px-3 py-1.5">
            <Hash className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-xs font-bold text-indigo-300">
              Total:{' '}
              <span className="text-white">
                {isLoading ? '…' : `${totalCount.toLocaleString()} lead${totalCount !== 1 ? 's' : ''}`}
              </span>
            </span>
          </div>
          {(fromDate || toDate) && (
            <span className="text-[11px] text-slate-500 italic">
              {fromDate && toDate
                ? `${fromDate} → ${toDate}`
                : fromDate
                ? `From ${fromDate}`
                : `Until ${toDate}`}
            </span>
          )}
        </div>

        {/* Main Content Card */}
        <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-6 space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-14 w-full bg-slate-900/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-red-400 text-xs font-semibold">Failed to load opportunities list.</p>
              <Button
                onClick={() => refetch()}
                className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700"
              >
                Retry Request
              </Button>
            </div>
          ) : opportunities.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <div className="inline-flex p-3 rounded-full bg-slate-900 text-slate-400 mb-2">
                📂
              </div>
              <h3 className="text-base font-semibold text-slate-200">No Opportunities Found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active leads or opportunities match the selected stage, project, or date range filters.
              </p>
            </div>
          ) : (
            <>
              {/* 1. DESKTOP & TABLET DATA TABLE (md: and above) */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow className="border-b border-slate-800/80 bg-[#0b0f19]">
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Customer</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Mobile</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Project</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Stage</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Owner</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">SLA Status</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase">Created</TableHead>
                      <TableHead className="text-slate-400 text-xs font-bold uppercase text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {opportunities.map((opp: any) => (
                      <TableRow
                        key={opp._id}
                        onClick={() => navigate(`/leads/${opp._id}`)}
                        className="cursor-pointer hover:bg-slate-800/40 border-b border-slate-800/40 transition-colors"
                      >
                        <TableCell className="font-semibold text-slate-100">
                          {opp.customer?.name || 'N/A'}
                        </TableCell>

                        <TableCell className="font-mono text-slate-400 text-xs">
                          {opp.customer?.primaryMobile || 'N/A'}
                        </TableCell>

                        <TableCell className="text-slate-300 text-xs">
                          {opp.project?.name || 'N/A'}
                        </TableCell>

                        <TableCell>
                          <Badge variant={getStageBadgeVariant(opp.stage)}>
                            {opp.stage ? opp.stage.replace('_', ' ') : 'N/A'}
                          </Badge>
                        </TableCell>

                        <TableCell className="text-slate-300 font-medium text-xs">
                          {opp.owner?.name || 'Unassigned'}
                        </TableCell>

                        <TableCell>
                          {opp.slaBreached ? (
                            <Badge variant="destructive" className="animate-pulse text-[10px]">
                              ⚠️ SLA BREACHED
                            </Badge>
                          ) : (
                            <Badge variant="success" className="text-[10px]">
                              ✓ ON TRACK
                            </Badge>
                          )}
                        </TableCell>

                        <TableCell className="text-xs text-slate-400 font-mono">
                          {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString() : 'N/A'}
                        </TableCell>

                        <TableCell className="text-right">
                          <span className="text-xs text-indigo-400 font-bold hover:text-indigo-300 inline-flex items-center gap-1">
                            <span>View</span>
                            <ArrowRight className="w-3 h-3" />
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {/* 2. MOBILE RESPONSIVE STACKED CARDS LIST (< md: / narrow screens) */}
              <div className="block md:hidden divide-y divide-slate-800/80">
                {opportunities.map((opp: any) => (
                  <div
                    key={opp._id}
                    onClick={() => navigate(`/leads/${opp._id}`)}
                    className="p-4 hover:bg-slate-800/40 transition-colors cursor-pointer space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-white truncate">
                        {opp.customer?.name || 'N/A'}
                      </h4>
                      <Badge variant={getStageBadgeVariant(opp.stage)}>
                        {opp.stage ? opp.stage.replace('_', ' ') : 'N/A'}
                      </Badge>
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs text-slate-300 font-mono">
                      <div className="flex items-center gap-1.5 truncate">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{opp.customer?.primaryMobile || 'N/A'}</span>
                      </div>
                      <div className="flex items-center gap-1.5 truncate">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{opp.project?.name || 'N/A'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between text-xs text-slate-400 pt-1 border-t border-slate-800/40">
                      <div className="flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-indigo-400" />
                        <span className="font-semibold text-slate-200">{opp.owner?.name || 'Unassigned'}</span>
                      </div>

                      <div>
                        {opp.slaBreached ? (
                          <span className="text-[10px] font-bold text-red-400 uppercase">⚠️ SLA Breached</span>
                        ) : (
                          <span className="text-[10px] font-bold text-emerald-400 uppercase">✓ On Track</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

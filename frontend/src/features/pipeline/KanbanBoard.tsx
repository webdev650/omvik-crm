import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ArrowRight, MoveRight, Layers, Phone, Building2, User, ChevronRight } from 'lucide-react';

import Navbar from '../../components/Navbar';
import { getOpportunities, updateOpportunityStage } from '../../api/opportunities';
import { getProjects } from '../../api/projects';
import { formatProjectName } from '../../utils/formatProjectName';
import { Card } from '../../components/ui/card';
import { Badge, getStageBadgeVariant } from '../../components/ui/badge';
import { Button } from '../../components/ui/button';

// ── Pipeline Stage Definitions ──────────────────────────────────────────────

export const PIPELINE_STAGES = [
  { id: 'new', label: 'New Lead', color: 'border-indigo-500/30 text-indigo-400 bg-indigo-500/10' },
  { id: 'contacted', label: 'Contacted', color: 'border-cyan-500/30 text-cyan-400 bg-cyan-500/10' },
  { id: 'qualified', label: 'Qualified', color: 'border-amber-500/30 text-amber-400 bg-amber-500/10' },
  { id: 'site_visit', label: 'Site Visit', color: 'border-blue-500/30 text-blue-400 bg-blue-500/10' },
  { id: 'negotiation', label: 'Negotiation', color: 'border-violet-500/30 text-violet-400 bg-violet-500/10' },
  { id: 'won', label: 'Won 🏆', color: 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10' },
  { id: 'lost', label: 'Lost', color: 'border-red-500/30 text-red-400 bg-red-500/10' },
];

// ── Desktop Sortable Kanban Card Component ──────────────────────────────────

interface CardProps {
  opp: any;
  isDragging?: boolean;
  onSelect?: () => void;
}

function KanbanCardItem({ opp, isDragging, onSelect }: CardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSortableDragging
  } = useSortable({ id: opp._id, data: { opp } });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isSortableDragging || isDragging ? 0.4 : 1
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={onSelect}
      className={`group p-4 rounded-xl border bg-[#131c31] hover:bg-slate-800/90 hover:border-indigo-500/50 shadow-lg cursor-grab active:cursor-grabbing transition-all duration-150 space-y-3 ${
        opp.slaBreached ? 'border-red-500/30' : 'border-slate-800/80'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <h4 className="text-sm font-bold text-slate-100 group-hover:text-indigo-300 transition-colors line-clamp-1">
          {opp.customer?.name || opp.rawName || 'Unnamed Lead'}
        </h4>
        {opp.slaBreached && (
          <span className="shrink-0 text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30 animate-pulse">
            SLA
          </span>
        )}
      </div>

      <div className="text-xs space-y-1">
        <p className="text-slate-400 font-medium line-clamp-1">
          🏙️ {opp.project?.name || 'No Project'}
        </p>
        <p className="text-slate-500 font-mono text-[11px]">
          📱 {opp.customer?.primaryMobile || 'N/A'}
        </p>
      </div>

      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-400">
        <span className="font-medium text-slate-300 truncate max-w-[110px]">
          👤 {opp.owner?.name || 'Unassigned'}
        </span>
        <span className="text-slate-500 text-[10px]">
          {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString('en-IN', { month: 'short', day: 'numeric' }) : ''}
        </span>
      </div>
    </div>
  );
}

// ── Droppable Stage Column Component (Desktop) ──────────────────────────────

interface ColumnProps {
  stage: typeof PIPELINE_STAGES[0];
  opportunities: any[];
  onCardClick: (id: string) => void;
}

function KanbanColumn({ stage, opportunities, onCardClick }: ColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: stage.id,
    data: { stageId: stage.id }
  });

  const oppIds = useMemo(() => opportunities.map((o) => o._id), [opportunities]);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col min-w-[280px] w-72 rounded-2xl border bg-[#0b0f19] p-3 shadow-xl transition-colors duration-200 ${
        isOver ? 'border-indigo-500/60 bg-indigo-950/20 ring-2 ring-indigo-500/20' : 'border-slate-800/80'
      }`}
    >
      <div className="flex items-center justify-between px-2 py-2 mb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${stage.color}`}>
            {stage.label}
          </span>
        </div>
        <span className="text-xs font-bold text-slate-400 font-mono bg-[#131c31] px-2 py-0.5 rounded-md border border-slate-800">
          {opportunities.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 min-h-[300px] max-h-[calc(100vh-280px)] pr-1">
        <SortableContext items={oppIds} strategy={verticalListSortingStrategy}>
          {opportunities.map((opp) => (
            <KanbanCardItem
              key={opp._id}
              opp={opp}
              onSelect={() => onCardClick(opp._id)}
            />
          ))}
        </SortableContext>

        {opportunities.length === 0 && (
          <div className="h-32 flex flex-col items-center justify-center text-center p-4 border border-dashed border-slate-800/60 rounded-xl text-slate-600 text-xs">
            <span>No leads in {stage.label}</span>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Pipeline / Kanban Component ────────────────────────────────────────

export default function KanbanBoard() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [selectedProject, setSelectedProject] = useState<string>('');
  const [mobileActiveStage, setMobileActiveStage] = useState<string>('new');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [lostModalOpp, setLostModalOpp] = useState<any | null>(null);
  const [lostReasonInput, setLostReasonInput] = useState<string>('');
  const [errorBanner, setErrorBanner] = useState<string | null>(null);

  // Sensor configuration for desktop drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 150, tolerance: 5 } })
  );

  // Fetch Projects for Filter Dropdown (flat list with hierarchy labels)
  const { data: projectsData } = useQuery({
    queryKey: ['projects', 'flat'],
    queryFn: () => getProjects({ flat: true })
  });
  const projects = projectsData?.projects || [];

  // Fetch Opportunities
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['opportunities', '', selectedProject],
    queryFn: () => getOpportunities({ project: selectedProject || undefined })
  });
  const opportunities: any[] = data?.opportunities || [];

  // Stage update mutation with Optimistic Update pattern
  const stageMutation = useMutation({
    mutationFn: ({ id, stage, lostReason }: { id: string; stage: string; lostReason?: string }) =>
      updateOpportunityStage(id, { stage, lostReason }),
    onMutate: async ({ id, stage }) => {
      await queryClient.cancelQueries({ queryKey: ['opportunities'] });
      const queryKey = ['opportunities', '', selectedProject];
      const previousData = queryClient.getQueryData(queryKey);

      queryClient.setQueryData(queryKey, (old: any) => {
        if (!old || !Array.isArray(old.opportunities)) return old;
        return {
          ...old,
          opportunities: old.opportunities.map((opp: any) =>
            opp._id === id ? { ...opp, stage } : opp
          )
        };
      });

      return { previousData, queryKey };
    },
    onError: (err: any, _variables, context: any) => {
      const msg = err.response?.data?.message || 'Failed to update stage';
      setErrorBanner(msg);

      if (context?.previousData) {
        queryClient.setQueryData(context.queryKey, context.previousData);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    }
  });

  // Group opportunities by stage
  const groupedOpportunities = useMemo(() => {
    const map: Record<string, any[]> = {};
    PIPELINE_STAGES.forEach((s) => (map[s.id] = []));
    opportunities.forEach((opp) => {
      const st = opp.stage || 'new';
      if (map[st]) {
        map[st].push(opp);
      } else {
        map['new'].push(opp);
      }
    });
    return map;
  }, [opportunities]);

  const activeOpp = useMemo(
    () => opportunities.find((o) => o._id === activeId),
    [activeId, opportunities]
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(String(event.active.id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (!over) return;

    const oppId = String(active.id);
    let targetStageId = String(over.id);

    if (!PIPELINE_STAGES.some((s) => s.id === targetStageId)) {
      const overOpp = opportunities.find((o) => o._id === targetStageId);
      if (overOpp) {
        targetStageId = overOpp.stage || 'new';
      } else {
        return;
      }
    }

    const currentOpp = opportunities.find((o) => o._id === oppId);
    if (!currentOpp || currentOpp.stage === targetStageId) return;

    if (targetStageId === 'lost') {
      setLostModalOpp({ oppId, targetStage: 'lost' });
      setLostReasonInput('');
      return;
    }

    stageMutation.mutate({ id: oppId, stage: targetStageId });
  };

  const handleMobileStageChange = (oppId: string, newStage: string) => {
    if (newStage === 'lost') {
      setLostModalOpp({ oppId, targetStage: 'lost' });
      setLostReasonInput('');
      return;
    }
    stageMutation.mutate({ id: oppId, stage: newStage });
  };

  const submitLostReason = () => {
    if (!lostModalOpp) return;
    if (!lostReasonInput.trim()) {
      setErrorBanner('A reason is required when marking an opportunity as Lost.');
      return;
    }

    stageMutation.mutate({
      id: lostModalOpp.oppId,
      stage: 'lost',
      lostReason: lostReasonInput.trim()
    });

    setLostModalOpp(null);
    setLostReasonInput('');
  };

  const activeStageConfig = PIPELINE_STAGES.find((s) => s.id === mobileActiveStage) || PIPELINE_STAGES[0];
  const activeStageOpps = groupedOpportunities[mobileActiveStage] || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider mb-2">
              <Layers className="w-3.5 h-3.5" />
              <span>Pipeline & Stage Progression</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Visual Pipeline Kanban
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Drag & drop or tap to move deals through your sales funnel stages.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <select
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
              className="h-10 rounded-xl border border-slate-800 bg-[#0b0f19] px-3.5 text-xs font-semibold text-slate-200 focus:border-indigo-500 focus:outline-none"
            >
              <option value="">All Projects</option>
              {projects.map((p: any) => (
                <option key={p._id} value={p._id}>
                  {formatProjectName(p)}
                </option>
              ))}
            </select>

            <Link to="/leads">
              <Button variant="outline" className="h-10 text-xs px-3.5 border-slate-800 rounded-xl font-bold">
                📑 List View
              </Button>
            </Link>
          </div>
        </div>

        {/* Error Banner */}
        {errorBanner && (
          <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-semibold flex items-center justify-between">
            <span>⚠️ {errorBanner}</span>
            <button onClick={() => setErrorBanner(null)} className="text-slate-400 hover:text-white">
              ✕
            </button>
          </div>
        )}

        {/* ── 1. MOBILE RESPONSIVE SINGLE-COLUMN STAGE SELECTOR VIEW (< md: / 375px–768px) ── */}
        <div className="block md:hidden space-y-4">
          {/* Scrollable Horizontal Stage Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-2 no-scrollbar">
            {PIPELINE_STAGES.map((st) => {
              const count = (groupedOpportunities[st.id] || []).length;
              const isActive = mobileActiveStage === st.id;

              return (
                <button
                  key={st.id}
                  onClick={() => setMobileActiveStage(st.id)}
                  className={`px-3 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border min-h-[44px] ${
                    isActive
                      ? 'bg-indigo-600 text-white border-indigo-500 shadow-md'
                      : 'bg-[#131c31] text-slate-300 border-slate-800/80 hover:bg-slate-800'
                  }`}
                >
                  <span>{st.label}</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${isActive ? 'bg-white/20 text-white' : 'bg-slate-900 text-slate-400'}`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Current Selected Stage Cards Container */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${activeStageConfig.color}`}>
                {activeStageConfig.label} ({activeStageOpps.length})
              </span>
              <span className="text-[11px] text-slate-400">Tap card to view details</span>
            </div>

            {activeStageOpps.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                No active deals in this stage.
              </div>
            ) : (
              <div className="space-y-3">
                {activeStageOpps.map((opp) => (
                  <div
                    key={opp._id}
                    className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800/80 space-y-3"
                  >
                    <div
                      onClick={() => navigate(`/leads/${opp._id}`)}
                      className="cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-bold text-white">
                          {opp.customer?.name || opp.rawName || 'Unnamed Lead'}
                        </h4>
                        {opp.slaBreached && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            SLA Breached
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 font-mono space-y-0.5">
                        <p>🏙️ {opp.project?.name || 'No Project'}</p>
                        <p>📱 {opp.customer?.primaryMobile || 'N/A'}</p>
                        <p>👤 Owner: {opp.owner?.name || 'Unassigned'}</p>
                      </div>
                    </div>

                    {/* Mobile "Move to Stage" Action Dropdown */}
                    <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                        Move Stage:
                      </span>
                      <select
                        value={opp.stage || 'new'}
                        onChange={(e) => handleMobileStageChange(opp._id, e.target.value)}
                        className="h-9 px-2.5 rounded-lg bg-[#131c31] border border-slate-700 text-slate-100 text-xs font-semibold focus:outline-none focus:border-indigo-500 min-h-[36px]"
                      >
                        {PIPELINE_STAGES.map((s) => (
                          <option key={s.id} value={s.id}>
                            {s.label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ── 2. DESKTOP MULTI-COLUMN KANBAN BOARD (md: and above) ── */}
        <div className="hidden md:block">
          {isLoading ? (
            <div className="flex gap-4 overflow-x-auto pb-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="min-w-[280px] w-72 h-[450px] bg-[#131c31] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 border border-red-500/20 bg-red-500/5 rounded-2xl text-center space-y-3">
              <p className="text-red-400 font-semibold text-xs">Failed to load pipeline opportunities.</p>
              <Button onClick={() => refetch()} variant="outline" className="text-xs">
                Retry
              </Button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="flex gap-4 overflow-x-auto pb-6 pt-2 scrollbar-thin scrollbar-thumb-slate-800">
                {PIPELINE_STAGES.map((stage) => (
                  <KanbanColumn
                    key={stage.id}
                    stage={stage}
                    opportunities={groupedOpportunities[stage.id] || []}
                    onCardClick={(oppId) => navigate(`/leads/${oppId}`)}
                  />
                ))}
              </div>

              <DragOverlay>
                {activeOpp ? (
                  <div className="w-72 p-4 rounded-xl border border-indigo-500/60 bg-[#131c31] shadow-2xl scale-105 opacity-95">
                    <h4 className="text-sm font-bold text-white">
                      {activeOpp.customer?.name || activeOpp.rawName}
                    </h4>
                    <p className="text-xs text-indigo-400 mt-1">
                      {activeOpp.project?.name}
                    </p>
                  </div>
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        {/* Lost Reason Modal */}
        {lostModalOpp && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="max-w-md w-full p-6 bg-[#131c31] border border-slate-800 rounded-2xl shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <span>🚫 Reason for Lost Opportunity</span>
              </h3>
              <p className="text-xs text-slate-400">
                Please provide a reason why this deal was lost to help analyze pipeline bottlenecks.
              </p>

              <textarea
                value={lostReasonInput}
                onChange={(e) => setLostReasonInput(e.target.value)}
                placeholder="e.g. Client purchased another project, budget constraints, etc."
                rows={3}
                className="w-full rounded-xl border border-slate-800 bg-[#0b0f19] p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:border-indigo-500 focus:outline-none"
              />

              <div className="flex items-center justify-end gap-3 pt-2">
                <Button
                  variant="outline"
                  onClick={() => setLostModalOpp(null)}
                  className="text-xs h-10 border-slate-800 rounded-xl"
                >
                  Cancel
                </Button>
                <Button
                  onClick={submitLostReason}
                  className="bg-red-600 hover:bg-red-500 text-white text-xs h-10 px-4 rounded-xl font-bold"
                >
                  Confirm Lost
                </Button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { getProjectTeamStats } from '../../api/opportunities';
import { Users, CalendarDays, Phone, Clock } from 'lucide-react';

interface ProjectTeamPanelProps {
  projectId: string;
}

export default function ProjectTeamPanel({ projectId }: ProjectTeamPanelProps) {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['projectTeamStats', projectId],
    queryFn: () => getProjectTeamStats(projectId),
    enabled: !!projectId,
    // Refresh every 60 seconds so today counts stay live
    refetchInterval: 60_000
  });

  const teamStats = data?.teamStats || [];

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-5">
        <div className="flex items-center gap-2 mb-4">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-slate-200">Project Team</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-xl bg-slate-900/60 animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return null; // Silently fail — don't block the main list
  }

  if (teamStats.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-5">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-indigo-400" />
          <span className="text-sm font-bold text-slate-200">Project Team</span>
        </div>
        <p className="text-xs text-slate-500">No active team members on this project yet.</p>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] p-5 space-y-4">
      {/* Panel Header */}
      <div className="flex items-center gap-2">
        <div className="p-1.5 rounded-lg bg-indigo-500/10">
          <Users className="w-4 h-4 text-indigo-400" />
        </div>
        <div>
          <span className="text-sm font-bold text-white">Project Team</span>
          <span className="ml-2 text-xs text-slate-500 font-mono">{teamStats.length} member{teamStats.length !== 1 ? 's' : ''}</span>
        </div>
      </div>

      {/* Team Member Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
        {teamStats.map((member: any) => {
          const sinceDate = member.earliestCreatedAt
            ? new Date(member.earliestCreatedAt).toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric'
              })
            : '—';

          const contactedPct =
            member.totalLeads > 0
              ? Math.round((member.contactedToday / member.totalLeads) * 100)
              : 0;

          return (
            <div
              key={member.ownerId}
              className="relative rounded-xl border border-slate-800/60 bg-slate-900/70 p-4 space-y-3 hover:border-indigo-500/40 hover:bg-slate-900 transition-all"
            >
              {/* Owner Name */}
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-7 h-7 rounded-full bg-indigo-500/20 border border-indigo-500/30 text-indigo-400 text-[11px] font-black flex items-center justify-center shrink-0 uppercase">
                    {member.ownerName.charAt(0)}
                  </div>
                  <span className="text-sm font-bold text-slate-100 truncate">{member.ownerName}</span>
                </div>
                <span className="text-[11px] font-black text-slate-100 bg-slate-800 rounded-lg px-2 py-0.5 shrink-0">
                  {member.totalLeads}
                </span>
              </div>

              {/* Since Date */}
              <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                <CalendarDays className="w-3 h-3 shrink-0" />
                <span>Since {sinceDate}</span>
              </div>

              {/* Today Breakdown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-emerald-400">
                    <Phone className="w-3 h-3" />
                    Contacted
                  </span>
                  <span className="text-emerald-400">{member.contactedToday}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] font-semibold">
                  <span className="flex items-center gap-1 text-amber-400">
                    <Clock className="w-3 h-3" />
                    Remaining
                  </span>
                  <span className="text-amber-400">{member.remainingToday}</span>
                </div>

                {/* Progress bar */}
                <div className="h-1.5 rounded-full bg-slate-800 overflow-hidden mt-1">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-emerald-400 transition-all duration-500"
                    style={{ width: `${contactedPct}%` }}
                  />
                </div>
                <p className="text-[10px] text-slate-500 text-right">{contactedPct}% contacted today</p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

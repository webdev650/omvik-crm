import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import {
  Tag,
  FileSpreadsheet,
  Kanban,
  BarChart2,
  PieChart as PieIcon
} from 'lucide-react';
import Navbar from '../../components/Navbar';
import ExecutiveDashboardView from '../../components/ExecutiveDashboardView';
import ProjectAnalyticsView from '../../components/ProjectAnalyticsView';
import useAuth from '../../hooks/useAuth';

export default function ReportsPage() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<'kpis' | 'analytics'>('kpis');

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* HERO HEADING & QUICK ACTION BAR (Matching Image 2) */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-[#0131B9]/15 border border-[#15B0F8]/30 text-[#15B0F8] text-[11px] font-bold uppercase tracking-wider">
              <span>Executive Command Center</span>
              <span>—</span>
              <span>{user?.role?.replace('_', ' ')?.toUpperCase() || 'SUPER ADMIN'} VIEW</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Executive Performance Dashboard
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Real-time lead counts, batch tracking, SLA health, conversion ratios, and top sales performance.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 shrink-0">
            <NavLink
              to="/admin/lead-batches"
              className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/60 flex items-center gap-2"
            >
              <Tag className="w-4 h-4 text-[#15B0F8]" />
              <span>Lead Batches</span>
            </NavLink>

            <NavLink
              to="/admin/import"
              className="h-10 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl transition-all border border-slate-700/60 flex items-center gap-2"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#FBB040]" />
              <span>Import Leads</span>
            </NavLink>

            <NavLink
              to="/pipeline"
              className="h-10 px-4 bg-[#0131B9] hover:bg-[#15B0F8] text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-[#0131B9]/20 flex items-center gap-2"
            >
              <Kanban className="w-4 h-4" />
              <span>Kanban Pipeline</span>
            </NavLink>
          </div>
        </div>

        {/* TAB TOGGLE BAR (Executive Main View vs Project Deep Dive & Charts) */}
        <div className="flex items-center gap-2 bg-[#131c31] p-1.5 rounded-2xl border border-slate-800/80">
          <button
            onClick={() => setActiveTab('kpis')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'kpis'
                ? 'bg-[#0131B9] text-white shadow-md shadow-[#0131B9]/30 border border-[#15B0F8]/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <BarChart2 className="w-4 h-4" />
            <span>Executive Main View (21 KPIs)</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'analytics'
                ? 'bg-[#0131B9] text-white shadow-md shadow-[#0131B9]/30 border border-[#15B0F8]/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <PieIcon className="w-4 h-4" />
            <span>Project Deep Dive & Charts</span>
          </button>
        </div>

        {/* TAB CONTENT AREA */}
        {activeTab === 'kpis' ? (
          <ExecutiveDashboardView hideHeader={false} />
        ) : (
          <ProjectAnalyticsView />
        )}

      </main>
    </div>
  );
}

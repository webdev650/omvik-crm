import React from 'react';
import Navbar from '../../components/Navbar';
import ExecutiveDashboardView from '../../components/ExecutiveDashboardView';

export default function ReportsPage() {
  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        <ExecutiveDashboardView />
      </main>
    </div>
  );
}

import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import LeadsList from '../features/leads/LeadsList';
import NewLeadForm from '../features/leads/NewLeadForm';
import { Button } from '../components/ui/button';
import { Plus, EyeOff, Eye, Users } from 'lucide-react';

export default function LeadsPage() {
  const [showForm, setShowForm] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Lead Acquisition</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Leads & Opportunity Management
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Submit new prospects and monitor real-time lead ownership pipeline.
            </p>
          </div>

          <Button
            onClick={() => setShowForm(!showForm)}
            className="h-10 px-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl transition-all shadow-md shadow-indigo-600/20 flex items-center gap-2"
          >
            {showForm ? (
              <>
                <EyeOff className="w-4 h-4" />
                <span>Hide Lead Form</span>
              </>
            ) : (
              <>
                <Plus className="w-4 h-4" />
                <span>+ New Lead</span>
              </>
            )}
          </Button>
        </div>

        {/* Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {showForm && (
            <div className="lg:col-span-1">
              <NewLeadForm />
            </div>
          )}

          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <LeadsList />
          </div>
        </div>
      </main>
    </div>
  );
}

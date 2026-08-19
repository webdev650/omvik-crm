import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import LeadsList from '../features/leads/LeadsList';
import NewLeadForm from '../features/leads/NewLeadForm';
import { Button } from '../components/ui/button';

export default function LeadsPage() {
  const [showForm, setShowForm] = useState<boolean>(true);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      {/* Background Accents */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-7xl mx-auto relative z-10">
        <Navbar />

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Leads & Opportunity Management
            </h1>
            <p className="text-sm text-slate-400">
              Submit new prospects and monitor real-time lead ownership pipeline.
            </p>
          </div>

          <Button
            onClick={() => setShowForm(!showForm)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold"
          >
            {showForm ? 'Hide Lead Form' : '+ New Lead'}
          </Button>
        </div>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {showForm && (
            <div className="lg:col-span-1 animate-fade-in">
              <NewLeadForm />
            </div>
          )}

          <div className={showForm ? 'lg:col-span-2' : 'lg:col-span-3'}>
            <LeadsList />
          </div>
        </main>
      </div>
    </div>
  );
}

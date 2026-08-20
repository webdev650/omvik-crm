import React from 'react';
import { useParams, useNavigate, NavLink } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import { getCustomerById } from '../api/customers';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge, getStageBadgeVariant } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id!),
    enabled: !!id
  });

  const customer = data?.customer;
  const opportunities = data?.opportunities || [];
  const followups = data?.followups || [];
  const siteVisits = data?.siteVisits || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Back & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate(-1)}
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            ← Back
          </Button>
          <span className="text-xs text-slate-500 font-mono">Customer 360 View</span>
        </div>

        {isLoading ? (
          <div className="h-64 bg-slate-900/60 rounded-2xl animate-pulse" />
        ) : isError || !customer ? (
          <Card className="border-red-500/30 bg-slate-900 p-8 text-center space-y-3">
            <p className="text-red-400 font-medium">Customer profile not found or permission denied.</p>
            <Button onClick={() => refetch()} className="bg-slate-800 text-xs text-slate-200">
              Retry
            </Button>
          </Card>
        ) : (
          <div className="space-y-8">
            {/* Customer Header Card */}
            <Card className="border-indigo-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-5">
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-extrabold text-white text-2xl shadow-xl shadow-indigo-600/30">
                    {customer.name?.charAt(0).toUpperCase() || 'C'}
                  </div>
                  <div>
                    <div className="flex items-center gap-3">
                      <h1 className="text-2xl font-extrabold text-white">{customer.name}</h1>
                      <span className="px-2.5 py-0.5 rounded-md bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                        {opportunities.length} Projects / Deals
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                      <span>📱 {customer.primaryMobile}</span>
                      {customer.email && <span>✉️ {customer.email}</span>}
                      {customer.city && <span>🏙️ {customer.city}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Opportunities Across All Projects */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span>🏢 Multi-Project Opportunities</span>
                  <span className="text-xs text-slate-400 font-normal">(Customer 360 Portfolio)</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map((opp: any) => (
                  <Card
                    key={opp._id}
                    className="border-slate-800 bg-slate-900/80 hover:border-indigo-500/40 transition-all cursor-pointer shadow-xl"
                    onClick={() => navigate(`/leads/${opp._id}`)}
                  >
                    <CardHeader className="pb-2">
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                          <span>🏙️ {opp.project?.name || 'Unassigned Project'}</span>
                        </CardTitle>
                        <Badge variant={getStageBadgeVariant(opp.stage)}>
                          {opp.stage ? opp.stage.replace('_', ' ') : 'new'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3 pt-2 text-xs">
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Assigned Rep:</span>
                        <span className="font-semibold text-slate-200">{opp.owner?.name || 'Unassigned'}</span>
                      </div>
                      <div className="flex items-center justify-between text-slate-400">
                        <span>Lead Source:</span>
                        <span className="font-mono text-indigo-400">{opp.source || 'website'}</span>
                      </div>
                      <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                        <span>Created: {new Date(opp.createdAt).toLocaleDateString()}</span>
                        <span className="text-indigo-400 font-bold hover:underline">View Opportunity →</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

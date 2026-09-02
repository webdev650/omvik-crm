import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Tag, Search, ArrowLeft, Users, Trophy, ChevronRight, Eye } from 'lucide-react';
import Navbar from '../../components/Navbar';
import api from '../../api/axios';
import { Button } from '../../components/ui/button';
import { Input } from '../../components/ui/input';
import { Badge } from '../../components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from '../../components/ui/table';

export default function LeadBatchesPage() {
  const [search, setSearch] = useState('');
  const [selectedBatchId, setSelectedBatchId] = useState<string | null>(null);
  const [leadSearch, setLeadSearch] = useState('');

  // Fetch batches list
  const { data: batchesData, isLoading: isLoadingBatches } = useQuery({
    queryKey: ['leadBatches'],
    queryFn: async () => {
      const res = await api.get('/admin/lead-batches');
      return res.data;
    }
  });

  // Fetch selected batch leads
  const { data: batchLeadsData, isLoading: isLoadingLeads } = useQuery({
    queryKey: ['batchLeads', selectedBatchId, leadSearch],
    queryFn: async () => {
      if (!selectedBatchId) return null;
      const res = await api.get(`/admin/lead-batches/${encodeURIComponent(selectedBatchId)}`, {
        params: { search: leadSearch }
      });
      return res.data;
    },
    enabled: !!selectedBatchId
  });

  const batches = batchesData?.batches || [];
  const filteredBatches = batches.filter((b: any) =>
    (b.batchName || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Tag className="w-3.5 h-3.5" />
              <span>Bulk Imports & Tag Tracking</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              {selectedBatchId ? `Batch: ${selectedBatchId}` : 'Lead Import Batches'}
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              {selectedBatchId
                ? 'Drill-down view of all opportunities imported under this batch.'
                : 'Overview of all lead batches uploaded via spreadsheet import or tagged manually.'}
            </p>
          </div>

          {selectedBatchId && (
            <Button
              size="sm"
              onClick={() => setSelectedBatchId(null)}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-xl flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to All Batches</span>
            </Button>
          )}
        </div>

        {/* VIEW 1: ALL BATCHES SUMMARY LIST */}
        {!selectedBatchId ? (
          <div className="space-y-4">
            {/* Search Filter Bar */}
            <div className="flex items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Search batch by name (e.g. Sheet 1)..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9 bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl"
                />
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Showing {filteredBatches.length} batch{filteredBatches.length === 1 ? '' : 'es'}
              </span>
            </div>

            {/* Batches Table */}
            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] overflow-hidden">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-400 font-semibold text-xs">Batch Name / Tag</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Total Leads</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Active Pipeline</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Deals Won</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Last Updated</TableHead>
                    <TableHead className="text-right text-slate-400 font-semibold text-xs">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingBatches ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        Loading lead import batches...
                      </TableCell>
                    </TableRow>
                  ) : filteredBatches.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        No import batches found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredBatches.map((b: any, idx: number) => (
                      <TableRow key={idx} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                        <TableCell className="font-bold text-white text-xs flex items-center gap-2">
                          <Tag className="w-3.5 h-3.5 text-indigo-400" />
                          <span>{b.batchName}</span>
                        </TableCell>
                        <TableCell className="font-extrabold text-indigo-300 text-xs">{b.totalLeads} leads</TableCell>
                        <TableCell>
                          <Badge className="bg-blue-500/10 text-blue-400 border-blue-500/20 text-xs">
                            {b.activeLeads} active
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-xs">
                            🏆 {b.wonDeals} won
                          </Badge>
                        </TableCell>
                        <TableCell className="text-slate-400 text-xs">
                          {b.lastImportedAt ? new Date(b.lastImportedAt).toLocaleDateString() : '—'}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            onClick={() => setSelectedBatchId(b.batchName)}
                            className="bg-indigo-600/20 hover:bg-indigo-600 text-indigo-300 hover:text-white text-xs font-bold rounded-xl h-8 px-3 border border-indigo-500/30"
                          >
                            <span>Drill Down</span>
                            <ChevronRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        ) : (
          /* VIEW 2: BATCH LEADS DRILL-DOWN */
          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-4 rounded-2xl">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <Input
                  type="text"
                  placeholder="Filter leads inside this batch..."
                  value={leadSearch}
                  onChange={(e) => setLeadSearch(e.target.value)}
                  className="pl-9 bg-[#0b0f19] border-slate-700 text-slate-200 text-xs rounded-xl"
                />
              </div>
              <span className="text-xs text-slate-400 font-semibold">
                Total Leads: <strong className="text-indigo-400">{batchLeadsData?.total || 0}</strong>
              </span>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-[#131c31] overflow-hidden">
              <Table>
                <TableHeader className="bg-[#0b0f19]">
                  <TableRow className="border-b border-slate-800">
                    <TableHead className="text-slate-400 font-semibold text-xs">Customer Name</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Mobile</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Project</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Owner Rep</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Stage</TableHead>
                    <TableHead className="text-slate-400 font-semibold text-xs">Intent</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoadingLeads ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        Loading leads for batch "{selectedBatchId}"...
                      </TableCell>
                    </TableRow>
                  ) : batchLeadsData?.opportunities?.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-slate-500 text-xs">
                        No opportunities found in this batch matching filter.
                      </TableCell>
                    </TableRow>
                  ) : (
                    batchLeadsData?.opportunities?.map((opp: any) => (
                      <TableRow key={opp._id} className="border-b border-slate-800/40 hover:bg-slate-800/40 transition-colors">
                        <TableCell className="font-bold text-white text-xs">
                          {opp.customer?.name || 'Prospect'}
                        </TableCell>
                        <TableCell className="text-slate-300 font-mono text-xs">
                          {opp.customer?.primaryMobile || '—'}
                        </TableCell>
                        <TableCell className="text-indigo-400 text-xs font-semibold">
                          {opp.project?.name || '—'}
                        </TableCell>
                        <TableCell className="text-slate-300 text-xs font-medium">
                          👤 {opp.owner?.name || 'Unassigned'}
                        </TableCell>
                        <TableCell>
                          <Badge className="bg-indigo-500/20 text-indigo-300 border-indigo-500/40 text-[10px] uppercase">
                            {opp.stage}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs capitalize font-bold">
                          <span className={opp.intent === 'high' ? 'text-emerald-400' : opp.intent === 'low' ? 'text-red-400' : 'text-amber-400'}>
                            {opp.intent || 'Medium'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

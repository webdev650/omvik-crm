import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Users, ArrowRight } from 'lucide-react';
import Navbar from '../components/Navbar';
import { getCustomers } from '../api/customers';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Button } from '../components/ui/button';

export default function CustomersPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  const customers = data?.customers || [];

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <Users className="w-3.5 h-3.5" />
              <span>Customer Directory</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Customer 360 Portfolio
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Multi-project client profiles. Click any customer to view their complete opportunity portfolio.
            </p>
          </div>
        </div>

        {/* Customer Directory Table Container */}
        <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl overflow-hidden shadow-sm">
          {isLoading ? (
            <div className="p-8 space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-12 bg-slate-900/60 rounded-xl animate-pulse" />
              ))}
            </div>
          ) : isError ? (
            <div className="p-12 text-center space-y-3">
              <p className="text-red-400 text-xs font-semibold">Failed to load customer directory.</p>
              <Button onClick={() => refetch()} className="bg-slate-800 text-xs text-slate-200">
                Retry
              </Button>
            </div>
          ) : customers.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <p className="text-slate-400 text-xs font-semibold">No customers found in your scope.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="border-b border-slate-800/80 bg-[#0b0f19]">
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Customer Name</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Primary Mobile</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">Email</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase">City</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase text-right">Deals Count</TableHead>
                  <TableHead className="text-slate-400 text-xs font-bold uppercase text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c: any) => (
                  <TableRow
                    key={c._id}
                    className="hover:bg-slate-800/40 cursor-pointer border-b border-slate-800/40 transition-colors"
                    onClick={() => navigate(`/customers/${c._id}`)}
                  >
                    <TableCell className="font-bold text-slate-100 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                        {c.name?.charAt(0).toUpperCase()}
                      </div>
                      <span className="hover:text-indigo-300 transition-colors">{c.name}</span>
                    </TableCell>
                    <TableCell className="font-mono text-slate-300 text-xs">{c.primaryMobile}</TableCell>
                    <TableCell className="text-slate-400 text-xs">{c.email || '—'}</TableCell>
                    <TableCell className="text-slate-400 text-xs">{c.city || '—'}</TableCell>
                    <TableCell className="text-right">
                      <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                        {c.opportunityCount || 1} Deals
                      </span>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        className="h-8 border-indigo-500/30 text-indigo-400 text-xs font-bold hover:bg-indigo-600 hover:text-white transition-all flex items-center gap-1.5 ml-auto"
                      >
                        <span>View 360</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </main>
    </div>
  );
}

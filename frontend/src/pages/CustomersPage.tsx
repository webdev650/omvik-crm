import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/Navbar';
import { getCustomers } from '../api/customers';
import { Card, CardContent } from '../components/ui/card';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '../components/ui/table';
import { Badge, getStageBadgeVariant } from '../components/ui/badge';
import { Button } from '../components/ui/button';

export default function CustomersPage() {
  const navigate = useNavigate();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customers'],
    queryFn: getCustomers
  });

  const customers = data?.customers || [];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-6xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
              👥 Customer Directory
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Customer 360 Portfolio
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Multi-project client profiles. Click any customer to view their complete opportunity portfolio.
            </p>
          </div>
        </div>

        {/* Customer Directory Table */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardContent className="p-0">
            {isLoading ? (
              <div className="p-8 space-y-4">
                {[1, 2, 3, 4, 5].map((i) => (
                  <div key={i} className="h-12 bg-slate-800/40 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : isError ? (
              <div className="p-12 text-center space-y-3">
                <p className="text-red-400 font-medium">Failed to load customer directory.</p>
                <Button onClick={() => refetch()} className="bg-slate-800 text-xs text-slate-200">
                  Retry
                </Button>
              </div>
            ) : customers.length === 0 ? (
              <div className="p-12 text-center space-y-2">
                <p className="text-slate-400 font-medium">No customers found in your scope.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer Name</TableHead>
                    <TableHead>Primary Mobile</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>City</TableHead>
                    <TableHead>Deals Count</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((c: any) => (
                    <TableRow key={c._id} className="hover:bg-slate-800/50 cursor-pointer" onClick={() => navigate(`/customers/${c._id}`)}>
                      <TableCell className="font-bold text-slate-100 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs">
                          {c.name?.charAt(0).toUpperCase()}
                        </div>
                        {c.name}
                      </TableCell>
                      <TableCell className="font-mono text-slate-300 text-xs">{c.primaryMobile}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{c.email || '—'}</TableCell>
                      <TableCell className="text-slate-400 text-xs">{c.city || '—'}</TableCell>
                      <TableCell>
                        <span className="px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                          {c.opportunityCount || 1} Deals
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="outline" className="h-8 border-indigo-500/30 text-indigo-400 text-xs font-bold hover:bg-indigo-500/10">
                          View Customer 360 →
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { getCustomerById } from '../api/customers';
import { createBooking, updateBooking, BookingPayload } from '../api/bookings';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Badge, getStageBadgeVariant } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import {
  Building2,
  FileSpreadsheet,
  Edit3,
  X,
  IndianRupee,
  Calendar,
  CheckCircle2,
  PlusCircle,
  Clock,
  UserCheck
} from 'lucide-react';
import { toast } from 'sonner';

export default function CustomerDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isManagement = user?.role && ['admin', 'super_admin', 'director', 'team_lead'].includes(user.role);

  // Modals state
  const [convertingOpp, setConvertingOpp] = useState<any | null>(null);
  const [editingBooking, setEditingBooking] = useState<any | null>(null);

  // New Booking Form State
  const [bookingForm, setBookingForm] = useState({
    unitNumber: '',
    sqftArea: '',
    bhk: '2BHK',
    bookingDate: new Date().toISOString().split('T')[0],
    finalPrice: '',
    totalCost: '',
    totalPaid: '0',
    probableRegistrationDate: '',
    status: 'booked',
    remarks: '',
    contact: '',
    location: '',
    projectType: 'Apartment'
  });

  // Quick Edit Form State (Total Paid, Status, Probable Registration Date, Remarks)
  const [editTotalPaid, setEditTotalPaid] = useState('');
  const [editStatus, setEditStatus] = useState('');
  const [editRegistrationDate, setEditRegistrationDate] = useState('');
  const [editRemarks, setEditRemarks] = useState('');

  // Fetch Customer 360 Data
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['customer', id],
    queryFn: () => getCustomerById(id!),
    enabled: !!id
  });

  const customer = data?.customer;
  const opportunities = data?.opportunities || [];
  const bookings = data?.bookings || [];

  // Create Booking Mutation
  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      toast.success('🎉 Booking recorded successfully!');
      setConvertingOpp(null);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create booking.');
    }
  });

  // Update Booking Mutation
  const updateBookingMutation = useMutation({
    mutationFn: ({ bookingId, payload }: { bookingId: string; payload: BookingPayload }) =>
      updateBooking(bookingId, payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Booking updated successfully');
      setEditingBooking(null);
      queryClient.invalidateQueries({ queryKey: ['customer', id] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update booking.');
    }
  });

  const handleOpenCreateModal = (opp: any) => {
    setConvertingOpp(opp);
    setBookingForm({
      unitNumber: '',
      sqftArea: '',
      bhk: '2BHK',
      bookingDate: new Date().toISOString().split('T')[0],
      finalPrice: opp.value ? String(opp.value) : '',
      totalCost: opp.value ? String(opp.value) : '',
      totalPaid: '0',
      probableRegistrationDate: '',
      status: 'booked',
      remarks: '',
      contact: customer?.primaryMobile || '',
      location: customer?.city || opp.project?.location || '',
      projectType: opp.project?.propertyType || 'Apartment'
    });
  };

  const handleCreateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingOpp) return;
    if (!bookingForm.finalPrice || Number(bookingForm.finalPrice) <= 0) {
      toast.error('Final closing price is required');
      return;
    }

    const cost = bookingForm.totalCost ? Number(bookingForm.totalCost) : Number(bookingForm.finalPrice);

    createBookingMutation.mutate({
      opportunityId: convertingOpp._id,
      customerId: customer._id,
      projectId: convertingOpp.project?._id,
      contact: bookingForm.contact || customer?.primaryMobile || '',
      location: bookingForm.location || customer?.city || '',
      projectType: bookingForm.projectType,
      unitNumber: bookingForm.unitNumber,
      sqftArea: bookingForm.sqftArea ? Number(bookingForm.sqftArea) : 0,
      bhk: bookingForm.bhk || null,
      bookingDate: bookingForm.bookingDate,
      finalPrice: Number(bookingForm.finalPrice),
      totalCost: cost,
      totalPaid: Number(bookingForm.totalPaid || 0),
      probableRegistrationDate: bookingForm.probableRegistrationDate || null,
      status: bookingForm.status,
      remarks: bookingForm.remarks
    });
  };

  const handleOpenEditModal = (b: any) => {
    setEditingBooking(b);
    setEditTotalPaid(String(b.totalPaid || 0));
    setEditStatus(b.status || b.currentStatus || 'booked');
    setEditRegistrationDate(
      b.probableRegistrationDate ? new Date(b.probableRegistrationDate).toISOString().split('T')[0] : ''
    );
    setEditRemarks(b.remarks || '');
  };

  const handleUpdateBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingBooking) return;

    const payload: BookingPayload = {
      totalPaid: Number(editTotalPaid || 0),
      status: editStatus,
      probableRegistrationDate: editRegistrationDate || null,
      remarks: editRemarks
    };

    updateBookingMutation.mutate({ bookingId: editingBooking._id, payload });
  };

  const formatCurrency = (amount: number) => {
    if (amount === undefined || amount === null) return '₹0';
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatDateStr = (d?: string | Date) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  const formatMonthStr = (d?: string | Date) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('en-IN', {
      month: 'long',
      year: 'numeric'
    });
  };

  const getStatusBadge = (statusStr: string) => {
    switch (statusStr) {
      case 'booked':
        return <Badge className="bg-blue-500/15 text-blue-400 border border-blue-500/30">Booked</Badge>;
      case 'registration':
        return <Badge className="bg-amber-500/15 text-amber-400 border border-amber-500/30">Registration</Badge>;
      case 'construction_in_progress':
        return <Badge className="bg-orange-500/15 text-orange-400 border border-orange-500/30">Construction In Progress</Badge>;
      case 'completed':
        return <Badge className="bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">Completed</Badge>;
      case 'unit_handover':
        return <Badge className="bg-purple-500/15 text-purple-400 border border-purple-500/30">Unit Handover</Badge>;
      case 'deal_closed':
        return <Badge className="bg-emerald-950 text-emerald-300 border border-emerald-700">Deal Closed</Badge>;
      default:
        return <Badge variant="outline">{statusStr}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      <div className="max-w-[1650px] mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Back & Breadcrumb */}
        <div className="flex items-center gap-3">
          <Button
            onClick={() => navigate('/customers')}
            variant="outline"
            className="border-slate-800 text-slate-300 hover:bg-slate-800 text-xs h-9"
          >
            ← Back to Customer Directory
          </Button>
          <span className="text-xs text-slate-500 font-mono">Customer 360 Portfolio View</span>
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
                        {opportunities.length} Deals
                      </span>
                      {bookings.length > 0 && (
                        <span className="px-2.5 py-0.5 rounded-md bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 font-mono text-xs font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>{bookings.length} Booked Units</span>
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 mt-2 font-mono">
                      <span>📱 {customer.primaryMobile}</span>
                      {customer.email && <span>✉️ {customer.email}</span>}
                      {customer.city && <span>🏙️ Location: {customer.city}</span>}
                      {customer.address && <span>📍 Address: {customer.address}</span>}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* BOOKINGS TABLE SECTION (Exact 20 client columns) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                  <span>Bookings</span>
                  <span className="text-xs text-slate-400 font-normal">(Customer 360 Master Booking Ledger)</span>
                </h2>
              </div>

              <Card className="border-slate-800 bg-slate-900/90 shadow-2xl backdrop-blur-xl overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-800 bg-[#0d1322] text-slate-400 font-bold uppercase tracking-wider text-[10px] whitespace-nowrap">
                        <th className="py-3.5 px-3 text-center">Sl. No.</th>
                        <th className="py-3.5 px-3">Name</th>
                        <th className="py-3.5 px-3">Contact</th>
                        <th className="py-3.5 px-3">Location</th>
                        <th className="py-3.5 px-3">Project Name</th>
                        <th className="py-3.5 px-3">Project Type</th>
                        <th className="py-3.5 px-3">Unit No.</th>
                        <th className="py-3.5 px-3 text-right">Sq.Ft Area</th>
                        <th className="py-3.5 px-3 text-center">BHK</th>
                        <th className="py-3.5 px-3">Month of Booking</th>
                        <th className="py-3.5 px-3">Date of Booking</th>
                        <th className="py-3.5 px-3 text-right">Final Price</th>
                        <th className="py-3.5 px-3 text-right">Total Cost</th>
                        <th className="py-3.5 px-3 text-right">Total Paid</th>
                        <th className="py-3.5 px-3 text-right">Payment Remaining</th>
                        <th className="py-3.5 px-3 text-center">% Payment Received</th>
                        <th className="py-3.5 px-3">Probable Registration Date</th>
                        <th className="py-3.5 px-3">Current Status</th>
                        <th className="py-3.5 px-3">Assigned</th>
                        <th className="py-3.5 px-3 text-left">Remarks</th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-800/60 font-medium text-slate-200">
                      {bookings.length === 0 ? (
                        <tr>
                          <td colSpan={20} className="py-8 text-center text-slate-500 italic">
                            No property bookings recorded for this customer yet.
                          </td>
                        </tr>
                      ) : (
                        bookings.map((b: any, idx: number) => {
                          const proj = b.project || {};
                          const agent = b.assignedTo || {};
                          const totalCost = b.totalCost || b.finalPrice || 0;
                          const totalPaid = b.totalPaid || 0;

                          // Calculated Virtual Fields
                          const paymentRemaining = b.paymentRemaining ?? Math.max(0, totalCost - totalPaid);
                          const rawPct = b.paymentPercentage ?? (totalCost > 0 ? (totalPaid / totalCost) * 100 : 0);
                          const paymentPctStr = `${Number(rawPct.toFixed(1))}%`;

                          const statusVal = b.status || b.currentStatus || 'booked';

                          return (
                            <tr
                              key={b._id}
                              className="hover:bg-slate-800/40 transition-colors whitespace-nowrap text-xs"
                            >
                              {/* 1. Sl. No. (row index) */}
                              <td className="py-3.5 px-3 text-center font-mono text-slate-400 text-[11px]">
                                {idx + 1}
                              </td>

                              {/* 2. Name (from Customer) */}
                              <td className="py-3.5 px-3 font-bold text-white">
                                {customer.name}
                              </td>

                              {/* 3. Contact */}
                              <td className="py-3.5 px-3 font-mono text-slate-300">
                                {b.contact || customer.primaryMobile || '—'}
                              </td>

                              {/* 4. Location */}
                              <td className="py-3.5 px-3 text-slate-300">
                                {b.location || customer.city || proj.location || '—'}
                              </td>

                              {/* 5. Project Name */}
                              <td className="py-3.5 px-3 font-semibold text-slate-200">
                                {proj.name || '—'}
                              </td>

                              {/* 6. Project Type */}
                              <td className="py-3.5 px-3 text-slate-300">
                                {b.projectType || proj.propertyType || 'Apartment'}
                              </td>

                              {/* 7. Unit No. */}
                              <td className="py-3.5 px-3 font-mono font-bold text-indigo-300">
                                {b.unitNumber || '—'}
                              </td>

                              {/* 8. Sq.Ft Area */}
                              <td className="py-3.5 px-3 text-right font-mono text-slate-300">
                                {b.sqftArea ? `${b.sqftArea.toLocaleString('en-IN')} sq.ft` : '—'}
                              </td>

                              {/* 9. BHK */}
                              <td className="py-3.5 px-3 text-center font-semibold text-slate-300">
                                {b.bhk || 'N/A'}
                              </td>

                              {/* 10. Month of Booking */}
                              <td className="py-3.5 px-3 text-slate-400 font-medium">
                                {formatMonthStr(b.bookingDate)}
                              </td>

                              {/* 11. Date of Booking */}
                              <td className="py-3.5 px-3 text-slate-300">
                                {formatDateStr(b.bookingDate)}
                              </td>

                              {/* 12. Final Price */}
                              <td className="py-3.5 px-3 text-right font-mono text-emerald-400 font-bold">
                                {formatCurrency(b.finalPrice)}
                              </td>

                              {/* 13. Total Cost */}
                              <td className="py-3.5 px-3 text-right font-mono text-slate-200">
                                {formatCurrency(totalCost)}
                              </td>

                              {/* 14. Total Paid (EDITABLE IN QUICK-EDIT) */}
                              <td className="py-3.5 px-3 text-right font-mono text-indigo-300 font-bold">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(b)}
                                  className="hover:underline hover:text-indigo-200 cursor-pointer flex items-center gap-1 ml-auto"
                                  title="Click to edit Total Paid"
                                >
                                  <span>{formatCurrency(totalPaid)}</span>
                                  <Edit3 className="w-3 h-3 text-indigo-400 opacity-60 hover:opacity-100" />
                                </button>
                              </td>

                              {/* 15. Payment Remaining (Calculated, read-only) */}
                              <td className="py-3.5 px-3 text-right font-mono text-amber-400 font-bold">
                                {formatCurrency(paymentRemaining)}
                              </td>

                              {/* 16. % Payment Received (Calculated, read-only) */}
                              <td className="py-3.5 px-3 text-center">
                                <span className={`px-2 py-0.5 rounded-full font-mono text-[11px] font-bold border ${rawPct >= 100 ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30' : rawPct >= 50 ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'bg-red-500/15 text-red-400 border-red-500/30'}`}>
                                  {paymentPctStr}
                                </span>
                              </td>

                              {/* 17. Probable Registration Date (EDITABLE IN QUICK-EDIT) */}
                              <td className="py-3.5 px-3 text-slate-300">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(b)}
                                  className="hover:underline hover:text-white cursor-pointer"
                                >
                                  {formatDateStr(b.probableRegistrationDate)}
                                </button>
                              </td>

                              {/* 18. Current Status (Colored Badge, EDITABLE IN QUICK-EDIT) */}
                              <td className="py-3.5 px-3">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(b)}
                                  className="hover:opacity-80 cursor-pointer"
                                >
                                  {getStatusBadge(statusVal)}
                                </button>
                              </td>

                              {/* 19. Assigned (employee name) */}
                              <td className="py-3.5 px-3 text-slate-300">
                                {agent.name || 'Unassigned'}
                              </td>

                              {/* 20. Remarks (EDITABLE IN QUICK-EDIT) */}
                              <td className="py-3.5 px-3 text-slate-400 max-w-xs truncate">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditModal(b)}
                                  className="hover:text-slate-200 cursor-pointer truncate text-left block w-full"
                                >
                                  {b.remarks || '— (click to edit)'}
                                </button>
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>

            {/* Opportunities Across All Projects */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-200 flex items-center gap-2">
                  <span>🏢 Multi-Project Opportunities</span>
                  <span className="text-xs text-slate-400 font-normal">(Customer Portfolio)</span>
                </h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {opportunities.map((opp: any) => {
                  const hasBooking = bookings.some((bk: any) => String(bk.opportunity?._id || bk.opportunity) === String(opp._id));

                  return (
                    <Card
                      key={opp._id}
                      className="border-slate-800 bg-slate-900/80 hover:border-indigo-500/40 transition-all shadow-xl relative"
                    >
                      <CardHeader className="pb-2">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                            <span>🏙️ {opp.project?.name || 'Unassigned Project'}</span>
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            <Badge variant={getStageBadgeVariant(opp.stage)}>
                              {opp.stage ? opp.stage.replace('_', ' ') : 'new'}
                            </Badge>
                          </div>
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

                        {/* CONVERT TO BOOKING BUTTON */}
                        {opp.stage === 'won' && (
                          <div className="pt-2 border-t border-slate-800">
                            {hasBooking ? (
                              <span className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Booking Active in Table Above</span>
                              </span>
                            ) : isManagement ? (
                              <Button
                                onClick={() => handleOpenCreateModal(opp)}
                                className="w-full h-8 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20"
                              >
                                🎉 Record Booking for Won Deal
                              </Button>
                            ) : (
                              <span className="text-xs text-emerald-400 font-bold">
                                🎉 Deal Won (Booking Pending Admin Action)
                              </span>
                            )}
                          </div>
                        )}

                        <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Created: {new Date(opp.createdAt).toLocaleDateString()}</span>
                          <button
                            type="button"
                            onClick={() => navigate(`/leads/${opp._id}`)}
                            className="text-indigo-400 font-bold hover:underline"
                          >
                            View Opportunity Detail →
                          </button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* CREATE BOOKING MODAL */}
      {convertingOpp && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-emerald-400" />
                  <span>Record Property Booking</span>
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  Customer: <span className="text-slate-200 font-bold">{customer?.name}</span> • Project: <span className="text-slate-200 font-bold">{convertingOpp.project?.name}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConvertingOpp(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateBookingSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Contact */}
                <div className="space-y-1.5">
                  <Label htmlFor="contact" className="text-slate-300 font-semibold">Contact Phone</Label>
                  <Input
                    id="contact"
                    value={bookingForm.contact}
                    onChange={(e) => setBookingForm({ ...bookingForm, contact: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>

                {/* Location */}
                <div className="space-y-1.5">
                  <Label htmlFor="location" className="text-slate-300 font-semibold">Location / City</Label>
                  <Input
                    id="location"
                    value={bookingForm.location}
                    onChange={(e) => setBookingForm({ ...bookingForm, location: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>

                {/* Project Type */}
                <div className="space-y-1.5">
                  <Label htmlFor="projectType" className="text-slate-300 font-semibold">Project Type</Label>
                  <Input
                    id="projectType"
                    value={bookingForm.projectType}
                    onChange={(e) => setBookingForm({ ...bookingForm, projectType: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Unit Number */}
                <div className="space-y-1.5">
                  <Label htmlFor="unitNumber" className="text-slate-300 font-semibold">Unit Number</Label>
                  <Input
                    id="unitNumber"
                    placeholder="e.g. A-402 / Villa 12"
                    value={bookingForm.unitNumber}
                    onChange={(e) => setBookingForm({ ...bookingForm, unitNumber: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>

                {/* Sq.Ft Area */}
                <div className="space-y-1.5">
                  <Label htmlFor="sqftArea" className="text-slate-300 font-semibold">Sq.Ft Area</Label>
                  <Input
                    id="sqftArea"
                    type="number"
                    placeholder="e.g. 1450"
                    value={bookingForm.sqftArea}
                    onChange={(e) => setBookingForm({ ...bookingForm, sqftArea: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>

                {/* BHK */}
                <div className="space-y-1.5">
                  <Label htmlFor="bhk" className="text-slate-300 font-semibold">BHK Config (Optional)</Label>
                  <select
                    id="bhk"
                    value={bookingForm.bhk}
                    onChange={(e) => setBookingForm({ ...bookingForm, bhk: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="1BHK">1 BHK</option>
                    <option value="2BHK">2 BHK</option>
                    <option value="3BHK">3 BHK</option>
                    <option value="4BHK">4 BHK</option>
                    <option value="Penthouse">Penthouse</option>
                    <option value="Plot">Plot</option>
                    <option value="N/A">N/A</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Booking Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="bookingDate" className="text-slate-300 font-semibold">Date of Booking *</Label>
                  <Input
                    id="bookingDate"
                    type="date"
                    value={bookingForm.bookingDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, bookingDate: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                    required
                  />
                </div>

                {/* Probable Registration Date */}
                <div className="space-y-1.5">
                  <Label htmlFor="probableRegistrationDate" className="text-slate-300 font-semibold">Probable Registration Date</Label>
                  <Input
                    id="probableRegistrationDate"
                    type="date"
                    value={bookingForm.probableRegistrationDate}
                    onChange={(e) => setBookingForm({ ...bookingForm, probableRegistrationDate: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                {/* Final Price */}
                <div className="space-y-1.5">
                  <Label htmlFor="finalPrice" className="text-emerald-400 font-semibold">Final Price (₹) *</Label>
                  <Input
                    id="finalPrice"
                    type="number"
                    placeholder="e.g. 7500000"
                    value={bookingForm.finalPrice}
                    onChange={(e) => {
                      const val = e.target.value;
                      setBookingForm({
                        ...bookingForm,
                        finalPrice: val,
                        totalCost: bookingForm.totalCost ? bookingForm.totalCost : val
                      });
                    }}
                    className="bg-slate-950 border-emerald-500/30 text-emerald-300 h-9 font-mono"
                    required
                  />
                </div>

                {/* Total Cost */}
                <div className="space-y-1.5">
                  <Label htmlFor="totalCost" className="text-slate-300 font-semibold">Total Cost (₹) *</Label>
                  <Input
                    id="totalCost"
                    type="number"
                    placeholder="e.g. 7800000"
                    value={bookingForm.totalCost}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalCost: e.target.value })}
                    className="bg-slate-950 border-slate-800 h-9 font-mono"
                    required
                  />
                </div>

                {/* Initial Total Paid */}
                <div className="space-y-1.5">
                  <Label htmlFor="totalPaid" className="text-indigo-400 font-semibold">Total Paid (₹)</Label>
                  <Input
                    id="totalPaid"
                    type="number"
                    placeholder="e.g. 500000"
                    value={bookingForm.totalPaid}
                    onChange={(e) => setBookingForm({ ...bookingForm, totalPaid: e.target.value })}
                    className="bg-slate-950 border-indigo-500/30 text-indigo-300 h-9 font-mono"
                  />
                </div>
              </div>

              {/* Status & Remarks */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="status" className="text-slate-300 font-semibold">Initial Status</Label>
                  <select
                    id="status"
                    value={bookingForm.status}
                    onChange={(e) => setBookingForm({ ...bookingForm, status: e.target.value })}
                    className="w-full h-9 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="booked">Booked</option>
                    <option value="registration">Registration</option>
                    <option value="construction_in_progress">Construction In Progress</option>
                    <option value="completed">Completed</option>
                    <option value="unit_handover">Unit Handover</option>
                    <option value="deal_closed">Deal Closed</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="remarks" className="text-slate-300 font-semibold">Remarks</Label>
                  <Input
                    id="remarks"
                    placeholder="Notes..."
                    value={bookingForm.remarks}
                    onChange={(e) => setBookingForm({ ...bookingForm, remarks: e.target.value })}
                    className="bg-slate-900 border-slate-800 h-9"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setConvertingOpp(null)}
                  className="h-9 text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={createBookingMutation.isPending}
                  className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5"
                >
                  {createBookingMutation.isPending ? 'Saving Booking...' : 'Save Booking Record'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* QUICK EDIT DIALOG (Total Paid, Status, Probable Registration Date, Remarks) */}
      {editingBooking && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-lg w-full p-6 space-y-5 shadow-2xl my-8 relative">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-indigo-400" />
                  <span>Quick-Edit Booking Details</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customer: <span className="text-slate-200 font-bold">{customer?.name}</span> • Unit: <span className="text-indigo-300 font-bold">{editingBooking.unitNumber || 'N/A'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingBooking(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUpdateBookingSubmit} className="space-y-4 text-xs">
              {/* Total Paid */}
              <div className="space-y-1.5">
                <Label htmlFor="editTotalPaid" className="text-indigo-300 font-semibold flex items-center justify-between">
                  <span>Total Paid (₹)</span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    Total Cost: {formatCurrency(editingBooking.totalCost || editingBooking.finalPrice || 0)}
                  </span>
                </Label>
                <Input
                  id="editTotalPaid"
                  type="number"
                  placeholder="Enter new total paid amount..."
                  value={editTotalPaid}
                  onChange={(e) => setEditTotalPaid(e.target.value)}
                  className="bg-slate-900 border-indigo-500/30 text-indigo-200 h-9 font-mono text-xs"
                />
              </div>

              {/* Status */}
              <div className="space-y-1.5">
                <Label htmlFor="editStatus" className="text-slate-300 font-semibold">Current Status</Label>
                <select
                  id="editStatus"
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="w-full h-9 rounded-xl border border-slate-800 bg-slate-900 px-3 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                >
                  <option value="booked">Booked</option>
                  <option value="registration">Registration</option>
                  <option value="construction_in_progress">Construction In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="unit_handover">Unit Handover</option>
                  <option value="deal_closed">Deal Closed</option>
                </select>
              </div>

              {/* Probable Registration Date */}
              <div className="space-y-1.5">
                <Label htmlFor="editRegistrationDate" className="text-slate-300 font-semibold">Probable Registration Date</Label>
                <Input
                  id="editRegistrationDate"
                  type="date"
                  value={editRegistrationDate}
                  onChange={(e) => setEditRegistrationDate(e.target.value)}
                  className="bg-slate-900 border-slate-800 h-9 text-xs"
                />
              </div>

              {/* Remarks */}
              <div className="space-y-1.5">
                <Label htmlFor="editRemarks" className="text-slate-300 font-semibold">Remarks</Label>
                <textarea
                  id="editRemarks"
                  rows={3}
                  value={editRemarks}
                  onChange={(e) => setEditRemarks(e.target.value)}
                  placeholder="Enter remarks..."
                  className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setEditingBooking(null)}
                  className="h-8 text-xs text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={updateBookingMutation.isPending}
                  className="h-8 text-xs bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                >
                  {updateBookingMutation.isPending ? 'Saving Updates...' : 'Save Updates'}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

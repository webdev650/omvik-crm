import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import Navbar from '../components/Navbar';
import { getOpportunityById, updateOpportunityIntent } from '../api/opportunities';
import { getActivities } from '../api/activities';
import { getFollowupsByOpportunity } from '../api/followups';
import { Badge, getStageBadgeVariant } from '../components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../components/ui/tabs';
import ActivityTimeline from '../features/activities/ActivityTimeline';
import LogActivityForm from '../features/activities/LogActivityForm';
import OpportunitySiteVisits from '../features/siteVisits/OpportunitySiteVisits';
import { toast } from 'sonner';
import useAuth from '../hooks/useAuth';
import { getBookingByOpportunityId, createBooking } from '../api/bookings';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { X, Building2, Calendar, FileText, Phone, ChevronRight } from 'lucide-react';
import { ordinalNum, ordinalDate, shortDateTime, shortOrdinalDate } from '../utils/dateFormat';

// ── Contact History + Next Contact Date Panel ─────────────────────────────────

const CHANNEL_ICONS: Record<string, string> = {
  call: '📞', whatsapp: '💬', email: '📧', meeting: '🤝', note: '📝'
};
const OUTCOME_COLORS: Record<string, string> = {
  connected: 'text-emerald-400', no_answer: 'text-slate-400', busy: 'text-amber-400',
  switched_off: 'text-slate-400', wrong_number: 'text-red-400',
  interested: 'text-indigo-400', not_interested: 'text-red-400'
};

function ContactHistoryPanel({ opportunityId }: { opportunityId: string }) {
  const { data: actData } = useQuery({
    queryKey: ['activities', opportunityId],
    queryFn: () => getActivities(opportunityId),
    enabled: !!opportunityId
  });

  const { data: fuData } = useQuery({
    queryKey: ['followups', 'opportunity', opportunityId],
    queryFn: () => getFollowupsByOpportunity(opportunityId),
    enabled: !!opportunityId
  });

  // Sort activities oldest → newest for ordinal numbering
  const activities: any[] = [...(actData?.activities ?? [])].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );

  // Next Contact Date = earliest SCHEDULED (not completed/missed) followup
  const scheduledFollowups: any[] = (fuData?.followups ?? []).filter(
    (f: any) => f.status === 'scheduled' && new Date(f.dueAt) > new Date()
  );
  scheduledFollowups.sort((a, b) => new Date(a.dueAt).getTime() - new Date(b.dueAt).getTime());
  const nextFollowup = scheduledFollowups[0] ?? null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {/* ── Next Contact Date (callout card) ── */}
      <div className={`rounded-2xl border p-5 flex flex-col gap-2 ${
        nextFollowup
          ? 'border-indigo-500/30 bg-indigo-500/5'
          : 'border-slate-800 bg-slate-900/40'
      }`}>
        <div className="flex items-center gap-2">
          <Calendar className={`w-4 h-4 ${nextFollowup ? 'text-indigo-400' : 'text-slate-500'}`} />
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Next Contact Date
          </p>
        </div>
        {nextFollowup ? (
          <>
            <p className="text-lg font-extrabold text-indigo-300 leading-tight">
              {shortOrdinalDate(nextFollowup.dueAt)}
            </p>
            {nextFollowup.purpose && (
              <p className="text-xs text-slate-400 font-medium">{nextFollowup.purpose}</p>
            )}
            <p className="text-[10px] text-slate-500 font-mono">
              Assigned to: {nextFollowup.owner?.name ?? 'Unassigned'}
            </p>
          </>
        ) : (
          <p className="text-sm text-slate-500 italic font-medium mt-1">
            Not scheduled yet
          </p>
        )}
      </div>

      {/* ── Contact History (takes 2 cols) ── */}
      <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex items-center gap-2 mb-3">
          <Phone className="w-4 h-4 text-slate-500" />
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Contact History
          </p>
          {activities.length > 0 && (
            <span className="ml-auto text-[10px] font-bold bg-slate-800 text-slate-400 px-2 py-0.5 rounded-full border border-slate-700">
              {activities.length} contact{activities.length !== 1 ? 's' : ''}
            </span>
          )}
        </div>

        {activities.length === 0 ? (
          <p className="text-xs text-slate-600 italic py-4 text-center">
            No contact attempts recorded yet.
          </p>
        ) : (
          <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
            {activities.map((act: any, index: number) => (
              <div key={act._id}
                className="flex items-center gap-3 p-2.5 rounded-xl bg-slate-800/40 border border-slate-800 hover:border-slate-700 transition-colors"
              >
                {/* Ordinal badge */}
                <span className="text-[10px] font-black text-slate-500 bg-slate-900 px-2 py-0.5 rounded-full border border-slate-700 shrink-0 whitespace-nowrap">
                  {ordinalNum(index + 1)}
                </span>

                {/* Channel icon */}
                <span className="text-base shrink-0">
                  {CHANNEL_ICONS[act.channel] ?? '📌'}
                </span>

                {/* Date */}
                <span className="text-xs font-semibold text-slate-300 shrink-0">
                  {ordinalDate(act.createdAt)}
                </span>

                {/* Outcome */}
                <span className={`text-[11px] font-bold capitalize ml-auto shrink-0 ${OUTCOME_COLORS[act.outcome] ?? 'text-slate-400'}`}>
                  {act.outcome?.replace('_', ' ')}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function OpportunityDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const isPrivilegedRole = user?.role && ['admin', 'super_admin', 'director', 'team_lead'].includes(user.role);

  const { data, isLoading, isError } = useQuery({
    queryKey: ['opportunity', id],
    queryFn: () => getOpportunityById(id!),
    enabled: !!id,
    retry: 1
  });

  const opp = data?.opportunity;

  const { data: bookingCheckData } = useQuery({
    queryKey: ['booking', 'opportunity', id],
    queryFn: () => getBookingByOpportunityId(id!),
    enabled: !!id && opp?.stage === 'won'
  });

  const existingBooking = bookingCheckData?.booking;

  const [isBookingModalOpen, setIsBookingModalOpen] = useState(false);
  const [bookingForm, setBookingForm] = useState({
    unitNumber: '',
    sqftArea: '',
    bhk: '2BHK',
    bookingDate: new Date().toISOString().split('T')[0],
    finalPrice: '',
    totalCost: '',
    totalPaid: '0',
    probableRegistrationDate: '',
    currentStatus: 'booked',
    remarks: '',
    address: '',
    city: ''
  });

  const intentMutation = useMutation({
    mutationFn: (newIntent: 'high' | 'medium' | 'low') => updateOpportunityIntent(id!, newIntent),
    onSuccess: (res) => {
      toast.success(res.message || 'Intent updated');
      queryClient.invalidateQueries({ queryKey: ['opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to update intent.');
    }
  });

  const createBookingMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: () => {
      toast.success('🎉 Booking record created successfully!');
      setIsBookingModalOpen(false);
      queryClient.invalidateQueries({ queryKey: ['booking', 'opportunity', id] });
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
      navigate('/bookings');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to create booking.');
    }
  });

  const handleBookingSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!bookingForm.finalPrice || Number(bookingForm.finalPrice) <= 0) {
      toast.error('Final closing price is required');
      return;
    }
    const cost = bookingForm.totalCost ? Number(bookingForm.totalCost) : Number(bookingForm.finalPrice);

    createBookingMutation.mutate({
      opportunityId: id,
      unitNumber: bookingForm.unitNumber,
      sqftArea: bookingForm.sqftArea ? Number(bookingForm.sqftArea) : 0,
      bhk: bookingForm.bhk,
      bookingDate: bookingForm.bookingDate,
      finalPrice: Number(bookingForm.finalPrice),
      totalCost: cost,
      totalPaid: Number(bookingForm.totalPaid || 0),
      probableRegistrationDate: bookingForm.probableRegistrationDate || null,
      currentStatus: bookingForm.currentStatus,
      remarks: bookingForm.remarks,
      address: bookingForm.address || opp?.customer?.address || '',
      city: bookingForm.city || opp?.customer?.city || ''
    });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-5xl mx-auto relative z-10">
        <Navbar />

        {/* Breadcrumb */}
        <nav className="flex items-center gap-2 text-xs text-slate-500 mb-6">
          <Link to="/leads" className="hover:text-indigo-400 transition-colors">
            ← Leads & Pipeline
          </Link>
          <span>/</span>
          <span className="text-slate-300 font-medium">
            {opp?.customer?.name ?? 'Opportunity Detail'}
          </span>
        </nav>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            <div className="h-40 w-full bg-slate-800/40 rounded-2xl animate-pulse" />
            <div className="h-64 w-full bg-slate-800/40 rounded-2xl animate-pulse" />
          </div>
        )}

        {/* Error / 404 */}
        {isError && !isLoading && (
          <div className="p-12 rounded-2xl border border-red-500/20 bg-red-500/5 text-center space-y-3">
            <p className="text-red-400 font-semibold text-lg">Opportunity not found</p>
            <p className="text-slate-500 text-sm">
              This record doesn't exist or you don't have access to it.
            </p>
            <button
              onClick={() => navigate('/leads')}
              className="px-4 py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-semibold hover:bg-slate-700 transition-colors"
            >
              Return to Leads
            </button>
          </div>
        )}

        {/* Opportunity Header Card */}
        {opp && (
          <div className="space-y-6">
            <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
              <CardContent className="p-6 sm:p-8">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

                  {/* Left: Customer & Project Info */}
                  <div className="space-y-4">
                    <div>
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                        Customer
                      </p>
                      <div className="flex flex-wrap items-center gap-3">
                        <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                          {opp.customer?.name}
                        </h1>
                        {opp.customer?._id && (
                          <Button
                            onClick={() => navigate(`/customers/${opp.customer._id}`)}
                            variant="outline"
                            className="h-7 text-[11px] font-bold border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                          >
                            View Customer 360 →
                          </Button>
                        )}
                      </div>
                      <p className="text-slate-400 font-mono text-sm mt-1">
                        {opp.customer?.primaryMobile}
                      </p>
                    </div>

                    <div className="grid grid-cols-2 gap-6">
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Project
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                          {opp.project?.name}
                        </p>
                        {opp.project?.location && (
                          <p className="text-xs text-slate-400">{opp.project.location}</p>
                        )}
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Assigned To
                        </p>
                        <p className="text-sm font-semibold text-slate-100">
                          {opp.owner?.name ?? 'Unassigned'}
                        </p>
                        {opp.owner?.role && (
                          <p className="text-xs text-slate-400 capitalize">{opp.owner.role}</p>
                        )}
                      </div>

                      {opp.source && (
                        <div>
                          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                            Source
                          </p>
                          <p className="text-sm text-slate-300 font-bold uppercase">
                            {opp.source.replace('_', ' ')}
                          </p>
                        </div>
                      )}

                      {/* Intent Level Dropdown */}
                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Lead Intent
                        </p>
                        <select
                          value={opp.intent || 'medium'}
                          onChange={(e) => intentMutation.mutate(e.target.value as any)}
                          disabled={intentMutation.isPending}
                          className="bg-slate-950 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 font-bold focus:border-indigo-500"
                        >
                          <option value="high">🟢 High Intent (Active)</option>
                          <option value="medium">🟡 Medium Intent (Active)</option>
                          <option value="low">🔴 Low Intent (Inactive)</option>
                        </select>
                      </div>

                      <div>
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">
                          Created
                        </p>
                        <p className="text-sm text-slate-300">
                          {opp.createdAt ? new Date(opp.createdAt).toLocaleDateString('en-IN', {
                            day: 'numeric', month: 'short', year: 'numeric'
                          }) : '—'}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Right: Stage & SLA Badges */}
                  <div className="flex flex-col items-start sm:items-end gap-3">
                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        Stage
                      </p>
                      <Badge variant={getStageBadgeVariant(opp.stage)} className="text-sm px-3 py-1">
                        {opp.stage?.replace('_', ' ')}
                      </Badge>
                    </div>

                    <div className="space-y-1">
                      <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                        SLA Status (48h Threshold)
                      </p>
                      {opp.slaBreached ? (
                        <Badge variant="destructive" className="animate-pulse text-sm px-3 py-1">
                          ⚠️ SLA BREACHED (&gt;48h)
                        </Badge>
                      ) : (
                        <Badge variant="success" className="text-sm px-3 py-1">
                          ✓ ON TRACK
                        </Badge>
                      )}
                    </div>

                    {opp.lastContactedAt && (
                      <div className="space-y-1">
                        <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                          Last Contacted
                        </p>
                        <p className="text-xs text-slate-400 font-mono">
                          {new Date(opp.lastContactedAt).toLocaleString('en-IN', {
                            day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                          })}
                        </p>
                      </div>
                    )}

                    {/* CONVERT TO BOOKING BUTTON (Visible when stage === 'won') */}
                    {opp.stage === 'won' && (
                      <div className="pt-2">
                        {existingBooking ? (
                          <Button
                            onClick={() => navigate('/bookings')}
                            className="bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30 text-xs font-bold"
                          >
                            ✓ Booking Record Created →
                          </Button>
                        ) : isPrivilegedRole ? (
                          <Button
                            onClick={() => setIsBookingModalOpen(true)}
                            className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/20 text-xs font-bold flex items-center gap-2"
                          >
                            <span>🎉 Convert to Customer Booking</span>
                          </Button>
                        ) : (
                          <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-3 py-1.5 rounded-xl border border-emerald-500/20">
                            🎉 Deal Won (Booking Pending Admin Action)
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* ── Contact History + Next Contact Date Panel ─────────────────── */}
            <ContactHistoryPanel opportunityId={id!} />

            {/* Tabs Shell */}
            <Tabs defaultValue="activities">
              <TabsList>
                <TabsTrigger value="activities">Activity Timeline</TabsTrigger>
                <TabsTrigger value="log">Log Activity</TabsTrigger>
                <TabsTrigger value="siteVisits">🏡 Site Visits</TabsTrigger>
                <TabsTrigger value="followups">Follow-up</TabsTrigger>
              </TabsList>

              <TabsContent value="activities">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Activity Timeline</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ActivityTimeline opportunityId={id!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="log">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Log New Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <LogActivityForm
                      opportunityId={id!}
                      currentStage={opp.stage}
                    />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="siteVisits">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardContent className="p-6">
                    <OpportunitySiteVisits opportunityId={id!} />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="followups">
                <Card className="border-slate-800 bg-slate-900/60 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="text-base">Follow-up</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-slate-500 italic">
                      Scheduled follow-ups and touchpoints for this lead.
                    </p>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        )}

        {/* CONVERT TO BOOKING MODAL DIALOG */}
        {isBookingModalOpen && opp && (
          <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
            <div className="bg-[#0f172a] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 space-y-6 shadow-2xl my-8 relative">
              <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-emerald-400" />
                    <span>Convert Deal to Customer Booking</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Customer: <span className="text-slate-200 font-bold">{opp.customer?.name}</span> ({opp.customer?.primaryMobile}) • Project: <span className="text-slate-200 font-bold">{opp.project?.name}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsBookingModalOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4 text-xs">
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

                  {/* Sq.ft Area */}
                  <div className="space-y-1.5">
                    <Label htmlFor="sqftArea" className="text-slate-300 font-semibold">Sq.ft Area</Label>
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
                    <Label htmlFor="bhk" className="text-slate-300 font-semibold">BHK Config</Label>
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
                    <Label htmlFor="finalPrice" className="text-emerald-400 font-semibold">Final Closing Price (₹) *</Label>
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
                    <Label htmlFor="totalCost" className="text-slate-300 font-semibold">Total Cost (incl. charges ₹) *</Label>
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
                    <Label htmlFor="totalPaid" className="text-indigo-400 font-semibold">Initial Payment Received (₹)</Label>
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

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Customer Address */}
                  <div className="space-y-1.5">
                    <Label htmlFor="address" className="text-slate-300 font-semibold">Customer Full Address</Label>
                    <Input
                      id="address"
                      placeholder="e.g. Flat 301, Sunshine Heights, Jubilee Hills"
                      value={bookingForm.address}
                      onChange={(e) => setBookingForm({ ...bookingForm, address: e.target.value })}
                      className="bg-slate-900 border-slate-800 h-9"
                    />
                  </div>

                  {/* Location / City */}
                  <div className="space-y-1.5">
                    <Label htmlFor="city" className="text-slate-300 font-semibold">Location / City</Label>
                    <Input
                      id="city"
                      placeholder="e.g. Hyderabad"
                      value={bookingForm.city}
                      onChange={(e) => setBookingForm({ ...bookingForm, city: e.target.value })}
                      className="bg-slate-900 border-slate-800 h-9"
                    />
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-1.5">
                  <Label htmlFor="remarks" className="text-slate-300 font-semibold">Booking Remarks</Label>
                  <textarea
                    id="remarks"
                    rows={2}
                    placeholder="Enter special payment structure notes, agreement terms..."
                    value={bookingForm.remarks}
                    onChange={(e) => setBookingForm({ ...bookingForm, remarks: e.target.value })}
                    className="w-full rounded-xl border border-slate-800 bg-slate-900 p-2 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-3 pt-3 border-t border-slate-800">
                  <Button
                    type="button"
                    variant="ghost"
                    onClick={() => setIsBookingModalOpen(false)}
                    className="h-9 text-xs text-slate-400"
                  >
                    Cancel
                  </Button>
                  <Button
                    type="submit"
                    disabled={createBookingMutation.isPending}
                    className="h-9 text-xs bg-emerald-600 hover:bg-emerald-500 text-white font-bold px-5"
                  >
                    {createBookingMutation.isPending ? 'Creating Booking...' : 'Create Booking Record'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, AlertTriangle, Send, Calendar, User as UserIcon, Layers, MessageSquare, Phone, PhoneCall, MapPin, BookmarkCheck } from 'lucide-react';
import Navbar from '../components/Navbar';
import useAuth from '../hooks/useAuth';
import { submitDailyReport, getTodayReport } from '../api/dailyReports';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function DailyReportPage() {
  const { user } = useAuth();

  const [whatsappMessages, setWhatsappMessages] = useState<number | ''>('');
  const [calls, setCalls] = useState<number | ''>('');
  const [connectedCalls, setConnectedCalls] = useState<number | ''>('');
  const [followups, setFollowups] = useState<number | ''>('');
  const [siteVisits, setSiteVisits] = useState<number | ''>('');
  const [bookingsToday, setBookingsToday] = useState<number | ''>('');
  const [notes, setNotes] = useState('');

  const { data, refetch } = useQuery({
    queryKey: ['todayDailyReport'],
    queryFn: getTodayReport
  });

  const existingReport = data?.report;
  const leadsAssignedCount = data?.leadsAssigned ?? existingReport?.leadsAssigned ?? 0;

  // Format today's date as DD-MM-YYYY
  const now = new Date();
  const dayStr = String(now.getDate()).padStart(2, '0');
  const monthStr = String(now.getMonth() + 1).padStart(2, '0');
  const yearStr = now.getFullYear();
  const formattedTodayDate = `${dayStr}-${monthStr}-${yearStr}`;

  useEffect(() => {
    if (existingReport) {
      setWhatsappMessages(existingReport.whatsappMessages ?? 0);
      setCalls(existingReport.claimedCalls ?? 0);
      setConnectedCalls(existingReport.connectedCalls ?? 0);
      setFollowups(existingReport.claimedFollowups ?? 0);
      setSiteVisits(existingReport.claimedSiteVisits ?? 0);
      setBookingsToday(existingReport.bookingsToday ?? 0);
      setNotes(existingReport.notes || '');
    }
  }, [existingReport]);

  const mutation = useMutation({
    mutationFn: submitDailyReport,
    onSuccess: (res) => {
      toast.success(res.message || 'Daily report submitted successfully!');
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit daily report.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      whatsappMessages: Number(whatsappMessages) || 0,
      claimedCalls: Number(calls) || 0,
      connectedCalls: Number(connectedCalls) || 0,
      claimedFollowups: Number(followups) || 0,
      claimedSiteVisits: Number(siteVisits) || 0,
      bookingsToday: Number(bookingsToday) || 0,
      notes: notes.trim()
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <FileText className="w-3.5 h-3.5" />
              <span>End-of-Day (EOD) Submission</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Daily Activity Report
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              Submit your daily sales accomplishments. Figures are automatically cross-referenced with your logged activities.
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto space-y-6">
          {/* Main Submission Card */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 sm:p-8 shadow-sm space-y-8">
            <div className="border-b border-slate-800/60 pb-4">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Today's Sales & Activity Accomplishments</span>
                {existingReport && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
                    EOD Submitted ✓
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Please review your read-only employee context and complete all daily reported activity counts.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              
              {/* SECTION 1: READ-ONLY CONTEXT HEADER FIELDS */}
              <div className="space-y-3">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" />
                  <span>1. Executive & Context Details (Read-Only)</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  {/* Field 1: Date */}
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800/80 space-y-1">
                    <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <Calendar className="w-3 h-3 text-indigo-400" />
                      <span>Date</span>
                    </Label>
                    <p className="font-mono text-base font-bold text-white">{formattedTodayDate}</p>
                  </div>

                  {/* Field 2: Telesales Executive Name */}
                  <div className="p-4 rounded-xl bg-[#0b0f19] border border-slate-800/80 space-y-1">
                    <Label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                      <UserIcon className="w-3 h-3 text-indigo-400" />
                      <span>Telesales Executive Name</span>
                    </Label>
                    <p className="text-base font-bold text-white truncate">{user?.name || 'Telesales Executive'}</p>
                  </div>

                  {/* Field 3: Leads Assigned (Auto-Computed) */}
                  <div className="p-4 rounded-xl bg-indigo-500/10 border border-indigo-500/30 space-y-1">
                    <Label className="block text-[10px] font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers className="w-3 h-3 text-indigo-400" />
                      <span>Leads Assigned (Current Total)</span>
                    </Label>
                    <p className="font-mono text-xl font-black text-indigo-400">{leadsAssignedCount}</p>
                  </div>
                </div>
              </div>

              {/* SECTION 2: EDITABLE NUMERIC INPUTS */}
              <div className="space-y-4 pt-2 border-t border-slate-800/60">
                <div className="text-xs font-bold text-indigo-400 uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  <span>2. Self-Reported Accomplishments</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  
                  {/* Field 4: WhatsApp Messages Sent */}
                  <div className="space-y-2 p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                    <Label htmlFor="whatsappMessages" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5 text-emerald-400" />
                      <span>WhatsApp Messages Sent</span>
                    </Label>
                    <Input
                      id="whatsappMessages"
                      type="number"
                      min={0}
                      value={whatsappMessages}
                      onChange={(e) => setWhatsappMessages(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="bg-[#131c31] border-slate-800 text-emerald-400 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-emerald-500"
                    />
                  </div>

                  {/* Field 5: Number of Calls */}
                  <div className="space-y-2 p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                    <Label htmlFor="calls" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-blue-400" />
                      <span>Number of Calls</span>
                    </Label>
                    <Input
                      id="calls"
                      type="number"
                      min={0}
                      value={calls}
                      onChange={(e) => setCalls(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="bg-[#131c31] border-slate-800 text-blue-400 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-blue-500"
                    />
                  </div>

                  {/* Field 6: Number of Connected Calls */}
                  <div className="space-y-2 p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                    <Label htmlFor="connectedCalls" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <PhoneCall className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Number of Connected Calls</span>
                    </Label>
                    <Input
                      id="connectedCalls"
                      type="number"
                      min={0}
                      value={connectedCalls}
                      onChange={(e) => setConnectedCalls(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="bg-[#131c31] border-slate-800 text-cyan-400 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-cyan-500"
                    />
                  </div>

                  {/* Field 7: Number of Visits */}
                  <div className="space-y-2 p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                    <Label htmlFor="siteVisits" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-purple-400" />
                      <span>Number of Visits</span>
                    </Label>
                    <Input
                      id="siteVisits"
                      type="number"
                      min={0}
                      value={siteVisits}
                      onChange={(e) => setSiteVisits(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="bg-[#131c31] border-slate-800 text-purple-400 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-purple-500"
                    />
                  </div>

                  {/* Field 8: Number of Bookings */}
                  <div className="space-y-2 p-4 rounded-xl bg-[#0b0f19] border border-slate-800 sm:col-span-2 lg:col-span-1">
                    <Label htmlFor="bookingsToday" className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                      <BookmarkCheck className="w-3.5 h-3.5 text-amber-400" />
                      <span>Number of Bookings</span>
                    </Label>
                    <Input
                      id="bookingsToday"
                      type="number"
                      min={0}
                      value={bookingsToday}
                      onChange={(e) => setBookingsToday(e.target.value === '' ? '' : Number(e.target.value))}
                      placeholder="0"
                      className="bg-[#131c31] border-slate-800 text-amber-400 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-amber-500"
                    />
                  </div>

                </div>
              </div>

              {/* SECTION 3: NOTES & REMARKS */}
              <div className="space-y-2 pt-2 border-t border-slate-800/60">
                <Label htmlFor="notes" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  💬 Daily Summary & Notes / Remarks (Optional)
                </Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention key outcomes, client feedback, or explanations for personal phone calls / offline followups..."
                  className="w-full p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-600 font-sans"
                />
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2 cursor-pointer transition-all"
              >
                <Send className="w-4 h-4" />
                <span>{mutation.isPending ? 'Submitting Report...' : 'Submit End-of-Day Report'}</span>
              </Button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}

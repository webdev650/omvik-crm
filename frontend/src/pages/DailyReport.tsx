import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { FileText, AlertTriangle, Send } from 'lucide-react';
import Navbar from '../components/Navbar';
import { submitDailyReport, getTodayReport } from '../api/dailyReports';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function DailyReportPage() {
  const [calls, setCalls] = useState<number | ''>('');
  const [followups, setFollowups] = useState<number | ''>('');
  const [siteVisits, setSiteVisits] = useState<number | ''>('');
  const [notes, setNotes] = useState('');
  const [discrepancyNotice, setDiscrepancyNotice] = useState<string | null>(null);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ['todayDailyReport'],
    queryFn: getTodayReport
  });

  const existingReport = data?.report;

  useEffect(() => {
    if (existingReport) {
      setCalls(existingReport.claimedCalls);
      setFollowups(existingReport.claimedFollowups);
      setSiteVisits(existingReport.claimedSiteVisits);
      setNotes(existingReport.notes || '');
      if (existingReport.discrepancyFlag) {
        setDiscrepancyNotice(existingReport.discrepancyNote);
      }
    }
  }, [existingReport]);

  const mutation = useMutation({
    mutationFn: submitDailyReport,
    onSuccess: (res) => {
      toast.success(res.message);
      if (res.discrepancyFlag) {
        setDiscrepancyNotice(res.report?.discrepancyNote || 'System cross-check flagged an activity difference.');
      } else {
        setDiscrepancyNotice(null);
      }
      refetch();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to submit daily report.');
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      claimedCalls: Number(calls) || 0,
      claimedFollowups: Number(followups) || 0,
      claimedSiteVisits: Number(siteVisits) || 0,
      notes: notes.trim()
    });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm max-w-4xl mx-auto">
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
          {/* Discrepancy Notice Alert Banner */}
          {discrepancyNotice && (
            <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-xs uppercase tracking-wider text-amber-400">
                <AlertTriangle className="w-4 h-4" />
                <span>System Activity Cross-Check Note</span>
              </div>
              <p className="text-xs text-amber-200/90 leading-relaxed">
                Your reported numbers differ from what's logged in the system ({discrepancyNotice}). Your report has been saved, and your administrator has been notified to review any additional notes provided.
              </p>
            </div>
          )}

          {/* Main Submission Card */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 shadow-sm space-y-6">
            <div className="border-b border-slate-800/60 pb-4">
              <h3 className="text-lg font-bold text-white">Today's Accomplishments Summary</h3>
              <p className="text-xs text-slate-400">
                Enter the total calls, follow-ups, and site visits completed today.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                
                {/* Calls Input */}
                <div className="space-y-2">
                  <Label htmlFor="calls" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    📞 Total Calls Made
                  </Label>
                  <Input
                    id="calls"
                    type="number"
                    min={0}
                    value={calls}
                    onChange={(e) => setCalls(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-indigo-600"
                  />
                </div>

                {/* Followups Input */}
                <div className="space-y-2">
                  <Label htmlFor="followups" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    ⏰ Follow-ups Completed
                  </Label>
                  <Input
                    id="followups"
                    type="number"
                    min={0}
                    value={followups}
                    onChange={(e) => setFollowups(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-indigo-600"
                  />
                </div>

                {/* Site Visits Input */}
                <div className="space-y-2">
                  <Label htmlFor="siteVisits" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    🚗 Site Visits Conducted
                  </Label>
                  <Input
                    id="siteVisits"
                    type="number"
                    min={0}
                    value={siteVisits}
                    onChange={(e) => setSiteVisits(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-[#0b0f19] border-slate-800 text-slate-100 font-mono text-xl font-black text-center h-12 rounded-xl focus:border-indigo-600"
                  />
                </div>

              </div>

              {/* Notes Field */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  💬 Daily Summary & Notes (Optional)
                </Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention key outcomes, client feedback, or explanations if calls were made via personal phone..."
                  className="w-full p-3.5 rounded-xl bg-[#0b0f19] border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-indigo-600"
                />
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full h-12 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-indigo-600/20 flex items-center justify-center gap-2"
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

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
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
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden font-sans">
      {/* Background Accent Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-3xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
              📝 End-of-Day (EOD) Submissions
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              Daily Activity Report
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              Submit your daily sales accomplishments. Figures are automatically cross-referenced with your logged activities.
            </p>
          </div>
        </div>

        {/* Discrepancy Notice Alert Banner */}
        {discrepancyNotice && (
          <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-300 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <span>⚠️ System Activity Cross-Check Note</span>
            </div>
            <p className="text-xs text-amber-200/90 leading-relaxed">
              Your reported numbers differ from what's logged in the system ({discrepancyNotice}). Your report has been saved, and your administrator has been notified to review any additional notes provided.
            </p>
          </div>
        )}

        {/* Main Submission Card */}
        <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Today's Accomplishments Summary</CardTitle>
            <CardDescription>
              Enter the total calls, follow-ups, and site visits completed today.
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                
                {/* Calls Input */}
                <div className="space-y-2">
                  <Label htmlFor="calls" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    📞 Total Calls Made
                  </Label>
                  <Input
                    id="calls"
                    type="number"
                    min={0}
                    value={calls}
                    onChange={(e) => setCalls(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-lg font-bold text-center h-12"
                  />
                </div>

                {/* Followups Input */}
                <div className="space-y-2">
                  <Label htmlFor="followups" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    ⏰ Follow-ups Completed
                  </Label>
                  <Input
                    id="followups"
                    type="number"
                    min={0}
                    value={followups}
                    onChange={(e) => setFollowups(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-lg font-bold text-center h-12"
                  />
                </div>

                {/* Site Visits Input */}
                <div className="space-y-2">
                  <Label htmlFor="siteVisits" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                    🚗 Site Visits Conducted
                  </Label>
                  <Input
                    id="siteVisits"
                    type="number"
                    min={0}
                    value={siteVisits}
                    onChange={(e) => setSiteVisits(e.target.value === '' ? '' : Number(e.target.value))}
                    placeholder="0"
                    className="bg-slate-950 border-slate-800 text-slate-100 font-mono text-lg font-bold text-center h-12"
                  />
                </div>

              </div>

              {/* Notes Field */}
              <div className="space-y-2">
                <Label htmlFor="notes" className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  💬 Daily Summary & Notes (Optional)
                </Label>
                <textarea
                  id="notes"
                  rows={3}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Mention key outcomes, client feedback, or explanations if calls were made via personal phone..."
                  className="w-full p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-indigo-500"
                />
              </div>

              <Button
                type="submit"
                disabled={mutation.isPending}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-12 text-sm"
              >
                {mutation.isPending ? 'Submitting Report...' : 'Submit End-of-Day Report'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

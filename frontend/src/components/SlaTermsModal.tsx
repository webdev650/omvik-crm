import React, { useState } from 'react';
import {
  ShieldCheck,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Search,
  Building,
  UserCheck,
  Lock,
  History,
  Scale
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription
} from './ui/dialog';
import { Input } from './ui/input';
import { Badge } from './ui/badge';

export interface ServiceStandardItem {
  id: number;
  activity: string;
  sla: string;
  requirement: string;
}

export interface SlaTermCondition {
  id: number;
  term: string;
  rule: string;
}

export const SERVICE_STANDARDS_DATA: ServiceStandardItem[] = [
  { id: 1, activity: 'Lead Assignment → 1st Contact', sla: 'Within 24 hours', requirement: 'Executive must make the first contact attempt.' },
  { id: 2, activity: '1st Contact → Lead Qualification', sla: 'Within 48 hours', requirement: 'Lead intent, temperature, requirement and project interest should be updated.' },
  { id: 3, activity: 'First Follow-Up', sla: 'Every 2 days Gap', requirement: 'Connecting with all connected / didn’t pick calls.' },
  { id: 4, activity: 'Positive / Hot Lead Follow-up', sla: 'Every 1–2 days', requirement: 'Active engagement should be maintained until the next defined action.' },
  { id: 5, activity: 'Positive / Warm Lead Follow-up', sla: 'Every 3–5 days', requirement: 'Follow-up should continue based on customer interest.' },
  { id: 6, activity: 'Mixed Intent Lead', sla: 'Every 5–7 days', requirement: 'Address objections, doubts and decision barriers.' },
  { id: 7, activity: 'Negative Intent Lead', sla: 'Every 15–30 days', requirement: 'Follow-up should be non-aggressive and focused on re-engagement.' },
  { id: 8, activity: 'Cold Lead', sla: 'Every 15–30 days', requirement: 'Lead should remain in a structured nurturing cycle.' },
  { id: 9, activity: 'Customer-Requested Follow-up', sla: 'As committed', requirement: 'Follow-up must happen on the date/time committed to the customer.' },
  { id: 10, activity: 'Site Visit Scheduled → Confirmation', sla: 'Within 24 hours', requirement: 'Visit details and confirmation should be updated in CRM.' },
  { id: 11, activity: 'Site Visit → Follow-up', sla: 'Within 24 hours', requirement: 'Feedback, interest level and next action must be recorded.' },
  { id: 12, activity: 'Quotation / Proposal Request', sla: 'Within 24 hours', requirement: 'Quotation/proposal should be shared or the reason for delay recorded.' },
  { id: 13, activity: 'Overdue Activity', sla: 'After SLA expires', requirement: 'Activity automatically moves to Overdue status.' },
  { id: 14, activity: 'Overdue → Escalation', sla: 'After 48 hours', requirement: 'Unresolved overdue activities may be escalated to the reporting manager.' }
];

export const SLA_TERMS_CONDITIONS_DATA: SlaTermCondition[] = [
  { id: 1, term: 'Working Hours', rule: 'Response timelines will be calculated during and also defined business hours.' },
  { id: 2, term: 'Lead Assignment', rule: 'The assigned Executive becomes responsible for the lead from the time of assignment.' },
  { id: 3, term: 'Lead Reassignment', rule: "If a lead is reassigned, the new Executive's response timeline starts from re-assignment and specially marked as reassigned/duplicate." },
  { id: 4, term: 'Intent / Update', rule: 'Lead temperature and intent must be updated whenever there is a significant change in customer behaviour or communication (POSITIVE, NEGATIVE OR MIXED).' },
  { id: 5, term: 'Customer-Requested Delay', rule: 'If the customer specifically requests a later callback or follow-up, the revised date/time should be recorded and the original SLA should not be treated as an Executive delay.' },
  { id: 6, term: 'Unreachable Lead', rule: 'Multiple unsuccessful contact attempts should be logged before moving a lead to a longer follow-up cycle (10 days or once in a month).' },
  { id: 7, term: 'Follow-up Commitment', rule: 'Any commitment made to a customer must be entered into the CRM with a specific date/time or Day or Gap of number of days.' },
  { id: 8, term: 'Mandatory Activity Log', rule: 'Calls, WhatsApp communication, meetings, site visits and important customer interactions should be recorded in the CRM.' },
  { id: 9, term: 'No False Closure', rule: 'A lead should not be marked as Closed, Lost or Not Interested without an appropriate reason being recorded and must be approved by the super admin.' },
  { id: 10, term: 'Overdue Activities', rule: 'Overdue activities should remain visible until completed, rescheduled with a valid reason, or appropriately closed.' },
  { id: 11, term: 'Escalation', rule: 'Repeated overdue actions or unattended Hot/Positive leads may be escalated to the reporting manager.' },
  { id: 12, term: 'Duplicate Leads', rule: 'Duplicate records should not be created merely to avoid an overdue status or restart the response timeline. Duplicates can only be added with permission of the super admin.' },
  { id: 13, term: 'Leave / Absence', rule: 'Leads and pending activities of an absent Executive should be reassigned to another authorized Executive where required.' },
  { id: 14, term: 'System Issues', rule: 'Verified CRM/system downtime may be excluded from SLA calculations.' },
  { id: 15, term: 'Management Override', rule: 'Only authorized users should be able to modify SLA timelines or waive an overdue status, with a recorded reason.' },
  { id: 16, term: 'Audit Trail', rule: 'The CRM should retain the original assignment time, deadline, activity time, rescheduling and closure history.' },
  { id: 17, term: 'Performance Tracking', rule: 'SLA compliance may be included in Executive performance reports along with conversion, follow-up and lead-management metrics.' },
  { id: 18, term: 'No Backdating', rule: 'Activities should be recorded using the actual completion time and should not be backdated to artificially meet the SLA.' },
  { id: 19, term: 'Data Integrity', rule: 'Executives are responsible for maintaining accurate follow-up dates, status, notes, contact attempts, and completion details.' },
  { id: 20, term: 'No Silent Closure', rule: 'An SLA-breached activity must not be closed without either completing the required action or recording a valid reason for cancellation/rescheduling.' },
  { id: 21, term: 'Escalation Priority', rule: 'Critical or high-value leads with breached SLAs should receive higher escalation priority than routine activities.' },
  { id: 22, term: 'Dashboard Visibility', rule: 'The CRM should provide separate counts for Due Today, Due Soon, Overdue, SLA Breached, Rescheduled and Resolved activities.' },
  { id: 23, term: 'Breach Resolution', rule: 'Once the pending action is completed, the system should retain the breach history while updating the activity to its appropriate final status.' },
  { id: 24, term: 'Management Authority', rule: 'Final interpretation of SLA rules, exceptions, and disciplinary consequences shall remain with Omvik Realcon management.' }
];

interface SlaTermsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultTab?: 'standards' | 'terms';
}

export default function SlaTermsModal({ open, onOpenChange, defaultTab = 'terms' }: SlaTermsModalProps) {
  const [activeTab, setActiveTab] = useState<'standards' | 'terms'>(defaultTab);
  const [search, setSearch] = useState('');

  const filteredStandards = SERVICE_STANDARDS_DATA.filter(
    (s) =>
      s.activity.toLowerCase().includes(search.toLowerCase()) ||
      s.sla.toLowerCase().includes(search.toLowerCase()) ||
      s.requirement.toLowerCase().includes(search.toLowerCase())
  );

  const filteredTerms = SLA_TERMS_CONDITIONS_DATA.filter(
    (t) =>
      t.term.toLowerCase().includes(search.toLowerCase()) ||
      t.rule.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden flex flex-col bg-[#0d1322] border-slate-800 text-slate-100">
        <DialogHeader className="border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
              <Scale className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-lg font-extrabold text-white">
                Omvik Realcon — Service Standards & SLA Terms & Conditions
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-400">
                Official operational SLA benchmarks, follow-up cycles, and governance rules for SLA breach compliance.
              </DialogDescription>
            </div>
          </div>

          {/* Search & Tab Selector Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3">
            <div className="flex items-center gap-1.5 bg-[#0b0f19] p-1 rounded-xl border border-slate-800">
              <button
                type="button"
                onClick={() => setActiveTab('standards')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'standards'
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>⚡ Service Standards ({SERVICE_STANDARDS_DATA.length})</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('terms')}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  activeTab === 'terms'
                    ? 'bg-amber-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>📜 SLA Terms & Conditions ({SLA_TERMS_CONDITIONS_DATA.length})</span>
              </button>
            </div>

            <div className="relative w-full sm:w-64">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
              <Input
                type="text"
                placeholder="Search SLA rules & terms..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-8 h-9 text-xs bg-[#131c31] border-slate-800 rounded-xl"
              />
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* TAB 1: SERVICE STANDARDS TABLE */}
          {activeTab === 'standards' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs flex items-center justify-between">
                <span>⏱️ Defined response timelines & mandatory activity gaps per lead stage.</span>
                <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-indigo-500/20">14 Service Standards</span>
              </div>

              {filteredStandards.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No matching service standards found.</div>
              ) : (
                <div className="space-y-2">
                  {filteredStandards.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#131c31] border border-slate-800 hover:border-indigo-500/30 transition-all space-y-1"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-800 text-slate-300 flex items-center justify-center text-[10px] font-mono">
                            {item.id}
                          </span>
                          {item.activity}
                        </span>
                        <Badge className="bg-amber-500/20 text-amber-300 border-amber-500/30 text-[10px] font-mono font-bold shrink-0">
                          {item.sla}
                        </Badge>
                      </div>
                      <p className="text-xs text-slate-400 pl-7">{item.requirement}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: TERMS & CONDITIONS RULES */}
          {activeTab === 'terms' && (
            <div className="space-y-3">
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs flex items-center justify-between">
                <span>🛡️ Mandatory governance rules for SLA breach, lead reassignment, false closures & audit integrity.</span>
                <span className="font-mono text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-amber-500/20">24 Policy Rules</span>
              </div>

              {filteredTerms.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No matching terms or conditions found.</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredTerms.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 rounded-xl bg-[#131c31] border border-slate-800/90 hover:border-amber-500/40 transition-all space-y-1 flex flex-col justify-between"
                    >
                      <div className="flex items-center justify-between gap-2 border-b border-slate-800/60 pb-2">
                        <span className="text-xs font-extrabold text-amber-300 flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center text-[10px] font-mono font-black">
                            {item.id}
                          </span>
                          {item.term}
                        </span>
                        {(item.id === 9 || item.id === 12 || item.id === 15) && (
                          <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 text-[9px] font-bold">
                            SUPER ADMIN
                          </span>
                        )}
                        {(item.id === 18 || item.id === 20) && (
                          <span className="px-1.5 py-0.5 rounded bg-red-500/20 text-red-300 border border-red-500/30 text-[9px] font-bold">
                            STRICT RULE
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-300 pt-1 leading-relaxed">{item.rule}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

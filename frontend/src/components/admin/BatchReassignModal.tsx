import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBatchReassignOptions, reassignBatchLeads, getBatchLeadsDetail } from '../../api/importHistory';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { X, UserCheck, RefreshCw, CheckSquare, Square, Layers, AlertCircle } from 'lucide-react';

interface BatchReassignModalProps {
  batchId: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function BatchReassignModal({ batchId, isOpen, onClose }: BatchReassignModalProps) {
  const queryClient = useQueryClient();

  const [reassignMode, setReassignMode] = useState<'all' | 'selected'>('all');
  const [selectedLeadIds, setSelectedLeadIds] = useState<string[]>([]);
  const [selectedTargetUser, setSelectedTargetUser] = useState<string>('');
  const [reason, setReason] = useState<string>('Workload balancing');
  const [isConfirmOpen, setIsConfirmOpen] = useState<boolean>(false);

  // Fetch Reassign Options (Current distribution & Available Employees)
  const { data: optionsData, isLoading: optionsLoading } = useQuery({
    queryKey: ['reassignOptions', batchId],
    queryFn: () => getBatchReassignOptions(batchId),
    enabled: isOpen && !!batchId
  });

  // Fetch Batch Leads Detail for selective checkbox list
  const { data: leadsData } = useQuery({
    queryKey: ['batchLeads', batchId],
    queryFn: () => getBatchLeadsDetail(batchId),
    enabled: isOpen && !!batchId && reassignMode === 'selected'
  });

  const availableEmployees = optionsData?.availableEmployees || [];
  const currentAssignment = optionsData?.currentAssignment || {};
  const currentAssignmentNames = optionsData?.currentAssignmentNames || {};
  const leads = leadsData?.leads || [];

  const toggleSelectLead = (id: string) => {
    if (selectedLeadIds.includes(id)) {
      setSelectedLeadIds(selectedLeadIds.filter((item) => item !== id));
    } else {
      setSelectedLeadIds([...selectedLeadIds, id]);
    }
  };

  const toggleSelectAllLeads = () => {
    if (selectedLeadIds.length === leads.length) {
      setSelectedLeadIds([]);
    } else {
      setSelectedLeadIds(leads.map((l: any) => l._id));
    }
  };

  const reassignMutation = useMutation({
    mutationFn: (payload: { selectedLeadIds?: string[] | null; newOwner: string; reason?: string }) =>
      reassignBatchLeads(batchId, payload),
    onSuccess: (res) => {
      toast.success(res.message || 'Reassignment complete!');
      queryClient.invalidateQueries({ queryKey: ['importHistory'] });
      queryClient.invalidateQueries({ queryKey: ['batchLeads', batchId] });
      queryClient.invalidateQueries({ queryKey: ['reassignOptions', batchId] });
      queryClient.invalidateQueries({ queryKey: ['opportunities'] });
      setIsConfirmOpen(false);
      onClose();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to reassign batch leads');
    }
  });

  const handleConfirmSubmit = () => {
    if (!selectedTargetUser) {
      toast.error('Please select an employee to assign leads to');
      return;
    }

    if (reassignMode === 'selected' && selectedLeadIds.length === 0) {
      toast.error('Please select at least one lead to reassign');
      return;
    }

    reassignMutation.mutate({
      selectedLeadIds: reassignMode === 'all' ? null : selectedLeadIds,
      newOwner: selectedTargetUser,
      reason
    });
  };

  if (!isOpen) return null;

  const selectedTargetUserObj = availableEmployees.find((e: any) => e._id === selectedTargetUser);
  const reassignCountDisplay = reassignMode === 'all' ? optionsData?.totalBatchLeads || 0 : selectedLeadIds.length;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-[#131c31] border border-slate-800 rounded-2xl w-full max-w-2xl shadow-2xl text-slate-100 overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-800 bg-[#0b0f19]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center border border-indigo-500/20">
              <RefreshCw className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <span>Reassign Batch:</span>
                <span className="font-mono text-indigo-400">{batchId}</span>
              </h3>
              <p className="text-xs text-slate-400">Reassign leads across team members for workload balancing</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[75vh] overflow-y-auto">
          {/* Current Distribution Breakdown */}
          <div className="space-y-2 bg-[#0b0f19] p-4 rounded-xl border border-slate-800/80">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Current Owner Distribution ({optionsData?.totalBatchLeads || 0} Total Leads)
            </Label>
            <div className="flex flex-wrap gap-2 pt-1">
              {Object.entries(currentAssignment).map(([ownerId, count]: [string, any]) => {
                const ownerName = currentAssignmentNames[ownerId] || 'Unassigned';
                return (
                  <Badge
                    key={ownerId}
                    variant="outline"
                    className="bg-slate-900 border-slate-700 text-slate-200 text-xs px-3 py-1 font-semibold flex items-center gap-1.5"
                  >
                    <span>👤 {ownerName}:</span>
                    <strong className="text-indigo-400 font-bold">{count} leads</strong>
                  </Badge>
                );
              })}
            </div>
          </div>

          {/* Reassignment Scope Mode */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-300 uppercase tracking-wider block">
              Reassignment Scope
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <label
                onClick={() => setReassignMode('all')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  reassignMode === 'all'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white font-bold'
                    : 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reassignMode"
                  checked={reassignMode === 'all'}
                  onChange={() => setReassignMode('all')}
                  className="hidden"
                />
                <Layers className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Reassign ALL Leads</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Reassign all {optionsData?.totalBatchLeads || 0} leads in this batch
                  </div>
                </div>
              </label>

              <label
                onClick={() => setReassignMode('selected')}
                className={`p-3.5 rounded-xl border cursor-pointer transition-all flex items-center gap-3 ${
                  reassignMode === 'selected'
                    ? 'bg-indigo-600/15 border-indigo-500 text-white font-bold'
                    : 'bg-[#0b0f19] border-slate-800 text-slate-400 hover:border-slate-700'
                }`}
              >
                <input
                  type="radio"
                  name="reassignMode"
                  checked={reassignMode === 'selected'}
                  onChange={() => setReassignMode('selected')}
                  className="hidden"
                />
                <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-slate-200">Reassign SELECTED Leads</div>
                  <div className="text-[11px] text-slate-400 font-normal">
                    Pick specific leads to move ({selectedLeadIds.length} selected)
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Selective Leads Checklist */}
          {reassignMode === 'selected' && (
            <div className="space-y-2 border border-slate-800 rounded-xl p-3 bg-[#0b0f19]">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <span className="text-xs font-bold text-slate-200">Select Leads to Move ({selectedLeadIds.length}/{leads.length})</span>
                <button
                  type="button"
                  onClick={toggleSelectAllLeads}
                  className="text-xs text-indigo-400 hover:text-indigo-300 font-bold underline"
                >
                  {selectedLeadIds.length === leads.length ? 'Deselect All' : 'Select All'}
                </button>
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pt-1">
                {leads.map((lead: any) => {
                  const isChecked = selectedLeadIds.includes(lead._id);
                  return (
                    <div
                      key={lead._id}
                      onClick={() => toggleSelectLead(lead._id)}
                      className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                        isChecked ? 'bg-indigo-500/10 border border-indigo-500/30 text-white' : 'hover:bg-slate-800/50 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {isChecked ? <CheckSquare className="w-4 h-4 text-indigo-400 shrink-0" /> : <Square className="w-4 h-4 text-slate-600 shrink-0" />}
                        <span className="font-mono text-indigo-300 font-bold">{lead.leadCode}</span>
                        <span className="font-semibold text-slate-200">{lead.customerName}</span>
                        <span className="text-slate-400 font-mono">({lead.phone})</span>
                      </div>
                      <span className="text-[11px] text-slate-400">Owner: {lead.currentOwner}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Target Employee Assignment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
              <UserCheck className="w-4 h-4 text-indigo-400" />
              <span>Target Employee for Assignment</span>
            </Label>
            <select
              value={selectedTargetUser}
              onChange={(e) => setSelectedTargetUser(e.target.value)}
              className="w-full h-11 bg-[#0b0f19] border border-slate-700 text-slate-100 text-xs font-semibold rounded-xl px-3 focus:border-indigo-500"
            >
              <option value="">Select active employee...</option>
              {availableEmployees.map((emp: any) => (
                <option key={emp._id} value={emp._id}>
                  👤 {emp.name} ({emp.employeeId || emp.role}) — Workload: {emp.currentLeadCount} active leads
                </option>
              ))}
            </select>
          </div>

          {/* Reason for Reassignment */}
          <div className="space-y-1.5">
            <Label className="text-xs font-bold text-slate-200">Reason for Reassignment</Label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full h-10 bg-[#0b0f19] border border-slate-700 text-slate-200 text-xs rounded-xl px-3 focus:border-indigo-500"
            >
              <option value="Workload balancing">Workload balancing</option>
              <option value="Employee on leave">Employee on leave</option>
              <option value="Employee reassignment">Employee reassignment</option>
              <option value="Performance optimization">Performance optimization</option>
              <option value="Other">Other</option>
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-slate-800 bg-[#0b0f19] flex items-center justify-between">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            className="text-xs font-bold text-slate-400 hover:text-slate-200"
          >
            Cancel
          </Button>

          {!isConfirmOpen ? (
            <Button
              type="button"
              disabled={!selectedTargetUser || (reassignMode === 'selected' && selectedLeadIds.length === 0)}
              onClick={() => setIsConfirmOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs px-5 py-2.5 rounded-xl flex items-center gap-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reassign {reassignCountDisplay} Lead{reassignCountDisplay !== 1 ? 's' : ''} →</span>
            </Button>
          ) : (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
                <AlertCircle className="w-4 h-4 text-amber-400" />
                Confirm move to {selectedTargetUserObj?.name}?
              </span>
              <Button
                type="button"
                onClick={handleConfirmSubmit}
                disabled={reassignMutation.isPending}
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs px-4 py-2 rounded-xl"
              >
                {reassignMutation.isPending ? 'Reassigning...' : 'Yes, Confirm'}
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

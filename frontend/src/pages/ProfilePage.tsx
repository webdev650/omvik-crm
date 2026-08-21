import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import { User, ShieldCheck, Save, Bot } from 'lucide-react';
import Navbar from '../components/Navbar';
import useAuthStore from '../store/authStore';
import { updateOwnProfile } from '../api/users';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge, getRoleBadgeVariant } from '../components/ui/badge';
import { Switch } from '../components/ui/switch';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [nudgesEnabled, setNudgesEnabled] = useState(user?.nudgesEnabled !== false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
      setNudgesEnabled(user.nudgesEnabled !== false);
    }
  }, [user]);

  const mutation = useMutation({
    mutationFn: updateOwnProfile,
    onSuccess: (data) => {
      if (data?.user) {
        setUser(data.user);
      }
      toast.success('Profile updated successfully!');
      setErrorMsg(null);
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || 'Failed to update profile. Please try again.';
      setErrorMsg(msg);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Full Name cannot be empty.');
      return;
    }
    setErrorMsg(null);
    mutation.mutate({ name: name.trim(), phone: phone.trim(), nudgesEnabled });
  };

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 font-sans pb-16">
      <Navbar />

      <main className="max-w-[1650px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Page Hero Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#131c31] border border-slate-800/80 p-5 sm:p-6 rounded-2xl shadow-sm">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-[11px] font-bold uppercase tracking-wider">
              <User className="w-3.5 h-3.5" />
              <span>Self-Service Center</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              My Profile & Credentials
            </h1>
            <p className="text-xs sm:text-sm text-slate-400">
              View your system credentials, assigned role, and update your personal details.
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left Column: Staff ID Card */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 shadow-sm md:col-span-1 text-center space-y-4">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 via-purple-600 to-blue-500 p-0.5 mx-auto shadow-md">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center font-black text-white text-3xl">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-bold text-white">{user?.name}</h3>
              <p className="text-xs font-mono text-slate-400">{user?.email}</p>
            </div>

            <div className="space-y-3 pt-3 border-t border-slate-800/60">
              <div className="space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Employee ID</p>
                <div className="inline-block px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-xs font-bold">
                  {user?.employeeId || '—'}
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">System Role</p>
                <div>
                  <Badge className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider border ${getRoleBadgeVariant(user?.role)}`}>
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Assigned Team / Pod</p>
                <p className="text-xs font-semibold text-slate-300">
                  {user?.teamId?.name || (user?.teamId ? 'Assigned' : 'Unassigned')}
                </p>
              </div>
            </div>
          </div>

          {/* Right Column: Editable Profile Form */}
          <div className="bg-[#131c31] border border-slate-800/80 rounded-2xl p-6 shadow-sm md:col-span-2 space-y-6">
            <div className="border-b border-slate-800/60 pb-3">
              <h3 className="text-lg font-bold text-white">Edit Personal Details</h3>
              <p className="text-xs text-slate-400">
                Update your display name and contact phone number. System role and email are managed by administrators.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-semibold">
                  {errorMsg}
                </div>
              )}

              {/* Read-Only Banner */}
              <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                <div>
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Employee ID</Label>
                  <p className="text-xs font-mono font-bold text-indigo-400 mt-0.5">{user?.employeeId || '—'}</p>
                </div>
                <div>
                  <Label className="text-[10px] uppercase tracking-wider font-bold text-slate-400">Permission Level</Label>
                  <p className="text-xs font-bold text-slate-200 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
                </div>
              </div>

              {/* Editable Fields */}
              <div className="space-y-1.5">
                <Label htmlFor="name" className="text-xs font-bold text-slate-300">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your full name"
                  className="bg-[#0b0f19] border-slate-800 text-slate-100 text-xs h-10 rounded-xl"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="phone" className="text-xs font-bold text-slate-300">Phone Number</Label>
                <Input
                  id="phone"
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="e.g. +91 98765 43210"
                  className="bg-[#0b0f19] border-slate-800 text-slate-100 text-xs h-10 rounded-xl"
                />
              </div>

              {/* Read-Only Email */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-bold text-slate-400">Email Address (Managed by Admin)</Label>
                <Input
                  id="email"
                  type="email"
                  value={user?.email || ''}
                  disabled
                  className="bg-[#0b0f19]/40 border-slate-800 text-slate-500 cursor-not-allowed text-xs h-10 rounded-xl"
                />
              </div>

              {/* Nudge Preference */}
              <div className="flex items-center justify-between p-4 rounded-xl bg-[#0b0f19] border border-slate-800">
                <div className="space-y-0.5">
                  <Label htmlFor="nudges" className="text-xs font-bold text-slate-100 cursor-pointer flex items-center gap-1.5">
                    <Bot className="w-4 h-4 text-indigo-400" />
                    <span>Show Helpful AI Nudges & Mascot</span>
                  </Label>
                  <p className="text-[11px] text-slate-400">
                    Receive occasional alerts for overdue follow-ups, SLA breaches, and clean inbox progress.
                  </p>
                </div>
                <Switch
                  id="nudges"
                  checked={nudgesEnabled}
                  onCheckedChange={setNudgesEnabled}
                />
              </div>

              <div className="pt-2">
                <Button
                  type="submit"
                  disabled={mutation.isPending}
                  className="w-full h-11 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>{mutation.isPending ? 'Saving Profile...' : 'Save Profile Changes'}</span>
                </Button>
              </div>
            </form>
          </div>

        </div>
      </main>
    </div>
  );
}

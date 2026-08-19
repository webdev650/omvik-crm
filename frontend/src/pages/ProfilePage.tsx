import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { toast } from 'sonner';
import Navbar from '../components/Navbar';
import useAuthStore from '../store/authStore';
import { updateOwnProfile } from '../api/users';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';
import { Badge, getRoleBadgeVariant } from '../components/ui/badge';

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setName(user.name || '');
      setPhone(user.phone || '');
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
    mutation.mutate({ name: name.trim(), phone: phone.trim() });
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-4 sm:p-8 relative overflow-hidden">
      {/* Background Accent Orbs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-4xl mx-auto relative z-10 space-y-8">
        <Navbar />

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest mb-2">
              👤 Self-Service Center
            </div>
            <h1 className="text-3xl font-extrabold tracking-tight text-white">
              My Profile & Credentials
            </h1>
            <p className="text-sm text-slate-400 mt-1">
              View your system credentials, assigned role, and update your personal details.
            </p>
          </div>
        </div>

        {/* Main Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

          {/* Left Column: Staff ID Card */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl md:col-span-1">
            <CardHeader className="text-center pb-4">
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center font-extrabold text-white text-3xl mx-auto shadow-xl shadow-indigo-600/30 mb-3">
                {user?.name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <CardTitle className="text-xl font-bold text-white">{user?.name}</CardTitle>
              <CardDescription className="text-xs font-mono text-slate-400">{user?.email}</CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 pt-2 border-t border-slate-800/60">
              <div className="space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Employee ID</p>
                <div className="inline-block px-3 py-1 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 font-mono text-sm font-bold">
                  {user?.employeeId || '—'}
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">System Role</p>
                <div>
                  <Badge className={`text-xs px-2.5 py-0.5 font-bold uppercase tracking-wider border ${getRoleBadgeVariant(user?.role)}`}>
                    {user?.role?.replace('_', ' ')}
                  </Badge>
                </div>
              </div>

              <div className="space-y-1 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Assigned Team / Pod</p>
                <p className="text-xs font-semibold text-slate-300">
                  {user?.teamId?.name || (user?.teamId ? 'Assigned' : 'Unassigned')}
                </p>
              </div>
            </CardContent>
          </Card>

          {/* Right Column: Editable Profile Form */}
          <Card className="border-slate-800 bg-slate-900/80 shadow-2xl backdrop-blur-xl md:col-span-2">
            <CardHeader>
              <CardTitle>Edit Personal Details</CardTitle>
              <CardDescription>
                Update your display name and contact phone number. System role and email are managed by administrators.
              </CardDescription>
            </CardHeader>

            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-5">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-medium">
                    {errorMsg}
                  </div>
                )}

                {/* Read-Only Employee ID & Role Banner */}
                <div className="grid grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/60 border border-slate-800">
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">Employee ID</Label>
                    <p className="text-sm font-mono font-bold text-indigo-400 mt-0.5">{user?.employeeId || '—'}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] uppercase tracking-wider text-slate-500">System Permission Level</Label>
                    <p className="text-sm font-bold text-slate-200 capitalize mt-0.5">{user?.role?.replace('_', ' ')}</p>
                  </div>
                </div>

                {/* Editable Fields */}
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input
                    id="name"
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your full name"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <Input
                    id="phone"
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="e.g. +91 98765 43210"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>

                {/* Read-Only Email Field */}
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address (Managed by Admin)</Label>
                  <Input
                    id="email"
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="bg-slate-950/40 border-slate-800/60 text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    disabled={mutation.isPending}
                    className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10"
                  >
                    {mutation.isPending ? 'Saving Profile...' : 'Save Profile Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

        </div>
      </div>
    </div>
  );
}

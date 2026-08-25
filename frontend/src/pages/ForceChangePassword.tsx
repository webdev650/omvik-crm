import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function ForceChangePassword() {
  const navigate = useNavigate();
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match. Please re-enter.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.patch('/auth/change-password', {
        currentPassword: currentPassword || undefined,
        newPassword
      });

      if (response.data?.success) {
        toast.success('Password updated successfully! Welcome to OMVIK CRM.');
        const updatedUser = response.data?.user || {
          ...user,
          mustChangePassword: false
        };
        updateUser(updatedUser);
        navigate('/dashboard', { replace: true });
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Accent Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-amber-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold uppercase tracking-widest">
            🔒 Account Setup Required
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Set Your Private Password
          </h1>
          <p className="text-xs text-slate-400">
            Welcome to OMVIK CRM! You are logged in with a temporary password. Please set your private password to proceed.
          </p>
        </div>

        <Card className="border-amber-500/30 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader className="text-center pb-3">
            <CardTitle className="text-lg text-white font-bold">First Login Security Gate</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              Create your new password to unlock your CRM workspace
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Private Password (min 6 characters)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter your new password"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="confirmPassword">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter your new password"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-11 mt-2 rounded-xl shadow-md shadow-indigo-600/20"
              >
                {isSubmitting ? 'Updating Password...' : 'Set New Password & Continue'}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

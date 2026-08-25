import React, { useState } from 'react';
import { toast } from 'sonner';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from './ui/card';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Label } from './ui/label';

export default function MustChangePasswordModal() {
  const { user, updateUser } = useAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  if (!user || !user.mustChangePassword) {
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!currentPassword) {
      setErrorMsg('Please enter your current temporary password.');
      return;
    }
    if (newPassword.length < 6) {
      setErrorMsg('New password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setErrorMsg('New passwords do not match.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/change-password', {
        currentPassword,
        newPassword
      });

      if (response.data?.success) {
        toast.success('Password updated successfully! Welcome to OMVIK CRM.');
        const updatedUser = response.data?.user || {
          ...user,
          mustChangePassword: false
        };
        updateUser(updatedUser);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to update password. Please check your credentials.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md relative z-10">
        <Card className="border-indigo-500/40 bg-slate-900 shadow-2xl shadow-indigo-500/10">
          <CardHeader className="text-center pb-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center text-2xl mx-auto mb-2">
              🔒
            </div>
            <CardTitle className="text-xl font-extrabold text-white">First Login Password Change Required</CardTitle>
            <CardDescription className="text-xs text-slate-400">
              For security, please update your temporary password to a private password before accessing the system.
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
                <Label htmlFor="currentPassword">Temporary / Current Password</Label>
                <Input
                  id="currentPassword"
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Enter current password"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="newPassword">New Password (min 6 characters)</Label>
                <Input
                  id="newPassword"
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
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
                  placeholder="Re-enter new password"
                  className="bg-slate-950 border-slate-800 text-slate-100"
                />
              </div>

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 mt-2"
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

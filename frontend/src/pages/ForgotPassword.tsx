import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '../api/axios';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    if (!email || !email.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      if (response.data?.message) {
        setStatusMsg(response.data.message);
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to request password reset. Please try again.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center p-4 relative overflow-hidden font-sans">
      {/* Background Accent Orbs */}
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-semibold uppercase tracking-widest">
            OMVIK Realcon CRM
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-white">
            Account Password Recovery
          </h1>
          <p className="text-xs text-slate-400">
            Enter your account email below to receive secure password reset instructions.
          </p>
        </div>

        <Card className="border-slate-800/80 bg-slate-900/90 shadow-2xl backdrop-blur-xl">
          <CardHeader>
            <CardTitle>Forgot Password?</CardTitle>
            <CardDescription>We'll send a 15-minute secure reset link to your inbox</CardDescription>
          </CardHeader>

          <CardContent>
            {statusMsg ? (
              <div className="space-y-4 text-center py-2">
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 flex items-center justify-center text-2xl mx-auto">
                  🔢
                </div>
                <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-medium">
                  {statusMsg}
                </div>
                <p className="text-xs text-slate-400">
                  Check your email inbox for your 6-digit numeric verification OTP.
                </p>
                <Button
                  onClick={() => navigate(`/reset-password?email=${encodeURIComponent(email.trim())}`)}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10"
                >
                  Enter 6-Digit OTP →
                </Button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                {errorMsg && (
                  <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-medium">
                    {errorMsg}
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="e.g. admin@omvik.com"
                    className="bg-slate-950 border-slate-800 text-slate-100"
                  />
                </div>

                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 mt-2"
                >
                  {isSubmitting ? 'Sending Instructions...' : 'Send Password Reset Link'}
                </Button>
              </form>
            )}
          </CardContent>

          <CardFooter className="justify-center border-t border-slate-800/60 text-xs text-slate-400">
            Remember your password?{' '}
            <Link to="/login" className="text-indigo-400 hover:underline font-semibold ml-1">
              Sign In
            </Link>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}

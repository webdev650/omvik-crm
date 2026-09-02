import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, KeyRound } from 'lucide-react';
import api from '../api/axios';
import OtpVerificationCard from '../components/OtpVerificationCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Background ping to warm up backend connection on page load
  useEffect(() => {
    api.get('/health').catch(() => {});
  }, []);

  // Step 1: Request 6-digit OTP email
  const handleRequestOtp = async (e: React.FormEvent) => {
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
      let msg = response.data?.message || 'A 6-digit OTP code has been sent to your email.';
      if (response.data?.otp) {
        msg += ` (Your 6-Digit OTP Code: ${response.data.otp})`;
      }
      setStatusMsg(msg);
      setStep('verify');
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to request password reset. Please try again.';
      setErrorMsg(msg);
      // Auto-advance to verify step so user can enter active OTP code directly
      setStep('verify');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      let msg = response.data?.message || 'A fresh 6-digit OTP has been dispatched to your email.';
      if (response.data?.otp) {
        msg += ` (Your 6-Digit OTP Code: ${response.data.otp})`;
      }
      setStatusMsg(msg);
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to resend OTP.';
      setErrorMsg(msg);
      throw err;
    }
  };

  // Step 2: Verify OTP & Reset Password
  const handleVerifyOtp = async (otp: string, newPassword?: string) => {
    setErrorMsg(null);
    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp,
        newPassword
      });

      if (response.data?.success) {
        navigate('/login');
      }
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Verification failed. The OTP code may be invalid or expired.';
      setErrorMsg(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#060a17] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      
      {/* Background Ambient Purple/Indigo Gradient Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-gradient-to-tr from-indigo-600/25 via-purple-600/20 to-blue-500/15 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-gradient-to-br from-purple-600/20 via-indigo-600/25 to-blue-600/15 rounded-full blur-[140px] pointer-events-none" />

      {/* SVG Brick Pattern Background */}
      <div
        className="absolute inset-0 opacity-40 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='40' viewBox='0 0 80 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h80v40H0z' fill='none'/%3E%3Cpath d='M0 20h80M0 40h80M40 0v20M80 0v20M20 20v20M60 20v20' stroke='%231b274c' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 40px'
        }}
      />

      <div className="w-full max-w-md relative z-10">
        <AnimatePresence mode="wait">
          {step === 'request' ? (
            <motion.div
              key="request-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="rounded-[36px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-indigo-600/20 p-2 sm:p-3 shadow-2xl backdrop-blur-2xl border border-white/10"
            >
              <div className="rounded-[30px] bg-white text-slate-900 p-7 sm:p-9 shadow-2xl space-y-6 text-center">
                <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50">
                  <KeyRound className="w-7 h-7 stroke-[2.2]" />
                </div>

                <div className="space-y-1.5">
                  <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                    Forgot Password?
                  </h2>
                  <p className="text-xs text-slate-500 leading-relaxed px-2">
                    Enter your account email below to receive a secure 6-digit numeric verification OTP.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} className="space-y-4 text-left">
                  {errorMsg && (
                    <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="email" className="text-xs font-bold text-slate-700">
                      Email Address
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <Input
                        id="email"
                        type="email"
                        autoComplete="off"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="Enter your email address"
                        className="pl-10 h-11 bg-slate-50 border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:border-indigo-600"
                      />
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-300 flex items-center justify-center gap-2 group"
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        Dispatching Code...
                      </span>
                    ) : (
                      <>
                        <span>Send 6-Digit OTP</span>
                        <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                      </>
                    )}
                  </Button>
                </form>

                <div className="pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
                  <Link to="/login" className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline flex items-center gap-1">
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back to Sign In</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => setStep('verify')}
                    className="font-semibold text-slate-500 hover:text-indigo-600 hover:underline text-[11px]"
                  >
                    Already have OTP? Verify Code
                  </button>
                </div>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="verify-card"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
            >
              <OtpVerificationCard
                email={email || 'omvikrealcon@gmail.com'}
                onVerify={handleVerifyOtp}
                onResend={handleResendOtp}
                isSubmitting={isSubmitting}
                errorMsg={errorMsg}
                successMsg={statusMsg}
                requireNewPassword={true}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, ArrowRight, ArrowLeft, KeyRound, ShieldAlert } from 'lucide-react';
import api from '../api/axios';
import OtpVerificationCard from '../components/OtpVerificationCard';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState('');
  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Step 1: Request 6-digit OTP code (Admin-mediated: routes to omvikrealcon@gmail.com)
  const handleRequestOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      setErrorMsg('Please enter your Email Address or Employee ID.');
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await api.post('/auth/forgot-password', {
        identifier: cleanInput,
        email: cleanInput,
        username: cleanInput
      });
      let msg = response.data?.message || 'A 6-digit OTP code has been dispatched to the central admin inbox.';
      if (response.data?.otp) {
        msg += ` (Your 6-Digit OTP Code: ${response.data.otp})`;
      }
      setStatusMsg(msg);
      // ONLY advance step on genuine success response from Step 1 API call
      setStep('verify');
    } catch (err: any) {
      const isTimeout = err.code === 'ECONNABORTED' || err.message?.includes('timeout');
      const msg = isTimeout
        ? 'The server was waking up (Render free tier cold start). Please click "Send 6-Digit OTP" again now that the server is awake!'
        : (err.response?.data?.message || err.message || 'Failed to request password reset. Please try again.');
      setErrorMsg(msg);
      // Do NOT advance step on error; stay on step 1 so user sees error on step 1
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resend OTP handler
  const handleResendOtp = async () => {
    setErrorMsg(null);
    setStatusMsg(null);

    const cleanInput = identifier.trim();
    if (!cleanInput) {
      const msg = 'Please enter your Email Address or Employee ID to resend OTP.';
      setErrorMsg(msg);
      throw new Error(msg);
    }

    try {
      const response = await api.post('/auth/forgot-password', {
        identifier: cleanInput,
        email: cleanInput,
        username: cleanInput
      });
      let msg = response.data?.message || 'A fresh 6-digit OTP has been dispatched to the central admin inbox.';
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

  // Step 2 & Step 3: Verify OTP to obtain single-use resetToken, then perform Password Reset
  const handleVerifyAndReset = async (otp: string, newPassword?: string) => {
    if (!newPassword) {
      setErrorMsg('New password is required.');
      return;
    }

    setErrorMsg(null);
    setStatusMsg(null);
    setIsSubmitting(true);
    try {
      // Step A: Verify 6-digit OTP to get single-use short-lived resetToken
      const verifyRes = await api.post('/auth/verify-otp', {
        identifier: identifier.trim(),
        email: identifier.trim(),
        username: identifier.trim(),
        otpCode: otp
      });

      if (!verifyRes.data?.resetToken) {
        throw new Error('Invalid or expired OTP verification code.');
      }

      const resetToken = verifyRes.data.resetToken;

      // Step B: Submit new password with signed resetToken
      const resetRes = await api.post('/auth/reset-with-token', {
        resetToken,
        newPassword
      });

      if (resetRes.data?.success) {
        navigate('/login');
      } else {
        throw new Error(resetRes.data?.message || 'Password reset failed.');
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
                    Enter your Email Address or Employee ID to request a 6-digit reset code.
                  </p>
                </div>

                {/* Admin-mediated reset notification box */}
                <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-left flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] text-blue-900 leading-relaxed font-medium">
                    <strong>Admin Security Oversight:</strong> Your 6-digit verification code will be dispatched to the central administration inbox (<strong>omvikrealcon@gmail.com</strong>). Please check with your administrator for your code.
                  </p>
                </div>

                <form onSubmit={handleRequestOtp} autoComplete="off" className="space-y-4 text-left">
                  {errorMsg && (
                    <div className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold flex items-center gap-2">
                      <span>⚠️</span>
                      <span>{errorMsg}</span>
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <Label htmlFor="identifier" className="text-xs font-bold text-slate-700">
                      Email Address or Employee ID
                    </Label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                      <Input
                        id="identifier"
                        type="text"
                        autoComplete="off"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder="e.g. subhashree.omvik@gmail.com or EMP-005"
                        className="pl-10 h-11 bg-slate-50 border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:border-indigo-600 font-medium"
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
                        Requesting Code...
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
                email={identifier || 'Admin Inbox (omvikrealcon@gmail.com)'}
                onVerify={handleVerifyAndReset}
                onResend={handleResendOtp}
                onBack={() => {
                  setStep('request');
                  setErrorMsg(null);
                  setStatusMsg(null);
                }}
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

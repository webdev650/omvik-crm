import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import api from '../api/axios';
import OtpVerificationCard from '../components/OtpVerificationCard';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialEmail = searchParams.get('email') || '';

  const [email, setEmail] = useState(initialEmail);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleResendOtp = async () => {
    if (!email) return;
    setErrorMsg(null);
    try {
      const response = await api.post('/auth/forgot-password', { email: email.trim() });
      setStatusMsg('A fresh 6-digit OTP has been sent to your email.');
    } catch (err: any) {
      const msg = err.response?.data?.message || 'Failed to resend OTP.';
      setErrorMsg(msg);
      throw err;
    }
  };

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
      const msg = err.response?.data?.message || 'Password reset failed. The OTP code may be invalid or expired.';
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

      <div className="w-full max-w-md relative z-10 space-y-4">
        <OtpVerificationCard
          email={email}
          onVerify={handleVerifyOtp}
          onResend={handleResendOtp}
          isSubmitting={isSubmitting}
          errorMsg={errorMsg}
          successMsg={statusMsg}
          requireNewPassword={true}
        />

        <div className="text-center text-xs text-slate-400">
          <Link to="/login" className="font-semibold text-indigo-400 hover:text-indigo-300 hover:underline inline-flex items-center gap-1">
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Sign In</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

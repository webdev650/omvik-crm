import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Lock, Eye, EyeOff, CheckCircle2, ArrowRight, ArrowLeft, RefreshCw, KeyRound, ShieldAlert } from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';

interface OtpVerificationCardProps {
  email: string;
  onVerify: (otp: string, newPassword?: string) => Promise<void>;
  onResend?: () => Promise<void>;
  onBack?: () => void;
  isSubmitting?: boolean;
  errorMsg?: string | null;
  successMsg?: string | null;
  requireNewPassword?: boolean;
}

export default function OtpVerificationCard({
  email,
  onVerify,
  onResend,
  onBack,
  isSubmitting = false,
  errorMsg = null,
  successMsg = null,
  requireNewPassword = true
}: OtpVerificationCardProps) {
  // 6 Digit Array
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Passwords (if required)
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Resend Countdown Timer (Default 30 seconds)
  const [countdown, setCountdown] = useState(30);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => prev - 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  // Handle Individual Box Input & Auto-Advance Focus
  const handleChange = (index: number, value: string) => {
    const numericValue = value.replace(/\D/g, '');
    if (!numericValue) {
      const newDigits = [...digits];
      newDigits[index] = '';
      setDigits(newDigits);
      return;
    }

    const digit = numericValue.slice(-1);
    const newDigits = [...digits];
    newDigits[index] = digit;
    setDigits(newDigits);

    // Auto-advance to next input box
    if (index < 5 && digit) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Backspace & Navigation
  const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace') {
      if (!digits[index] && index > 0) {
        inputRefs.current[index - 1]?.focus();
      }
    } else if (e.key === 'ArrowLeft' && index > 0) {
      inputRefs.current[index - 1]?.focus();
    } else if (e.key === 'ArrowRight' && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  // Handle Paste 6-Digit String
  const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData) {
      const newDigits = ['', '', '', '', '', ''];
      for (let i = 0; i < pastedData.length; i++) {
        newDigits[i] = pastedData[i];
      }
      setDigits(newDigits);
      const focusIndex = Math.min(pastedData.length, 5);
      inputRefs.current[focusIndex]?.focus();
    }
  };

  const handleResendClick = async () => {
    if (countdown > 0 || !onResend || isResending) return;
    setIsResending(true);
    setValidationError(null);
    try {
      await onResend();
      setCountdown(30);
    } catch (err) {
      console.error(err);
    } finally {
      setIsResending(false);
    }
  };

  const handleConfirmSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);

    const fullOtp = digits.join('');
    if (fullOtp.length !== 6) {
      setValidationError('Please enter all 6 digits of your verification code.');
      return;
    }

    if (requireNewPassword) {
      if (!newPassword || newPassword.length < 7) {
        setValidationError('Password must be at least 7 characters long.');
        return;
      }

      const hasUpper = /[A-Z]/.test(newPassword);
      const hasLower = /[a-z]/.test(newPassword);
      const hasNumber = /[0-9]/.test(newPassword);
      const hasSpecial = /[^A-Za-z0-9]/.test(newPassword);

      if (!hasUpper || !hasLower || !hasNumber || !hasSpecial) {
        setValidationError('Password must contain at least 1 uppercase (A-Z), 1 lowercase (a-z), 1 number (0-9), and 1 special character (e.g. Omvik@1).');
        return;
      }

      if (newPassword !== confirmPassword) {
        setValidationError('Passwords do not match.');
        return;
      }
    }

    onVerify(fullOtp, requireNewPassword ? newPassword : undefined);
  };

  return (
    <div className="w-full max-w-md mx-auto">
      {/* Outer Glow Container */}
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="rounded-[36px] bg-gradient-to-b from-indigo-500/20 via-purple-500/10 to-indigo-600/20 p-2 sm:p-3 shadow-2xl backdrop-blur-2xl border border-white/10"
      >
        {/* Main Clean White Card */}
        <div className="rounded-[30px] bg-white text-slate-900 p-7 sm:p-9 shadow-2xl space-y-6 text-center relative overflow-hidden">
          
          {/* Header Mail Icon Badge */}
          <div className="inline-flex p-3.5 rounded-2xl bg-indigo-50 text-indigo-600 shadow-sm border border-indigo-100/50">
            <Mail className="w-7 h-7 stroke-[2.2]" />
          </div>

          {/* Heading & Subtitle */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Verify Your Email
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed px-2">
              Please enter the 6-digit verification code sent to <br />
              <strong className="text-indigo-600 font-semibold break-all">{email || 'your email'}</strong>
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleConfirmSubmit} className="space-y-5">
            {/* Error Notifications */}
            {(validationError || errorMsg) && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-red-50 border border-red-200 text-red-600 text-xs font-semibold text-left flex items-start gap-2"
              >
                <ShieldAlert className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                <span>{validationError || errorMsg}</span>
              </motion.div>
            )}

            {/* Success Notifications */}
            {successMsg && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-semibold text-left flex items-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{successMsg}</span>
              </motion.div>
            )}

            {/* 6 SEPARATE DIGIT BOXES */}
            <div className="flex items-center justify-center gap-1.5 sm:gap-2 pt-1">
              <div className="flex items-center gap-1.5 sm:gap-2">
                {[0, 1, 2].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none shadow-sm"
                  />
                ))}
              </div>

              <span className="text-slate-300 font-bold text-xl px-0.5 sm:px-1">-</span>

              <div className="flex items-center gap-1.5 sm:gap-2">
                {[3, 4, 5].map((i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digits[i]}
                    onChange={(e) => handleChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    onPaste={handlePaste}
                    className="w-10 h-12 sm:w-12 sm:h-14 text-center font-bold text-lg sm:text-xl text-slate-900 bg-slate-50 border-2 border-slate-200 rounded-2xl focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-100 transition-all outline-none shadow-sm"
                  />
                ))}
              </div>
            </div>

            {/* New Password Fields (for Password Reset) */}
            {requireNewPassword && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="space-y-3 pt-2 text-left border-t border-slate-100"
              >
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 space-y-1">
                  <p className="font-bold text-slate-800">Password Requirements:</p>
                  <ul className="list-disc pl-4 space-y-0.5 text-[10px] text-slate-500">
                    <li>Min 7 characters</li>
                    <li>1 uppercase letter (A-Z), 1 lowercase letter (a-z)</li>
                    <li>1 number (0-9) & 1 special char (@, #, $, %, !)</li>
                  </ul>
                  <p className="text-[10px] font-mono text-indigo-600 pt-0.5">Examples: Omvik@1, Test#123, Hello@7</p>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="e.g. Omvik@1"
                      className="pl-10 pr-10 h-10 bg-slate-50 border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:border-indigo-600"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-3 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="pl-10 h-10 bg-slate-50 border-slate-200 text-slate-900 text-xs rounded-xl focus:bg-white focus:border-indigo-600"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* Confirm Action Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm rounded-2xl shadow-lg shadow-indigo-600/30 transition-all duration-300 flex items-center justify-center gap-2 group"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying Code...
                </span>
              ) : (
                <>
                  <span>Confirm Reset</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Resend Countdown Text & Back Button */}
          <div className="pt-2 text-xs text-slate-500 space-y-2">
            <div>
              Didn't receive the code?{' '}
              {countdown > 0 ? (
                <span className="font-semibold text-indigo-600">
                  Resend ({countdown}s)
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleResendClick}
                  disabled={isResending}
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 focus:outline-none"
                >
                  {isResending ? (
                    <RefreshCw className="w-3 h-3 animate-spin" />
                  ) : null}
                  <span>Resend OTP</span>
                </button>
              )}
            </div>

            {onBack && (
              <div className="pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={onBack}
                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 text-xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Change Email / Employee ID</span>
                </button>
              </div>
            )}
          </div>

        </div>
      </motion.div>
    </div>
  );
}

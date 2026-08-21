import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ShieldCheck,
  TrendingUp,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  UserCheck
} from 'lucide-react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: ''
    }
  });

  const onSubmit = async (values: LoginFormValues) => {
    setServerError(null);
    try {
      const response = await api.post('/auth/login', values);
      if (response.data && response.data.user) {
        if (response.data.token) {
          localStorage.setItem('omvik_token', response.data.token);
        }
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Login failed. Please check your credentials and try again.';
      setServerError(message);
    }
  };

  const handleQuickFill = (email: string) => {
    setValue('email', email);
    setValue('password', 'password123');
    setServerError(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#05070e] text-slate-100 flex flex-col lg:flex-row overflow-hidden relative font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Ambient Mesh Glow Background */}
      <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-indigo-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" />
      <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-blue-600/15 rounded-full blur-[140px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }} />

      {/* LEFT PANEL: Creative Real Estate Showcase (Hidden on small screens) */}
      <div className="hidden lg:flex lg:w-7/12 relative z-10 flex-col justify-between p-12 lg:p-16 border-r border-slate-800/50 bg-gradient-to-br from-slate-950/90 via-slate-900/60 to-slate-950/90 backdrop-blur-3xl">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 shadow-lg shadow-indigo-500/25 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Building2 className="w-5 h-5 text-indigo-400" />
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-lg tracking-wider text-white">OMVIK REALCON</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                PRO CRM
              </span>
            </div>
            <p className="text-xs text-slate-400">Enterprise Real Estate & Lead Ownership Platform</p>
          </div>
        </div>

        {/* Center Hero Content & Animated Floating Cards */}
        <div className="my-auto py-10 space-y-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="space-y-4 max-w-xl"
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-500/10 border border-indigo-500/20 text-indigo-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              <span>Smart Real Estate Sales Pipeline</span>
            </div>
            <h1 className="text-4xl xl:text-5xl font-black text-white tracking-tight leading-tight">
              Manage Deals with <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-blue-400 to-indigo-300">Precision & Security</span>
            </h1>
            <p className="text-slate-300 text-base leading-relaxed">
              Empowering sales teams with atomic lead ownership, real-time SLA sweeps, and automated daily performance digests.
            </p>
          </motion.div>

          {/* Floating Glassmorphic Feature Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl pt-2">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl hover:border-indigo-500/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Atomic Lead Locking</h4>
                  <p className="text-xs text-slate-400 mt-0.5">Race-condition safe duplicate protection</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800/80 backdrop-blur-xl shadow-xl hover:border-blue-500/40 transition-all group"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-400 group-hover:scale-110 transition-transform">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Automated SLA Sweeps</h4>
                  <p className="text-xs text-slate-400 mt-0.5">36h / 48h / 72h Leave-aware escalations</p>
                </div>
              </div>
            </motion.div>
          </div>

          {/* Quick Metrics Banner */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="flex items-center gap-6 pt-4 text-xs font-semibold text-slate-400"
          >
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>100% Data-Scoped Isolation</span>
            </div>
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <span>Real-Time EOD Cross-Checks</span>
            </div>
          </motion.div>
        </div>

        {/* Footer info */}
        <div className="text-xs text-slate-500 flex items-center justify-between">
          <span>© 2026 Omvik Realcon Heritage Ltd. All rights reserved.</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="text-slate-400 font-mono text-[11px]">System Online</span>
          </span>
        </div>
      </div>

      {/* RIGHT PANEL: Sleek Interactive Login Form */}
      <div className="w-full lg:w-5/12 flex items-center justify-center p-6 sm:p-10 lg:p-16 relative z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full max-w-md space-y-6"
        >
          {/* Mobile Brand Header */}
          <div className="lg:hidden text-center space-y-2 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 p-0.5 mx-auto shadow-lg shadow-indigo-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
            </div>
            <h2 className="text-2xl font-black tracking-tight text-white">OMVIK REALCON</h2>
            <p className="text-xs text-slate-400">Enterprise Lead & Sales Management</p>
          </div>

          {/* Main Card */}
          <div className="rounded-3xl border border-slate-800/90 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-2xl space-y-6 relative overflow-hidden">
            {/* Top Glowing Edge Accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 via-blue-500 to-indigo-400" />

            <div className="space-y-1">
              <h2 className="text-2xl font-bold text-white tracking-tight">Sign In to Dashboard</h2>
              <p className="text-xs text-slate-400">Enter your official work credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {serverError && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2"
                >
                  <span className="text-base">⚠️</span>
                  <span>{serverError}</span>
                </motion.div>
              )}

              {/* Email Input */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Email Address
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="aparna@omvikrealcon.com"
                    className="pl-10 h-11 bg-slate-950/70 border-slate-800 text-slate-100 text-xs rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    {...register('email')}
                  />
                </div>
                {errors.email && (
                  <p className="text-[11px] text-red-400 font-medium">{errors.email.message}</p>
                )}
              </div>

              {/* Password Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                    Password
                  </Label>
                  <Link
                    to="/forgot-password"
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-500 absolute left-3.5 top-3.5 pointer-events-none" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    className="pl-10 pr-10 h-11 bg-slate-950/70 border-slate-800 text-slate-100 text-xs rounded-xl focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/50 transition-all"
                    {...register('password')}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-3.5 text-slate-500 hover:text-slate-300 transition-colors focus:outline-none"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {errors.password && (
                  <p className="text-[11px] text-red-400 font-medium">{errors.password.message}</p>
                )}
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/25 transition-all duration-300 flex items-center justify-center gap-2 group"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2">
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Authenticating...
                  </span>
                ) : (
                  <>
                    <span>Sign In to Workstation</span>
                    <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </>
                )}
              </Button>
            </form>

            {/* Quick Demo Access Chips */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2.5">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <UserCheck className="w-3 h-3 text-indigo-400" />
                Quick Demo Login Credentials:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('aparna@omvikrealcon.com')}
                  className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-indigo-500/50 transition-all text-xs group"
                >
                  <span className="font-bold text-slate-200 block group-hover:text-indigo-300">Aparna</span>
                  <span className="text-[10px] text-slate-500 block">Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('barsha@omvikrealcon.com')}
                  className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-blue-500/50 transition-all text-xs group"
                >
                  <span className="font-bold text-slate-200 block group-hover:text-blue-300">Barsha</span>
                  <span className="text-[10px] text-slate-500 block">Admin</span>
                </button>
              </div>
            </div>
          </div>

          {/* System Footer Info */}
          <p className="text-center text-[11px] text-slate-500">
            Protected by role-based data scoping & atomic duplicate prevention.
          </p>
        </motion.div>
      </div>
    </div>
  );
}

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
  Sparkles,
  ArrowRight,
  UserCheck,
  ShieldCheck
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
    <div className="min-h-screen w-full bg-[#030611] text-slate-100 flex items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans selection:bg-indigo-500 selection:text-white">
      {/* Dynamic Animated Water Liquid Background Orbs */}
      <motion.div
        animate={{
          scale: [1, 1.2, 1],
          x: [0, 30, 0],
          y: [0, -40, 0]
        }}
        transition={{
          duration: 12,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute top-1/4 left-1/3 w-[450px] h-[450px] bg-gradient-to-tr from-indigo-600/30 via-purple-600/25 to-blue-500/20 rounded-full blur-[130px] pointer-events-none"
      />

      <motion.div
        animate={{
          scale: [1, 1.25, 1],
          x: [0, -35, 0],
          y: [0, 45, 0]
        }}
        transition={{
          duration: 15,
          repeat: Infinity,
          ease: 'easeInOut'
        }}
        className="absolute bottom-1/4 right-1/3 w-[450px] h-[450px] bg-gradient-to-br from-blue-600/25 via-cyan-500/20 to-indigo-600/30 rounded-full blur-[130px] pointer-events-none"
      />

      {/* Subtle Background Water Caustics / Mesh Pattern */}
      <div
        className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:24px_24px] pointer-events-none"
      />

      {/* CENTERED WATER GLASS CARD */}
      <motion.div
        initial={{ opacity: 0, scale: 0.94, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.5, ease: 'easeOut' }}
        className="w-full max-w-md relative z-10"
      >
        {/* Outer Glow Halo */}
        <div className="absolute -inset-0.5 bg-gradient-to-r from-indigo-500/30 via-cyan-500/20 to-blue-500/30 rounded-[32px] blur-xl opacity-75 group-hover:opacity-100 transition duration-1000" />

        {/* Liquid Water-Glass Card Container */}
        <div className="relative rounded-[28px] border border-white/15 bg-white/[0.04] p-7 sm:p-9 shadow-[0_8px_40px_rgba(0,0,0,0.6)] backdrop-blur-3xl space-y-6 overflow-hidden">
          
          {/* Top Glass Specular Reflection Highlight Line */}
          <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-white/40 to-transparent" />
          
          {/* Water Glass Shimmer Arc */}
          <div className="absolute -top-24 -left-24 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

          {/* Header & Logo */}
          <div className="text-center space-y-3">
            <div className="inline-flex p-0.5 rounded-2xl bg-gradient-to-tr from-indigo-500/40 via-cyan-400/30 to-blue-500/40 shadow-lg shadow-indigo-500/20">
              <div className="w-12 h-12 rounded-[14px] bg-slate-950/80 backdrop-blur-xl flex items-center justify-center border border-white/10">
                <Building2 className="w-6 h-6 text-indigo-400" />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">OMVIK REALCON</h1>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  CRM
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Enter your credentials to access your sales workspace
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-2xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-semibold flex items-center gap-2"
              >
                <span className="text-sm">⚠️</span>
                <span>{serverError}</span>
              </motion.div>
            )}

            {/* Email Field */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                Email Address
              </Label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <Input
                  id="email"
                  type="email"
                  placeholder="aparna@omvikrealcon.com"
                  className="pl-10 h-11 bg-slate-950/50 border-white/10 text-slate-100 text-xs rounded-xl focus:border-indigo-400 focus:bg-slate-950/70 focus:ring-1 focus:ring-indigo-400/40 transition-all placeholder:text-slate-500"
                  {...register('email')}
                />
              </div>
              {errors.email && (
                <p className="text-[11px] text-red-400 font-medium">{errors.email.message}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-xs font-semibold text-slate-300">
                  Password
                </Label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  className="pl-10 pr-10 h-11 bg-slate-950/50 border-white/10 text-slate-100 text-xs rounded-xl focus:border-indigo-400 focus:bg-slate-950/70 focus:ring-1 focus:ring-indigo-400/40 transition-all placeholder:text-slate-500"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-3.5 text-slate-400 hover:text-slate-200 transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-400 font-medium">{errors.password.message}</p>
              )}
            </div>

            {/* Liquid Submit Button */}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-11 mt-2 bg-gradient-to-r from-indigo-600 via-indigo-500 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-300 flex items-center justify-center gap-2 group border border-white/10"
            >
              {isSubmitting ? (
                <span className="flex items-center gap-2">
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Verifying...
                </span>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </Button>
          </form>

          {/* Quick Fill Demo Badges */}
          <div className="pt-4 border-t border-white/10 space-y-2">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <UserCheck className="w-3 h-3 text-indigo-400" />
              Quick Fill Demo Accounts:
            </span>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => handleQuickFill('aparna@omvikrealcon.com')}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.08] hover:border-indigo-400/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-200 block group-hover:text-indigo-300">Aparna</span>
                <span className="text-[10px] text-slate-400 block">Super Admin</span>
              </button>
              <button
                type="button"
                onClick={() => handleQuickFill('barsha@omvikrealcon.com')}
                className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 text-left hover:bg-white/[0.08] hover:border-blue-400/50 transition-all text-xs group"
              >
                <span className="font-bold text-slate-200 block group-hover:text-blue-300">Barsha</span>
                <span className="text-[10px] text-slate-400 block">Admin</span>
              </button>
            </div>
          </div>

          {/* Card Footer */}
          <div className="pt-1 text-center">
            <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-indigo-400" />
              Protected by role-based data scope & SLA sweep engine
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

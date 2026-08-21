import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  Building2,
  ArrowRight,
  UserCheck,
  ShieldCheck,
  Lightbulb,
  Sun
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
  
  // Light state: toggles ON and OFF every 2 seconds automatically
  const [isLightOn, setIsLightOn] = useState(true);
  const [autoToggle, setAutoToggle] = useState(true);

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

  // 2-second Light ON/OFF Interval Effect
  useEffect(() => {
    if (!autoToggle) return;

    const interval = setInterval(() => {
      setIsLightOn((prev) => !prev);
    }, 2000); // Toggles every 2 seconds

    return () => clearInterval(interval);
  }, [autoToggle]);

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
    <div className="min-h-screen w-full bg-[#060a17] text-slate-100 flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans selection:bg-amber-500 selection:text-slate-950">
      
      {/* 1. DARK BLUE BRICK WALL BACKGROUND TEXTURE */}
      <div 
        className="absolute inset-0 opacity-45 pointer-events-none"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='40' viewBox='0 0 80 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h80v40H0z' fill='none'/%3E%3Cpath d='M0 20h80M0 40h80M40 0v20M80 0v20M20 20v20M60 20v20' stroke='%231b274c' stroke-width='1.5'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 40px'
        }}
      />

      {/* 2. TOP SPOTLIGHT LAMP FIXTURE */}
      <div className="relative z-30 flex flex-col items-center mb-[-12px]">
        {/* Wall Mount Cable / Bracket */}
        <div className="w-2.5 h-6 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-x border-slate-700 shadow-md" />
        
        {/* 3D Lamp Fixture Body */}
        <div 
          onClick={() => {
            setAutoToggle(false);
            setIsLightOn(!isLightOn);
          }}
          title="Click to toggle light manual/auto mode"
          className="relative cursor-pointer group"
        >
          <div className="w-24 h-8 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-t-xl border-t border-x border-slate-700/80 shadow-2xl flex items-center justify-center">
            <div className="w-16 h-1.5 bg-gradient-to-r from-slate-700 via-amber-500/40 to-slate-700 rounded-full" />
          </div>

          {/* Lamp Bulb / Core */}
          <div className="w-28 h-3.5 bg-slate-900 rounded-b-md border-b border-x border-slate-700 flex items-center justify-center overflow-hidden">
            <motion.div
              animate={{
                opacity: isLightOn ? 1 : 0.15,
                scale: isLightOn ? [1, 1.05, 1] : 0.95
              }}
              transition={{ duration: 0.3 }}
              className="w-20 h-2 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 rounded-full shadow-[0_0_20px_#f59e0b]"
            />
          </div>

          {/* Manual Auto-Toggle Indicator Badge */}
          <div className="absolute -top-3 -right-6 px-1.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-700 text-[9px] text-amber-400 font-mono flex items-center gap-1 shadow-md">
            <Sun className={`w-2.5 h-2.5 ${autoToggle ? 'animate-spin' : ''}`} />
            <span>2s</span>
          </div>
        </div>
      </div>

      {/* 3. CONICAL SPOTLIGHT LIGHT BEAM (ANIMATED ON / OFF EVERY 2 SECONDS) */}
      <AnimatePresence>
        <motion.div
          key="spotlight-beam"
          animate={{
            opacity: isLightOn ? 1 : 0.08,
            scaleY: isLightOn ? 1 : 0.95
          }}
          transition={{ duration: 0.45, ease: 'easeInOut' }}
          className="absolute top-12 left-1/2 -translate-x-1/2 w-[650px] sm:w-[800px] h-[750px] pointer-events-none z-10 origin-top"
          style={{
            background: 'radial-gradient(ellipse at top, rgba(254, 243, 199, 0.45) 0%, rgba(245, 158, 11, 0.22) 35%, rgba(217, 119, 6, 0.08) 65%, transparent 80%)',
            clipPath: 'polygon(44% 0%, 56% 0%, 100% 100%, 0% 100%)'
          }}
        />
      </AnimatePresence>

      {/* Ambient Warm Floor Glow when Light is ON */}
      <motion.div
        animate={{
          opacity: isLightOn ? 0.7 : 0.05
        }}
        transition={{ duration: 0.45 }}
        className="absolute top-36 left-1/2 -translate-x-1/2 w-[500px] h-[500px] bg-amber-500/20 rounded-full blur-[140px] pointer-events-none z-0"
      />

      {/* 4. LIGHTED GLASSMORPHIC LOGIN CARD (ILLUMINATED BY SPOTLIGHT) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="w-full max-w-md relative z-20 mt-2"
      >
        {/* Card Outer Illuminated Border Glow */}
        <motion.div
          animate={{
            opacity: isLightOn ? 1 : 0.2,
            boxShadow: isLightOn
              ? '0 20px 60px -10px rgba(245, 158, 11, 0.35), 0 0 30px rgba(251, 191, 36, 0.2)'
              : '0 20px 60px -10px rgba(0, 0, 0, 0.8)'
          }}
          transition={{ duration: 0.45 }}
          className="rounded-[30px] p-0.5 bg-gradient-to-b from-amber-200/60 via-amber-500/20 to-slate-800/40"
        >
          {/* Main Glass Card Container */}
          <div className="rounded-[28px] bg-[#0b1329]/80 backdrop-blur-2xl p-7 sm:p-9 space-y-6 border border-white/10 relative overflow-hidden shadow-2xl">
            
            {/* Top Spotlight Edge Specular Highlight */}
            <motion.div 
              animate={{ opacity: isLightOn ? 1 : 0.1 }}
              transition={{ duration: 0.45 }}
              className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-200 to-transparent" 
            />

            {/* Header & Title */}
            <div className="text-center space-y-2">
              <div className="inline-flex p-0.5 rounded-2xl bg-gradient-to-tr from-amber-400/30 via-yellow-300/20 to-amber-600/30 shadow-md">
                <div className="w-12 h-12 rounded-[14px] bg-slate-950/90 flex items-center justify-center border border-amber-500/20">
                  <Building2 className="w-6 h-6 text-amber-400" />
                </div>
              </div>

              <div>
                <h1 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                  Login
                </h1>
                <p className="text-xs text-slate-400 mt-1">
                  Enter your credentials to access OMVIK CRM
                </p>
              </div>
            </div>

            {/* Login Form */}
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

              {/* Username / Email Field */}
              <div className="space-y-1.5">
                <Label htmlFor="email" className="text-xs font-semibold text-slate-300">
                  Username / Email
                </Label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5 pointer-events-none" />
                  <Input
                    id="email"
                    type="email"
                    placeholder="aparna@omvikrealcon.com"
                    className="pl-10 h-11 bg-slate-950/60 border-slate-700/80 text-slate-100 text-xs rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all placeholder:text-slate-500"
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
                    className="text-[11px] text-amber-400 hover:text-amber-300 font-medium transition-colors"
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
                    className="pl-10 pr-10 h-11 bg-slate-950/60 border-slate-700/80 text-slate-100 text-xs rounded-xl focus:border-amber-400 focus:ring-1 focus:ring-amber-400/40 transition-all placeholder:text-slate-500"
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

              {/* White Glowing Pill Login Button (Matching Pinterest Design) */}
              <motion.div whileHover={{ scale: 1.01 }} whileTap={{ scale: 0.99 }}>
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full h-11 mt-2 bg-white hover:bg-slate-100 text-slate-950 font-bold text-xs rounded-full shadow-lg shadow-amber-500/10 transition-all duration-300 flex items-center justify-center gap-2 group border border-amber-200/50"
                >
                  {isSubmitting ? (
                    <span className="flex items-center gap-2 text-slate-950">
                      <span className="w-3.5 h-3.5 border-2 border-slate-400 border-t-slate-950 rounded-full animate-spin" />
                      Signing In...
                    </span>
                  ) : (
                    <>
                      <span className="font-extrabold text-slate-950">Login</span>
                      <ArrowRight className="w-4 h-4 text-slate-950 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </Button>
              </motion.div>
            </form>

            {/* Quick Fill Demo Accounts */}
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <UserCheck className="w-3 h-3 text-amber-400" />
                Quick Demo Fill:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleQuickFill('aparna@omvikrealcon.com')}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-amber-400/60 transition-all text-xs group"
                >
                  <span className="font-bold text-slate-200 block group-hover:text-amber-300">Aparna</span>
                  <span className="text-[10px] text-slate-400 block">Super Admin</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleQuickFill('barsha@omvikrealcon.com')}
                  className="p-2.5 rounded-xl bg-slate-950/60 border border-slate-800 text-left hover:border-amber-400/60 transition-all text-xs group"
                >
                  <span className="font-bold text-slate-200 block group-hover:text-amber-300">Barsha</span>
                  <span className="text-[10px] text-slate-400 block">Admin</span>
                </button>
              </div>
            </div>

            {/* Security Footer */}
            <div className="pt-1 text-center">
              <p className="text-[10px] text-slate-500 flex items-center justify-center gap-1">
                <ShieldCheck className="w-3 h-3 text-amber-400" />
                Protected by role-based data scope & SLA sweeps
              </p>
            </div>

          </div>
        </motion.div>
      </motion.div>

      {/* Bottom Floating Control for Light Mode Toggle */}
      <div className="relative z-20 mt-6 flex items-center gap-2 bg-slate-900/90 border border-slate-800 px-3 py-1.5 rounded-full text-xs text-slate-400 shadow-xl backdrop-blur-md">
        <Lightbulb className={`w-3.5 h-3.5 ${isLightOn ? 'text-amber-400 fill-amber-400' : 'text-slate-600'}`} />
        <span>Light Mode:</span>
        <button
          onClick={() => {
            setAutoToggle(!autoToggle);
          }}
          className={`font-mono text-[10px] px-2 py-0.5 rounded-full font-bold transition-colors ${
            autoToggle ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'bg-slate-800 text-slate-400'
          }`}
        >
          {autoToggle ? 'Auto (2s ON/OFF)' : 'Manual'}
        </button>
      </div>

    </div>
  );
}

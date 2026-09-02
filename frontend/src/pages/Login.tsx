import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { User, Lock, Eye, EyeOff, ShieldCheck } from 'lucide-react';
import api from '../api/axios';
import useAuth from '../hooks/useAuth';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Label } from '../components/ui/label';

const loginSchema = z.object({
  email: z.string().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required')
});

type LoginFormValues = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);

  // Interactive Street Light / Torch Light state (Default: ON = true)
  const [isLightOn, setIsLightOn] = useState(true);

  const {
    register,
    handleSubmit,
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
        if (response.data.greeting && response.data.user.nudgesEnabled !== false) {
          sessionStorage.setItem('omvik_mascot_greeting', response.data.greeting);
        }
        login(response.data.user);
        navigate('/dashboard');
      }
    } catch (error: any) {
      console.error('Login error:', error);
      const message =
        error.response?.data?.message ||
        error.response?.data?.error ||
        'Invalid credentials. Please check your username or email and password.';
      setServerError(message);
    }
  };

  return (
    <div 
      className={`min-h-screen w-full flex flex-col items-center justify-center p-4 relative overflow-hidden font-sans transition-colors duration-700 selection:bg-yellow-400 selection:text-slate-950 ${
        isLightOn ? 'bg-[#091020]' : 'bg-[#02050a]'
      }`}
    >
      
      {/* 1. DARK BLUE BRICK WALL BACKGROUND TEXTURE */}
      <div 
        className={`absolute inset-0 transition-opacity duration-700 pointer-events-none ${
          isLightOn ? 'opacity-80' : 'opacity-20'
        }`}
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='80' height='40' viewBox='0 0 80 40' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M0 0h80v40H0z' fill='none'/%3E%3Cpath d='M0 20h80M0 40h80M40 0v20M80 0v20M20 20v20M60 20v20' stroke='%23192a54' stroke-width='1.8'/%3E%3C/svg%3E")`,
          backgroundSize: '80px 40px'
        }}
      />

      {/* 2. SLEEK INTERACTIVE STREET LIGHT / WALL SPOTLIGHT FIXTURE */}
      <div className="relative z-30 flex flex-col items-center mb-[-2px]">
        {/* Wall Bracket Pipe */}
        <div className="w-3 h-4 bg-gradient-to-b from-slate-950 via-slate-800 to-slate-900 border-x border-slate-700/80 shadow-md" />

        {/* Sleek Metallic Wall Spotlight Dome */}
        <div 
          onClick={() => setIsLightOn(!isLightOn)}
          title="Click to toggle street light ON / OFF"
          className="relative cursor-pointer group select-none flex flex-col items-center"
        >
          {/* Metallic Dome Shade */}
          <div className="w-24 h-6 bg-gradient-to-b from-slate-800 via-slate-900 to-slate-950 rounded-t-2xl border-t border-x border-slate-600/90 shadow-2xl flex items-center justify-center relative overflow-hidden group-hover:border-amber-400 transition-colors">
            <div className="w-16 h-0.5 bg-amber-400/40 rounded-full" />
          </div>

          {/* Lamp Glass Lens / Bulb Core */}
          <div className="w-28 h-3 bg-[#080e1e] rounded-b-md border-b border-x border-slate-600 flex items-center justify-center relative overflow-hidden shadow-xl">
            <motion.div
              animate={{
                opacity: isLightOn ? 1 : 0.15,
                scale: isLightOn ? 1 : 0.9
              }}
              transition={{ duration: 0.3 }}
              className="w-20 h-2 bg-gradient-to-r from-amber-200 via-yellow-100 to-amber-200 rounded-full shadow-[0_0_25px_#f59e0b,#0_0_50px_#fef08a]"
            />
          </div>
        </div>
      </div>

      {/* 3. VOLUMETRIC TORCH LIGHT CONE (PROJECTS DOWNWARD OVER LOGIN CARD) */}
      <AnimatePresence>
        {isLightOn && (
          <motion.div
            key="torch-light-beam"
            initial={{ opacity: 0, scaleY: 0.8 }}
            animate={{ opacity: 1, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.8 }}
            transition={{ duration: 0.45, ease: 'easeOut' }}
            className="absolute top-12 left-1/2 -translate-x-1/2 w-[580px] sm:w-[740px] h-[780px] pointer-events-none z-10 origin-top"
            style={{
              background: 'radial-gradient(ellipse at top, rgba(254, 240, 138, 0.48) 0%, rgba(245, 158, 11, 0.26) 30%, rgba(217, 119, 6, 0.08) 60%, transparent 80%)',
              clipPath: 'polygon(46% 0%, 54% 0%, 100% 100%, 0% 100%)'
            }}
          />
        )}
      </AnimatePresence>

      {/* Ambient Floor & Wall Soft Glow */}
      <motion.div
        animate={{
          opacity: isLightOn ? 0.6 : 0.02
        }}
        transition={{ duration: 0.45 }}
        className="absolute top-32 left-1/2 -translate-x-1/2 w-[520px] h-[520px] bg-amber-500/20 rounded-full blur-[130px] pointer-events-none z-0"
      />

      {/* 4. GLASSMORPHIC LOGIN CARD */}
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-[400px] relative z-20 mt-2"
      >
        <div 
          className={`rounded-2xl p-7 sm:p-9 space-y-6 backdrop-blur-xl border transition-all duration-500 shadow-2xl relative overflow-hidden ${
            isLightOn
              ? 'bg-[#0e172e]/70 border-white/20 shadow-[0_20px_50px_rgba(245,158,11,0.2)]'
              : 'bg-[#050914]/95 border-slate-800/80 shadow-black'
          }`}
        >
          {/* Top Specular Edge Highlight */}
          {isLightOn && (
            <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-200 to-transparent opacity-90" />
          )}

          {/* Header Title */}
          <div className="text-center pt-1">
            <h1 className="text-3xl font-extrabold tracking-tight text-white drop-shadow-md">
              Login
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-1">
            {serverError && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="p-3 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold flex items-center gap-2"
              >
                <span>⚠️</span>
                <span>{serverError}</span>
              </motion.div>
            )}

            {/* Input 1: Username or Email */}
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-slate-200 block pl-1">
                Username or Email
              </Label>
              <div className="relative">
                <Input
                  id="email"
                  type="text"
                  placeholder="Enter your username or email"
                  className="w-full h-11 pr-11 pl-4 bg-slate-950/40 border-slate-600/70 text-slate-100 text-xs rounded-full focus:border-amber-300 focus:ring-1 focus:ring-amber-300/50 transition-all placeholder:text-slate-400 font-medium"
                  {...register('email')}
                />
                <User className="w-4 h-4 text-slate-300 absolute right-4 top-3.5 pointer-events-none" />
              </div>
              {errors.email && (
                <p className="text-[11px] text-red-400 font-medium pl-3">{errors.email.message}</p>
              )}
            </div>

            {/* Input 2: Password */}
            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-slate-200 block pl-1">
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  className="w-full h-11 pr-11 pl-4 bg-slate-950/40 border-slate-600/70 text-slate-100 text-xs rounded-full focus:border-amber-300 focus:ring-1 focus:ring-amber-300/50 transition-all placeholder:text-slate-400 font-medium"
                  {...register('password')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-3.5 text-slate-300 hover:text-white transition-colors focus:outline-none"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Lock className="w-4 h-4 text-slate-300 pointer-events-none" />}
                </button>
              </div>
              {errors.password && (
                <p className="text-[11px] text-red-400 font-medium pl-3">{errors.password.message}</p>
              )}
            </div>

            {/* Row: Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-xs px-1 text-slate-200 font-medium pt-1">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-950 text-amber-400 focus:ring-0 focus:ring-offset-0 cursor-pointer"
                />
                <span>Remember me</span>
              </label>

              <Link
                to="/forgot-password"
                className="text-slate-200 hover:text-white hover:underline transition-colors"
              >
                Forgot password?
              </Link>
            </div>

            {/* Login Button (Pure White Pill Button) */}
            <div className="pt-2">
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full h-11 bg-white hover:bg-slate-100 text-slate-950 font-extrabold text-sm rounded-full shadow-lg transition-all duration-300 border border-white/90 active:scale-[0.99] cursor-pointer"
              >
                {isSubmitting ? (
                  <span className="flex items-center gap-2 text-slate-950">
                    <span className="w-4 h-4 border-2 border-slate-400 border-t-slate-950 rounded-full animate-spin" />
                    Signing In...
                  </span>
                ) : (
                  'Login'
                )}
              </Button>
            </div>

            {/* Footer Registration Link */}
            <div className="text-center pt-2 text-xs text-slate-300">
              <span>Don't have an account? </span>
              <button
                type="button"
                onClick={() => setServerError('Account creation is managed by System Admin. Please contact admin@omvik.com')}
                className="font-bold text-white hover:underline cursor-pointer"
              >
                Register
              </button>
            </div>
          </form>

          {/* Security Footer */}
          <div className="pt-2 text-center border-t border-white/10">
            <p className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" />
              Protected by role-based data scope & SLA sweeps
            </p>
          </div>

        </div>
      </motion.div>

    </div>
  );
}

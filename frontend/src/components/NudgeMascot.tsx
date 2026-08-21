import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import useAuth from '../hooks/useAuth';
import { getMyPerformance } from '../api/reports';

export default function NudgeMascot() {
  const { user } = useAuth();
  const [isVisible, setIsVisible] = useState(false);
  const [message, setMessage] = useState('');
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Fetch real performance & overdue follow-up counts
  const { data } = useQuery({
    queryKey: ['myPerformance'],
    queryFn: getMyPerformance,
    enabled: !!user && user.nudgesEnabled !== false
  });

  useEffect(() => {
    // Check OS accessibility preference for reduced motion
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);

    // Check if user disabled nudges
    if (!user || user.nudgesEnabled === false) {
      setIsVisible(false);
      return;
    }

    // 1. Immediate Login Greeting check from sessionStorage
    const pendingGreeting = sessionStorage.getItem('omvik_mascot_greeting');
    if (pendingGreeting) {
      setMessage(pendingGreeting);
      setIsVisible(true);
      sessionStorage.removeItem('omvik_mascot_greeting');
      return;
    }

    // 2. Check if user dismissed nudges today
    const todayStr = new Date().toISOString().split('T')[0];
    const dismissedToday = localStorage.getItem('omvik_nudge_dismissed_today');
    if (dismissedToday === todayStr) {
      setIsVisible(false);
      return;
    }

    // 3. Set timer to trigger mascot nudge popup after 8 seconds on turn/load
    const timer = setTimeout(() => {
      const perf = data?.performance || {};
      const overdue = perf.followupsOverdue || 0;
      const won = perf.opportunitiesWon || 0;

      if (overdue > 0) {
        setMessage(`👀 You have ${overdue} overdue follow-up task${overdue > 1 ? 's' : ''} waiting for action!`);
      } else if (won > 0) {
        setMessage(`🎉 Great progress! You have closed ${won} deal${won > 1 ? 's' : ''} won. Keep it up!`);
      } else {
        setMessage('✨ Fantastic job! Your daily action inbox is clean today.');
      }

      setIsVisible(true);
    }, 8000);

    return () => clearTimeout(timer);
  }, [user, data]);

  // Listen for dynamic Mascot Nudge Events (e.g. Login greeting / Logout farewell)
  useEffect(() => {
    const handleMascotEvent = (e: any) => {
      if (e.detail?.message && user?.nudgesEnabled !== false) {
        setMessage(e.detail.message);
        setIsVisible(true);
      }
    };

    window.addEventListener('omvik_mascot_nudge', handleMascotEvent);
    return () => window.removeEventListener('omvik_mascot_nudge', handleMascotEvent);
  }, [user]);

  const handleDismiss = () => {
    setIsVisible(false);
  };

  const handleDismissToday = () => {
    const todayStr = new Date().toISOString().split('T')[0];
    localStorage.setItem('omvik_nudge_dismissed_today', todayStr);
    setIsVisible(false);
  };

  if (!isVisible || !user || user.nudgesEnabled === false) {
    return null;
  }

  return (
    <div className={`fixed bottom-4 right-4 left-4 sm:left-auto max-w-[calc(100vw-32px)] sm:max-w-sm z-50 flex items-end gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 ${isReducedMotion ? '' : 'transition-transform'}`}>
      {/* Nudge Speech Bubble */}
      <div className="flex-1 bg-slate-900 border border-indigo-500/40 p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-2xl text-slate-100 space-y-2 relative min-w-0">
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white text-xs p-1"
          title="Close nudge"
        >
          ✕
        </button>

        <div className="flex items-center gap-2 text-[11px] font-bold text-indigo-400 uppercase tracking-widest">
          <span>🤖 Omvik Assistant</span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed pr-4 font-medium">
          {message}
        </p>

        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
          <button
            onClick={handleDismissToday}
            className="hover:text-indigo-300 font-semibold underline decoration-dotted cursor-pointer"
          >
            Don't show today
          </button>
          <button
            onClick={handleDismiss}
            className="px-2.5 py-1 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-bold cursor-pointer"
          >
            Got it
          </button>
        </div>
      </div>

      {/* SVG Animated Mascot Character */}
      <div className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-600 flex items-center justify-center shadow-xl shadow-indigo-600/40 border border-indigo-400/30 ${isReducedMotion ? '' : 'animate-bounce'}`}>
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="w-6 h-6 sm:w-8 sm:h-8 text-white"
        >
          <rect x="3" y="11" width="18" height="10" rx="2" />
          <circle cx="12" cy="5" r="2" />
          <path d="M12 7v4" />
          <line x1="8" y1="16" x2="8.01" y2="16" />
          <line x1="16" y1="16" x2="16.01" y2="16" />
        </svg>
      </div>
    </div>
  );
}

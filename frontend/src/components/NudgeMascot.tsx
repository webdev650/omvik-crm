import React, { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import useAuth from '../hooks/useAuth';
import { getAssistantMessage, AssistantMessageResponse } from '../api/assistant';

export default function NudgeMascot() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const [isVisible, setIsVisible] = useState(false);
  const [customMessage, setCustomMessage] = useState<string | null>(null);
  const [customType, setCustomType] = useState<'reminder' | 'appreciation' | 'info' | 'greeting' | null>(null);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  // Check OS accessibility preference for reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setIsReducedMotion(mediaQuery.matches);
  }, []);

  // Fetch role-based, task-aware Omvik Assistant message on load & refresh every 5 minutes
  const {
    data: assistantData,
    isLoading,
    isError,
    refetch
  } = useQuery<AssistantMessageResponse>({
    queryKey: ['assistantMessage'],
    queryFn: getAssistantMessage,
    enabled: !!user && user.nudgesEnabled !== false,
    refetchInterval: 5 * 60 * 1000, // Refresh every 5 minutes
    refetchOnWindowFocus: true
  });

  // Listen for global assistant refresh events (e.g. after call logged, task completed, EOD submitted)
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
      queryClient.invalidateQueries({ queryKey: ['assistantMessage'] });
    };

    window.addEventListener('omvik_refresh_assistant', handleRefresh);
    return () => window.removeEventListener('omvik_refresh_assistant', handleRefresh);
  }, [refetch, queryClient]);

  // Handle immediate Login Greeting from sessionStorage or dynamic mascot events
  useEffect(() => {
    if (!user || user.nudgesEnabled === false) {
      setIsVisible(false);
      return;
    }

    const pendingGreeting = sessionStorage.getItem('omvik_mascot_greeting');
    if (pendingGreeting) {
      setCustomMessage(pendingGreeting);
      setCustomType('greeting');
      setIsVisible(true);
      sessionStorage.removeItem('omvik_mascot_greeting');
      return;
    }

    // Check if dismissed today
    const todayStr = new Date().toISOString().split('T')[0];
    const dismissedToday = localStorage.getItem('omvik_nudge_dismissed_today');
    if (dismissedToday === todayStr) {
      setIsVisible(false);
      return;
    }

    // If assistantData loaded and not dismissed, show card
    if (assistantData?.message || isError) {
      setIsVisible(true);
    }
  }, [user, assistantData, isError]);

  // Listen for dynamic Mascot Nudge Events
  useEffect(() => {
    const handleMascotEvent = (e: any) => {
      if (e.detail?.message && user?.nudgesEnabled !== false) {
        setCustomMessage(e.detail.message);
        if (e.detail.type) {
          setCustomType(e.detail.type);
        }
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

  // Determine current active message and type safely
  const isAdminRole = user?.role && ['admin', 'super_admin', 'director', 'team_lead'].includes(user.role);
  let displayMessage = customMessage || assistantData?.message || '';
  let displayType = customType || assistantData?.type || (isAdminRole ? 'greeting' : 'info');

  if (isLoading && !displayMessage) {
    displayMessage = 'Checking updates...';
    displayType = 'greeting';
  } else if (isError && !displayMessage) {
    displayMessage = isAdminRole
      ? 'Welcome to OMVIK CRM. Have a productive day!'
      : 'Check your leads and tasks to stay on track.';
    displayType = 'info';
  }

  // Subtle styling per type (reminder = amber, appreciation = green, greeting = neutral)
  const isReminder = displayType === 'reminder';
  const isAppreciation = displayType === 'appreciation';

  const borderClass = isReminder
    ? 'border-amber-500/40 shadow-amber-950/20'
    : isAppreciation
    ? 'border-emerald-500/40 shadow-emerald-950/20'
    : 'border-slate-700/60 shadow-slate-950/20';

  const badgeTextClass = isReminder
    ? 'text-amber-400'
    : isAppreciation
    ? 'text-emerald-400'
    : 'text-slate-300';

  const buttonClass = isReminder
    ? 'bg-amber-600 hover:bg-amber-500'
    : isAppreciation
    ? 'bg-emerald-600 hover:bg-emerald-500'
    : 'bg-slate-700 hover:bg-slate-600 text-slate-200';

  const linkHoverClass = isReminder
    ? 'hover:text-amber-300'
    : isAppreciation
    ? 'hover:text-emerald-300'
    : 'hover:text-slate-300';

  return (
    <div
      className={`fixed bottom-4 right-4 left-4 sm:left-auto max-w-[calc(100vw-32px)] sm:max-w-sm z-50 flex items-end gap-2.5 sm:gap-3 animate-in fade-in slide-in-from-bottom-5 duration-300 ${
        isReducedMotion ? '' : 'transition-transform'
      }`}
    >
      {/* Nudge Speech Bubble */}
      <div
        className={`flex-1 bg-slate-900 border p-3.5 sm:p-4 rounded-2xl shadow-2xl backdrop-blur-2xl text-slate-100 space-y-2 relative min-w-0 transition-colors ${borderClass}`}
      >
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 text-slate-400 hover:text-white text-xs p-1"
          title="Close nudge"
        >
          ✕
        </button>

        <div className={`flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest ${badgeTextClass}`}>
          <span>🤖 Omvik Assistant</span>
        </div>

        <p className="text-xs text-slate-200 leading-relaxed pr-4 font-medium">
          {displayMessage}
        </p>

        <div className="flex items-center justify-between pt-1 text-[10px] text-slate-400 border-t border-slate-800/80">
          <button
            onClick={handleDismissToday}
            className={`font-semibold underline decoration-dotted cursor-pointer transition-colors ${linkHoverClass}`}
          >
            Don't show today
          </button>
          <button
            onClick={handleDismiss}
            className={`px-2.5 py-1 rounded-lg text-white font-bold cursor-pointer transition-colors ${buttonClass}`}
          >
            Got it
          </button>
        </div>
      </div>

      {/* SVG Animated Mascot Character */}
      <div
        className={`w-12 h-12 sm:w-14 sm:h-14 shrink-0 rounded-2xl bg-gradient-to-tr ${
          isReminder
            ? 'from-amber-600 to-orange-600 shadow-amber-600/30 border-amber-400/30'
            : isAppreciation
            ? 'from-emerald-600 to-teal-600 shadow-emerald-600/30 border-emerald-400/30'
            : 'from-slate-700 to-slate-800 shadow-slate-900/40 border-slate-600/30'
        } flex items-center justify-center shadow-xl border ${isReducedMotion ? '' : 'animate-bounce'}`}
      >
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

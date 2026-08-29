import * as React from 'react';

export interface BadgeProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info';
}

export function Badge({
  className = '',
  variant = 'default',
  ...props
}: BadgeProps) {
  let baseStyles =
    'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wider transition-colors';

  let variantStyles = '';
  switch (variant) {
    case 'default':
      variantStyles = 'bg-indigo-500/10 border border-indigo-500/30 text-indigo-400';
      break;
    case 'secondary':
      variantStyles = 'bg-slate-800 border border-slate-700 text-slate-300';
      break;
    case 'destructive':
      variantStyles = 'bg-red-500/10 border border-red-500/30 text-red-400 font-bold';
      break;
    case 'success':
      variantStyles = 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400';
      break;
    case 'warning':
      variantStyles = 'bg-amber-500/10 border border-amber-500/30 text-amber-400';
      break;
    case 'info':
      variantStyles = 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-400';
      break;
    case 'outline':
      variantStyles = 'border border-slate-700 text-slate-400';
      break;
  }

  return (
    <div className={`${baseStyles} ${variantStyles} ${className}`} {...props} />
  );
}

export function getStageBadgeVariant(stage: string): BadgeProps['variant'] {
  switch (stage) {
    case 'new':
      return 'default';
    case 'contacted':
      return 'info';
    case 'qualified':
      return 'warning';
    case 'site_visit':
      return 'info';
    case 'negotiation':
      return 'warning';
    case 'won':
      return 'success';
    case 'lost':
      return 'destructive';
    default:
      return 'secondary';
  }
}

export function getRoleBadgeVariant(role?: string): BadgeProps['variant'] {
  switch (role) {
    case 'super_admin':
    case 'admin':
    case 'director':
      return 'warning';
    case 'team_lead':
      return 'default';
    case 'telecaller':
      return 'info';
    case 'marketing':
      return 'info';
    case 'finance':
      return 'success';
    default:
      return 'secondary';
  }
}

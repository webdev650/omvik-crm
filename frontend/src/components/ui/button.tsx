import * as React from 'react';

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'default' | 'outline' | 'ghost' | 'destructive';
  size?: 'default' | 'sm' | 'lg';
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className = '',
      variant = 'default',
      size = 'default',
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    let baseStyles =
      'inline-flex items-center justify-center font-medium rounded-xl transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none cursor-pointer';

    let variantStyles = '';
    switch (variant) {
      case 'default':
        variantStyles =
          'bg-gradient-to-r from-indigo-600 to-blue-600 text-white hover:from-indigo-500 hover:to-blue-500 shadow-lg shadow-indigo-600/30 active:scale-[0.98]';
        break;
      case 'outline':
        variantStyles =
          'border border-slate-700 bg-transparent text-slate-200 hover:bg-slate-800 hover:text-white';
        break;
      case 'ghost':
        variantStyles = 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white';
        break;
      case 'destructive':
        variantStyles =
          'bg-red-600 text-white hover:bg-red-500 shadow-lg shadow-red-600/30';
        break;
    }

    let sizeStyles = '';
    switch (size) {
      case 'sm':
        sizeStyles = 'h-9 px-3 text-xs';
        break;
      case 'default':
        sizeStyles = 'h-11 px-5 text-sm';
        break;
      case 'lg':
        sizeStyles = 'h-12 px-6 text-base';
        break;
    }

    return (
      <button
        ref={ref}
        disabled={disabled}
        className={`${baseStyles} ${variantStyles} ${sizeStyles} ${className}`}
        {...props}
      >
        {children}
      </button>
    );
  }
);
Button.displayName = 'Button';

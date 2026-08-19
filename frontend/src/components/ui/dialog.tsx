import * as React from 'react';

interface DialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  children: React.ReactNode;
}

export function Dialog({ open, onOpenChange, children }: DialogProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm transition-opacity animate-in fade-in"
        onClick={() => onOpenChange(false)}
      />
      {/* Modal Container */}
      <div className="relative z-10 w-full max-w-lg animate-in zoom-in-95 duration-150">
        {children}
      </div>
    </div>
  );
}

export const DialogContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className = '', children, ...props }, ref) => (
  <div
    ref={ref}
    className={`p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl space-y-4 ${className}`}
    {...props}
  >
    {children}
  </div>
));
DialogContent.displayName = 'DialogContent';

export function DialogHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`space-y-1.5 ${className}`} {...props}>{children}</div>;
}

export function DialogTitle({ className = '', children, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h3 className={`text-lg font-bold text-slate-100 flex items-center gap-2 ${className}`} {...props}>{children}</h3>;
}

export function DialogDescription({ className = '', children, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <p className={`text-xs text-slate-400 ${className}`} {...props}>{children}</p>;
}

export function DialogFooter({ className = '', children, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={`flex items-center justify-end gap-3 pt-4 border-t border-slate-800/80 ${className}`} {...props}>{children}</div>;
}

import * as React from 'react';

export const Tabs = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { defaultValue?: string; value?: string; onValueChange?: (v: string) => void }
>(({ className = '', defaultValue, value, onValueChange, children, ...props }, ref) => {
  const [active, setActive] = React.useState(value ?? defaultValue ?? '');

  React.useEffect(() => {
    if (value !== undefined) setActive(value);
  }, [value]);

  const handleChange = (v: string) => {
    if (value === undefined) setActive(v);
    onValueChange?.(v);
  };

  return (
    <div ref={ref} className={`w-full ${className}`} data-active={active} {...props}>
      {React.Children.map(children, (child) =>
        React.isValidElement(child)
          ? React.cloneElement(child as React.ReactElement<any>, { __active: active, __onChange: handleChange })
          : child
      )}
    </div>
  );
});
Tabs.displayName = 'Tabs';

export const TabsList = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { __active?: string; __onChange?: (v: string) => void }
>(({ className = '', __active, __onChange, children, ...props }, ref) => (
  <div
    ref={ref}
    className={`inline-flex items-center gap-1 p-1 rounded-xl bg-slate-950/80 border border-slate-800 ${className}`}
    {...props}
  >
    {React.Children.map(children, (child) =>
      React.isValidElement(child)
        ? React.cloneElement(child as React.ReactElement<any>, { __active, __onChange })
        : child
    )}
  </div>
));
TabsList.displayName = 'TabsList';

export const TabsTrigger = React.forwardRef<
  HTMLButtonElement,
  React.ButtonHTMLAttributes<HTMLButtonElement> & { value: string; __active?: string; __onChange?: (v: string) => void }
>(({ className = '', value, __active, __onChange, children, ...props }, ref) => {
  const isActive = __active === value;
  return (
    <button
      ref={ref}
      type="button"
      onClick={() => __onChange?.(value)}
      className={`px-4 py-1.5 rounded-lg text-xs font-semibold tracking-wide transition-all duration-200 ${
        isActive
          ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
          : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
});
TabsTrigger.displayName = 'TabsTrigger';

export const TabsContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> & { value: string; __active?: string }
>(({ className = '', value, __active, children, ...props }, ref) => {
  if (__active !== value) return null;
  return (
    <div ref={ref} className={`mt-4 animate-fade-in ${className}`} {...props}>
      {children}
    </div>
  );
});
TabsContent.displayName = 'TabsContent';

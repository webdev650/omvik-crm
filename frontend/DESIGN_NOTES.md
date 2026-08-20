# Omvik CRM — UI Design Standards & Alignment Rules

## 1. Card & Container Spacing Tokens
- **Page Container Padding**: `p-4 sm:p-6 lg:p-8`
- **Standard Card Padding**: `p-5` or `p-6` (`CardContent className="p-6"`)
- **Card Spacing Scale**: `space-y-6` for page sections, `space-y-4` for form controls.

## 2. Table Column Alignment
- **Text Labels & Names**: Left-aligned (`text-left font-semibold text-slate-100`)
- **Numeric Values & Totals**: Right-aligned (`text-right font-mono text-slate-200`)
- **Dates & Timestamps**: Monospaced font (`font-mono text-xs text-slate-400`)
- **Action Columns & Controls**: Right-aligned (`TableHead className="text-right"`, `TableCell className="text-right"`)

## 3. Form Input & Label Rules
- **Label Positioning**: Labels are ALWAYS stacked directly above the input field using `<Label className="block text-xs font-bold text-slate-400 mb-1.5 uppercase tracking-wider">`.
- **Input Styling**: Dark glassmorphic input controls (`bg-slate-950 border-slate-800 text-slate-100 focus:border-indigo-500`).

## 4. Badges & Indicators
- **Stage Badges**: Capitalized with HSL color-coded variants (`new`, `contacted`, `qualified`, `site_visit`, `negotiation`, `won`, `lost`).
- **SLA Alert Badges**: Pulsing highlight badges for urgent items (`bg-red-500/20 text-red-400 border-red-500/30 animate-pulse`).

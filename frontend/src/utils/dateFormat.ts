/**
 * OMVIK CRM — Date Formatting Utility
 * Provides consistent, human-readable date strings across the app.
 * Uses vanilla Intl APIs — no extra packages needed.
 */

/** Returns ordinal suffix: 1→"st", 2→"nd", 3→"rd", 4+→"th" */
export function ordinalSuffix(n: number): string {
  const abs = Math.abs(n);
  const mod10 = abs % 10;
  const mod100 = abs % 100;
  if (mod100 >= 11 && mod100 <= 13) return 'th';
  if (mod10 === 1) return 'st';
  if (mod10 === 2) return 'nd';
  if (mod10 === 3) return 'rd';
  return 'th';
}

/** Returns ordinal number string: 1→"1st", 2→"2nd", 3→"3rd", 22→"22nd" */
export function ordinalNum(n: number): string {
  return `${n}${ordinalSuffix(n)}`;
}

/**
 * Formats a date as "5th July 2026"
 * @param dateStr — ISO string or Date object
 */
export function ordinalDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'long' });
  const year = d.getFullYear();
  return `${ordinalNum(day)} ${month} ${year}`;
}

/**
 * Formats a date as "5th July 2026, 10:30 AM"
 * @param dateStr — ISO string or Date object
 */
export function shortDateTime(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'long' });
  const year = d.getFullYear();
  const time = d.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).toUpperCase();
  return `${ordinalNum(day)} ${month} ${year}, ${time}`;
}

/**
 * Formats a date as "5th Aug 2026" (short month)
 */
export function shortOrdinalDate(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';
  const day = d.getDate();
  const month = d.toLocaleDateString('en-IN', { month: 'short' });
  const year = d.getFullYear();
  return `${ordinalNum(day)} ${month} ${year}`;
}

/**
 * Returns relative time for recent dates, falls back to ordinalDate for older ones.
 * e.g. "just now", "3h ago", "2d ago", "5th July 2026"
 */
export function relativeOrOrdinal(dateStr: string | Date): string {
  const d = typeof dateStr === 'string' ? new Date(dateStr) : dateStr;
  if (isNaN(d.getTime())) return '—';
  const diffMs = Date.now() - d.getTime();
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return shortOrdinalDate(d);
}

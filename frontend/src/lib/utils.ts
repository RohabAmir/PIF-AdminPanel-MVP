import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { format, formatDistanceToNowStrict, isValid, parseISO } from 'date-fns';

export const cn = (...inputs: ClassValue[]) => twMerge(clsx(inputs));

const toDate = (v: string | Date | null | undefined) => (v ? (typeof v === 'string' ? parseISO(v) : v) : null);

/** Dates are stored in UTC and always shown in the viewer's local timezone. */
export function fmtDate(v: string | Date | null | undefined, pattern = 'd MMM yyyy'): string {
  const d = toDate(v);
  return d && isValid(d) ? format(d, pattern) : '—';
}
export const fmtDateTime = (v: string | Date | null | undefined) => fmtDate(v, 'd MMM yyyy, HH:mm');
export function fmtRelative(v: string | Date | null | undefined): string {
  const d = toDate(v);
  return d && isValid(d) ? `${formatDistanceToNowStrict(d)} ago` : '—';
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('');
}

export function slugify(input: string): string {
  return (
    input
      .normalize('NFKD')
      .replace(/[̀-ͯ]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80) || ''
  );
}

export function formatBytes(n: number): string {
  if (!n) return '—';
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

export function humanize(s: string): string {
  return s.replace(/[._]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Safe "return to" target after login: internal paths only. */
export function safeReturnTo(v: string | null | undefined): string {
  if (!v || !v.startsWith('/') || v.startsWith('//')) return '/dashboard';
  if (['/login', '/verify-otp', '/reset-password', '/forgot-password'].some((p) => v.startsWith(p))) return '/dashboard';
  return v;
}

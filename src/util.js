import { useCallback, useEffect, useState } from 'react';

// Board backgrounds are stored by id/name in the API; the look lives here.
export const BACKGROUNDS = {
  1: 'linear-gradient(135deg, #2b5876 0%, #4e9fc4 100%)',
  2: 'linear-gradient(135deg, #1f4d3a 0%, #4f8a5b 100%)',
  3: 'linear-gradient(135deg, #c2410c 0%, #f59e0b 100%)',
  4: 'linear-gradient(135deg, #4c1d95 0%, #a855f7 100%)',
  5: 'linear-gradient(135deg, #1f2937 0%, #4b5563 100%)',
  6: 'linear-gradient(135deg, #a16207 0%, #e7c27d 100%)',
};
export const backgroundFor = (id) => BACKGROUNDS[id] || BACKGROUNDS[1];

export const LABEL_COLORS = ['#16a34a', '#ca8a04', '#ea580c', '#dc2626', '#9333ea', '#2563eb', '#0891b2', '#64748b'];

export const PRIVILEGES = { 1: 'Can view', 2: 'Can edit', 3: 'Admin' };

// Short, human date: "Nov 8" or "Nov 8, 2025" when not this year.
export function shortDate(value) {
  if (!value) return '';
  const d = new Date(value);
  const sameYear = d.getFullYear() === new Date().getFullYear();
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', ...(!sameYear && { year: 'numeric' }) });
}

export function timeAgo(value) {
  const seconds = Math.round((Date.now() - new Date(value).getTime()) / 1000);
  if (seconds < 60) return 'just now';
  const units = [
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ];
  for (const [unit, size] of units) {
    if (seconds >= size) {
      const n = Math.floor(seconds / size);
      return `${n} ${unit}${n > 1 ? 's' : ''} ago`;
    }
  }
}

// "2025-11-08T10:30" for <input type="datetime-local"> in local time.
export function toLocalInput(value) {
  const d = new Date(value);
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function dueStatus(deadline) {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  if (diff < 0) return 'overdue';
  if (diff < 24 * 3600 * 1000) return 'soon';
  return 'later';
}

export const initials = (name = '?') => name.slice(0, 2).toUpperCase();

// Loads data from `fn` on mount and whenever deps change; `reload` refetches.
export function useLoad(fn, deps = []) {
  const [state, setState] = useState({ data: null, error: null, loading: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const load = useCallback(fn, deps);

  const reload = useCallback(async () => {
    try {
      const data = await load();
      setState({ data, error: null, loading: false });
    } catch (error) {
      setState((s) => ({ ...s, error, loading: false }));
    }
  }, [load]);

  useEffect(() => {
    setState((s) => ({ ...s, loading: true }));
    reload();
  }, [reload]);

  return { ...state, reload, setData: (data) => setState((s) => ({ ...s, data })) };
}

// Global toast messages, rendered by <Toasts/>.
export const toast = (message, kind = 'info') =>
  window.dispatchEvent(new CustomEvent('pm:toast', { detail: { message: String(message), kind } }));

// Runs an async action and toasts its error; returns true on success.
export async function attempt(action, success) {
  try {
    await action();
    if (success) toast(success, 'success');
    return true;
  } catch (err) {
    toast(err.message, 'error');
    return false;
  }
}

// Only http(s) URLs are rendered as links/images (blocks javascript: etc.).
export function safeUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : null;
  } catch {
    return null;
  }
}

// Inline style for a cover: a hex color or an http(s) image URL.
export function coverStyle(cover) {
  if (!cover) return null;
  if (/^#[0-9a-f]{3,8}$/i.test(cover)) return { background: cover };
  const url = safeUrl(cover);
  return url ? { backgroundImage: `url(${JSON.stringify(url)})` } : null;
}

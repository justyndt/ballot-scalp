export type DeadlineState =
  | { kind: 'passed'; label: string }
  | { kind: 'now'; label: string }
  | { kind: 'today'; label: string }
  | { kind: 'tomorrow'; label: string }
  | { kind: 'upcoming'; label: string; days: number };

const DAY = 86_400_000;

export function parseISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function daysUntil(iso: string, now = new Date()): number {
  return Math.round((parseISO(iso).getTime() - startOfDay(now).getTime()) / DAY);
}

export function deadlineState(iso: string, isoEnd?: string, now = new Date()): DeadlineState {
  const start = daysUntil(iso, now);
  const end = isoEnd ? daysUntil(isoEnd, now) : start;
  if (start <= 0 && end >= 0 && isoEnd) return { kind: 'now', label: 'Happening now' };
  if (end < 0) return { kind: 'passed', label: 'Passed' };
  if (start === 0) return { kind: 'today', label: 'Today' };
  if (start === 1) return { kind: 'tomorrow', label: 'Tomorrow' };
  return { kind: 'upcoming', label: `${start} ${start === 1 ? 'day' : 'days'} away`, days: start };
}

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export function formatDate(iso: string | null): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
}

export function formatShort(iso: string | null): string | null {
  if (!iso) return null;
  const d = parseISO(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

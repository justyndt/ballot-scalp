import type { Candidate, Race } from '../content.config';

/* Everything time-dependent is computed here, at render time, from a clock
   passed in. Nothing about "passed" or "days away" is ever stored in the
   data — a stored status string becomes a lie the moment the date moves.
   Pass an explicit `now` so this is testable against a fake clock. */

export type DeadlineState =
  | { kind: 'passed'; label: string }
  | { kind: 'now'; label: string }
  | { kind: 'today'; label: string }
  | { kind: 'tomorrow'; label: string }
  | { kind: 'upcoming'; label: string; days: number };

const DAY = 86_400_000;

/** Parse YYYY-MM-DD as local midnight, not UTC. new Date('2026-08-18') is
 *  UTC and shifts a day backwards west of Greenwich — which silently makes
 *  every deadline look one day closer. */
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

/** isoEnd makes this a range (early voting), which can be "happening now". */
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

/* Party is shown as text, never as a color fill. Red and blue both carry
   partisan meaning on a ballot, so neither appears as a party marker. */
const PARTY_ABBR: Record<string, string> = {
  'Democrat': 'DEM',
  'Republican': 'REP',
  'No Party Affiliation': 'NPA',
  'Libertarian': 'LPF',
  'Write-In': 'Write-In',
  'Nonpartisan office': 'Nonpartisan',
};

/** null party means the office does not publish it (Leon's local races).
 *  "Not stated" is the honest rendering — never infer it. */
export function partyAbbr(party: string | null): string {
  return party ? (PARTY_ABBR[party] ?? party) : 'Not stated';
}

/** Only used for the hover rule, and only alongside the visible party text,
 *  so color is never the sole carrier of meaning. */
export function partyRuleClass(party: string | null): string {
  if (party === 'Republican') return 'p-rep';
  if (party === 'Democrat') return 'p-dem';
  return 'p-oth';
}

export function lastName(name: string): string {
  const clean = String(name).replace(/["“”().]/g, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  return (parts[parts.length - 1] || clean).toLowerCase();
}

/** Alphabetical by last name, always. Never by incumbency, party, filing
 *  date or money — the order of a candidate list is itself a statement. */
export function sortCandidates(list: Candidate[]): Candidate[] {
  return [...list].sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
}

export function initials(name: string): string {
  const p = String(name).replace(/["“”().]/g, '').split(/\s+/).filter(Boolean);
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
}

/* Absent values print in the record's own language. A blank cell reads as
   an oversight; "Not published" tells the reader whose gap it is. */
export const NOT_PUBLISHED = 'Not published';
export const NOT_STATED = 'Not stated';
export const NO_WEBSITE = 'No campaign website on file';

export function orElse(value: string | null | undefined, fallback = NOT_PUBLISHED): string {
  return value && value.length ? value : fallback;
}

/** Free-text search over the fields a voter would actually type. */
export function matchesQuery(race: Race, q: string): boolean {
  const needle = q.trim().toLowerCase();
  if (!needle) return true;
  const haystack = [
    race.office, race.seat, race.jurisdiction, race.county, race.level,
    race.districtNumber != null ? `district ${race.districtNumber}` : '',
    race.heldBy.name,
    ...race.candidates.flatMap((c) => [c.name, c.party ?? '']),
  ].join(' ').toLowerCase();
  return haystack.includes(needle);
}

/** When a search returns nothing, check whether the office simply has no
 *  election this cycle and say so. Without this, searching "sheriff" reads
 *  as an omission rather than an answer. Suppress the generic
 *  "no races match" copy whenever this returns a value. */
export function offCycleAnswer(q: string, offices: string[], note: string) {
  const needle = q.trim().toLowerCase();
  if (needle.length < 3) return null;
  const hit = offices.find(
    (o) => o.toLowerCase().includes(needle) || needle.includes(o.toLowerCase().split(' (')[0]),
  );
  return hit ? { office: hit, heading: `${hit} has no 2026 election`, note } : null;
}

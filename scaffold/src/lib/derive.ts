import type { Candidate, Race } from '../content.config';
import { meta } from './meta';
import { formatDate, formatShort } from './clock';

export { parseISO, daysUntil, deadlineState, formatDate, formatShort } from './clock';
export type { DeadlineState } from './clock';

const PARTY_ABBR: Record<string, string> = {
  'Democrat': 'DEM',
  'Republican': 'REP',
  'No Party Affiliation': 'NPA',
  'Libertarian': 'LPF',
  'Write-In': 'WRI',
  'Nonpartisan office': 'NONPARTISAN',
  'Independent Party of Florida': 'IND',
  'Constitution Party of Florida': 'CPF',
};

export function partyFull(party: string | null, absent = 'Party not stated'): string {
  if (!party) return absent;
  return party === 'Nonpartisan office' ? 'Nonpartisan office' : party;
}

export function partyAbbr(party: string | null): string {
  return party ? (PARTY_ABBR[party] ?? party) : 'Not stated';
}

export function partyRuleClass(party: string | null): string {
  if (party === 'Republican') return 'p-rep';
  if (party === 'Democrat') return 'p-dem';
  return 'p-oth';
}

const SUFFIXES = new Set(['jr', 'sr', 'ii', 'iii', 'iv', 'v']);

function nameParts(name: string): string[] {
  const parts = String(name).replace(/["“”(),.]/g, '').trim().split(/\s+/).filter(Boolean);
  while (parts.length > 1 && SUFFIXES.has(parts[parts.length - 1].toLowerCase())) {
    parts.pop();
  }
  return parts;
}

export function lastName(name: string): string {
  const parts = nameParts(name);
  return (parts[parts.length - 1] || String(name).trim()).toLowerCase();
}

export function sortCandidates(list: Candidate[]): Candidate[] {
  return [...list].sort((a, b) => lastName(a.name).localeCompare(lastName(b.name)));
}

export function initials(name: string): string {
  const p = nameParts(name);
  return ((p[0]?.[0] ?? '') + (p[p.length - 1]?.[0] ?? '')).toUpperCase();
}

export const NOT_PUBLISHED = 'Not published';
export const NOT_STATED = 'Not stated';
export const NO_WEBSITE = 'No campaign website on file';
export const NO_ELECTION = 'No election';
export const NO_REASON = 'Reason not published';

export function orElse(value: string | null | undefined, fallback = NOT_PUBLISHED): string {
  return value && value.length ? value : fallback;
}

export function electionLabel(race: Pick<Race, 'electionDate' | 'pending'>): string {
  if (!race.electionDate) return race.pending ? NOT_PUBLISHED : NO_ELECTION;
  const short = formatShort(race.electionDate) as string;
  if (race.electionDate === meta.elections.general.date) return `${short} general`;
  if (race.electionDate === meta.elections.primary.date) return `${short} primary`;
  return short;
}

export function incumbencyFact(race: Pick<Race, 'candidates' | 'pending'>): string {
  if (race.candidates.some((c) => c.incumbent === true)) return 'Incumbent running';
  if (race.pending || race.candidates.some((c) => c.incumbent === null)) return NOT_PUBLISHED;
  return 'Open seat';
}

export interface SeatParts {
  has: boolean; word: string; num: string;
  plain: boolean; label: string; text: string;
}

export function seatParts(seat: string | null): SeatParts {
  if (!seat || seat === 'Florida') return { has: false, word: '', num: '', plain: false, label: '', text: '' };
  const s = String(seat).trim();
  const m = /^([A-Za-z][A-Za-z-]*)\s+(\d+(?:\s*,\s*\d+)*)$/.exec(s);
  if (m) return { has: true, word: m[1], num: m[2], plain: false, label: '', text: s };
  return { has: true, word: '', num: '', plain: true, label: s, text: s };
}

export function officeText(race: Pick<Race, 'office' | 'seat'>): string {
  const sp = seatParts(race.seat);
  return race.office + (sp.has ? `, ${sp.text}` : '');
}

const OFF_BALLOT = new Set(['Withdrew', 'Did not qualify']);

export function fieldLabel(race: Pick<Race, 'candidates'>): string {
  const n = race.candidates.filter((c) => !OFF_BALLOT.has(c.status)).length;
  if (n === 0) return 'No candidates';
  if (n === 1) return 'Unopposed';
  return `${n} candidates`;
}

export function activeCandidates(race: Pick<Race, 'candidates'>): Candidate[] {
  return sortCandidates(race.candidates).filter((c) => !OFF_BALLOT.has(c.status));
}
export function withdrawnCandidates(race: Pick<Race, 'candidates'>): Candidate[] {
  return sortCandidates(race.candidates).filter((c) => c.status === 'Withdrew');
}
export function didNotQualifyCandidates(race: Pick<Race, 'candidates'>): Candidate[] {
  return sortCandidates(race.candidates).filter((c) => c.status === 'Did not qualify');
}

export const NOT_IN_RECORD = 'Not published in this record';

export function petitionFact(
  c: Pick<Candidate, 'petitionMet' | 'qualifyingMethod'>,
  absent: string = NOT_IN_RECORD,
): string {
  return formatDate(c.petitionMet)
    ?? (c.qualifyingMethod === 'Qualifying fee' ? 'Fee paid instead' : absent);
}

export function proofRows(c: Candidate, race: Pick<Race, 'office'>) {
  const withdrew = c.status === 'Withdrew';
  const didNotQualify = c.status === 'Did not qualify';
  const offBallot = withdrew || didNotQualify;
  const rows: { label: string; value: string }[] = [
    { label: 'Ballot name', value: c.name },
    { label: 'Status', value: c.status || 'Qualified' },
  ];
  if (c.announced) {
    rows.push({ label: 'Date announced', value: formatDate(c.announced) ?? NOT_IN_RECORD });
  }
  rows.push({
    label: 'Date qualified',
    value: formatDate(c.qualified) ?? (offBallot ? 'Not applicable' : NOT_IN_RECORD),
  });
  if (withdrew) {
    rows.push({ label: 'Date withdrawn', value: formatDate(c.withdrew ?? null) ?? NOT_IN_RECORD });
  }
  rows.push(
    { label: 'Method', value: c.qualifyingMethod ?? NOT_IN_RECORD },
    { label: 'Petition met', value: petitionFact(c) },
  );

  if (/Lieutenant Governor/.test(race.office)) {
    rows.push({ label: 'Running mate', value: c.runningMate ?? 'Not named' });
  }
  rows.push(
    { label: 'Treasurer', value: c.treasurer ?? NOT_IN_RECORD },
    { label: 'Treasurer filed', value: formatDate(c.treasurerFiled) ?? NOT_IN_RECORD },

    { label: 'Raised', value: money(c.financeRaised) },
    { label: 'In-kind', value: money(c.financeInKind) },
    { label: 'Spent', value: money(c.financeSpent) },
  );
  return rows;
}

export function money(n: number | null | undefined): string {
  if (n == null) return 'See linked report';
  return `$${Math.round(n).toLocaleString('en-US')}`;
}

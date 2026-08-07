import { defineCollection, reference, z } from 'astro:content';
import { file } from 'astro/loaders';

/* Astro's file() loader wants an array at the top level, but races.json is
   { meta, races } — one human-editable artifact, deliberately. So the races
   collection reaches in with a parser, and meta is a plain JSON import
   (see src/lib/meta.ts). Keep it one file: it's what lets someone who
   doesn't write code hand you a data correction. */

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const PARTIES = [
  'Democrat',
  'Republican',
  'No Party Affiliation',
  'Libertarian',
  'Write-In',
  'Nonpartisan office',
] as const;

export const LEVELS = [
  'Federal',
  'Statewide',
  'State',
  'Judicial',
  'County',
  'School board',
  'Municipal',
  'Special district',
] as const;

export const STATUSES = [
  'Qualified',
  'Qualified, unopposed primary',
  'Unopposed, elected',
  'On the ballot for retention',
  'Elected without opposition',
  'Withdrew',
] as const;

/* null is meaningful throughout: it means the office that keeps the record
   does not publish this field. It is never "unknown to us" and never a
   placeholder to fill with a guess. Leon publishes less than Gadsden. */
const candidate = z.object({
  id: z.string(),
  name: z.string(),
  party: z.enum(PARTIES).nullable(),
  incumbent: z.boolean(),
  writeIn: z.boolean(),
  status: z.enum(STATUSES),
  qualified: isoDate.nullable(),          // the proof of legitimacy: filing date
  announced: isoDate.nullable(),
  petitionMet: isoDate.nullable(),
  qualifyingMethod: z.string().nullable(),
  treasurer: z.string().nullable(),
  treasurerFiled: isoDate.nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),   // null for all 135 today — see README
  note: z.string().nullable().optional(),
  photo: z.string().url(),                // Unsplash placeholder
  recordUrl: z.string().url(),
  financeUrl: z.string().url().nullable(),
  financeTotal: z.number().nullable(),
  runningMate: z.string().nullable().optional(), // Governor tickets only
  withdrew: isoDate.nullable().optional(),
});

const heldBy = z.object({
  name: z.string(),                       // may read "Not published"
  party: z.string().nullable(),
  verified: z.boolean(),
  source: z.string(),
});

const race = z.object({
  county: z.string(),                     // "Statewide" | a region id
  counties: z.array(z.string()),          // whose ballots this appears on
  level: z.enum(LEVELS),
  office: z.string(),
  seat: z.string(),
  jurisdiction: z.string(),
  partisan: z.boolean(),
  electionDate: isoDate,
  ballotNote: z.string(),
  districtNumber: z.number().nullable(),
  heldBy,
  source: z.string(),
  candidates: z.array(candidate),
  pending: z.string().nullable().optional(),
});

const races = defineCollection({
  loader: file('src/data/races.json', {
    parser: (text) => JSON.parse(text).races,
  }),
  schema: race,
});

export const collections = { races };
export type Race = z.infer<typeof race>;
export type Candidate = z.infer<typeof candidate>;

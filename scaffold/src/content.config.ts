import { defineCollection, z } from 'astro:content';
import { file } from 'astro/loaders';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'expected YYYY-MM-DD');

export const PARTIES = [
  'Democrat',
  'Republican',
  'No Party Affiliation',
  'Libertarian',
  'Write-In',
  'Nonpartisan office',
  'Independent Party of Florida',
  'Constitution Party of Florida',
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
  'Did not qualify',
] as const;

const candidate = z.object({
  id: z.string(),
  name: z.string(),
  party: z.enum(PARTIES).nullable(),

  incumbent: z.boolean().nullable(),
  writeIn: z.boolean(),
  status: z.enum(STATUSES),
  qualified: isoDate.nullable(),
  announced: isoDate.nullable(),
  petitionMet: isoDate.nullable(),
  qualifyingMethod: z.string().nullable(),
  treasurer: z.string().nullable(),
  treasurerFiled: isoDate.nullable(),
  email: z.string().nullable(),
  phone: z.string().nullable(),
  website: z.string().url().nullable(),
  note: z.string().nullable().optional(),
  photo: z.string().url(),
  recordUrl: z.string().url(),
  financeUrl: z.string().url().nullable(),

  financeRaised: z.number().nullable(),
  financeInKind: z.number().nullable(),
  financeSpent: z.number().nullable(),
  runningMate: z.string().nullable().optional(), // Governor tickets only
  withdrew: isoDate.nullable().optional(),
});

const heldBy = z.object({
  name: z.string().nullable(),
  party: z.string().nullable(),
  verified: z.boolean(),
  source: z.string(),

  note: z.string().nullable().optional(),
});

const race = z.object({
  county: z.string(),
  counties: z.array(z.string()),
  level: z.enum(LEVELS),
  office: z.string(),
  seat: z.string(),
  jurisdiction: z.string(),
  partisan: z.boolean(),

  electionDate: isoDate.nullable(),
  ballotNote: z.string(),

  districtNumber: z.string().regex(/^\d+$/, 'expected a digit string').nullable(),
  heldBy,
  source: z.string(),
  candidates: z.array(candidate),

  pending: z.union([z.string(), z.boolean()]).nullable().optional(),
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

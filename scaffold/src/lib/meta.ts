import data from '../data/races.json';

/* meta carries everything that would otherwise be hardcoded geography or
   prose: the counties, the elections offices, the calendar, the
   closed-primary explainer, the disclaimer. Adding a county is a regions
   entry plus its races. Adding a state means swapping meta wholesale —
   the closed-primary explainer is Florida law, not a component. */

export interface Region {
  id: string;
  name: string;
  supervisor: string;
  address: string;
  phone: string;
  url: string;
  domain: string;
  lookupUrl: string;
}

export interface CalendarEntry {
  label: string;
  iso: string;
  isoEnd?: string;
  date: string;
  body: string;
}

export interface Source { id: string; label: string; url: string }

export const meta = data.meta;
export const regions = meta.regions as Region[];
export const sources = meta.sources as Source[];
export const calendar = meta.calendar as CalendarEntry[];

export const sourceById = (id: string) => sources.find((s) => s.id === id);
export const regionById = (id: string) => regions.find((r) => r.id === id);

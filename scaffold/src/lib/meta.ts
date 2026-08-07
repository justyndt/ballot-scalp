import data from '../data/races.json';

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

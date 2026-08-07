export const COMPARE_KEY = 'ballot-scalp:compare';

export type Slots = [string | null, string | null];

export function readSlots(): Slots {
  try {
    const raw = localStorage.getItem(COMPARE_KEY);
    if (!raw) return [null, null];
    const p = JSON.parse(raw);
    if (!Array.isArray(p)) return [null, null];
    const at = (i: number) => (typeof p[i] === 'string' && p[i] ? p[i] : null);
    return [at(0), at(1)];
  } catch {
    return [null, null];
  }
}

export function writeSlots(s: Slots) {
  try {

    if (!s[0] && !s[1]) localStorage.removeItem(COMPARE_KEY);
    else localStorage.setItem(COMPARE_KEY, JSON.stringify(s));
  } catch {
  }
}

export function toggle(s: Slots, id: string): Slots {
  if (s[0] === id) return [null, s[1]];
  if (s[1] === id) return [s[0], null];
  if (!s[0]) return [id, s[1]];
  return [s[0], id];
}

export const count = (s: Slots) => (s[0] ? 1 : 0) + (s[1] ? 1 : 0);

export const COMPARE_EVENT = 'compare:change';
export function announce() {
  document.dispatchEvent(new CustomEvent(COMPARE_EVENT));
}

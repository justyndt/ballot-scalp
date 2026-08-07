export interface OffCycle { offices: string[]; note: string; cycle: string }

export function offCycleAnswer(q: string, data: OffCycle) {
  const needle = q.trim().toLowerCase();
  if (needle.length < 3) return null;
  const hit = data.offices.find(
    (o) => o.toLowerCase().includes(needle) || needle.includes(o.toLowerCase().split(' (')[0]),
  );
  return hit
    ? { office: hit, heading: `${hit} has no ${data.cycle} election`, note: data.note }
    : null;
}

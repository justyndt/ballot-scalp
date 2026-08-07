# Ballot Record — working notes

An unbiased public record of the 2026 ballot in Leon and Gadsden County, Florida.

## Stack
Astro 5 (static) · Tailwind CSS v4 (CSS-first `@theme`, no config file) · Iconify via `astro-icon` + `@iconify-json/lucide` · content collections over `src/data/races.json`.

## Non-negotiables

These are editorial, not stylistic. Read `README.md` § "The editorial rules" before changing UI.

- **No party colors.** Party is text (`DEM`/`REP`/`NPA`/`LPF`). Accent is slate-teal `#2f7480` on purpose; the design system's red is overridden on purpose. Party color appears only on hover, only as a bottom rule, only next to the party text.
- **Alphabetical by last name.** Never sort by incumbency, party, filing date or money. No ranking UI of any kind.
- **No endorsements, ratings, scores, or paid placement.** Ever.
- **Every fact links to its source.** No source link, no fact.
- **Missing data says so in the record's words** — "Not published", "Not stated", "No campaign website on file". Never guess, never leave blank.
- **Derive status from the clock.** A hardcoded "Deadline passed" is a bug.
- **No geography in markup.** Counties, offices, calendar, explainer all come from `meta`. Adding a county = one `meta.regions` entry + races.
- **Zero border radius.** Everything flush left. 2px rules, no hairlines, nothing floating.
- **Accent text at body size uses `accent-700`** — `accent` is only 3:1 on this ground.
- **Portraits are placeholders.** Replace all or none; unequal imagery is bias.

## First run

```bash
cd scaffold
mv src/pages/race/-id-.astro src/pages/race/'[id]'.astro   # brackets were stripped in transit
npm install && npm run dev
npm run check                                              # validates races.json against the Zod schema
```

If `check` fails, the data changed — fix the schema, not the data.

## Gotchas

- `file()` loader needs an array, so the races collection passes `parser: t => JSON.parse(t).races`; `meta` is a plain JSON import.
- Render the full race list server-side and filter by hiding — do not build the list in JS. Keeps it searchable and JS-off usable.
- `/compare` sizes type with container queries (`cqw`), not `vw`. An element can't query itself: the container is the parent, the clamped text needs an inner span.
- Use `border-top` per grid cell, not vertical borders — wrapped rows stay correct and no rule dangles.
- Never clear `localStorage` keys you did not write.
- Empty search checks `meta.notUpThisCycle.offices` and answers; suppress the generic "no matches" line when it does.

## Known gaps

1. No candidate has a campaign website — neither SOE collects them. Manual research pass.
2. Leon does not publish party for local races, or petition/qualifying dates and treasurers. Gadsden does. That asymmetry is in the source, not a bug.
3. The <640px native-select dropdown fallback is untested.

# Handoff: Ballot Scalp

An unbiased, non-partisan record of every 2026 race and candidate on the ballot in Leon and Gadsden County, Florida — with the paperwork that proves each candidate really filed.

## About the design files

`design-reference/Ballot Record.dc.html` is a **design reference, not production code.** It is a single-file HTML prototype with inline styles and a vanilla JS class for state. Do not port it line by line and do not ship it. Rebuild it as an Astro site using the scaffold in `scaffold/`, which reflects the intended stack:

- **Astro 5** — static output, no SSR needed
- **Tailwind CSS v4** — CSS-first config (`@theme`), no `tailwind.config` file
- **Iconify** via `astro-icon` + `@iconify-json/lucide`
- **Astro content collections** reading `src/data/races.json` through the `file()` loader, validated by Zod

The prototype's value is that it settles three things: the **data shape**, the **visual system**, and the **editorial rules**. Those are the parts to preserve exactly. The DOM structure is disposable.

## Fidelity

**High fidelity.** Colors, type, spacing, rules and interaction states are final. Recreate them faithfully using the Tailwind theme in `scaffold/src/styles/global.css`, which maps the design tokens 1:1. Every number in this document was measured from the working prototype.

Two things are deliberately unfinished and are noted as such in the UI itself:

1. **No candidate has a campaign website.** Neither Supervisor of Elections collects them. `website` is `null` for every candidate and the UI renders "No campaign website on file." Filling these in is a manual research pass, not a code task.
2. **Portraits are Unsplash placeholders**, identical treatment for every candidate, labelled as placeholders in the footer. Do not swap in real photos of some candidates and not others — unequal imagery is a bias problem, not a content gap.

---

## The editorial rules (read this before writing any UI)

This site's only claim is neutrality. These rules are load-bearing; several of them look like arbitrary style choices and are not.

1. **No party colors.** Red and blue both carry partisan meaning on a ballot. The accent is re-pointed to a slate-teal (`#2f7480`) that no US party owns. Party appears as text only — `DEM` / `REP` / `NPA` / `LPF`. Party color appears *only* on hover, only as a bottom rule, and only alongside the visible party text, so color is never the sole carrier of meaning.
2. **Alphabetical by last name, always.** Never by incumbency, party, filing date, or fundraising. The candidate list order is itself a statement.
3. **No endorsements, ratings, scores, rankings, or "top candidates."** No paid placement. No sorting control that could imply ranking.
4. **Every fact links to the office that keeps it.** Each race carries `source`; each candidate carries `recordUrl`. If a fact has no source link it should not be on the page.
5. **Absent data says so, in the record's own words.** "Not published," "Not stated," "No campaign website on file" — never a guess, never an empty cell, never an inferred value. Leon does not publish party for local races; those read "Not stated" rather than being inferred from registration.
6. **Status is derived from the clock, never typed into the data.** Deadlines compute to Passed / Happening now / Today / Tomorrow / N days away at render time. Any hardcoded "Deadline passed" string is a bug — it becomes a lie the moment the date moves.
7. **Geography is data, not markup.** No screen hardcodes "Leon" or "Gadsden." Counties, elections office details, calendar, and the closed-primary explainer all come from `meta`. Adding a county is a `meta.regions` entry plus its races. Adding a state means swapping `meta` — the closed-primary explainer is Florida-specific law and lives in `meta.explainer`, not in a component.

---

## Data

One file: `src/data/races.json`, shape `{ meta, races }`. 52 races, 194 candidates. Every field present on every record (explicit `null` rather than omission) except `pending`, `note`, `runningMate` and `withdrew`. DOS statewide/federal/judicial rows sync from `data/CandidateList.txt` via `scripts/sync-dos-candidates.py` ([Division of Elections download](https://dos.elections.myflorida.com/candidates/downloadcanlist.asp)).

### Why it is one file with a `parser`

Astro's `file()` loader expects an array at the top level. `races.json` is an object, so the collection passes a `parser` that reaches in for `.races`, and `meta` is imported directly as JSON. This keeps the artifact a single human-editable file — which is what makes it possible to hand a data correction to someone who does not write code. See `scaffold/src/content.config.ts`.

### Race

| Field | Type | Notes |
| --- | --- | --- |
| `id` | string | Slug, stable, used as the route param |
| `county` | `"Statewide" \| "Leon" \| "Gadsden"` | The single primary county |
| `counties` | string[] | Which ballots this race appears on — statewide races list both |
| `level` | enum | Federal, Statewide, State, Judicial, County, School board, Municipal, Special district |
| `office` | string | e.g. "Tallahassee City Commissioner" |
| `seat` | string | "Seat 3", "District 2", "Group 5", or a place name |
| `jurisdiction` | string | Display line under the title |
| `partisan` | boolean | Drives the closed-primary note |
| `electionDate` | ISO date | Which election this seat is decided at |
| `ballotNote` | string | How this seat is decided, in plain language |
| `districtNumber` | number \| null | For district-based races |
| `heldBy` | `{ name, party, verified, source }` | Current officeholder; `name` may be "Not published" |
| `source` | source id | Foreign key into `meta.sources` |
| `candidates` | Candidate[] | Alphabetical by last name in the file — keep it that way |
| `pending` | string? | Present on 5 races: why the field may still change |

### Candidate

| Field | Type | Notes |
| --- | --- | --- |
| `id`, `name` | string | |
| `party` | enum \| null | Democrat, Republican, No Party Affiliation, Libertarian, Write-In, Nonpartisan office, Independent Party of Florida, Constitution Party of Florida, or `null` = not stated |
| `incumbent`, `writeIn` | boolean | |
| `status` | enum | Qualified / Qualified, unopposed primary / Unopposed, elected / On the ballot for retention / Elected without opposition / Withdrew / Did not qualify |
| `qualified` | ISO date \| null | **The proof of legitimacy** — the filing date |
| `announced`, `petitionMet` | ISO date \| null | |
| `qualifyingMethod` | string \| null | Fee paid vs. petition |
| `treasurer`, `treasurerFiled` | string / ISO \| null | Gadsden publishes both; Leon's candidate list publishes treasurer names (and contact) for many local rows, not treasurer-filed dates |
| `email`, `phone` | string \| null | |
| `website` | string \| null | **`null` for all** — see above |
| `note` | string? | Race-specific context |
| `photo` | URL | Unsplash placeholder, `?w=320&h=320&fit=crop&crop=faces` |
| `recordUrl` | URL | The official record for this candidate |
| `financeUrl` | URL \| null | Where the office's finance reports live |
| `financeRaised`, `financeInKind`, `financeSpent` | number \| null | Three figures, not one total — the office reports them separately. `null` = the candidate files with an office we don't index; `financeUrl` points there |
| `runningMate` | string? | Only Governor tickets (named running mates where the Division of Elections lists one) |
| `withdrew` | ISO date? | Present when the record publishes a withdraw date |

### meta

`cycle`, `lastVerified`, `qualifyingClosed`, `primary`, `general`, `earlyVoting`, `name`, `state`, `scope`, `kicker`, `intro`, `datesIntro`, `ballotIntro`, `lookupNote`, `photoNote`, `colorNote` — plus:

- `sources[]` — `{ id, label, url }`. Every `source` field is a key here.
- `regions[]` — `{ id, name, supervisor, address, phone, url, domain, lookupUrl }`. **Drives the county filter, the ballot-builder county picker, the elections-office cards, and the district-lookup links.** Two entries today.
- `elections` — `{ primary: {date, short, label, note}, general: {...}, earlyVoting: {short, label} }`
- `calendar[]` — `{ label, iso, date, body }` ×5. `iso` is what the status derivation reads.
- `explainer` — `{ heading, paras[3] }`. Closed primaries in plain terms.
- `notUpThisCycle` — `{ label, note, offices[7] }`. Offices with no 2026 election. **Powers the empty-search answer** (see Search below).
- `disclaimer` — `{ heading, verifyLabel, paras: [{icon, title, text}] ×3 }`
- `dataGaps[]` — 3 strings, rendered in the footer.

---

## Screens

Five routes. The prototype is a single-file view switcher; in Astro these become real pages, which is a straight improvement — deep links to a race become free and shareable.

### 1. `/` — Races index

**Purpose:** find your race. **Layout:** `max-width: 1360px`, `padding: 0 clamp(16px,4vw,32px)`, centered.

- **Masthead** — kicker in accent-700 (12px, `letter-spacing:.01em`), h1 at `clamp(34px,6.2vw,60px)` / `line-height:1.03` / `letter-spacing:-0.03em` capped near 20ch, intro paragraph at 16px/1.6 capped ~48ch. Right column: a 2-up stat grid — primary and general dates at 30px/800, then early voting and the race/candidate count. The "N days away" line is computed against the real clock.
- **Two-column body below a 2px rule.** Left: filter rail, `flex: 1 1 210px`. Right: results, `flex: 999 1 440px`, `min-width: 0`.
- **Filter rail** — 8 groups: County, Race level, Party, Election, Status, Seat, District, Campaign website. Each is a wrapping row of toggle chips: 2px border, 0 radius, 13px/600 label, `padding: 7px 11px`. Selected = accent fill, white text. Group heading 11px, `letter-spacing:.04em`, uppercase-ish, muted. Multi-select within a group (OR), AND across groups.
- **Search field** — full width, `min-height:48px`, 16px text, 2px `--color-ink` border, transparent background, `padding: 8px 14px 8px 42px`. Lucide `search` at 18px absolutely positioned `left:14px`, muted to 55% ink, `pointer-events:none`.
- **Result line** — "Showing all 52 races" / "Showing N of 52 races" on the left, "Verified <date>" right, 13px muted, above a 2px rule.
- **Races grouped by level**, each group under an accent-700 13px heading. **Race card:** office at 22px/800/`-0.02em`, seat and jurisdiction 13px muted, "Currently held by" + name in the right column, a candidate-count tag (2px border, 12px), the election date, then the candidate chips.
- **Candidate chip** — 2px border, `padding: 7px 10px`, monogram square (26px, surface fill, 11px/800 initials), name 13px/600, party abbreviation 11px muted. On hover the party rule appears as `inset 0 -3px 0`.

### 2. `/race/[id]` — Race detail

- **Back link** ("← All races", 13px/600, accent-700, underlined), 24px above the breadcrumb.
- **Header:** breadcrumb (12px accent-700) → h1 `clamp(28px,5vw,52px)`/1.03/`-0.03em`, max 22ch → a row 14px below holding the **seat badge** (2px border, `padding:5px 12px`; "Seat" 13px muted + number 20px/800) and the jurisdiction (16px muted) → 2px rule.
- **Facts strip** — 4 cells: County, Election, Field, Seat. Label 12px muted, value 17px/800, 7px gap. Cells have 26px gutters both sides and the grid is pulled left 26px so cell one's text is flush with the h1. Rules are `border-top` per cell (not verticals), grid offset −1px so row one's rule hides under the header rule and a wrapped second row still gets one. Wrapper is `overflow:hidden` and the grid 1px wider, which clips the trailing rule. **Note:** this strip's "Seat" column means *is an incumbent running* — different fact from the badge's seat *number*. Same word, two meanings; consider relabelling.
- **Two columns.** Left: "How this seat is decided" (accent-100 fill, 4px accent left rule) then the candidate list. Right: "Currently holds this seat" card (2px border) and, where present, the pending note.
- **Candidate row** — portrait or monogram, name 20px/800, party, tags for incumbent / write-in / withdrew, then the **proof block**: a definition grid of Filed, Qualifying method, Petition met, Treasurer, Treasurer filed, Running mate, Email, Phone, Website, Finance — each absent value printed in the record's own language. Label 12px muted, value 14px.
- Governor is one race titled **"Governor and Lieutenant Governor"** — Florida elects the ticket on one line. Do not split it into two races. `runningMate` renders under the name and as a proof row, and reads "Not named" where the Division of Elections lists none.

### 3. `/ballot` — Ballot builder

Pick county, commission district, school board district and city; get only the races on your ballot. Uses `meta.regions` for the county list and `counties` / `districtNumber` on each race to match. Persist selections in `localStorage`.

### 4. `/compare` — Side-by-side

Two candidate slots, each a searchable dropdown; a shared label column and one column per candidate, comparing the same proof fields.

**This screen has the most fragile layout in the design.** Three rules, learned the hard way:
- Label column is `clamp(70px, 18%, 200px)` — **not** `minmax(104px, 200px)`, which claims its max regardless of remaining space and starves the data columns.
- Head cells need `min-width: 0` and `flex-wrap: wrap` so the monogram and name stack instead of escaping the cell.
- Type must size off the **column**, not the viewport: head and data cells are `container-type: inline-size` with `cqw` clamps (`clamp(14px,11cqw,22px)`, `clamp(12px,4.6cqw,15px)`). `vw` units do not know the column got narrow and will break long names mid-word. An element cannot query itself, so the clamped text needs an inner `<span>` — the container must be the parent.

### 5. `/dates` — Key dates

- **Timeline** from `meta.calendar`, not five equal boxes. Each step: derived status, event label, date at `clamp(26px,2.4vw,32px)`, body capped at 30ch. Passed steps drop to ~55% ink with a hollow tick; the next upcoming step gets the accent tick. Rules are `border-top` per cell so they join into one line and redraw on each wrapped row. 24px gutters, grid pulled left 24px.
- **Closed-primary explainer** from `meta.explainer`.
- **Offices with no 2026 election** from `meta.notUpThisCycle` — the seven offices last elected in 2024 on four-year terms, next up in 2028.
- **Elections office cards** from `meta.regions`.

---

## Interactions & behavior

| Behavior | Detail |
| --- | --- |
| Search | Matches candidate name, office, seat, jurisdiction, district, party. Instant, client-side, no debounce needed at 139 rows. |
| **Empty search fallback** | If nothing matches, check the query against `meta.notUpThisCycle.offices` and answer directly — "Superintendent of Schools has no 2026 election" plus the reason. Suppress the generic "no races match" copy when a specific answer exists, or the two contradict each other. This is why searching "sheriff" returns an explanation instead of a blank. |
| Filters | Multi-select within a group (OR), AND across groups. "Clear all" appears only when a filter is active. |
| Navigation | Every view change resets scroll to top **after** the state commits — window, `document.scrollingElement`, and any scrollable ancestor, on the current frame and the next. In Astro, real page routes give you this free; keep it in mind for any client-side filtering that re-renders. |
| Compare | Add/remove from a candidate row; a tray shows current picks. Button icon switches plus → check when added. |
| Ballot | Selections persist in `localStorage`; never clear keys you did not write. |
| Countdown | Computed from the real clock every load. Never a stored string. |
| Dropdowns | Searchable, keyboard-navigable (arrows + enter), Lucide `search` in the field and `check` on the selected option. Falls back to a native `<select>` under 640px — **untested, needs a real narrow window.** |
| Focus | `:focus-visible { outline: 2px solid var(--color-accent); outline-offset: 2px }` — never the browser default. |

### Client-side JS

Given static data and 139 rows, plain `<script>` modules in Astro are enough — no UI framework. Filtering is a DOM class toggle over pre-rendered cards, which also means **the full list is in the HTML for search engines and for users with JS off.** Render every race server-side and filter by hiding; do not render the list from JS. If compare/ballot grow real complexity, add a Preact island for just those two rather than adopting a framework site-wide.

---

## Design tokens

Modernist: flat, architectural, Archivo throughout, zero radius everywhere, 2px rules doing all the organising. Nothing floats, nothing is decorated. Full mapping in `scaffold/src/styles/global.css`.

### Color

| Token | Value | Use |
| --- | --- | --- |
| `bg` | `#f3f2f2` | Page ground |
| `surface` | `#eae9e9` | Monogram squares, tinted cells |
| `ink` | `#201e1d` | All text, all 2px borders |
| `divider` | `color-mix(in srgb,#201e1d 40%,transparent)` | Section rules |
| `accent` | `#2f7480` | Selected chips, ticks, primary action |
| `accent-700` | `#1b4c56` | **Accent text at body size** — `accent` alone is only 3:1 on this ground |

Accent ramp: 100 `#eef5f6`, 200 `#d8e8ea`, 300 `#b5d3d8`, 400 `#86b4bc`, 500 `#52929c`, 600 `#266571`, 700 `#1b4c56`, 800 `#133840`, 900 `#0e2a31`. Neutral ramp: 100 `#f8f4f4`, 200 `#eae7e7`, 300 `#d7d3d3`, 400 `#bab6b6`, 500 `#9b9797`, 600 `#7d7979`, 700 `#605d5d`, 800 `#444141`, 900 `#2d2b2b`.

Party hover only: REP `#b02a1f`, DEM `#1c4e9e`, other `#6a6664`.

> The design system's own accent is red `#ec3013`. It is deliberately overridden here — see editorial rule 1. Do not "restore" it.

### Type — Archivo, weights 400/600/800

| Role | Size | Line-height | Letter-spacing |
| --- | --- | --- | --- |
| Hero h1 | `clamp(34px,6.2vw,60px)` | 1.03 | −0.03em |
| Race h1 | `clamp(28px,5vw,52px)` | 1.03 | −0.03em |
| Section h2 | 26px / 800 | 1.15 | −0.02em |
| Card title | 22px / 800 | 1.2 | −0.02em |
| Candidate name | 20px / 800 | 1.2 | −0.02em |
| Stat value | 30px / 800 | 1 | −0.02em |
| Body | 16px / 400 | 1.6 | — |
| Dense body | 15px, 14px | 1.5 | — |
| Meta, chip label | 13px / 600 | 1.4 | −0.005em |
| Small label | 12px | 1.35 | .01em |
| Group heading, monogram | 11px | 1.3 | .04em |

Weight 600 is the workhorse (28 uses), 800 for headings (26), 700 for a handful of emphasis labels. Body copy uses `text-wrap: pretty`.

### Spacing, radius, elevation

4 / 8 / 12 / 16 / 24 / 32px. **Radius 0 everywhere — do not round a corner.** Shadows exist in the system (`sm`/`md`/`lg`) but this site uses borders instead; nothing floats.

### Layout

Page `max-width: 1360px`, gutter `clamp(16px,4vw,32px)`. Index body is a two-column flex: rail `flex: 1 1 210px`, results `flex: 999 1 440px; min-width: 0`. Rules are 2px `--color-divider` between major sections; **prefer `border-top` per grid cell over vertical rules** so wrapped rows stay correct and no rule dangles at an edge.

---

## Icons

**21 distinct Lucide icons.** The prototype inlines them as static SVG (24 `<svg>` elements) because a web component's upgrade timing caused 0×0 renders. In Astro use Iconify properly:

```astro
---
import { Icon } from 'astro-icon/components';
---
<Icon name="lucide:search" width={18} height={18} />
```

`astro-icon` inlines the SVG at build time from `@iconify-json/lucide` — no runtime request, no CDN, no flash. In use: `search`, `check`, `chevron-down`, `chevron-up`, `arrow-right`, `arrow-up-right`, `plus`, `x`, `triangle-alert`, `external-link`, `calendar`, `clock`, `map-pin`, `user`, `users`, `file-text`, `landmark`, `circle`, `circle-check`, `info`, `link`.

Two icons are **conditional and must be two branches, not a dynamic name**: the dropdown chevron (down closed / up open) and the compare button (plus / check). In Astro, a ternary on `name` is fine — the constraint was the prototype's, not Astro's.

**Where icons are deliberately absent:** the three disclaimer headings and the elections-office links carry no icon (arrows only on outbound links). This was an explicit decision — do not add decorative icons back.

### The one wrap detail

Outbound links put the arrow inline at the end of the text so it sits on the **last line** when the label wraps, 13×13, ~4px off the anchor's bottom. Not floated right, not absolutely positioned.

---

## Assets

- **Portraits** — Unsplash, `?w=320&h=320&fit=crop&crop=faces`. Placeholders, labelled as such. Replace all or none.
- **Archivo** — Google Fonts, weights 400/600/800. Self-host with `@fontsource/archivo` for a production build.
- No other images. No logo yet.

---

## Files in this bundle

```
README.md                              This document
CLAUDE.md                              Working instructions for Claude Code
data/races.json                        The data artifact — 52 races, 139 candidates
design-reference/Ballot Record.dc.html The HTML prototype (reference only)
design-reference/styles.css            Modernist design-system tokens
scaffold/                              Astro 5 + Tailwind 4 + Iconify starting point
  package.json                         Pinned deps
  astro.config.mjs                     Static output, astro-icon, Tailwind vite plugin
  tsconfig.json                        Strict, resolveJsonModule on
  src/data/races.json                  The data, in place
  src/content.config.ts                Collection + full Zod schema + exported enums
  src/lib/meta.ts                      meta typed, plus sourceById / regionById
  src/lib/derive.ts                    Clock-derived status, dates, party text, sorting, search
  src/styles/global.css                Tailwind @theme token mapping + component layer
  src/layouts/Base.astro               Shell, masthead, nav
  src/components/RaceCard.astro        Index card, with the filter data-attributes
  src/components/CandidateChip.astro   Monogram + name + party text
  src/pages/index.astro                Races index, complete with filter + search wiring
  src/pages/race/-id-.astro            Race detail — RENAME to [id].astro
  src/pages/api/races.json.ts          Optional JSON endpoint
```

**Built:** `/` and `/race/[id]` are complete and working, including the filter rail, search, the off-cycle empty-state answer, the facts strip and the proof block. Config, schema, tokens and the derivation logic are done — the parts where a wrong guess is expensive.

**Still to build:** `/ballot`, `/compare`, `/dates`, and the footer (disclaimer + sources + known gaps, filled from `meta`). All three follow the same patterns as the two built routes; the screen specs above have the measurements.

## Before `npm install`: two renames

This bundle was authored in an environment that disallows square brackets and dots in filenames, so two files need renaming when you unzip:

```bash
cd scaffold
mv src/pages/race/-id-.astro src/pages/race/'[id]'.astro   # Astro dynamic route
rm src/pages/.gitkeep
```

Nothing else is renamed. If `/race/us-senate` 404s, this is why.

## Deploy (Vercel)

The Astro app lives in **`scaffold/`**. Root `vercel.json` installs and builds there (`npm … --prefix scaffold`, output `scaffold/dist`), so the project Root Directory can stay `.`.

If you override settings in the Vercel UI, use either:
- Root Directory `scaffold`, build `npm run build`, output `dist`, or
- Root Directory `.` and leave build/output to `vercel.json`

A deploy that finishes in ~50ms with no `npm install` / `astro build` is wrong — redeploy from a commit that includes `vercel.json`.

## Suggested order

1. `npm install`, confirm the dev server boots and `astro check` passes against the schema. **If the schema fails, the data changed — fix the schema, not the data.**
2. Port `derive.ts` behavior and unit-test the date derivations around a fake clock. Every screen depends on them.
3. Build `/` fully, including the empty-search fallback.
4. `/race/[id]`, then `/dates`.
5. `/compare` last — re-read the container-query notes above before starting.
6. Test at 640px and below; the dropdown fallback is unverified.

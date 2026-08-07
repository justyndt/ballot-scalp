/* Renders a built ballot to a PNG, drawn by hand on a canvas.

   No library: the ballot is structured text, and html2canvas-style DOM
   capture would drag in a dependency, inherit the page's layout quirks and
   still need the fonts loaded. Drawing it directly also means the exported
   image is designed rather than screenshotted — it can carry the "not an
   official ballot" line and the verified date, which a screenshot cannot.

   The tokens below are the site's, repeated as literals because a canvas
   cannot read CSS custom properties. */
const BG = '#f3f2f2';
const INK = '#201e1d';
const ACCENT = '#2f7480';
const ACCENT_700 = '#1b4c56';
const MUTED = '#605d5d';
const DIVIDER = '#8d8b8a';

/* CSS font shorthand: "<weight> <size>px <family>". The weight carries no
   unit — "600px 13px Archivo" is malformed, and a canvas will silently fall
   back to a wrong size rather than throw. */
const FAMILY = 'Archivo, system-ui, sans-serif';
const head = (px: number) => `800 ${px}px ${FAMILY}`;
const body = (px: number, weight = 400) => `${weight} ${px}px ${FAMILY}`;

export interface ExportCandidate { name: string; party: string }
export interface ExportRace {
  office: string;
  seat: string;
  field: string;
  election: string;
  /* The reader's own mark. null is printed, not skipped: a race left blank
     is a thing to notice before polling day, not something to hide. */
  chosen: ExportCandidate | null;
  addressDependent: boolean;
}
export interface ExportGroup { level: string; races: ExportRace[] }
export interface ExportBallot {
  siteName: string;
  scope: string;
  selections: string[];
  /** e.g. "12 of 35 races marked" — printed so a half-finished plan is
   *  obvious at a glance rather than discovered at the polling place. */
  progress: string;
  groups: ExportGroup[];
  verified: string;
  disclaimer: string;
  /** Whose choices these are. Without it a shared image could read as this
   *  site recommending a slate, which is the one thing it must never do. */
  choicesNote: string;
  sourceLine: string;
}

const W = 1000;
const PAD = 56;
const INNER = W - PAD * 2;

type Op =
  | { t: 'text'; x: number; y: number; s: string; font: string; fill: string; align?: 'right' }
  | { t: 'rect'; x: number; y: number; w: number; h: number; fill: string };

function wrap(ctx: CanvasRenderingContext2D, text: string, font: string, maxW: number): string[] {
  ctx.font = font;
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let line = '';
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (line && ctx.measureText(next).width > maxW) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

/* Layout and paint are separate passes so the canvas can be sized to the
   content: a 6-race ballot and a 40-race ballot should not produce the same
   image with acres of empty ground. */
function layout(ctx: CanvasRenderingContext2D, b: ExportBallot): { ops: Op[]; height: number } {
  const ops: Op[] = [];
  let y = PAD;

  const text = (s: string, font: string, fill: string, x = PAD, align?: 'right') => {
    ops.push({ t: 'text', x, y, s, font, fill, align });
  };
  const rule = (h = 2, colour = INK) => {
    ops.push({ t: 'rect', x: PAD, y, w: INNER, h, fill: colour });
    y += h;
  };

  /* Masthead: the accent square is the site's mark, so the image is
     recognisable as coming from here rather than from an elections office. */
  ops.push({ t: 'rect', x: PAD, y, w: 26, h: 26, fill: ACCENT });
  ctx.font = head(22);
  text(b.siteName, head(22), INK, PAD + 40);
  y += 26;
  text(b.scope, body(13), MUTED, PAD + 40);
  y += 30;

  text('Your ballot', head(34), INK);
  y += 42;

  for (const line of wrap(ctx, b.selections.join('  ·  '), body(15, 600), INNER)) {
    text(line, body(15, 600), ACCENT_700);
    y += 22;
  }
  text(b.progress, body(13), MUTED);
  y += 20;
  y += 14;
  rule(2);
  y += 26;

  for (const group of b.groups) {
    text(group.level.toUpperCase(), body(12, 600), ACCENT_700);
    y += 20;

    for (const race of group.races) {
      rule(1, DIVIDER);
      y += 14;

      /* Election label sits right-aligned on the office line, the same
         pairing the page uses. */
      const officeMax = INNER - 150;
      const officeLines = wrap(ctx, race.office, head(19), officeMax);
      text(race.election, body(13, 600), INK, W - PAD, 'right');
      officeLines.forEach((line, i) => {
        text(line, head(19), INK);
        y += i === officeLines.length - 1 ? 22 : 24;
      });

      const meta = [race.seat, race.field].filter(Boolean).join('  ·  ');
      text(meta, body(13), MUTED);
      y += 20;

      if (race.addressDependent) {
        text('Depends on your street address — check with your Supervisor of Elections', body(12), MUTED);
        y += 18;
      }

      /* One line: the mark this reader made, or the absence of one. */
      if (race.chosen) {
        const line = race.chosen.party
          ? `${race.chosen.name}  ·  ${race.chosen.party}`
          : race.chosen.name;
        ops.push({ t: 'rect', x: PAD, y: y + 3, w: 3, h: 14, fill: ACCENT });
        for (const l of wrap(ctx, line, body(15, 600), INNER - 18)) {
          text(l, body(15, 600), INK, PAD + 14);
          y += 21;
        }
      } else {
        text('No choice made', body(14), MUTED, PAD + 14);
        y += 20;
      }
      y += 12;
    }
    y += 16;
  }

  y += 6;
  rule(2);
  y += 24;

  for (const line of wrap(ctx, b.disclaimer, body(13, 600), INNER)) {
    text(line, body(13, 600), INK);
    y += 19;
  }
  y += 6;
  for (const line of wrap(ctx, b.choicesNote, body(13), INNER)) {
    text(line, body(13), INK);
    y += 19;
  }
  y += 8;
  for (const line of wrap(ctx, b.sourceLine, body(12), INNER)) {
    text(line, body(12), MUTED);
    y += 17;
  }
  y += 4;
  text(b.verified, body(12), MUTED);
  y += 17;

  return { ops, height: Math.ceil(y + PAD) };
}

/** Draws the ballot and hands back a canvas. Fonts must be ready first, or
 *  the measuring pass sizes the image for a fallback face. */
export async function renderBallot(b: ExportBallot): Promise<HTMLCanvasElement> {
  if (document.fonts?.ready) await document.fonts.ready;

  const measure = document.createElement('canvas').getContext('2d');
  if (!measure) throw new Error('canvas unavailable');
  const { ops, height } = layout(measure, b);

  /* Draw at device resolution so the text is not soft on a phone, but keep
     the logical coordinate system so the layout maths stays readable. */
  const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1), 3);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(W * dpr);
  canvas.height = Math.round(height * dpr);
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('canvas unavailable');
  ctx.scale(dpr, dpr);

  ctx.fillStyle = BG;
  ctx.fillRect(0, 0, W, height);
  ctx.textBaseline = 'top';

  for (const op of ops) {
    if (op.t === 'rect') {
      ctx.fillStyle = op.fill;
      ctx.fillRect(op.x, op.y, op.w, op.h);
    } else {
      ctx.font = op.font;
      ctx.fillStyle = op.fill;
      ctx.textAlign = op.align === 'right' ? 'right' : 'left';
      ctx.fillText(op.s, op.x, op.y);
    }
  }
  ctx.textAlign = 'left';
  return canvas;
}

/** Saves the canvas as a PNG. The object URL is revoked afterwards — a
 *  multi-megabyte bitmap held by a stale URL is a real leak on a phone. */
export function downloadCanvas(canvas: HTMLCanvasElement, filename: string): Promise<void> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error('could not encode image'));
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      resolve();
    }, 'image/png');
  });
}

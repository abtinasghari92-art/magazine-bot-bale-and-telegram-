import {
  ARABIC_PRESENTATION_FORMS,
  LAM_ALEF_LIGATURES,
  SUPPORTED_CODE_POINT_RANGES,
} from "./generated/persian-font";

/**
 * Minimal Persian/Arabic text shaping for PDF drawing (REQ-014).
 *
 * `pdf-lib` writes glyphs in the order it receives them and does not run an
 * OpenType shaper, so Persian handed to it straight renders as disconnected
 * letters in left-to-right order. This module does the two things a shaper
 * would do for a short watermark line:
 *
 * 1. replace each letter with its contextual Unicode presentation form
 *    (`Arabic Presentation Forms-A/B`), which the bundled font subset covers;
 * 2. reorder the string for visual right-to-left output, keeping Latin and
 *    numeric runs left-to-right.
 *
 * It is deliberately not a full Unicode bidi implementation: it covers a single
 * short watermark line, not page text.
 */

const ZWNJ = 0x200c;
const ZWJ = 0x200d;
const TATWEEL = 0x0640;
const LAM = 0x0644;

const FORM_ISOLATED = 0;
const FORM_FINAL = 1;
const FORM_INITIAL = 2;
const FORM_MEDIAL = 3;

/** Marks (harakat, superscript alef) sit on the previous letter and never join. */
function isTransparent(codePoint: number): boolean {
  return (
    (codePoint >= 0x064b && codePoint <= 0x065f) ||
    codePoint === 0x0670 ||
    (codePoint >= 0x06d6 && codePoint <= 0x06dc) ||
    (codePoint >= 0x06df && codePoint <= 0x06e4) ||
    (codePoint >= 0x06e7 && codePoint <= 0x06e8) ||
    (codePoint >= 0x06ea && codePoint <= 0x06ed)
  );
}

type JoiningType = "dual" | "right" | "none";

function joiningType(codePoint: number): JoiningType {
  if (codePoint === TATWEEL) return "dual";
  const forms = ARABIC_PRESENTATION_FORMS[codePoint];
  if (!forms) return "none";
  return forms[FORM_INITIAL] !== 0 || forms[FORM_MEDIAL] !== 0 ? "dual" : "right";
}

/** True when the code point belongs to a right-to-left script. */
function isRtl(codePoint: number): boolean {
  return (
    (codePoint >= 0x0600 && codePoint <= 0x06ff && !isArabicIndicDigit(codePoint)) ||
    (codePoint >= 0x0750 && codePoint <= 0x077f) ||
    (codePoint >= 0xfb50 && codePoint <= 0xfdff) ||
    (codePoint >= 0xfe70 && codePoint <= 0xfeff)
  );
}

/** Arabic-Indic and extended (Persian) digits read left-to-right like Latin ones. */
function isArabicIndicDigit(codePoint: number): boolean {
  return (
    (codePoint >= 0x0660 && codePoint <= 0x0669) ||
    (codePoint >= 0x06f0 && codePoint <= 0x06f9)
  );
}

function isLtr(codePoint: number): boolean {
  if (isArabicIndicDigit(codePoint)) return true;
  if (codePoint >= 0x0030 && codePoint <= 0x0039) return true;
  if (codePoint >= 0x0041 && codePoint <= 0x005a) return true;
  if (codePoint >= 0x0061 && codePoint <= 0x007a) return true;
  return codePoint >= 0x00c0 && codePoint <= 0x024f;
}

/** Characters that swap sides when a run is mirrored for RTL output. */
const MIRRORED: Readonly<Record<number, number>> = {
  0x0028: 0x0029,
  0x0029: 0x0028,
  0x005b: 0x005d,
  0x005d: 0x005b,
  0x007b: 0x007d,
  0x007d: 0x007b,
  0x003c: 0x003e,
  0x003e: 0x003c,
  0x00ab: 0x00bb,
  0x00bb: 0x00ab,
};

export function isSupportedCodePoint(codePoint: number): boolean {
  for (const [first, last] of SUPPORTED_CODE_POINT_RANGES) {
    if (codePoint >= first && codePoint <= last) return true;
    if (codePoint < first) return false;
  }
  return false;
}

/**
 * Drop everything the bundled subset cannot encode, so a misconfigured
 * watermark string can never make the preview endpoint throw.
 */
export function sanitizeForWatermarkFont(text: string): string {
  let output = "";
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    if (codePoint === ZWNJ || codePoint === ZWJ) {
      output += char;
      continue;
    }
    output += isSupportedCodePoint(codePoint) ? char : " ";
  }
  return output.replace(/ {2,}/g, " ").trim();
}

type Cell = { codePoint: number; joining: JoiningType; form: number | null };

function buildCells(codePoints: number[]): Cell[] {
  const cells: Cell[] = [];

  for (let index = 0; index < codePoints.length; index += 1) {
    const codePoint = codePoints[index]!;

    // A lam directly followed by an alef variant is one ligature glyph.
    const next = codePoints[index + 1];
    if (codePoint === LAM && next !== undefined && LAM_ALEF_LIGATURES[next]) {
      cells.push({ codePoint: -next, joining: "right", form: null });
      index += 1;
      continue;
    }

    cells.push({ codePoint, joining: joiningType(codePoint), form: null });
  }

  return cells;
}

/** Nearest neighbour that participates in joining, skipping marks. */
function neighbour(cells: Cell[], from: number, step: number): Cell | null {
  for (let index = from + step; index >= 0 && index < cells.length; index += step) {
    const cell = cells[index]!;
    if (cell.codePoint >= 0 && isTransparent(cell.codePoint)) continue;
    return cell;
  }
  return null;
}

function joinsForward(cell: Cell | null): boolean {
  if (!cell) return false;
  if (cell.codePoint === ZWJ) return true;
  if (cell.codePoint === ZWNJ) return false;
  return cell.joining === "dual";
}

function joinsBackward(cell: Cell | null): boolean {
  if (!cell) return false;
  if (cell.codePoint === ZWJ) return true;
  if (cell.codePoint === ZWNJ) return false;
  // Negative code points are lam-alef ligatures: they accept a join on the right.
  if (cell.codePoint < 0) return true;
  return cell.joining !== "none";
}

/** Replace each letter with the presentation form its neighbours call for. */
function applyForms(cells: Cell[]): string {
  let output = "";

  for (let index = 0; index < cells.length; index += 1) {
    const cell = cells[index]!;
    const { codePoint } = cell;

    if (codePoint === ZWNJ || codePoint === ZWJ) continue;

    const linkBefore = joinsForward(neighbour(cells, index, -1));

    if (codePoint < 0) {
      const ligature = LAM_ALEF_LIGATURES[-codePoint]!;
      output += String.fromCodePoint(ligature[linkBefore ? 1 : 0]);
      continue;
    }

    const forms = ARABIC_PRESENTATION_FORMS[codePoint];
    if (!forms) {
      output += String.fromCodePoint(codePoint);
      continue;
    }

    const linkAfter =
      cell.joining === "dual" && joinsBackward(neighbour(cells, index, 1));

    let form: number;
    if (linkBefore && linkAfter) form = forms[FORM_MEDIAL];
    else if (linkBefore) form = forms[FORM_FINAL];
    else if (linkAfter) form = forms[FORM_INITIAL];
    else form = forms[FORM_ISOLATED];

    output += String.fromCodePoint(form || forms[FORM_ISOLATED] || codePoint);
  }

  return output;
}

type Direction = "rtl" | "ltr";

type Run = { direction: Direction; codePoints: number[] };

/**
 * Split into directional runs and emit them in visual order for an RTL line.
 * Neutral characters (spaces, dashes, punctuation) follow the run they trail.
 */
function reorderForRtl(text: string): string {
  const codePoints = [...text].map((char) => char.codePointAt(0)!);
  const runs: Run[] = [];
  let pending: number[] = [];

  const push = (direction: Direction, values: number[]) => {
    const last = runs[runs.length - 1];
    if (last && last.direction === direction) {
      last.codePoints.push(...values);
      return;
    }
    runs.push({ direction, codePoints: [...values] });
  };

  for (const codePoint of codePoints) {
    if (isRtl(codePoint)) {
      push("rtl", [...pending, codePoint]);
      pending = [];
      continue;
    }
    if (isLtr(codePoint)) {
      push("ltr", [...pending, codePoint]);
      pending = [];
      continue;
    }
    pending.push(codePoint);
  }
  if (pending.length > 0) {
    push(runs[runs.length - 1]?.direction ?? "rtl", pending);
  }

  let output = "";
  for (let index = runs.length - 1; index >= 0; index -= 1) {
    const run = runs[index]!;
    const values =
      run.direction === "rtl"
        ? [...run.codePoints].reverse().map((cp) => MIRRORED[cp] ?? cp)
        : run.codePoints;
    output += String.fromCodePoint(...values);
  }
  return output;
}

/**
 * Turn a logical Persian string into the glyph sequence `pdf-lib` should draw
 * left to right. Latin-only text passes through untouched.
 */
export function shapePersianText(text: string): string {
  const sanitized = sanitizeForWatermarkFont(text);
  if (!sanitized) return "";

  const codePoints = [...sanitized].map((char) => char.codePointAt(0)!);
  if (!codePoints.some((codePoint) => isRtl(codePoint))) {
    return sanitized;
  }

  return reorderForRtl(applyForms(buildCells(codePoints)));
}

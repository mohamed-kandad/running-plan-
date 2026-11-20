import type { Workout } from './types';

/** The kind of instruction a checklist line carries — drives its icon and tone. */
export type ChecklistTone =
  | 'warmup'
  | 'main'
  | 'cooldown'
  | 'effort'
  | 'route'
  | 'pace'
  | 'fuel'
  | 'finish'
  | 'why'
  | 'tip'
  | 'note'
  | 'rule'
  | 'strength'
  | 'mobility'
  | 'balance';

export interface ChecklistItem {
  id: string;
  /** Short name printed above the step; empty for a plain numbered instruction. */
  label: string;
  text: string;
  tone: ChecklistTone;
  /** Block heading above this step, e.g. "FOOT, ANKLE & CORE (20–25 min)". */
  section?: string;
  /** The number the note used, so the checklist matches the plan the coach wrote. */
  index?: number;
}

const WARM_RE = /(\d+\s*min(?:ute)?s?\s+(?:easy\s+)?warm-?up)/i;
const COOL_RE = /(\d+\s*min(?:ute)?s?\s+(?:easy\s+)?cool-?down)/i;

const NUMBERED_RE = /^\(?(\d{1,2})\s*[).:\-]\s*(\S.*)$/;
/** Where the coaching name of an exercise ends and its doses begin: "Glute bridge 3 × 12". */
const SETS_RE = /\s\d+\s*(?:[×x]\s*\d+|\b(?:min|mins|minutes|sec|secs|s)\b)/i;

const KNOWN_PREFIX: Record<string, { label: string; tone: ChecklistTone }> = {
  why: { label: 'Why it works', tone: 'why' },
  tip: { label: "Coach's tip", tone: 'tip' },
  note: { label: 'Note', tone: 'note' },
  focus: { label: 'Focus', tone: 'effort' },
  fuel: { label: 'Fueling', tone: 'fuel' },
  fueling: { label: 'Fueling', tone: 'fuel' },
  pace: { label: 'Pacing', tone: 'pace' },
  pacing: { label: 'Pacing', tone: 'pace' },
  effort: { label: 'Effort', tone: 'effort' },
  route: { label: 'Route', tone: 'route' },
  rule: { label: 'Rule', tone: 'rule' },
  rules: { label: 'Rule', tone: 'rule' },
  safety: { label: 'Safety', tone: 'rule' },
  important: { label: 'Important', tone: 'rule' },
};

/** Splits prose into sentences without relying on regex lookbehind (not on every engine). */
function splitSentences(text: string): string[] {
  const matches = text.replace(/\s+/g, ' ').match(/[^.!?]+[.!?]*/g) ?? [];
  return matches.map((part) => part.trim()).filter(Boolean);
}

/** Trims punctuation and filler so a sentence reads like a checklist step. */
function tidy(raw: string): string {
  let text = raw.replace(/\s+/g, ' ').trim();
  text = text.replace(/^[,;:—–\-\s]+/, '').replace(/^(?:then|and)\s+/i, '');
  text = text.replace(/[,;:—–\-\s.]+$/, '');
  text = text.replace(/[,;:—–\-\s]*\b(?:then|and)$/i, '');
  text = text.replace(/[,;:—–\-\s.]+$/, '');
  if (!text) return '';
  return text.charAt(0).toUpperCase() + text.slice(1);
}

function titleCase(value: string): string {
  return value.toLowerCase().replace(/\b[a-z]/g, (char) => char.toUpperCase());
}

function classify(text: string, index: number): { label: string; tone: ChecklistTone } {
  const t = text.toLowerCase();

  if (/shakeout/.test(t)) return { label: 'Shakeout', tone: 'effort' };
  if (WARM_RE.test(text)) return { label: 'Warm-up', tone: 'warmup' };
  if (COOL_RE.test(text)) return { label: 'Cool-down', tone: 'cooldown' };
  if (/fuel|gel|water|sip|drink|carbo|hydrat/.test(t)) return { label: 'Fueling', tone: 'fuel' };
  if (/route|terrain|flat|rolling|hill/.test(t)) return { label: 'Route', tone: 'route' };
  if (/^race\b/.test(t)) return { label: 'Race', tone: 'main' };
  if (/finish|reserve|last kilomet|empty the tank|\bkick\b/.test(t)) {
    return { label: 'Finish', tone: 'finish' };
  }
  if (/start|controlled/.test(t)) return { label: 'Start', tone: 'main' };
  if (/interval|\breps?\b|×|\bstrong\b|z4|z5/.test(t)) return { label: 'Intervals', tone: 'main' };
  if (/tempo|z3|comfortably hard|threshold|steady/.test(t)) return { label: 'Main set', tone: 'main' };
  if (/talk|conversat|chat|breath|relaxed|easy|slow|effort/.test(t)) {
    return { label: 'Effort', tone: 'effort' };
  }
  if (/\bz[1-5]\b|heart rate|\bhr\b|bpm|pace|\bkm\b/.test(t)) return { label: 'Pacing', tone: 'pace' };

  return { label: index === 0 ? 'Session' : 'Remember', tone: 'note' };
}

/** Picks the icon/tone for one exercise line of a structured session. */
function exerciseTone(text: string): ChecklistTone {
  const t = text.toLowerCase();
  if (/balance|propriocep|single-leg|single leg/.test(t)) return 'balance';
  if (/mobility|stretch|rotation|rotate|roll|foam|flexor|hip opener/.test(t)) return 'mobility';
  if (
    /raise|bridge|plank|squat|lunge|press|curl|deadlift|hop|skip|bound|strength|\bcore\b|\bfoot\b|\btoe\b|\bankle\b/.test(
      t
    )
  ) {
    return 'strength';
  }
  if (/warm-?up/.test(t)) return 'warmup';
  if (/cool-?down/.test(t)) return 'cooldown';
  return 'main';
}

/** "Bent-knee calf raises (soleus) 3 × 15, 3 s lowering" → "Bent-knee calf raises (soleus)". */
function exerciseName(text: string): string {
  const match = text.match(SETS_RE);
  if (!match || !match.index) return '';
  const name = text.slice(0, match.index).replace(/[,;:–—-]+$/, '').trim();
  return name.length >= 3 && name.length <= 38 ? name : '';
}

/** Strips Excel/Notes checkbox glyphs and bullet characters from the start of a line. */
function stripBullet(line: string): string {
  return line.replace(/^[\s☐☑□▪▫•·*–—-]+/, '').trim();
}

/**
 * Reads the numbered, block-style note from the plan sheet:
 * a heading line, then "1) …", "2) …", and trailing RULE:/WHY: lines.
 */
function fromLines(lines: string[]): ChecklistItem[] {
  const items: ChecklistItem[] = [];
  let section: string | undefined;

  lines.forEach((line) => {
    const numbered = line.match(NUMBERED_RE);
    if (numbered) {
      const text = tidy(numbered[2]);
      if (!text) return;
      if (items.some((item) => item.text.toLowerCase() === text.toLowerCase())) return;
      items.push({
        id: `step-${items.length}`,
        label: exerciseName(text),
        text,
        tone: exerciseTone(text),
        section,
        index: Number.parseInt(numbered[1], 10),
      });
      return;
    }

    const prefixed = line.match(/^([A-Za-z][A-Za-z /&-]{1,22}):\s*(.+)$/);
    if (prefixed) {
      const known = KNOWN_PREFIX[prefixed[1].trim().toLowerCase()];
      const rest = tidy(prefixed[2]);
      if (known && rest) {
        items.push({
          id: `body-${items.length}`,
          label: known.label,
          text: rest,
          tone: known.tone,
          section,
        });
        return;
      }
    }

    // Anything else is the heading for the exercises that follow it.
    const heading = tidy(line).replace(/[.:]$/, '');
    if (heading) section = heading;
  });

  return items.slice(0, 10);
}

/** Reads a one-paragraph brief, lifting warm-up/cool-down out of run-on sentences. */
function fromProse(detail: string): ChecklistItem[] {
  const warm = detail.match(WARM_RE);
  const cool = detail.match(COOL_RE);

  const body: ChecklistItem[] = [];
  splitSentences(detail).forEach((sentence) => {
    let remaining = sentence;
    if (warm) remaining = remaining.replace(warm[0], ' ');
    if (cool) remaining = remaining.replace(cool[0], ' ');

    const text = tidy(remaining);
    if (!text) return;
    if (body.some((item) => item.text.toLowerCase() === text.toLowerCase())) return;

    const prefixMatch = text.match(/^([A-Za-z][A-Za-z /&-]{1,22}):\s*(.+)$/);
    if (prefixMatch) {
      const prefix = prefixMatch[1].trim();
      const rest = tidy(prefixMatch[2]);
      const known = KNOWN_PREFIX[prefix.toLowerCase()];
      if (known) {
        body.push({ id: `body-${body.length}`, label: known.label, text: rest, tone: known.tone });
        return;
      }
      if (prefix === prefix.toUpperCase()) {
        const tone = classify(rest, body.length).tone;
        body.push({ id: `body-${body.length}`, label: titleCase(prefix), text: rest, tone });
        return;
      }
    }

    const { label, tone } = classify(text, body.length);
    body.push({ id: `body-${body.length}`, label, text, tone });
  });

  const items: ChecklistItem[] = [];
  if (warm) items.push({ id: 'warmup', label: 'Warm-up', text: tidy(warm[0]), tone: 'warmup' });
  items.push(...body);
  if (cool) items.push({ id: 'cooldown', label: 'Cool-down', text: tidy(cool[0]), tone: 'cooldown' });

  return items.slice(0, 6);
}

/**
 * Turns a workout's note into one tickable workout structure.
 * Numbered multi-line notes (foot drills, strength blocks) keep their numbers and
 * headings; prose briefs are split into warm-up / main set / cool-down steps.
 */
export function buildWorkoutChecklist(workout: Workout): ChecklistItem[] {
  const raw = (workout.detail ?? '').replace(/\r\n?/g, '\n').trim();
  if (!raw) return [];

  const lines = raw.split('\n').map(stripBullet).filter(Boolean);
  const numbered = lines.filter((line) => NUMBERED_RE.test(line)).length;
  // A one-line note only counts as a list when it starts with its own number.
  const isList = numbered >= 2 || (numbered === 1 && (lines.length > 1 || NUMBERED_RE.test(lines[0])));
  if (isList) return fromLines(lines);

  return fromProse(raw.replace(/\s+/g, ' '));
}

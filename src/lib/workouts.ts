import type { Workout, WorkoutType } from './types';

/** Accent colour per session type, shared by every workout presentation. */
export const WORKOUT_COLORS: Record<WorkoutType, string> = {
  easy: '#5BE39A',
  tempo: '#F5A052',
  intervals: '#D4FF00',
  long: '#5B8DEF',
  recovery: '#4FD1C5',
  race: '#C9F94B',
};

export function typeColor(type: WorkoutType): string {
  return WORKOUT_COLORS[type] ?? '#8D9AA4';
}

/** Session types in the order they are offered when building a workout. */
export const WORKOUT_TYPES: WorkoutType[] = [
  'easy',
  'tempo',
  'intervals',
  'long',
  'recovery',
  'race',
];

export const WORKOUT_TYPE_LABEL: Record<WorkoutType, string> = {
  easy: 'Easy',
  tempo: 'Tempo',
  intervals: 'Intervals',
  long: 'Long run',
  recovery: 'Recovery',
  race: 'Race day',
};

const DEFAULT_TITLE: Record<WorkoutType, string> = {
  easy: 'Easy run',
  tempo: 'Tempo run',
  intervals: 'Intervals',
  long: 'Long run',
  recovery: 'Recovery jog',
  race: 'Race day',
};

export function defaultWorkoutTitle(type: WorkoutType): string {
  return DEFAULT_TITLE[type];
}

/** Builds an id that stays unique even when two sessions share a date and type. */
export function makeWorkoutId(date: string, type: WorkoutType, plan: Workout[]): string {
  const base = `${date}-${type}`;
  if (!plan.some((workout) => workout.id === base)) return base;
  let suffix = 2;
  while (plan.some((workout) => workout.id === `${base}-${suffix}`)) suffix += 1;
  return `${base}-${suffix}`;
}

const NUMBERED_LINE = /^\(?(\d{1,2})\s*[).:\-]\s*(\S.*)$/;
const LABELLED_LINE = /^(rules?|why|tip|note|safety|focus|pace|fuel|effort|route):\s*\S/i;

/** True when a detail is the numbered, checklist-style note written in Excel. */
export function isStructuredDetail(detail: string): boolean {
  return detail.split('\n').some((line) => NUMBERED_LINE.test(line.trim()));
}

function cleanLine(line: string): string {
  return line.replace(/^[\s☐☑□▪▫•·*–—-]+/, '').trim();
}

/** Splits a stored detail back into the editor's heading and step rows. */
export function splitStructuredDetail(detail: string): { heading: string; steps: string[] } {
  const lines = detail.split('\n').map(cleanLine).filter(Boolean);
  let heading = '';
  const steps: string[] = [];

  lines.forEach((line) => {
    const numbered = line.match(NUMBERED_LINE);
    if (numbered) {
      steps.push(numbered[2].trim());
      return;
    }
    if (LABELLED_LINE.test(line) || steps.length > 0) {
      steps.push(line);
      return;
    }
    heading = line;
  });

  return { heading, steps };
}

/** Writes the editor's rows back to the numbered note the checklist reader expects. */
export function joinStructuredDetail(heading: string, steps: string[]): string {
  let number = 0;
  const lines = steps
    .map(cleanLine)
    .filter(Boolean)
    .map((step) => {
      if (LABELLED_LINE.test(step)) return step;
      number += 1;
      return `${number}) ${step}`;
    });

  return [heading.trim(), ...lines].filter(Boolean).join('\n');
}

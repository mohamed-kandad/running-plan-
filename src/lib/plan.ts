import { addDays, diffDays, formatPace, startOfWeek } from './date';
import type { Goal, Level, PlanSettings, Workout, WorkoutType } from './types';

export const GOALS: { key: Goal; label: string; km: number }[] = [
  { key: '5K', label: '5K', km: 5 },
  { key: '10K', label: '10K', km: 10 },
  { key: 'HALF', label: 'Half', km: 21.1 },
];

export const GOAL_LABEL: Record<Goal, string> = {
  '5K': '5K',
  '10K': '10K',
  HALF: 'Half marathon',
};

export const DEFAULT_RACE_WEEK_OFFSET = 8;

/** Monday-based training days for each days-per-week setting. */
const WEEKDAY_SLOTS: Record<number, number[]> = {
  3: [1, 3, 5],
  4: [1, 2, 4, 6],
  5: [1, 2, 3, 5, 6],
};

const DAY_ROLES: Record<number, WorkoutType[]> = {
  3: ['easy', 'tempo', 'long'],
  4: ['easy', 'tempo', 'easy', 'long'],
  5: ['easy', 'tempo', 'recovery', 'easy', 'long'],
};

const BASE_KM: Record<Goal, { easy: number; quality: number; long: number }> = {
  '5K': { easy: 4, quality: 4, long: 6 },
  '10K': { easy: 6, quality: 6, long: 10 },
  HALF: { easy: 8, quality: 8, long: 14 },
};

const TYPE_TITLES: Record<WorkoutType, string> = {
  easy: 'Easy run',
  tempo: 'Tempo run',
  intervals: 'Intervals',
  long: 'Long run',
  recovery: 'Recovery jog',
  race: 'Race day',
};

export function zoneForType(type: WorkoutType): number {
  switch (type) {
    case 'recovery':
      return 1;
    case 'easy':
    case 'long':
      return 2;
    case 'tempo':
      return 3;
    case 'intervals':
      return 4;
    case 'race':
      return 5;
  }
}

export function defaultSettings(today: string): PlanSettings {
  const start = startOfWeek(today);
  return {
    goal: '10K',
    level: 'intermediate',
    daysPerWeek: 4,
    startDate: start,
    raceDate: addDays(start, DEFAULT_RACE_WEEK_OFFSET * 7 - 1),
  };
}

/** Suggested pace band in seconds per km, before level adjustment. */
const BASE_PACE: Record<WorkoutType, [number, number]> = {
  recovery: [400, 435],
  easy: [370, 400],
  long: [375, 405],
  tempo: [310, 330],
  intervals: [290, 310],
  race: [300, 318],
};

/** Formatted target pace band for a session type, slowed for beginners. */
export function paceTarget(type: WorkoutType, level: Level): string {
  const [fast, slow] = BASE_PACE[type];
  const adjust = level === 'beginner' ? 25 : 0;
  return `${formatPace(fast + adjust)}–${formatPace(slow + adjust)}`;
}

/** Training phase label for a given week of the block. */
export function phaseLabel(week: number, totalWeeks: number): string {
  const remaining = totalWeeks - week;
  if (remaining <= 0) return 'Race week';
  if (remaining <= 2) return 'Taper and sharpen';
  if (week <= 2) return 'Base building';
  return 'Build phase';
}

/** Number of training weeks between plan start and race day. */
export function planWeeks(settings: PlanSettings): number {
  const raw = Math.ceil((diffDays(settings.startDate, settings.raceDate) + 1) / 7);
  return Math.min(20, Math.max(4, raw));
}

function weekFactor(weekIndex: number, totalWeeks: number): number {
  const build = 1 + 0.05 * weekIndex;
  const cutback = weekIndex % 4 === 3 ? 0.82 : 1;
  const remaining = totalWeeks - 1 - weekIndex;
  const taper = remaining === 0 ? 0.6 : remaining === 1 ? 0.85 : 1;
  return build * cutback * taper;
}

const roundHalf = (n: number) => Math.round(n * 2) / 2;

function describe(
  type: WorkoutType,
  distanceKm: number,
  settings: PlanSettings,
  week: number
): string {
  switch (type) {
    case 'easy':
      return `Relaxed and conversational — you should be able to hold a chat. HR in Z2, ${distanceKm} km total.`;
    case 'recovery':
      return `Very easy shakeout. Short, slow, and it should leave you feeling better than when you started.`;
    case 'long':
      return distanceKm >= 10
        ? `Steady Z2 effort. Take a gel or a few sips every 30–40 min to rehearse race fueling.`
        : `Steady Z2 effort the whole way. Keep it easy — finish feeling like you could keep going.`;
    case 'tempo': {
      const minutes = Math.min(40, 15 + week * 2);
      return `10 min easy warm-up, then ${minutes} min continuous at Z3 (comfortably hard), then 10 min easy cool-down.`;
    }
    case 'intervals': {
      const reps = (settings.level === 'beginner' ? 4 : 6) + Math.floor(week / 4);
      return `15 min warm-up, ${reps} × 3 min at Z4 (strong and controlled) with 90 s easy jog between, 10 min cool-down.`;
    }
    case 'race': {
      const km = GOALS.find((g) => g.key === settings.goal)?.km ?? 10;
      return `Race ${km} km. Start controlled in Z3, settle into Z4, and empty the tank over the last kilometre.`;
    }
  }
}

export function generatePlan(settings: PlanSettings): Workout[] {
  const totalWeeks = planWeeks(settings);
  const slots = WEEKDAY_SLOTS[settings.daysPerWeek];
  const roles = DAY_ROLES[settings.daysPerWeek];
  const base = BASE_KM[settings.goal];
  const workouts: Workout[] = [];

  for (let w = 0; w < totalWeeks; w++) {
    const factor = weekFactor(w, totalWeeks);
    const weekStart = addDays(settings.startDate, w * 7);

    slots.forEach((weekday, index) => {
      let type = roles[index];
      // Quality day alternates intervals / tempo so the block stays varied.
      if (type === 'tempo') type = w % 2 === 0 ? 'intervals' : 'tempo';

      const raw =
        type === 'long'
          ? base.long
          : type === 'intervals' || type === 'tempo'
            ? base.quality
            : type === 'recovery'
              ? base.easy * 0.6
              : base.easy;

      const distanceKm = Math.max(2, roundHalf(raw * factor));
      const date = addDays(weekStart, weekday);

      if (date >= settings.raceDate) return;

      workouts.push({
        id: `${date}-${type}`,
        date,
        week: w + 1,
        type,
        title: TYPE_TITLES[type],
        detail: describe(type, distanceKm, settings, w + 1),
        distanceKm,
        zone: zoneForType(type),
      });
    });
  }

  const raceKm = GOALS.find((g) => g.key === settings.goal)?.km ?? 10;
  workouts.push({
    id: `${settings.raceDate}-race`,
    date: settings.raceDate,
    week: totalWeeks,
    type: 'race',
    title: `${GOAL_LABEL[settings.goal]} race day`,
    detail: describe('race', raceKm, settings, totalWeeks),
    distanceKm: raceKm,
    zone: zoneForType('race'),
  });

  return workouts.sort((a, b) => a.date.localeCompare(b.date));
}

/** Total planned kilometres in a week (1-based). */
export function weekKm(plan: Workout[], week: number): number {
  return plan
    .filter((w) => w.week === week)
    .reduce((sum, w) => sum + w.distanceKm, 0);
}

export function nextWorkouts(plan: Workout[], today: string, count = 3): Workout[] {
  return plan.filter((w) => w.date > today).slice(0, count);
}

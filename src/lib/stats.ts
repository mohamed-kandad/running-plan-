import { addDays, startOfWeek, toISO } from './date';
import type { RunLog, Workout } from './types';

export interface Totals {
  runs: number;
  km: number;
  seconds: number;
  longestKm: number;
  avgPace: number; // seconds per km
}

export function totals(runs: RunLog[]): Totals {
  const km = runs.reduce((sum, r) => sum + r.distanceKm, 0);
  const seconds = runs.reduce((sum, r) => sum + r.durationSec, 0);
  const longestKm = runs.reduce((max, r) => Math.max(max, r.distanceKm), 0);
  return {
    runs: runs.length,
    km,
    seconds,
    longestKm,
    avgPace: km > 0 ? seconds / km : 0,
  };
}

export function paceOf(run: RunLog): number {
  return run.distanceKm > 0 ? run.durationSec / run.distanceKm : 0;
}

export interface WeekBucket {
  weekStart: string;
  km: number;
  runs: number;
}

/** Kilometres per Monday-based week, oldest first, including empty weeks. */
export function weeklyBuckets(runs: RunLog[], today: string, weeks = 8): WeekBucket[] {
  const currentWeek = startOfWeek(today);
  return Array.from({ length: weeks }, (_, index) => {
    const weekStart = addDays(currentWeek, (index - (weeks - 1)) * 7);
    const inWeek = runs.filter((r) => startOfWeek(r.date) === weekStart);
    return {
      weekStart,
      km: inWeek.reduce((sum, r) => sum + r.distanceKm, 0),
      runs: inWeek.length,
    };
  });
}

export function kmThisWeek(runs: RunLog[], today: string): number {
  const weekStart = startOfWeek(today);
  return runs
    .filter((r) => startOfWeek(r.date) === weekStart)
    .reduce((sum, r) => sum + r.distanceKm, 0);
}

/** Runs completed on consecutive days up to yesterday/today. */
export function dayStreak(runs: RunLog[], today: string): number {
  const days = new Set(runs.map((r) => r.date));
  let streak = 0;
  let cursor = today;
  if (!days.has(cursor)) {
    cursor = addDays(cursor, -1);
    if (!days.has(cursor)) return 0;
  }
  while (days.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}

/** Share of past scheduled sessions that were logged. */
export function adherence(plan: Workout[], runs: RunLog[], today: string): number {
  const past = plan.filter((w) => w.date <= today);
  if (past.length === 0) return 0;
  const ids = new Set(runs.map((r) => r.workoutId));
  const done = past.filter((w) => ids.has(w.id)).length;
  return done / past.length;
}

/** Which week number of the plan contains `today`. */
export function currentWeek(plan: Workout[], today: string): number {
  const next = plan.find((w) => w.date >= today);
  return next?.week ?? plan[plan.length - 1]?.week ?? 1;
}

export function dateStamp(date = new Date()): string {
  return toISO(date);
}

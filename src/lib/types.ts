export type Goal = '5K' | '10K' | 'HALF';
export type Level = 'beginner' | 'intermediate';
export type WorkoutType =
  | 'easy'
  | 'tempo'
  | 'intervals'
  | 'long'
  | 'recovery'
  | 'race';

export interface Workout {
  /** Stable id derived from date + role, so completions survive plan rebuilds. */
  id: string;
  date: string; // YYYY-MM-DD
  week: number; // 1-based
  type: WorkoutType;
  title: string;
  detail: string;
  /** Optional custom target pace, e.g. "5:30–5:45"; the type's band is used when absent. */
  pace?: string;
  distanceKm: number;
  zone: number; // 1-5
}

export interface RunLog {
  id: string;
  workoutId?: string;
  date: string;
  distanceKm: number;
  durationSec: number;
  avgHr?: number;
  effort?: number; // 1-10
  notes?: string;
}

export interface PlanSettings {
  goal: Goal;
  level: Level;
  daysPerWeek: 3 | 4 | 5;
  startDate: string;
  raceDate: string;
}

export interface Zone {
  id: number;
  min: number;
  max: number;
}

export interface AppState {
  settings: PlanSettings;
  plan: Workout[];
  runs: RunLog[];
  zones: Zone[];
  maxHr: number;
  restingHr: number;
  /** Device calendar event id per workout id, so exports never duplicate. */
  calendarEventIds: Record<string, string>;
}

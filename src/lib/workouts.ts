import type { WorkoutType } from './types';

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

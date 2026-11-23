import { CATEGORIES, CATEGORY_BY_ID } from './categories';
import { COOLDOWN_EXERCISES } from './cooldown';
import { CORE_EXERCISES } from './core';
import { DRILLS_EXERCISES } from './drills';
import { APPROVED_IMAGES } from './approvedImages';
import { EXERCISE_IMAGES } from './exerciseImages';
import { FOOT_ANKLE_EXERCISES } from './foot-ankle';
import { GLUTES_EXERCISES } from './glutes';
import { MOBILITY_EXERCISES } from './mobility';
import { RECOVERY_EXERCISES } from './recovery';
import { STRENGTH_EXERCISES } from './strength';
import { TRAIL_EXERCISES } from './trail';
import type {
  CategoryId,
  Difficulty,
  EquipmentId,
  Exercise,
  ExerciseImage,
  Exercise as ExerciseRecord,
  MuscleId,
  PurposeId,
  WhenId,
} from './types';
import { EQUIPMENT_LABELS } from './types';
import { WARMUP_EXERCISES } from './warmup';

/** Every exercise in the library, each defined exactly once. */
export const EXERCISES: Exercise[] = [
  ...WARMUP_EXERCISES,
  ...COOLDOWN_EXERCISES,
  ...FOOT_ANKLE_EXERCISES,
  ...STRENGTH_EXERCISES,
  ...GLUTES_EXERCISES,
  ...CORE_EXERCISES,
  ...MOBILITY_EXERCISES,
  ...DRILLS_EXERCISES,
  ...TRAIL_EXERCISES,
  ...RECOVERY_EXERCISES,
];

export const EXERCISE_BY_ID: Record<string, Exercise> = Object.fromEntries(
  EXERCISES.map((exercise) => [exercise.id, exercise])
);

export const TOTAL_EXERCISES = EXERCISES.length;

export function getExercise(id: string | null | undefined): Exercise | undefined {
  return id ? EXERCISE_BY_ID[id] : undefined;
}

export function getExerciseImages(id: string): ExerciseImage[] {
  const base = EXERCISE_IMAGES[id] ?? [];
  const approved = APPROVED_IMAGES[id] as
    | { source: ExerciseImage['source']; credit?: string }
    | undefined;
  return approved
    ? [{ source: approved.source, label: 'Photo', credit: approved.credit }, ...base]
    : base;
}

export function exercisesInCategory(categoryId: CategoryId): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.categories.includes(categoryId));
}

export function exercisesInGroup(groupId: string): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.groups.includes(groupId));
}

export function categoryCount(categoryId: CategoryId): number {
  return exercisesInCategory(categoryId).length;
}

export function exercisesForMuscle(muscleId: MuscleId): Exercise[] {
  return EXERCISES.filter(
    (exercise) =>
      exercise.primaryMuscles.includes(muscleId) || exercise.secondaryMuscles.includes(muscleId)
  ).sort((a, b) => {
    const aPrimary = a.primaryMuscles.includes(muscleId) ? 0 : 1;
    const bPrimary = b.primaryMuscles.includes(muscleId) ? 0 : 1;
    return aPrimary - bPrimary || a.name.localeCompare(b.name);
  });
}

export function exercisesUsingEquipment(equipment: EquipmentId): Exercise[] {
  return EXERCISES.filter((exercise) => exercise.equipment.includes(equipment));
}

/** Curated picks for the home screen — a spread across the categories. */
export const POPULAR_IDS = [
  'goblet-squat',
  'glute-bridge',
  'clamshells',
  'tibialis-raises',
  'plank',
  'worlds-greatest-stretch',
  'single-leg-rdl',
  'worlds-greatest-stretch',
  'step-ups',
  'dead-bug',
  'foam-roll-quads',
  'a-skips',
].filter((id, index, list) => list.indexOf(id) === index);

export interface ExerciseFilters {
  category?: CategoryId | null;
  muscle?: MuscleId | null;
  difficulty?: Difficulty[];
  equipment?: EquipmentId[];
  purpose?: PurposeId[];
  when?: WhenId[];
}

const normalize = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

/** Name + alias index, longest first, so "single-leg glute bridge" wins over "glute bridge". */
const NAME_INDEX = EXERCISES.flatMap((exercise) =>
  [exercise.name, ...(exercise.aliases ?? [])].map((name) => ({
    id: exercise.id,
    key: normalize(name),
  }))
).sort((a, b) => b.key.length - a.key.length);

/**
 * Finds the exercise a workout checklist line is talking about.
 * The prescription ("3 × 10") is returned separately so the workout's own
 * numbers can be shown apart from the library's general recommendation.
 */
export function matchExerciseInText(text: string): {
  exercise: Exercise;
  prescription: string | null;
} | null {
  const normalized = normalize(text.replace(/^\s*\(?\d{1,2}\s*[).:\-]\s*/, ''));
  if (!normalized) return null;

  const hit = NAME_INDEX.find(
    (entry) =>
      normalized === entry.key ||
      normalized.startsWith(`${entry.key} `) ||
      normalized.includes(` ${entry.key} `)
  );
  if (!hit) return null;

  return {
    exercise: EXERCISE_BY_ID[hit.id],
    prescription: parsePrescription(text),
  };
}

/** "Goblet squat 3 × 10" → "3 × 10"; "Plank 30 s" → "30 s". */
export function parsePrescription(text: string): string | null {
  const sets = text.match(/(\d+)\s*[×x]\s*(\d+)/);
  if (sets) return `${sets[1]} × ${sets[2]}`;
  const minutes = text.match(/(\d+)\s*(?:min|mins|minutes)\b/i);
  if (minutes) return `${minutes[1]} min`;
  const seconds = text.match(/(\d+)\s*(?:sec|secs|seconds)\b/i);
  if (seconds) return `${seconds[1]} sec`;
  return null;
}

/** Free-text search plus the structured filters. */
export function filterExercises(query: string, filters: ExerciseFilters = {}): Exercise[] {
  const terms = normalize(query).split(' ').filter(Boolean);

  return EXERCISES.filter((exercise) => {
    if (filters.category && !exercise.categories.includes(filters.category)) return false;
    if (
      filters.muscle &&
      !exercise.primaryMuscles.includes(filters.muscle) &&
      !exercise.secondaryMuscles.includes(filters.muscle)
    ) {
      return false;
    }
    if (filters.difficulty?.length && !filters.difficulty.includes(exercise.difficulty)) return false;
    if (
      filters.equipment?.length &&
      !filters.equipment.some((equipment) => exercise.equipment.includes(equipment))
    ) {
      return false;
    }
    if (filters.purpose?.length && !filters.purpose.includes(exercise.purpose)) return false;
    if (filters.when?.length && !filters.when.some((when) => exercise.when.includes(when))) {
      return false;
    }

    if (terms.length === 0) return true;
    const haystack = normalize(
      [
        exercise.name,
        ...(exercise.aliases ?? []),
        ...exercise.categories.map((id) => CATEGORY_BY_ID[id]?.name ?? ''),
        ...exercise.primaryMuscles,
        ...exercise.secondaryMuscles,
        ...exercise.equipment.map((equipment) => EQUIPMENT_LABELS[equipment]),
      ].join(' ')
    );
    return terms.every((term) => haystack.includes(term));
  });
}

/** True when every exercise has at least one bundled illustration. */
export function missingImageIds(): string[] {
  return EXERCISES.filter((exercise) => (EXERCISE_IMAGES[exercise.id] ?? []).length === 0).map(
    (exercise) => exercise.id
  );
}

export { CATEGORIES, CATEGORY_BY_ID };
export type { ExerciseRecord };

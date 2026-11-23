import type { ImageSourcePropType } from 'react-native';

/** Content model for the offline exercise library. */

export type CategoryId =
  | 'warmup'
  | 'cooldown'
  | 'foot-ankle'
  | 'strength'
  | 'glutes-hips'
  | 'core'
  | 'mobility'
  | 'drills'
  | 'trail'
  | 'recovery';

export type MuscleId =
  | 'quadriceps'
  | 'hamstrings'
  | 'glutes'
  | 'calves'
  | 'soleus'
  | 'tibialis'
  | 'hip-flexors'
  | 'adductors'
  | 'abductors'
  | 'core'
  | 'obliques'
  | 'back'
  | 'shoulders';

export type Difficulty = 'beginner' | 'intermediate' | 'advanced';

export type EquipmentId =
  | 'none'
  | 'mat'
  | 'band'
  | 'dumbbells'
  | 'kettlebell'
  | 'box'
  | 'wall'
  | 'chair'
  | 'foam-roller'
  | 'towel'
  | 'hill'
  | 'stairs';

export type PurposeId =
  | 'warm-up'
  | 'cool-down'
  | 'strength'
  | 'stability'
  | 'mobility'
  | 'technique'
  | 'trail'
  | 'recovery';

export type WhenId = 'pre-run' | 'post-run' | 'rest-day' | 'gym' | 'anytime' | 'pre-race';

export interface Muscle {
  id: MuscleId;
  name: string;
  /** Which body diagram the group is drawn on. */
  view: 'front' | 'back';
  role: string;
  description: string;
}

export interface CategoryGroup {
  id: string;
  name: string;
  blurb: string;
}

export interface Category {
  id: CategoryId;
  name: string;
  tagline: string;
  description: string;
  /** Ionicons glyph used in lists and headers. */
  icon: string;
  accent: string;
  /** Exercise whose illustration represents the category. */
  heroExerciseId: string;
  groups: CategoryGroup[];
}

export interface Exercise {
  id: string;
  name: string;
  /** Extra names the workout matcher should accept. */
  aliases?: string[];
  /** Primary category first. */
  categories: CategoryId[];
  /** Group ids from any of the categories above. */
  groups: string[];
  difficulty: Difficulty;
  primaryMuscles: MuscleId[];
  secondaryMuscles: MuscleId[];
  equipment: EquipmentId[];
  purpose: PurposeId;
  when: WhenId[];
  /** Typical time to run through the exercise, in minutes. */
  durationMin: number;
  start: string;
  steps: string[];
  breathing: string;
  prescription: {
    sets: string;
    reps: string;
    rest: string;
  };
  mistakes: string[];
  safety: string[];
  why: string;
  tip?: string;
  easier?: string;
  harder?: string;
}

export interface ExerciseImage {
  source: ImageSourcePropType;
  label: string;
  /** Where the image came from, shown under the gallery. */
  credit?: string;
}

export interface RoutineStep {
  exerciseId: string;
  sets: string;
  reps: string;
  restSec: number;
  note?: string;
}

export interface Routine {
  id: string;
  name: string;
  subtitle: string;
  focus: string;
  durationMin: string;
  level: Difficulty;
  equipment: EquipmentId[];
  when: WhenId[];
  steps: RoutineStep[];
}

export const DIFFICULTY_LABELS: Record<Difficulty, string> = {
  beginner: 'Beginner',
  intermediate: 'Intermediate',
  advanced: 'Advanced',
};

export const EQUIPMENT_LABELS: Record<EquipmentId, string> = {
  none: 'No equipment',
  mat: 'Mat',
  band: 'Resistance band',
  dumbbells: 'Dumbbells',
  kettlebell: 'Kettlebell',
  box: 'Box / step',
  wall: 'Wall',
  chair: 'Chair',
  'foam-roller': 'Foam roller',
  towel: 'Towel',
  hill: 'Hill / slope',
  stairs: 'Stairs',
};

export const PURPOSE_LABELS: Record<PurposeId, string> = {
  'warm-up': 'Warm-up',
  'cool-down': 'Cool-down',
  strength: 'Strength',
  stability: 'Stability',
  mobility: 'Mobility',
  technique: 'Technique',
  trail: 'Trail',
  recovery: 'Recovery',
};

export const WHEN_LABELS: Record<WhenId, string> = {
  'pre-run': 'Before a run',
  'post-run': 'After a run',
  'rest-day': 'Rest day',
  gym: 'Gym day',
  anytime: 'Any time',
  'pre-race': 'Race day',
};

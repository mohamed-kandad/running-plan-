import type { Routine } from './types';

/** Ready-made routines designed for runners. */
export const ROUTINES: Routine[] = [
  {
    id: 'pre-run-warmup',
    name: 'Pre-run warm-up',
    subtitle: 'Wake up the legs before any run',
    focus: 'Raises your temperature, opens the hips and rehearses the stride.',
    durationMin: '10–15',
    level: 'beginner',
    equipment: ['none'],
    when: ['pre-run'],
    steps: [
      { exerciseId: 'easy-jog', sets: '1', reps: '5 min', restSec: 0, note: 'Easy enough to chat.' },
      { exerciseId: 'leg-swings-front-back', sets: '1', reps: '10 per leg', restSec: 0 },
      { exerciseId: 'leg-swings-side-side', sets: '1', reps: '10 per leg', restSec: 0 },
      { exerciseId: 'knee-hugs', sets: '1', reps: '8 per side', restSec: 0 },
      { exerciseId: 'dynamic-hamstring-sweeps', sets: '1', reps: '8 per leg', restSec: 0 },
      { exerciseId: 'high-knees', sets: '2', reps: '20 m', restSec: 30 },
      { exerciseId: 'strides', sets: '4', reps: '20 s', restSec: 60, note: 'Build smoothly, stay relaxed.' },
    ],
  },
  {
    id: 'post-run-cooldown',
    name: 'Post-run cool-down',
    subtitle: 'Bring the body back down',
    focus: 'Lowers the heart rate, then relaxes the calves, quads and hips.',
    durationMin: '5–10',
    level: 'beginner',
    equipment: ['wall'],
    when: ['post-run'],
    steps: [
      { exerciseId: 'walking-recovery', sets: '1', reps: '4 min', restSec: 0 },
      { exerciseId: 'standing-calf-stretch', sets: '1', reps: '30 s per leg', restSec: 15 },
      { exerciseId: 'standing-quad-stretch', sets: '1', reps: '30 s per leg', restSec: 15 },
      { exerciseId: 'hip-flexor-stretch', sets: '1', reps: '30 s per side', restSec: 15 },
      { exerciseId: 'figure-four-glute-stretch', sets: '1', reps: '30 s per side', restSec: 15 },
      { exerciseId: 'deep-breathing', sets: '1', reps: '8 breaths', restSec: 0 },
    ],
  },
  {
    id: 'foot-ankle-routine',
    name: 'Foot & ankle routine',
    subtitle: 'Build the spring and the brake',
    focus: 'Calf, shin and foot strength for runners who want sturdier ankles.',
    durationMin: '15–20',
    level: 'beginner',
    equipment: ['wall', 'none'],
    when: ['rest-day', 'post-run'],
    steps: [
      { exerciseId: 'tibialis-raises', sets: '3', reps: '15', restSec: 45 },
      { exerciseId: 'bent-knee-calf-raises', sets: '3', reps: '12', restSec: 45 },
      { exerciseId: 'single-leg-calf-raises', sets: '3', reps: '8 per leg', restSec: 60 },
      { exerciseId: 'short-foot', sets: '3', reps: '8 per foot', restSec: 30 },
      { exerciseId: 'toe-yoga', sets: '2', reps: '8 per foot', restSec: 30 },
      { exerciseId: 'single-leg-balance', sets: '2', reps: '30 s per leg', restSec: 30 },
    ],
  },
  {
    id: 'strength-legs-core',
    name: 'Strength A — legs & core',
    subtitle: 'The heavy session of the week',
    focus: 'Squat, hinge and step patterns that carry over to every run.',
    durationMin: '30–40',
    level: 'intermediate',
    equipment: ['kettlebell', 'dumbbells', 'box', 'mat'],
    when: ['gym', 'rest-day'],
    steps: [
      { exerciseId: 'goblet-squat', sets: '4', reps: '10', restSec: 90 },
      { exerciseId: 'dumbbell-rdl', sets: '3', reps: '10', restSec: 90 },
      { exerciseId: 'bulgarian-split-squat', sets: '3', reps: '8 per leg', restSec: 90 },
      { exerciseId: 'step-ups', sets: '3', reps: '8 per leg', restSec: 60 },
      { exerciseId: 'glute-bridge', sets: '3', reps: '12', restSec: 60 },
      { exerciseId: 'plank', sets: '3', reps: '30 s', restSec: 45 },
    ],
  },
  {
    id: 'glutes-hip-stability',
    name: 'Glutes & hip stability',
    subtitle: 'Keep the knee tracking straight',
    focus: 'Activation and single-leg control for the hips.',
    durationMin: '15–20',
    level: 'beginner',
    equipment: ['band', 'mat'],
    when: ['anytime', 'rest-day'],
    steps: [
      { exerciseId: 'clamshells', sets: '3', reps: '15 per side', restSec: 30 },
      { exerciseId: 'banded-lateral-walks', sets: '3', reps: '10 each way', restSec: 45 },
      { exerciseId: 'fire-hydrants', sets: '3', reps: '12 per side', restSec: 30 },
      { exerciseId: 'glute-bridge', sets: '3', reps: '12', restSec: 60 },
      { exerciseId: 'single-leg-balance', sets: '2', reps: '30 s per leg', restSec: 30 },
    ],
  },
  {
    id: 'core-stability',
    name: 'Core stability',
    subtitle: 'Posture that lasts the whole run',
    focus: 'Bracing and anti-rotation without crunching your way through it.',
    durationMin: '15–20',
    level: 'intermediate',
    equipment: ['mat', 'band', 'dumbbells'],
    when: ['anytime', 'rest-day'],
    steps: [
      { exerciseId: 'dead-bug', sets: '3', reps: '10 per side', restSec: 45 },
      { exerciseId: 'bird-dog', sets: '3', reps: '10 per side', restSec: 45 },
      { exerciseId: 'side-plank', sets: '2', reps: '30 s per side', restSec: 45 },
      { exerciseId: 'pallof-press', sets: '3', reps: '10 per side', restSec: 45 },
      { exerciseId: 'suitcase-carry', sets: '3', reps: '25 m per side', restSec: 60 },
    ],
  },
  {
    id: 'trail-preparation',
    name: 'Trail preparation',
    subtitle: 'Climb strong, descend with control',
    focus: 'Step strength, eccentric control and carrying work for the trails.',
    durationMin: '20–30',
    level: 'intermediate',
    equipment: ['box', 'dumbbells'],
    when: ['gym', 'rest-day'],
    steps: [
      { exerciseId: 'weighted-step-ups', sets: '3', reps: '8 per leg', restSec: 90 },
      { exerciseId: 'step-downs', sets: '3', reps: '8 per leg', restSec: 60 },
      { exerciseId: 'lateral-step-downs', sets: '3', reps: '8 per side', restSec: 60 },
      { exerciseId: 'eccentric-calf-raises', sets: '3', reps: '10 per leg', restSec: 60 },
      { exerciseId: 'single-leg-squats', sets: '3', reps: '4 per leg', restSec: 90 },
      { exerciseId: 'farmers-carry', sets: '3', reps: '30 m', restSec: 60 },
    ],
  },
  {
    id: 'race-day-warmup',
    name: 'Race day warm-up',
    subtitle: 'Arrive at the start line sharp',
    focus: 'Short, progressive and finished minutes before the gun.',
    durationMin: '15–20',
    level: 'intermediate',
    equipment: ['none'],
    when: ['pre-race'],
    steps: [
      { exerciseId: 'easy-jog', sets: '1', reps: '8 min', restSec: 0 },
      { exerciseId: 'dynamic-hip-openers', sets: '1', reps: '6 per side', restSec: 0 },
      { exerciseId: 'a-skips', sets: '2', reps: '20 m', restSec: 30 },
      { exerciseId: 'high-knees', sets: '2', reps: '20 m', restSec: 30 },
      { exerciseId: 'butt-kicks', sets: '2', reps: '20 m', restSec: 30 },
      { exerciseId: 'strides', sets: '4', reps: '25 s', restSec: 60, note: 'Last one 5 minutes before the start.' },
    ],
  },
];

export const ROUTINE_BY_ID = Object.fromEntries(ROUTINES.map((routine) => [routine.id, routine])) as Record<
  string,
  Routine
>;

/** Rough total time for a routine, in minutes. */
export function routineMinutes(routine: Routine): number {
  const seconds = routine.steps.reduce((total, step) => {
    const reps = step.reps.match(/(\d+)\s*(min|minutes)/i);
    const minutes = reps ? Number(reps[1]) : 0;
    return total + minutes * 60 + step.restSec;
  }, 0);
  return Math.max(5, Math.round(seconds / 60));
}

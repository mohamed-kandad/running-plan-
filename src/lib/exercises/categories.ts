import type { Category, CategoryId } from './types';

/** The ten library categories, in the order the home screen shows them. */
export const CATEGORIES: Category[] = [
  {
    id: 'warmup',
    name: 'Warm-up',
    tagline: 'Before running',
    description:
      'Prepare muscles, joints and the nervous system before running. Dynamic, moving preparation — not static stretching.',
    icon: 'flash-outline',
    accent: '#FFB020',
    heroExerciseId: 'high-knees',
    groups: [
      { id: 'general-warmup', name: 'General warm-up', blurb: 'Raise your temperature and heart rate.' },
      { id: 'dynamic-mobility', name: 'Dynamic mobility', blurb: 'Take joints through their range while moving.' },
      { id: 'running-drills', name: 'Running drills', blurb: 'Wake up the coordination you use when you run.' },
      { id: 'pre-race', name: 'Pre-race activation', blurb: 'Sharp, short, and done minutes before the gun.' },
    ],
  },
  {
    id: 'cooldown',
    name: 'Cool-down',
    tagline: 'After running',
    description:
      'Gradually reduce activity and relax the muscles after running. Static holds, easy movement and breathing.',
    icon: 'leaf-outline',
    accent: '#4FD1C5',
    heroExerciseId: 'standing-calf-stretch',
    groups: [
      { id: 'immediate-recovery', name: 'Immediate recovery', blurb: 'The first five minutes after you stop.' },
      { id: 'static-stretch', name: 'Static stretching', blurb: 'Relaxed holds once you have cooled down.' },
      { id: 'breathing-relaxation', name: 'Breathing & relaxation', blurb: 'Bring the nervous system back down.' },
    ],
  },
  {
    id: 'foot-ankle',
    name: 'Foot & Ankle',
    tagline: 'Strength and control',
    description:
      'Improve foot strength, ankle stability and running control. The smallest muscles carry the biggest load.',
    icon: 'footsteps-outline',
    accent: '#64C8F5',
    heroExerciseId: 'tibialis-raises',
    groups: [
      { id: 'foot-strength', name: 'Foot & ankle strength', blurb: 'Build the spring and the brake.' },
      { id: 'foot-balance', name: 'Balance', blurb: 'Train the ankle to hold its line.' },
      { id: 'foot-band', name: 'Banded control', blurb: 'Target the small stabilisers with a band.' },
    ],
  },
  {
    id: 'strength',
    name: 'Strength',
    tagline: 'Legs and power',
    description:
      'Build strength for long-distance running and trail running. Squat, hinge, step and push — the movements running is made of.',
    icon: 'barbell-outline',
    accent: '#D4FF00',
    heroExerciseId: 'goblet-squat',
    groups: [
      { id: 'strength-lower', name: 'Lower body', blurb: 'Squats, lunges and steps.' },
      { id: 'strength-posterior', name: 'Posterior chain', blurb: 'Glutes, hamstrings and hips behind the stride.' },
      { id: 'strength-calves', name: 'Calves', blurb: 'The spring that returns energy every step.' },
    ],
  },
  {
    id: 'glutes-hips',
    name: 'Glutes & Hips',
    tagline: 'Stability and control',
    description:
      'Improve pelvic stability, hip strength and running mechanics so the knee tracks straight on every footstrike.',
    icon: 'body-outline',
    accent: '#B79CFF',
    heroExerciseId: 'clamshells',
    groups: [
      { id: 'hip-activation', name: 'Activation', blurb: 'Wake the glutes up before you load them.' },
      { id: 'hip-stability', name: 'Stability', blurb: 'Hold the pelvis level on one leg.' },
    ],
  },
  {
    id: 'core',
    name: 'Core & Stability',
    tagline: 'Posture under fatigue',
    description:
      'Maintain good posture and control during long runs. Bracing, anti-rotation and carrying work.',
    icon: 'shield-checkmark-outline',
    accent: '#5B8DEF',
    heroExerciseId: 'plank',
    groups: [
      { id: 'core-extension', name: 'Anti-extension', blurb: 'Stop the hips from sagging.' },
      { id: 'core-rotation', name: 'Anti-rotation', blurb: 'Resist the twist a stride creates.' },
      { id: 'core-dynamic', name: 'Dynamic core', blurb: 'Brace while the legs move.' },
    ],
  },
  {
    id: 'mobility',
    name: 'Mobility',
    tagline: 'Range and quality',
    description:
      'Improve joint mobility and movement quality. Controlled ranges for hips, spine and ankles.',
    icon: 'accessibility-outline',
    accent: '#46DE9B',
    heroExerciseId: '90-90-hip',
    groups: [
      { id: 'mobility-hips', name: 'Hips', blurb: 'Rotation and extension you need to stride.' },
      { id: 'mobility-spine', name: 'Spine', blurb: 'Rotation and extension that keeps you tall.' },
      { id: 'mobility-ankles', name: 'Ankles', blurb: 'Dorsiflexion for a full, quiet footstrike.' },
    ],
  },
  {
    id: 'drills',
    name: 'Running Drills',
    tagline: 'Technique and cadence',
    description:
      'Improve running coordination, cadence and movement efficiency with short, precise drills.',
    icon: 'speedometer-outline',
    accent: '#F5A052',
    heroExerciseId: 'a-skips',
    groups: [
      { id: 'drill-cadence', name: 'Cadence', blurb: 'Quick, quiet steps.' },
      { id: 'drill-coordination', name: 'Coordination', blurb: 'Left and right working together.' },
    ],
  },
  {
    id: 'trail',
    name: 'Trail Preparation',
    tagline: 'Terrain and climbs',
    description:
      'Prepare for uneven terrain, climbing and descending. Strength and practice for the trail, where the ground does not help you.',
    icon: 'trail-sign-outline',
    accent: '#C9F94B',
    heroExerciseId: 'step-ups',
    groups: [
      { id: 'trail-climbing', name: 'Climbing', blurb: 'Power up, one step at a time.' },
      { id: 'trail-descending', name: 'Descending', blurb: 'Control the way down — that is where legs suffer.' },
      { id: 'trail-strength', name: 'Trail strength', blurb: 'Carry, balance and stabilise.' },
    ],
  },
  {
    id: 'recovery',
    name: 'Recovery',
    tagline: 'Rest and reset',
    description:
      'Support recovery after hard sessions and races. Gentle movement, foam rolling and breathing — nothing aggressive.',
    icon: 'moon-outline',
    accent: '#8D9AA4',
    heroExerciseId: 'foam-roll-quads',
    groups: [
      { id: 'recovery-breathing', name: 'Breathing', blurb: 'Downshift after the effort.' },
      { id: 'recovery-rolling', name: 'Foam rolling', blurb: 'Slow pressure, never pain.' },
      { id: 'recovery-gentle', name: 'Gentle mobility', blurb: 'Easy range that helps you feel better.' },
    ],
  },
];

export const CATEGORY_BY_ID = Object.fromEntries(CATEGORIES.map((c) => [c.id, c])) as Record<
  CategoryId,
  Category
>;

/** Every group, keyed by its id, so an exercise can name one group string. */
export const GROUP_LABELS = Object.fromEntries(
  CATEGORIES.flatMap((category) => category.groups.map((group) => [group.id, group.name]))
) as Record<string, string>;

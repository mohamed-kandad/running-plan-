import type { Muscle, MuscleId } from './types';

/** The muscles the library names, in the order the reference screen shows them. */
export const MUSCLES: Muscle[] = [
  {
    id: 'quadriceps',
    name: 'Quadriceps',
    view: 'front',
    role: 'Front of the thigh',
    description:
      'Four muscles that straighten the knee and control how much the knee bends on landing. They take the brunt of downhill running and fast intervals.',
  },
  {
    id: 'hamstrings',
    name: 'Hamstrings',
    view: 'back',
    role: 'Back of the thigh',
    description:
      'Bend the knee and extend the hip. They work hardest as you push off and when you lengthen your stride, which is why they strain when they are undertrained.',
  },
  {
    id: 'glutes',
    name: 'Glutes',
    view: 'back',
    role: 'Hips and buttocks',
    description:
      'The engine of the stride. Gluteus maximus drives hip extension; the smaller glute muscles keep the pelvis level so the knee tracks straight.',
  },
  {
    id: 'calves',
    name: 'Calves',
    view: 'back',
    role: 'Back of the lower leg',
    description:
      'The gastrocnemius and friends push you off the ground and absorb the first impact of every step. They are your spring and your brake.',
  },
  {
    id: 'soleus',
    name: 'Soleus',
    view: 'back',
    role: 'Deep calf muscle',
    description:
      'Sits under the calf and works hardest when the knee is bent. It is a huge consumer of oxygen on long climbs and a common site of tightness.',
  },
  {
    id: 'tibialis',
    name: 'Tibialis anterior',
    view: 'front',
    role: 'Front of the shin',
    description:
      'Lifts the toes and controls how the foot lowers after landing. A weak tibialis is linked with shin soreness and a heavy, slapping foot strike.',
  },
  {
    id: 'hip-flexors',
    name: 'Hip flexors',
    view: 'front',
    role: 'Front of the hip',
    description:
      'The psoas and iliacus lift the knee and swing the leg forward. Sitting all day shortens them, which pulls the pelvis out of position when you run.',
  },
  {
    id: 'adductors',
    name: 'Adductors',
    view: 'front',
    role: 'Inner thigh',
    description:
      'Pull the leg toward the midline and steady the pelvis on one leg. They do far more work in running than most runners give them credit for.',
  },
  {
    id: 'abductors',
    name: 'Abductors',
    view: 'back',
    role: 'Outer hip',
    description:
      'Gluteus medius and minimus move the leg away from the body and stop the hip from collapsing inward on every footstrike.',
  },
  {
    id: 'core',
    name: 'Core',
    view: 'front',
    role: 'Trunk and abdomen',
    description:
      'Transversus abdominis and friends brace the trunk so your arms and legs have something stable to work from over a long run.',
  },
  {
    id: 'obliques',
    name: 'Obliques',
    view: 'front',
    role: 'Sides of the trunk',
    description:
      'Rotate and side-bend the trunk, and resist rotation when the opposite leg swings. They keep your upper body from twisting against your stride.',
  },
  {
    id: 'back',
    name: 'Back',
    view: 'back',
    role: 'Erector spinae and mid-back',
    description:
      'Holds you tall when fatigue sets in. A back that fades late in a race turns into slumped shoulders and a shorter, slower stride.',
  },
  {
    id: 'shoulders',
    name: 'Shoulders',
    view: 'front',
    role: 'Deltoids and shoulder girdle',
    description:
      'Set the arm swing and keep the shoulders relaxed. Tight shoulders waste energy and creep up toward the ears when you are tired.',
  },
];

export const MUSCLE_BY_ID = Object.fromEntries(MUSCLES.map((m) => [m.id, m])) as Record<
  MuscleId,
  Muscle
>;

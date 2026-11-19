import type { Zone } from './types';

export const ZONE_META: {
  name: string;
  short: string;
  color: string;
  feel: string;
  purpose: string;
  pct: [number, number];
}[] = [
  {
    name: 'Recovery',
    short: 'Z1',
    color: '#8D9AA4',
    feel: 'Barely working. Full sentences, nose breathing.',
    purpose: 'Flush the legs, add aerobic volume with almost no cost.',
    pct: [50, 60],
  },
  {
    name: 'Endurance',
    short: 'Z2',
    color: '#46DE9B',
    feel: 'Easy and chatty. You can talk in full sentences.',
    purpose: 'Where 80% of your running should live. Builds the engine.',
    pct: [60, 70],
  },
  {
    name: 'Tempo',
    short: 'Z3',
    color: '#C9F94B',
    feel: 'Comfortably hard. Short sentences only.',
    purpose: 'Raises the pace you can hold before lactate climbs.',
    pct: [70, 80],
  },
  {
    name: 'Threshold',
    short: 'Z4',
    color: '#FF9F5A',
    feel: 'Hard. A few words at a time, focused effort.',
    purpose: 'Sharpens speed endurance for races and intervals.',
    pct: [80, 90],
  },
  {
    name: 'VO2 max',
    short: 'Z5',
    color: '#D4FF00',
    feel: 'All out. No talking, short repeats only.',
    purpose: 'Raises your ceiling. Used sparingly, near race day.',
    pct: [90, 100],
  },
];

/** Zones as percentages of max heart rate. */
export function zonesFromMaxHr(maxHr: number): Zone[] {
  return ZONE_META.map((meta, index) => ({
    id: index + 1,
    min: Math.round((maxHr * meta.pct[0]) / 100),
    max: Math.round((maxHr * meta.pct[1]) / 100),
  }));
}

export function zoneColor(id: number): string {
  return ZONE_META[id - 1]?.color ?? '#8D9AA4';
}

export function zoneName(id: number): string {
  return ZONE_META[id - 1]?.name ?? `Zone ${id}`;
}

/**
 * Move one edge of a zone by `delta` bpm while keeping the stack contiguous:
 * a min edge drags the previous zone's max with it, a max edge drags the next min.
 */
export function adjustZone(zones: Zone[], id: number, edge: 'min' | 'max', delta: number): Zone[] {
  const index = zones.findIndex((z) => z.id === id);
  if (index === -1) return zones;
  const next = zones.map((z) => ({ ...z }));
  const zone = next[index];

  if (edge === 'min') {
    const floor = index === 0 ? 30 : next[index - 1].min + 5;
    const value = Math.min(Math.max(zone.min + delta, floor), zone.max - 5);
    zone.min = value;
    if (index > 0) next[index - 1].max = value;
  } else {
    const ceiling = index === next.length - 1 ? 230 : next[index + 1].max - 5;
    const value = Math.max(Math.min(zone.max + delta, ceiling), zone.min + 5);
    zone.max = value;
    if (index < next.length - 1) next[index + 1].min = value;
  }

  return next;
}

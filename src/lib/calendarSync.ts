import { Platform } from 'react-native';

import { addDays, diffDays, formatPace, fromISO, toISO, todayISO } from './date';
import { paceTarget, zoneForType } from './plan';
import type { PlanSettings, RunLog, Workout, WorkoutType } from './types';

type CalendarModule = typeof import('expo-calendar/legacy');
type LegacyCalendar = Awaited<ReturnType<CalendarModule['getCalendarsAsync']>>[number];

const RUN_KEYWORDS = ['run', 'tempo', 'interval', 'long', 'recovery', 'stride', 'jog', 'race'];

export function calendarSupported(): boolean {
  return true;
}

/** expo-calendar legacy is a native module, so it is dynamically loaded off web. */
async function loadCalendar(): Promise<CalendarModule | null> {
  if (Platform.OS === 'web') return null;
  return import('expo-calendar/legacy');
}

async function requestAccess(Calendar: CalendarModule) {
  const permission = await Calendar.requestCalendarPermissionsAsync();
  if (permission.status !== 'granted') {
    throw new Error('Calendar permission was not granted. Enable it in Settings to sync.');
  }
}

async function writableCalendar(Calendar: CalendarModule): Promise<LegacyCalendar> {
  if (Platform.OS === 'ios') {
    try {
      const defaultCalendar = await Calendar.getDefaultCalendarAsync();
      if (defaultCalendar && defaultCalendar.allowsModifications) {
        return defaultCalendar;
      }
    } catch {
      // Fallback to getCalendarsAsync below
    }
  }
  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  const writable =
    calendars.find((calendar) => calendar.allowsModifications && calendar.isPrimary) ||
    calendars.find((calendar) => calendar.allowsModifications);
  if (!writable) throw new Error('No writable calendar was found on this device.');
  return writable;
}

export interface CalendarExportResult {
  created: number;
  updated: number;
  eventIds: Record<string, string>;
}

function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\r?\n/g, '\\n');
}

export function exportPlanToIcs(plan: Workout[], settings: PlanSettings): string {
  const today = todayISO();
  const upcoming = plan.filter((w) => w.date >= today);
  const nowStamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');

  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Stride//Running Plan//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'X-WR-CALNAME:Stride Running Plan',
  ];

  for (const workout of upcoming) {
    const dateStr = workout.date.replace(/-/g, '');
    const dtStart = `${dateStr}T070000`;
    const dtEnd = `${dateStr}T080000`;
    const title = `${workout.title} · ${workout.distanceKm} km`;
    const targetPace = paceTarget(workout.type, settings.level);
    const description = `${workout.detail}\n\nTarget pace ${targetPace} /km · Zone ${workout.zone}\nImported from Stride`;

    lines.push(
      'BEGIN:VEVENT',
      `UID:stride-${workout.id}-${dateStr}@stride.app`,
      `DTSTAMP:${nowStamp}`,
      `DTSTART:${dtStart}`,
      `DTEND:${dtEnd}`,
      `SUMMARY:${escapeIcsText(title)}`,
      `DESCRIPTION:${escapeIcsText(description)}`,
      'STATUS:CONFIRMED',
      'BEGIN:VALARM',
      'TRIGGER:-PT30M',
      'ACTION:DISPLAY',
      'DESCRIPTION:Reminder',
      'END:VALARM',
      'END:VEVENT'
    );
  }

  lines.push('END:VCALENDAR');
  return lines.join('\r\n');
}

function downloadWebIcs(icsData: string, filename: string): void {
  if (typeof document === 'undefined') return;
  const blob = new Blob([icsData], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

/**
 * Mirrors the plan into the device calendar (or downloads .ics on web). Sessions that already
 * have an event are updated in place (so renaming or re-scheduling the plan never leaves stale events),
 * and events deleted on the device are recreated.
 */
export async function addPlanToCalendar(
  plan: Workout[],
  settings: PlanSettings,
  existingEventIds: Record<string, string>
): Promise<CalendarExportResult> {
  const today = todayISO();
  const upcoming = plan.filter((w) => w.date >= today);

  if (Platform.OS === 'web') {
    if (upcoming.length === 0) {
      return { created: 0, updated: 0, eventIds: {} };
    }
    const icsData = exportPlanToIcs(plan, settings);
    downloadWebIcs(icsData, `stride-${settings.goal.toLowerCase()}-plan.ics`);
    return { created: upcoming.length, updated: 0, eventIds: {} };
  }

  const Calendar = await loadCalendar();
  if (!Calendar) throw new Error('Calendar sync needs the iOS or Android app.');
  await requestAccess(Calendar);
  const calendar = await writableCalendar(Calendar);

  const eventIds: Record<string, string> = {};
  let created = 0;
  let updated = 0;

  for (const workout of upcoming) {
    const startDate = fromISO(workout.date);
    startDate.setHours(7, 0, 0, 0);
    const endDate = new Date(startDate.getTime() + 60 * 60 * 1000);

    const details = {
      title: `${workout.title} · ${workout.distanceKm} km`,
      startDate,
      endDate,
      allDay: false,
      notes: `${workout.detail}\n\nTarget pace ${paceTarget(workout.type, settings.level)} /km · Zone ${workout.zone}\nImported from Stride`,
      alarms: [{ relativeOffset: -30 }],
      timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    };

    const existingId = existingEventIds[workout.id];
    if (existingId) {
      try {
        await Calendar.updateEventAsync(existingId, details);
        eventIds[workout.id] = existingId;
        updated += 1;
        continue;
      } catch {
        // Event was deleted in the Calendar app — fall through and create it again.
      }
    }

    const eventId = await Calendar.createEventAsync(calendar.id, details);
    eventIds[workout.id] = eventId;
    created += 1;
  }

  return { created, updated, eventIds };
}

export interface CalendarSessionImport {
  workout: Workout;
  durationSec: number;
  distanceKm: number;
}

/** Result of reading the calendar: plan sessions that ran, plus runs that weren't planned. */
export interface CalendarImport {
  sessions: CalendarSessionImport[];
  extraRuns: RunLog[];
}

export interface CalendarEventLike {
  title?: string | null;
  startDate: string | Date;
  endDate: string | Date;
  allDay?: boolean;
}

/** Pace assumed for a run that only has a calendar duration (minutes per km). */
const ESTIMATED_PACE_SEC_PER_KM = 360;

const eventDurationSec = (event: CalendarEventLike): number => {
  const startMs = new Date(event.startDate).getTime();
  const endMs = new Date(event.endDate).getTime();
  const raw = Math.round((endMs - startMs) / 1000);
  return Number.isFinite(raw) && raw > 0 ? Math.min(6 * 3600, Math.max(10 * 60, raw)) : 0;
};

/**
 * Pure matching step of the calendar import. Planned sessions whose day has a matching
 * training event come back as sessions to mark complete; training events on days with no
 * planned session come back as extra runs (distance estimated from the event length).
 */
export function matchCalendarEvents(
  plan: Workout[],
  runs: RunLog[],
  events: CalendarEventLike[],
  today = todayISO()
): CalendarImport {
  const logged = new Set(runs.map((run) => run.workoutId).filter(Boolean));
  const byDate = new Map(plan.map((workout) => [workout.date, workout]));
  const matches = new Map<string, CalendarSessionImport>();
  const extraRuns: RunLog[] = [];
  const extraKeys = new Set<string>();

  for (const event of events) {
    const date = toISO(new Date(event.startDate));
    const workout = byDate.get(date);
    const title = `${event.title ?? ''}`.trim();
    const lower = title.toLowerCase();
    const looksLikeTraining = RUN_KEYWORDS.some((keyword) => lower.includes(keyword));

    if (workout) {
      if (logged.has(workout.id) || matches.has(workout.id)) continue;
      if (!looksLikeTraining && !lower.includes(workout.title.toLowerCase())) continue;

      const durationSec = event.allDay
        ? Math.round(workout.distanceKm * ESTIMATED_PACE_SEC_PER_KM)
        : eventDurationSec(event) || Math.round(workout.distanceKm * ESTIMATED_PACE_SEC_PER_KM);

      matches.set(workout.id, { workout, durationSec, distanceKm: workout.distanceKm });
      continue;
    }

    // No session planned that day: treat a completed training event as an unplanned run.
    if (date > today || event.allDay || !looksLikeTraining) continue;
    const durationSec = eventDurationSec(event);
    if (!durationSec) continue;

    const distanceKm = Math.round((durationSec / ESTIMATED_PACE_SEC_PER_KM) * 10) / 10;
    const key = `${date}|${durationSec}`;
    if (extraKeys.has(key)) continue;
    extraKeys.add(key);

    extraRuns.push({
      id: `cal-${date}-${durationSec}`,
      date,
      distanceKm,
      durationSec,
      notes: title ? `From Calendar · ${title}` : 'From Calendar',
    });
  }

  return { sessions: Array.from(matches.values()), extraRuns };
}

const DEFAULT_TITLES: Record<WorkoutType, string> = {
  easy: 'Easy run',
  tempo: 'Tempo run',
  intervals: 'Intervals',
  long: 'Long run',
  recovery: 'Recovery jog',
  race: 'Race day',
};

/** Infers a session type from the event title, so imported workouts keep their meaning. */
function typeFromTitle(title: string): WorkoutType {
  const text = title.toLowerCase();
  if (/interval|\breps?\b|track|fartlek|stride/.test(text)) return 'intervals';
  if (/tempo|threshold|cruise/.test(text)) return 'tempo';
  if (/long|endurance/.test(text)) return 'long';
  if (/recovery|shakeout/.test(text)) return 'recovery';
  if (/race|parkrun/.test(text)) return 'race';
  return 'easy';
}

/**
 * Turns upcoming training events in the calendar into plan sessions. Each event becomes one
 * workout on its day, with the distance estimated from its length (0.6 km per 10 min).
 */
export function planFromCalendarEvents(
  events: CalendarEventLike[],
  today = todayISO()
): Workout[] {
  const byDate = new Map<string, Workout>();

  for (const event of events) {
    const date = toISO(new Date(event.startDate));
    if (date < today || event.allDay || byDate.has(date)) continue;

    const title = `${event.title ?? ''}`.trim();
    const lower = title.toLowerCase();
    if (!RUN_KEYWORDS.some((keyword) => lower.includes(keyword))) continue;

    const type = typeFromTitle(lower);
    const durationSec = eventDurationSec(event) || 45 * 60;
    const distanceKm =
      Math.round(Math.min(80, Math.max(0.5, durationSec / ESTIMATED_PACE_SEC_PER_KM)) * 10) / 10;

    byDate.set(date, {
      id: `${date}-${type}`,
      date,
      week: 0,
      type,
      title: title || DEFAULT_TITLES[type],
      detail: title ? `Imported from Calendar — ${title}.` : 'Imported from Calendar.',
      distanceKm,
      zone: zoneForType(type),
    });
  }

  const workouts = Array.from(byDate.values()).sort((a, b) => a.date.localeCompare(b.date));
  const first = workouts[0]?.date;
  return workouts.map((workout) => ({
    ...workout,
    week: first ? Math.floor(diffDays(first, workout.date) / 7) + 1 : 1,
  }));
}

export interface CalendarPlanImport {
  workouts: Workout[];
  runs: RunLog[];
}

/**
 * Builds a plan from the training sessions already in the device calendar: upcoming events
 * become workouts, past ones become logged runs. This is the only calendar way to create a plan.
 */
export async function importPlanFromCalendar(): Promise<CalendarPlanImport> {
  if (Platform.OS === 'web') {
    throw new Error(
      'Reading device calendars is only supported on iOS and Android. On web, import your plan from Excel.'
    );
  }

  const Calendar = await loadCalendar();
  if (!Calendar) throw new Error('Calendar import needs the iOS or Android app.');
  await requestAccess(Calendar);

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (calendars.length === 0) throw new Error('No calendars are available to read.');

  const start = fromISO(addDays(todayISO(), -28));
  start.setHours(0, 0, 0, 0);
  const end = fromISO(addDays(todayISO(), 84));
  end.setHours(23, 59, 59, 999);

  const events = await Calendar.getEventsAsync(
    calendars.map((calendar) => calendar.id),
    start,
    end
  );

  const { extraRuns } = matchCalendarEvents([], [], events);
  return { workouts: planFromCalendarEvents(events), runs: extraRuns };
}

/**
 * Reads the device calendar across the plan (and a fortnight either side) and returns
 * plan sessions that ran plus training runs that were never in the plan.
 */
export async function importRunsFromCalendar(
  plan: Workout[],
  runs: RunLog[]
): Promise<CalendarImport> {
  if (Platform.OS === 'web') {
    throw new Error(
      'Reading device calendars is only supported on iOS and Android. On web, import runs via Excel.'
    );
  }

  const Calendar = await loadCalendar();
  if (!Calendar) throw new Error('Calendar sync needs the iOS or Android app.');
  await requestAccess(Calendar);

  const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
  if (calendars.length === 0) throw new Error('No calendars are available to read.');

  const first = plan.length > 0 ? plan[0].date : todayISO();
  const last = plan.length > 0 ? plan[plan.length - 1].date : todayISO();
  const start = fromISO(addDays(first, -14));
  start.setHours(0, 0, 0, 0);
  const end = fromISO(addDays(last, 14));
  end.setHours(23, 59, 59, 999);

  const events = await Calendar.getEventsAsync(
    calendars.map((calendar) => calendar.id),
    start,
    end
  );

  return matchCalendarEvents(plan, runs, events);
}

/** Human-readable summary used in the sync status line. */
export function describeExport(result: CalendarExportResult): string {
  if (Platform.OS === 'web') {
    return result.created > 0
      ? `Downloaded calendar file (${result.created} session${result.created === 1 ? '' : 's'}). Open it to import into your calendar.`
      : 'No upcoming sessions to export.';
  }
  if (result.created === 0 && result.updated === 0) return 'No upcoming sessions to sync.';
  if (result.created === 0) {
    return `${result.updated} session${result.updated === 1 ? '' : 's'} updated in your calendar.`;
  }
  const parts = [`${result.created} added`];
  if (result.updated > 0) parts.push(`${result.updated} updated`);
  return `Calendar sync: ${parts.join(', ')}.`;
}

/** Human-readable summary of a calendar import. */
export function describeImport(result: CalendarImport): string {
  const parts: string[] = [];
  if (result.sessions.length) {
    parts.push(`${result.sessions.length} session${result.sessions.length === 1 ? '' : 's'} completed`);
  }
  if (result.extraRuns.length) {
    parts.push(`${result.extraRuns.length} extra run${result.extraRuns.length === 1 ? '' : 's'} logged`);
  }
  if (parts.length === 0) return 'No matching sessions found in your calendar.';
  return `From Calendar: ${parts.join(' + ')}.`;
}

/** Suggested pace string for an imported run, used in the success message. */
export function importedPace(durationSec: number, distanceKm: number): string {
  return distanceKm > 0 ? `${formatPace(durationSec / distanceKm)} /km` : '';
}

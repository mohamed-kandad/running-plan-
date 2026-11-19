import { useEffect } from 'react';
import { Platform } from 'react-native';

import { addDays, todayISO } from './date';
import type { Workout } from './types';
import { useApp } from '@/store/AppStore';

/** Morning nudge before the run, evening nudge if it still isn't logged. */
export const MORNING_HOUR = 7;
export const EVENING_HOUR = 19;

/** How many days of reminders are scheduled ahead; the app re-syncs on every launch. */
const DAYS_AHEAD = 7;
const REMINDER_KIND = 'workout-reminder';
const CHANNEL_ID = 'workout-reminders';
const ACCENT = '#D4FF00';

type NotificationsModule = typeof import('expo-notifications');

let modulePromise: Promise<NotificationsModule | null> | null = null;

/** expo-notifications has no web implementation, so it is only loaded on mobile. */
function loadNotifications(): Promise<NotificationsModule | null> {
  if (Platform.OS === 'web') return Promise.resolve(null);
  if (!modulePromise) {
    modulePromise = import('expo-notifications').then((Notifications) => {
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowBanner: true,
          shouldShowList: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });
      return Notifications;
    });
  }
  return modulePromise;
}

export interface PlannedReminder {
  workout: Workout;
  at: Date;
  evening: boolean;
}

function reminderDate(iso: string, hour: number): Date {
  const [year, month, day] = iso.split('-').map(Number);
  return new Date(year, month - 1, day, hour, 0, 0, 0);
}

/**
 * The reminders that should be pending right now: a morning and an evening nudge for every
 * upcoming training day whose workout hasn't been logged yet, skipping times already past.
 */
export function upcomingReminders(
  plan: Workout[],
  completedIds: Set<string>,
  today = todayISO(),
  now = new Date()
): PlannedReminder[] {
  const byDate = new Map(plan.map((workout) => [workout.date, workout]));
  const reminders: PlannedReminder[] = [];

  for (let offset = 0; offset < DAYS_AHEAD; offset++) {
    const date = addDays(today, offset);
    const workout = byDate.get(date);
    if (!workout || completedIds.has(workout.id)) continue;

    for (const slot of [
      { hour: MORNING_HOUR, evening: false },
      { hour: EVENING_HOUR, evening: true },
    ]) {
      const at = reminderDate(date, slot.hour);
      if (at.getTime() > now.getTime()) {
        reminders.push({ workout, at, evening: slot.evening });
      }
    }
  }

  return reminders;
}

/** Replaces our own scheduled reminders with the ones that still make sense. */
export async function syncWorkoutReminders(
  plan: Workout[],
  completedIds: Set<string>
): Promise<void> {
  const Notifications = await loadNotifications();
  if (!Notifications) return;

  const scheduled = await Notifications.getAllScheduledNotificationsAsync();
  const ours = scheduled.filter((request) => request.content.data?.kind === REMINDER_KIND);
  await Promise.all(
    ours.map((request) => Notifications.cancelScheduledNotificationAsync(request.identifier))
  );

  // Nothing planned: the reminders are cleared above and we never ask for permission.
  if (plan.length === 0) return;

  const reminders = upcomingReminders(plan, completedIds);
  if (reminders.length === 0) return;

  const permission = await Notifications.getPermissionsAsync();
  if (!permission.granted) {
    if (!permission.canAskAgain) return;
    const asked = await Notifications.requestPermissionsAsync();
    if (!asked.granted) return;
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Workout reminders',
      importance: Notifications.AndroidImportance.DEFAULT,
    });
  }

  await Promise.all(
    reminders.map(({ workout, at, evening }) =>
      Notifications.scheduleNotificationAsync({
        content: {
          title: evening ? `Still time for ${workout.title}` : `Today: ${workout.title}`,
          body: evening
            ? `Your ${workout.distanceKm} km session isn't logged yet. Log it before the day ends.`
            : `${workout.distanceKm} km planned today. Log it in Stride when you're back.`,
          data: { kind: REMINDER_KIND, workoutId: workout.id, date: workout.date },
          color: ACCENT,
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: at,
          channelId: CHANNEL_ID,
        },
      })
    )
  );
}

/** Keeps the scheduled reminders in sync with the plan and with what has been logged. */
export function useWorkoutReminders(): void {
  const { plan, completedIds, ready } = useApp();

  useEffect(() => {
    if (!ready) return;
    syncWorkoutReminders(plan, completedIds).catch((error) =>
      console.warn('Failed to schedule workout reminders.', error)
    );
  }, [ready, plan, completedIds]);
}

import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  addDays,
  diffDays,
  formatShort,
  monthLabel,
  weekdayLetter,
} from '@/lib/date';
import { WORKOUT_TYPE_LABEL, typeColor } from '@/lib/workouts';
import type { Workout } from '@/lib/types';
import { colors, font, radius } from '@/theme';

/**
 * Shown on Home when the current Monday–Sunday block has no sessions: it says the
 * week is clear, points at the next planned session and offers a way forward.
 */
export function EmptyWeekCard({
  weekStart,
  today,
  nextSession,
  firstSessionDate,
  onAddWorkout,
  onOpenPlan,
  onOpenSession,
}: {
  weekStart: string;
  today: string;
  /** First session after this week, if the plan has one. */
  nextSession: Workout | null;
  /** Earliest session in the whole plan, used to tell "starts" from "resumes". */
  firstSessionDate: string | null;
  onAddWorkout: () => void;
  onOpenPlan: () => void;
  onOpenSession: (workout: Workout) => void;
}) {
  const weekEnd = addDays(weekStart, 6);
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const month = monthLabel(weekStart).split(' ')[0].slice(0, 3);
  const range = `${Number(weekStart.slice(8, 10))}–${Number(weekEnd.slice(8, 10))} ${month}`;

  const notStarted = firstSessionDate !== null && firstSessionDate > weekEnd;
  const title = nextSession
    ? notStarted
      ? `Your plan starts ${formatShort(nextSession.date)}`
      : `Next session ${formatShort(nextSession.date)}`
    : 'Nothing left on the calendar';

  const daysAway = nextSession ? diffDays(today, nextSession.date) : 0;
  const countdown = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;

  const body = nextSession
    ? `Week ${range} is wide open. The first session back is ${countdown}.`
    : `Week ${range} is wide open, and nothing is scheduled after it either. Add a session to get moving again.`;

  return (
    <View style={styles.card}>
      <View style={styles.head}>
        <View style={styles.icon}>
          <Ionicons name="moon-outline" size={16} color={colors.accent} />
        </View>
        <Text style={styles.overline}>NO SESSIONS · {range.toUpperCase()}</Text>
      </View>

      <Text style={styles.title}>{title}</Text>
      <Text style={styles.body}>{body}</Text>

      {/* The clear week, one hollow dot per day */}
      <View style={styles.dots}>
        {days.map((date) => {
          const isToday = date === today;
          return (
            <View key={date} style={styles.dotCol}>
              <View style={[styles.dot, isToday && styles.dotToday]} />
              <Text style={[styles.dotLabel, isToday && styles.dotLabelToday]}>
                {weekdayLetter(date)}
              </Text>
            </View>
          );
        })}
      </View>

      {nextSession ? (
        <Pressable
          onPress={() => onOpenSession(nextSession)}
          style={({ pressed }) => [styles.nextRow, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel={`Open next session, ${nextSession.title} on ${formatShort(nextSession.date)}`}
        >
          <View style={[styles.nextDot, { backgroundColor: typeColor(nextSession.type) }]} />
          <View style={styles.nextText}>
            <Text style={styles.nextTitle} numberOfLines={1}>
              {nextSession.title} · {nextSession.distanceKm} km
            </Text>
            <Text style={styles.nextMeta}>
              {formatShort(nextSession.date).toUpperCase()} · {WORKOUT_TYPE_LABEL[nextSession.type]}
            </Text>
          </View>
          <Ionicons name="chevron-forward" size={15} color={colors.muted} />
        </Pressable>
      ) : null}

      <View style={styles.actions}>
        <Pressable
          onPress={onAddWorkout}
          style={({ pressed }) => [styles.primaryBtn, pressed && { opacity: 0.9 }]}
          accessibilityRole="button"
          accessibilityLabel="Create a workout for this week"
        >
          <Ionicons name="add" size={16} color={colors.accentInk} />
          <Text style={styles.primaryText}>Create workout</Text>
        </Pressable>
        <Pressable
          onPress={onOpenPlan}
          style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
          accessibilityRole="button"
          accessibilityLabel="Open the week plan"
        >
          <Text style={styles.secondaryText}>Week plan</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 16,
    gap: 10,
  },
  head: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  icon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: {
    color: colors.muted,
    ...font.label,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 10,
    letterSpacing: 1,
  },
  title: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 22,
    letterSpacing: -0.5,
  },
  body: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  dots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 4,
  },
  dotCol: { alignItems: 'center', gap: 6, flex: 1 },
  dot: {
    width: 11,
    height: 11,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: colors.borderStrong,
  },
  dotToday: { borderColor: colors.accent, backgroundColor: colors.accentTintStrong },
  dotLabel: { color: colors.faint, fontSize: 9, fontWeight: '700', letterSpacing: 0.4 },
  dotLabelToday: { color: colors.accent },
  nextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  nextDot: { width: 6, height: 6, borderRadius: 3 },
  nextText: { flex: 1, gap: 2, minWidth: 0 },
  nextTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 13,
  },
  nextMeta: { color: colors.faint, ...font.mono, fontSize: 9 },
  actions: { flexDirection: 'row', gap: 8, marginTop: 2 },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 11,
  },
  primaryText: {
    color: colors.accentInk,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 13,
  },
  secondaryBtn: {
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryText: {
    color: colors.muted,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 13,
  },
});

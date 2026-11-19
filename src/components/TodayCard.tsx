import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { formatDuration, formatPace } from '@/lib/date';
import type { RunLog, Workout, WorkoutType } from '@/lib/types';
import { typeColor } from '@/lib/workouts';
import { colors, radius } from '@/theme';

export interface WorkoutStep {
  id: string;
  label: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
  badgeColor?: string;
}

export function parseWorkoutSteps(detail: string, type: WorkoutType): WorkoutStep[] {
  if (!detail || !detail.trim()) return [];

  const lower = detail.toLowerCase();

  if (lower.includes('warm-up') || lower.includes('warmup')) {
    const steps: WorkoutStep[] = [];
    const warmupMatch = detail.match(/(\d+\s*(?:min|mins|minutes)?\s*(?:easy\s*)?warm-?up)/i);
    const warmupText = warmupMatch ? warmupMatch[1] : 'Easy warm-up jog';
    steps.push({
      id: 'warmup',
      label: 'Warm-up',
      text: warmupText.replace(/,\s*then/i, '').trim(),
      icon: 'flame-outline',
    });

    const cooldownMatch = detail.match(/(\d+\s*(?:min|mins|minutes)?\s*(?:easy\s*)?cool-?down)/i);
    const cooldownText = cooldownMatch ? cooldownMatch[1] : 'Easy cool-down jog';

    let mainText = detail;
    if (warmupMatch) mainText = mainText.replace(warmupMatch[0], '');
    if (cooldownMatch) mainText = mainText.replace(cooldownMatch[0], '');
    mainText = mainText
      .replace(/^[\s,;—–-]+|[\s,;—–-]+$|-/g, '')
      .replace(/^then\s+/i, '')
      .trim();

    if (mainText) {
      steps.push({
        id: 'main',
        label: type === 'intervals' ? 'Intervals' : 'Main Set',
        text: mainText,
        icon: 'flash-outline',
      });
    }

    if (cooldownMatch) {
      steps.push({
        id: 'cooldown',
        label: 'Cool-down',
        text: cooldownText.trim(),
        icon: 'snow-outline',
      });
    }

    return steps;
  }

  if (type === 'easy') {
    return [
      { id: 'effort', label: 'Effort', text: 'Relaxed & conversational (Zone 2)', icon: 'heart-outline' },
      { id: 'finish', label: 'Finish', text: 'Finish with energy in reserve', icon: 'flag-outline' },
    ];
  }

  if (type === 'long') {
    return [
      { id: 'pace', label: 'Pacing', text: 'Steady aerobic effort throughout', icon: 'speedometer-outline' },
      { id: 'fuel', label: 'Fueling', text: 'Take water/gel every 30–40 min', icon: 'water-outline' },
    ];
  }

  if (type === 'recovery') {
    return [
      { id: 'shakeout', label: 'Shakeout', text: 'Very easy, short recovery jog', icon: 'walk-outline' },
    ];
  }

  if (type === 'race') {
    return [
      { id: 'start', label: 'Start', text: 'Controlled start, hold steady', icon: 'flag-outline' },
      { id: 'finish', label: 'Kick', text: 'Empty tank over final km', icon: 'flash-outline' },
    ];
  }

  return [
    { id: 'step-0', label: 'Workout', text: detail, icon: 'compass-outline' },
  ];
}

export function TodayCard({
  date,
  workout,
  phase,
  pace,
  hr,
  done,
  run,
  onLog,
  onPlan,
}: {
  date: string;
  workout: Workout | null;
  phase: string;
  pace: string;
  hr: string;
  done: boolean;
  run?: RunLog;
  onLog: () => void;
  onPlan: () => void;
}) {
  const accent = workout ? typeColor(workout.type) : colors.faint;
  const [fadeAnim] = useState(() => new Animated.Value(0));
  const [slideAnim] = useState(() => new Animated.Value(4));
  const [checkedByDate, setCheckedByDate] = useState<Record<string, Record<string, boolean>>>({});
  const dateChecks = checkedByDate[date] || {};

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, { toValue: 1, duration: 240, useNativeDriver: true }),
      Animated.spring(slideAnim, { toValue: 0, friction: 9, tension: 70, useNativeDriver: true }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  const steps = useMemo(
    () => (workout ? parseWorkoutSteps(workout.detail, workout.type) : []),
    [workout]
  );

  const toggleStep = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setCheckedByDate((prev) => ({
      ...prev,
      [date]: { ...prev[date], [id]: !prev[date]?.[id] },
    }));
  };

  return (
    <Animated.View
      style={[
        styles.card,
        { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
      ]}
    >
      <View style={styles.topRow}>
        <View style={styles.typeRow}>
          <View style={[styles.dot, { backgroundColor: accent }]} />
          <Text style={[styles.typeText, { color: accent }]}>
            {workout ? workout.type.toUpperCase() : 'REST DAY'}
          </Text>
          <Text style={styles.separator}>·</Text>
          <Text style={styles.phaseText}>{phase}</Text>
        </View>

        <View style={styles.actions}>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onLog();
            }}
            style={({ pressed }) => [styles.actionButton, done && styles.actionButtonDone, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <Ionicons
              name={done ? 'checkmark' : 'add'}
              size={13}
              color={done ? colors.green : colors.text}
            />
            <Text style={[styles.actionButtonText, done && { color: colors.green }]}>
              {done ? 'Logged' : 'Log Run'}
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
              onPlan();
            }}
            style={({ pressed }) => [styles.actionButton, pressed && { opacity: 0.7 }]}
            hitSlop={6}
          >
            <Ionicons name="calendar-outline" size={13} color={colors.muted} />
          </Pressable>
        </View>
      </View>

      <View style={styles.mainContent}>
        <View style={styles.titleArea}>
          <Text style={styles.title} numberOfLines={1}>
            {workout ? workout.title : 'Active Recovery & Rest'}
          </Text>
          {workout ? (
            <Text style={[styles.distanceVal, { color: accent }]}>
              {workout.distanceKm} km
            </Text>
          ) : null}
        </View>

        {workout ? (
          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Ionicons name="speedometer-outline" size={12} color={colors.muted} />
              <Text style={styles.metaText}>{pace} /km</Text>
            </View>
            <Text style={styles.metaDot}>•</Text>
            <View style={styles.metaItem}>
              <Ionicons name="heart-outline" size={12} color={colors.muted} />
              <Text style={styles.metaText}>Zone {workout.zone} ({hr})</Text>
            </View>
          </View>
        ) : (
          <Text style={styles.restSubtitle}>
            Rest allows muscles to repair and adapt. Light walking or mobility work is welcome.
          </Text>
        )}
      </View>

      {workout && steps.length > 0 ? (
        <View style={styles.checklist}>
          {steps.map((step: WorkoutStep) => {
            const isChecked = done || Boolean(dateChecks[step.id]);
            return (
              <Pressable
                key={step.id}
                onPress={() => toggleStep(step.id)}
                style={({ pressed }) => [
                  styles.checkRow,
                  isChecked && styles.checkRowDone,
                  pressed && { opacity: 0.75 },
                ]}
              >
                <View style={[styles.checkbox, isChecked && styles.checkboxDone]}>
                  {isChecked ? <Ionicons name="checkmark" size={10} color={colors.accentInk} /> : null}
                </View>
                <Text style={styles.stepLabel}>{step.label}:</Text>
                <Text style={[styles.stepText, isChecked && styles.stepTextDone]} numberOfLines={1}>
                  {step.text}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}

      {done && run ? (
        <View style={styles.loggedStrip}>
          <Ionicons name="checkmark-circle" size={13} color={colors.green} />
          <Text style={styles.loggedText} numberOfLines={1}>
            {`Completed: ${run.distanceKm} km in ${formatDuration(run.durationSec)} (${formatPace(
              run.durationSec / Math.max(run.distanceKm, 0.1)
            )} /km)`}
          </Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 14,
  },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typeText: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  separator: {
    color: colors.faint,
    fontSize: 11,
  },
  phaseText: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionButtonDone: {
    backgroundColor: `${colors.green}15`,
    borderColor: `${colors.green}35`,
  },
  actionButtonText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.text,
    letterSpacing: 0.2,
  },
  mainContent: {
    gap: 4,
  },
  titleArea: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    gap: 8,
  },
  title: {
    flex: 1,
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.4,
  },
  distanceVal: {
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 2,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '500',
  },
  metaDot: {
    color: colors.faint,
    fontSize: 12,
  },
  restSubtitle: {
    color: colors.muted,
    fontSize: 12,
    lineHeight: 17,
  },
  checklist: {
    gap: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 5,
  },
  checkRowDone: {
    opacity: 0.6,
  },
  checkbox: {
    width: 16,
    height: 16,
    borderRadius: 4,
    borderWidth: 1.5,
    borderColor: colors.faint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  stepLabel: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  stepText: {
    flex: 1,
    color: colors.text,
    fontSize: 12,
    fontWeight: '500',
  },
  stepTextDone: {
    textDecorationLine: 'line-through',
    color: colors.muted,
  },
  loggedStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: `${colors.green}12`,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.green}30`,
  },
  loggedText: {
    color: colors.green,
    fontSize: 11.5,
    fontWeight: '500',
  },
});

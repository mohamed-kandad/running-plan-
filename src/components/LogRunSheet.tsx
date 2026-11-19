import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatPace, formatShort } from '@/lib/date';
import { paceTarget } from '@/lib/plan';
import type { Workout, WorkoutType } from '@/lib/types';
import { typeColor } from '@/lib/workouts';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';
import { Sheet } from './Sheet';
import { Button } from './ui';

const FONT_BOLD = 'SpaceGrotesk-Bold';
const FONT_ITALIC = 'SpaceGrotesk-BoldItalic';

export interface RunInputValues {
  distanceKm: number;
  durationSec: number;
  avgHr?: number;
  effort?: number;
  notes?: string;
}

export interface WorkoutStep {
  id: string;
  label: string;
  text: string;
  icon: keyof typeof Ionicons.glyphMap;
}

function parseDetails(detail: string, type: WorkoutType): WorkoutStep[] {
  if (!detail || !detail.trim()) return [];
  const lower = detail.toLowerCase();

  if (lower.includes('warm-up') || lower.includes('warmup')) {
    const steps: WorkoutStep[] = [];
    const warmupMatch = detail.match(/(\d+\s*(?:min|mins|minutes)?\s*(?:easy\s*)?warm-?up)/i);
    if (warmupMatch) {
      steps.push({
        id: 'warmup',
        label: 'Warm-up',
        text: warmupMatch[1].replace(/,\s*then/i, '').trim(),
        icon: 'flame-outline',
      });
    }

    const cooldownMatch = detail.match(/(\d+\s*(?:min|mins|minutes)?\s*(?:easy\s*)?cool-?down)/i);
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
        label: type === 'intervals' ? 'Intervals' : 'Main set',
        text: mainText,
        icon: 'flash-outline',
      });
    }

    if (cooldownMatch) {
      steps.push({
        id: 'cooldown',
        label: 'Cool-down',
        text: cooldownMatch[1].trim(),
        icon: 'snow-outline',
      });
    }

    return steps.length > 0
      ? steps
      : [{ id: 'det', label: 'Brief', text: detail, icon: 'compass-outline' }];
  }

  return [{ id: 'det', label: 'Instruction', text: detail, icon: 'compass-outline' }];
}

export function LogRunSheet({
  workout,
  onClose,
  onSubmit,
}: {
  workout: Workout | null;
  onClose: () => void;
  onSubmit: (input: RunInputValues) => void;
}) {
  const { settings, zones } = useApp();
  const plannedKm = workout?.distanceKm ?? 5;

  const [km, setKm] = useState(`${plannedKm}`);
  const [minutes, setMinutes] = useState(`${Math.round(plannedKm * 6)}`);
  const [seconds, setSeconds] = useState('0');
  const [hr, setHr] = useState('');
  const [effort, setEffort] = useState<number | undefined>();
  const [notes, setNotes] = useState('');

  const distance = Number.parseFloat(km.replace(',', '.')) || 0;
  const durationSec =
    (Number.parseInt(minutes || '0', 10) || 0) * 60 +
    (Number.parseInt(seconds || '0', 10) || 0);
  const valid = distance > 0 && durationSec > 0;

  const accent = workout ? typeColor(workout.type) : colors.accent;
  const targetPace = workout ? paceTarget(workout.type, settings.level) : '—';
  const zone = workout ? zones[workout.zone - 1] : undefined;
  const hrRange = zone ? `${zone.min}–${zone.max} bpm` : '—';
  const steps = workout ? parseDetails(workout.detail, workout.type) : [];

  const submit = () => {
    if (!valid) return;
    onSubmit({
      distanceKm: Math.round(distance * 100) / 100,
      durationSec,
      avgHr: Number.parseInt(hr, 10) || undefined,
      effort,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Sheet
      visible={workout !== null}
      onClose={onClose}
      title={workout ? workout.title : 'Log run'}
      subtitle={
        workout
          ? `${formatShort(workout.date)} · ${workout.distanceKm} km planned`
          : undefined
      }
      footer={
        <Button
          label="Save completed run"
          onPress={submit}
          disabled={!valid}
          icon="checkmark"
        />
      }
    >
      {workout ? (
        <View style={styles.detailsContainer}>
          <View style={styles.workoutTopline}>
            <View style={[styles.typePill, { backgroundColor: `${accent}16`, borderColor: `${accent}45` }]}>
              <View style={[styles.typeDot, { backgroundColor: accent }]} />
              <Text style={[styles.typePillText, { color: accent }]}>
                {workout.type.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.plannedLabel}>TODAY&apos;S SESSION</Text>
          </View>

          <View style={styles.metricsRow}>
            <View style={styles.metric}>
              <Ionicons name="speedometer-outline" size={15} color={colors.accent} />
              <View style={styles.metricCopy}>
                <Text style={styles.metricLabel}>TARGET PACE</Text>
                <Text style={styles.metricValue}>{targetPace}<Text style={styles.metricUnit}> /km</Text></Text>
              </View>
            </View>
            <View style={styles.metricDivider} />
            <View style={styles.metric}>
              <Ionicons name="heart-outline" size={15} color={colors.accent} />
              <View style={styles.metricCopy}>
                <Text style={styles.metricLabel}>HEART RATE</Text>
                <Text style={styles.metricValue}>Z{workout.zone}<Text style={styles.metricUnit}> · {hrRange}</Text></Text>
              </View>
            </View>
          </View>

          <View style={styles.coachingCard}>
            <View style={styles.coachingHeader}>
              <View style={styles.coachingIcon}>
                <Ionicons name="sparkles-outline" size={15} color={colors.accentInk} />
              </View>
              <Text style={styles.coachingTitle}>THE PLAN</Text>
            </View>
            <Text style={styles.detailMainText}>{workout.detail}</Text>

            {steps.length > 0 ? (
              <View style={styles.stepsList}>
                {steps.map((step, index) => (
                  <View key={step.id} style={styles.stepRow}>
                    <View style={[styles.stepNumber, { borderColor: `${accent}55` }]}>
                      <Text style={[styles.stepNumberText, { color: accent }]}>{index + 1}</Text>
                    </View>
                    <View style={styles.stepContent}>
                      <Text style={[styles.stepLabel, { color: accent }]}>{step.label}</Text>
                      <Text style={styles.stepText}>{step.text}</Text>
                    </View>
                    <Ionicons name={step.icon} size={16} color={colors.faint} />
                  </View>
                ))}
              </View>
            ) : null}
          </View>
        </View>
      ) : null}

      <View style={styles.logSection}>
        <View style={styles.sectionHeading}>
          <View style={styles.headingMark} />
          <Text style={styles.sectionTitle}>YOUR RUN</Text>
          <Text style={styles.sectionHint}>ADD YOUR RESULTS</Text>
        </View>

        <View style={styles.primaryFields}>
          <Field label="DISTANCE" suffix="KM" featured>
            <TextInput
              value={km}
              onChangeText={setKm}
              keyboardType="decimal-pad"
              style={styles.featuredInput}
              placeholder="0.0"
              placeholderTextColor={colors.faint}
              selectTextOnFocus
            />
          </Field>
          <Field label="AVG HEART RATE" suffix="BPM">
            <TextInput
              value={hr}
              onChangeText={setHr}
              keyboardType="number-pad"
              style={styles.input}
              placeholder="—"
              placeholderTextColor={colors.faint}
              maxLength={3}
            />
          </Field>
        </View>

        <View style={styles.durationBlock}>
          <View style={styles.durationHeading}>
            <Text style={styles.label}>DURATION</Text>
            <Text style={styles.durationHint}>TOTAL TIME</Text>
          </View>
          <View style={styles.durationInputs}>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={minutes}
                onChangeText={setMinutes}
                keyboardType="number-pad"
                style={styles.timeInput}
                placeholder="00"
                placeholderTextColor={colors.faint}
                maxLength={4}
                selectTextOnFocus
              />
              <Text style={styles.timeUnit}>MIN</Text>
            </View>
            <Text style={styles.timeColon}>:</Text>
            <View style={styles.timeInputWrap}>
              <TextInput
                value={seconds}
                onChangeText={setSeconds}
                keyboardType="number-pad"
                style={styles.timeInput}
                placeholder="00"
                placeholderTextColor={colors.faint}
                maxLength={2}
                selectTextOnFocus
              />
              <Text style={styles.timeUnit}>SEC</Text>
            </View>
          </View>
        </View>

        <View style={styles.paceResult}>
          <View style={styles.paceIcon}>
            <Ionicons name="timer-outline" size={16} color={colors.accentInk} />
          </View>
          <View style={styles.paceCopy}>
            <Text style={styles.paceLabel}>AVERAGE PACE</Text>
            <Text style={styles.paceValue}>
              {valid ? `${formatPace(durationSec / distance)} /km` : '—:— /km'}
            </Text>
          </View>
          <Text style={styles.paceLive}>LIVE</Text>
        </View>
        {!valid ? (
          <Text style={styles.helper}>Enter your distance and duration to calculate pace.</Text>
        ) : null}

        <View style={styles.effortSection}>
          <View style={styles.fieldHeading}>
            <Text style={styles.label}>HOW HARD DID IT FEEL?</Text>
            <Text style={styles.durationHint}>EFFORT · 1–10</Text>
          </View>
          <View style={styles.effortButtons}>
            {[2, 4, 6, 8, 10].map((n) => {
              const active = effort === n;
              return (
                <Pressable
                  key={n}
                  onPress={() => setEffort(active ? undefined : n)}
                  style={({ pressed }) => [
                    styles.effortButton,
                    active && styles.effortActive,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.effortText, active && styles.effortTextActive]}>{n}</Text>
                </Pressable>
              );
            })}
          </View>
          <View style={styles.effortScale}>
            <Text style={styles.scaleText}>EASY</Text>
            <Text style={styles.scaleText}>ALL OUT</Text>
          </View>
        </View>

        <Field label="RUN NOTES" suffix="OPTIONAL">
          <TextInput
            value={notes}
            onChangeText={setNotes}
            style={[styles.input, styles.notes]}
            placeholder="Legs, weather, energy, how it felt..."
            placeholderTextColor={colors.faint}
            multiline
          />
        </Field>
      </View>
    </Sheet>
  );
}

function Field({
  label,
  suffix,
  featured,
  children,
}: {
  label: string;
  suffix?: string;
  featured?: boolean;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.field}>
      <View style={styles.labelRow}>
        <Text style={styles.label}>{label}</Text>
        {suffix ? <Text style={styles.suffix}>{suffix}</Text> : null}
      </View>
      <View style={featured ? styles.featuredField : undefined}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  detailsContainer: {
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  workoutTopline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
  },
  typeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  typePillText: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    letterSpacing: 0.7,
  },
  plannedLabel: {
    color: colors.faint,
    ...font.label,
    fontSize: 9,
    letterSpacing: 1,
  },
  metricsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  metric: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metricCopy: { flex: 1, gap: 2 },
  metricLabel: {
    color: colors.muted,
    ...font.label,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  metricValue: {
    color: colors.text,
    fontFamily: FONT_BOLD,
    fontSize: 14,
  },
  metricUnit: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 10,
  },
  metricDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
    marginHorizontal: 12,
  },
  coachingCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 9,
  },
  coachingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
  },
  coachingIcon: {
    width: 25,
    height: 25,
    borderRadius: 9,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coachingTitle: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  detailMainText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },
  stepsList: {
    gap: 6,
    marginTop: 2,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surface,
    paddingHorizontal: 9,
    paddingVertical: 9,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepNumber: {
    width: 25,
    height: 25,
    borderRadius: 9,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: {
    fontFamily: FONT_BOLD,
    fontSize: 11,
  },
  stepContent: { flex: 1, gap: 2 },
  stepLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    letterSpacing: 0.35,
    textTransform: 'uppercase',
  },
  stepText: {
    color: colors.text,
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '500',
  },
  logSection: {
    paddingTop: 15,
    gap: 14,
  },
  sectionHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headingMark: {
    width: 4,
    height: 17,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 15,
    letterSpacing: 0.2,
  },
  sectionHint: {
    color: colors.faint,
    ...font.label,
    fontSize: 9,
    marginLeft: 'auto',
    letterSpacing: 0.5,
  },
  primaryFields: {
    flexDirection: 'row',
    gap: 10,
  },
  field: { flex: 1, gap: 7 },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  label: {
    color: colors.muted,
    ...font.label,
    fontSize: 10,
    letterSpacing: 0.45,
  },
  suffix: {
    color: colors.faint,
    ...font.label,
    fontSize: 9,
  },
  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: FONT_BOLD,
    fontSize: 16,
    minHeight: 49,
  },
  featuredField: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accent,
    overflow: 'hidden',
  },
  featuredInput: {
    backgroundColor: colors.surfaceAlt,
    paddingHorizontal: 12,
    paddingVertical: 11,
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 21,
    minHeight: 49,
  },
  durationBlock: {
    gap: 7,
  },
  durationHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  durationHint: {
    color: colors.faint,
    ...font.label,
    fontSize: 9,
    letterSpacing: 0.5,
  },
  durationInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeInputWrap: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 55,
  },
  timeInput: {
    flex: 1,
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 23,
    paddingVertical: 7,
  },
  timeUnit: {
    color: colors.faint,
    ...font.label,
    fontSize: 9,
  },
  timeColon: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 20,
  },
  paceResult: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  paceIcon: {
    width: 31,
    height: 31,
    borderRadius: 11,
    backgroundColor: `${colors.accentInk}18`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  paceCopy: { flex: 1, gap: 1 },
  paceLabel: {
    color: colors.accentInk,
    opacity: 0.72,
    ...font.label,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  paceValue: {
    color: colors.accentInk,
    fontFamily: FONT_ITALIC,
    fontSize: 18,
  },
  paceLive: {
    color: colors.accentInk,
    fontFamily: FONT_BOLD,
    fontSize: 9,
    letterSpacing: 0.8,
    borderWidth: 1,
    borderColor: `${colors.accentInk}55`,
    borderRadius: radius.pill,
    paddingHorizontal: 7,
    paddingVertical: 4,
  },
  helper: {
    color: colors.muted,
    fontSize: 11,
    marginTop: -8,
  },
  effortSection: { gap: 8 },
  fieldHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effortButtons: {
    flexDirection: 'row',
    gap: 7,
  },
  effortButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  effortActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  effortText: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 13,
  },
  effortTextActive: { color: colors.accentInk },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  effortScale: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -3,
  },
  scaleText: {
    color: colors.faint,
    ...font.label,
    fontSize: 8,
    letterSpacing: 0.6,
  },
  notes: {
    minHeight: 76,
    fontFamily: undefined,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
});

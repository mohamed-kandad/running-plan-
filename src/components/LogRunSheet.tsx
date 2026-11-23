import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { formatDuration, formatPace, formatShort } from '@/lib/date';
import { matchExerciseInText } from '@/lib/exercises';
import { paceTarget } from '@/lib/plan';
import type { Workout } from '@/lib/types';
import { buildWorkoutChecklist, type ChecklistTone } from '@/lib/workoutChecklist';
import { typeColor } from '@/lib/workouts';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';
import { Sheet } from './Sheet';
import { Button } from './ui';

const FONT_BOLD = 'SpaceGrotesk-Bold';
const FONT_ITALIC = 'Archivo-BoldItalic';

const TONE_ICON: Record<ChecklistTone, keyof typeof Ionicons.glyphMap> = {
  warmup: 'flame-outline',
  main: 'flash-outline',
  cooldown: 'snow-outline',
  effort: 'heart-outline',
  route: 'map-outline',
  pace: 'speedometer-outline',
  fuel: 'water-outline',
  finish: 'flag-outline',
  why: 'bulb-outline',
  tip: 'sparkles-outline',
  note: 'information-circle-outline',
  rule: 'shield-checkmark-outline',
  strength: 'barbell-outline',
  mobility: 'body-outline',
  balance: 'footsteps-outline',
};

export interface RunInputValues {
  distanceKm: number;
  durationSec: number;
  avgHr?: number;
  effort?: number;
  notes?: string;
}

export function LogRunSheet({
  workout,
  onClose,
  onSubmit,
  onEdit,
}: {
  workout: Workout | null;
  onClose: () => void;
  onSubmit: (input: RunInputValues) => void;
  /** Opens the workout editor for this session. */
  onEdit?: () => void;
}) {
  const { settings, zones, runs, lastSavedRun, deleteRun, undoLastRun } = useApp();
  const plannedKm = workout?.distanceKm ?? 5;

  const [km, setKm] = useState(`${plannedKm}`);
  const [minutes, setMinutes] = useState(`${Math.round(plannedKm * 6)}`);
  const [seconds, setSeconds] = useState('0');
  const [hr, setHr] = useState('');
  const [effort, setEffort] = useState<number | undefined>();
  const [notes, setNotes] = useState('');
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [justSaved, setJustSaved] = useState(false);

  const lastId = useRef<string | null>(null);
  useEffect(() => {
    const id = workout?.id ?? null;
    if (lastId.current === id) return;
    lastId.current = id;
    setJustSaved(false);
    setChecked({});
  }, [workout?.id]);

  const distance = Number.parseFloat(km.replace(',', '.')) || 0;
  const durationSec =
    (Number.parseInt(minutes || '0', 10) || 0) * 60 +
    (Number.parseInt(seconds || '0', 10) || 0);
  const valid = distance > 0 && durationSec > 0;

  const accent = workout ? typeColor(workout.type) : colors.accent;
  const targetPace = workout
    ? (workout.pace?.trim() ? workout.pace : paceTarget(workout.type, settings.level))
    : '—';
  const zone = workout ? zones[workout.zone - 1] : undefined;
  const steps = workout ? buildWorkoutChecklist(workout) : [];
  const doneSteps = steps.filter((step) => checked[step.id]).length;
  const progress = steps.length ? doneSteps / steps.length : 0;

  const existingRun = workout?.id
    ? runs.find((run) => run.workoutId === workout.id)
    : undefined;
  const showSaved = justSaved;
  const savedKm = existingRun?.distanceKm ?? lastSavedRun?.distanceKm ?? distance;
  const savedSec =
    existingRun?.durationSec ?? lastSavedRun?.durationSec ?? durationSec;

  const submit = () => {
    if (!valid) return;
    onSubmit({
      distanceKm: Math.round(distance * 100) / 100,
      durationSec,
      avgHr: Number.parseInt(hr, 10) || undefined,
      effort,
      notes: notes.trim() || undefined,
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    setJustSaved(true);
  };

  const undo = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
    if (existingRun) deleteRun(existingRun.id);
    else undoLastRun();
    setJustSaved(false);
  };

  const toggleStep = (id: string) => {
    Haptics.selectionAsync().catch(() => {});
    setChecked((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  if (!workout) {
    return <Sheet visible={false} onClose={onClose} title="Log run">{null}</Sheet>;
  }

  return (
    <Sheet
      visible
      onClose={onClose}
      title={workout.title}
      subtitle={`${formatShort(workout.date)} · ${workout.distanceKm} km planned`}
      action={
        onEdit ? (
          <Pressable
            onPress={onEdit}
            hitSlop={10}
            style={styles.editButton}
            accessibilityRole="button"
            accessibilityLabel="Edit workout"
          >
            <Ionicons name="create-outline" size={17} color={colors.text} />
          </Pressable>
        ) : undefined
      }
      footer={
        showSaved ? (
          <Button label="Done" onPress={onClose} icon="checkmark" />
        ) : (
          <Button
            label="Save completed run"
            onPress={submit}
            disabled={!valid}
            icon="checkmark"
          />
        )
      }
    >
      {showSaved ? (
        <SavedRun
          title={workout.title}
          date={workout.date}
          distanceKm={savedKm}
          durationSec={savedSec}
          avgHr={existingRun?.avgHr}
          effort={existingRun?.effort}
          notes={existingRun?.notes}
          onUndo={undo}
        />
      ) : (
        <>
          {existingRun ? (
            <View style={styles.loggedRow}>
              <View style={styles.loggedIcon}>
                <Ionicons name="checkmark-circle" size={16} color={colors.green} />
              </View>
              <View style={styles.loggedCopy}>
                <Text style={styles.loggedTitle}>Already logged</Text>
                <Text style={styles.loggedText}>
                  {existingRun.distanceKm} km · {formatDuration(existingRun.durationSec)} · saving
                  again replaces it
                </Text>
              </View>
              <Pressable
                onPress={undo}
                hitSlop={8}
                style={({ pressed }) => [styles.loggedUndo, pressed && styles.pressed]}
                accessibilityRole="button"
                accessibilityLabel="Undo this workout"
              >
                <Text style={styles.loggedUndoText}>UNDO</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.detailsContainer}>
            <View style={styles.topline}>
              <View
                style={[
                  styles.typePill,
                  { backgroundColor: `${accent}16`, borderColor: `${accent}45` },
                ]}
              >
                <View style={[styles.typeDot, { backgroundColor: accent }]} />
                <Text style={[styles.typePillText, { color: accent }]}>
                  {workout.type.toUpperCase()}
                </Text>
              </View>
              <Text style={styles.toplineRight}>
                {workout.distanceKm} KM · Z{workout.zone}
              </Text>
            </View>

            <View style={styles.targets}>
              <Target label="PACE" value={targetPace} unit="/km" accent={accent} />
              <View style={styles.targetDivider} />
              <Target
                label="ZONE"
                value={`Z${workout.zone}`}
                unit={zone ? ` ${zone.min}–${zone.max}` : ''}
                accent={accent}
              />
              <View style={styles.targetDivider} />
              <Target
                label="DISTANCE"
                value={`${workout.distanceKm}`}
                unit="km"
                accent={accent}
              />
            </View>

            {steps.length > 0 ? (
              <View style={styles.checklistCard}>
                <View style={styles.checkHeader}>
                  <View style={[styles.checkIconWrap, { backgroundColor: `${accent}1F` }]}>
                    <Ionicons name="list-outline" size={14} color={accent} />
                  </View>
                  <Text style={styles.checkTitle}>WORKOUT STRUCTURE</Text>
                  <Text style={styles.checkCounter}>
                    {doneSteps}/{steps.length}
                  </Text>
                </View>

                <View style={styles.track}>
                  <View
                    style={[
                      styles.trackFill,
                      {
                        width: `${Math.round(progress * 100)}%` as `${number}%`,
                        backgroundColor: accent,
                      },
                    ]}
                  />
                </View>

                <View style={styles.stepList}>
                  {steps.map((step, index) => {
                    const on = !!checked[step.id];
                    const heading =
                      step.section && step.section !== steps[index - 1]?.section
                        ? step.section
                        : null;
                    const linked = matchExerciseInText(step.text);
                    return (
                      <React.Fragment key={step.id}>
                        {heading ? (
                          <View style={[styles.stepHeading, index > 0 && styles.stepHeadingSpaced]}>
                            <Text style={styles.stepHeadingText}>{heading}</Text>
                          </View>
                        ) : null}
                        <Pressable
                          onPress={() => toggleStep(step.id)}
                          style={({ pressed }) => [
                            styles.stepRow,
                            index > 0 && !heading && styles.stepRowBorder,
                            pressed && styles.pressed,
                          ]}
                          accessibilityRole="checkbox"
                          accessibilityState={{ checked: on }}
                          accessibilityLabel={
                            step.label ? `${step.label}: ${step.text}` : step.text
                          }
                        >
                          <View
                            style={[styles.checkbox, on && { backgroundColor: accent, borderColor: accent }]}
                          >
                            {on ? (
                              <Ionicons name="checkmark" size={13} color={colors.accentInk} />
                            ) : (
                              <Text style={styles.checkboxIndex}>{step.index ?? index + 1}</Text>
                            )}
                          </View>
                          <View style={styles.stepCopy}>
                            {step.label ? (
                              <Text style={[styles.stepLabel, { color: on ? colors.faint : accent }]}>
                                {step.label}
                              </Text>
                            ) : null}
                            <Text style={[styles.stepText, on && styles.stepTextDone]}>
                              {step.text}
                            </Text>
                            {linked?.prescription ? (
                              <Text style={styles.stepRx}>Workout prescription · {linked.prescription}</Text>
                            ) : null}
                          </View>
                          {linked ? (
                            <Pressable
                              onPress={() =>
                                router.push(`/exercise/${linked.exercise.id}` as Href)
                              }
                              hitSlop={8}
                              style={({ pressed }) => [styles.stepLink, pressed && { opacity: 0.6 }]}
                              accessibilityRole="button"
                              accessibilityLabel={`How to do ${linked.exercise.name}`}>
                              <Ionicons name="information-circle-outline" size={19} color={colors.accent} />
                            </Pressable>
                          ) : (
                            <Ionicons
                              name={TONE_ICON[step.tone]}
                              size={15}
                              color={on ? colors.faint : `${colors.muted}99`}
                            />
                          )}
                        </Pressable>
                      </React.Fragment>
                    );
                  })}
                </View>
              </View>
            ) : workout.detail ? (
              <Text style={styles.detailText}>{workout.detail}</Text>
            ) : null}
          </View>

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
        </>
      )}
    </Sheet>
  );
}

/** The confirmation the sheet swaps to after saving, with a way back out. */
function SavedRun({
  title,
  date,
  distanceKm,
  durationSec,
  avgHr,
  effort,
  notes,
  onUndo,
}: {
  title: string;
  date: string;
  distanceKm: number;
  durationSec: number;
  avgHr?: number;
  effort?: number;
  notes?: string;
  onUndo: () => void;
}) {
  const [scale] = useState(() => new Animated.Value(0.7));
  const [opacity] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, { toValue: 1, friction: 6, tension: 90, useNativeDriver: true }),
      Animated.timing(opacity, { toValue: 1, duration: 220, useNativeDriver: true }),
    ]).start();
  }, [opacity, scale]);

  const pace = distanceKm > 0 ? `${formatPace(durationSec / distanceKm)} /km` : '—';

  return (
    <View style={styles.savedBlock}>
      <Animated.View style={[styles.savedBadge, { opacity, transform: [{ scale }] }]}>
        <Ionicons name="checkmark" size={32} color={colors.accentInk} />
      </Animated.View>

      <Text style={styles.savedTitle}>Run saved</Text>
      <Text style={styles.savedSub}>
        {title} · {formatShort(date)}
      </Text>

      <View style={styles.savedStats}>
        <SavedStat label="DISTANCE" value={`${distanceKm}`} unit="km" />
        <View style={styles.savedStatDivider} />
        <SavedStat label="TIME" value={formatDuration(durationSec)} unit="" />
        <View style={styles.savedStatDivider} />
        <SavedStat label="PACE" value={pace} unit="" />
      </View>

      {avgHr || effort || notes ? (
        <View style={styles.savedMeta}>
          {avgHr ? (
            <SavedMeta icon="heart-outline" text={`${avgHr} bpm avg`} />
          ) : null}
          {effort ? <SavedMeta icon="speedometer-outline" text={`Effort ${effort}/10`} /> : null}
          {notes ? <SavedMeta icon="chatbubble-ellipses-outline" text={notes} /> : null}
        </View>
      ) : null}

      <Pressable
        onPress={onUndo}
        style={({ pressed }) => [styles.undoRow, pressed && styles.pressed]}
        accessibilityRole="button"
        accessibilityLabel="Undo this workout"
      >
        <View style={styles.undoIcon}>
          <Ionicons name="arrow-undo-outline" size={16} color={colors.orange} />
        </View>
        <View style={styles.undoCopy}>
          <Text style={styles.undoTitle}>Undo this workout</Text>
          <Text style={styles.undoText}>
            Removes the saved run and marks this session as not done.
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={15} color={colors.faint} />
      </Pressable>
    </View>
  );
}

function SavedStat({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <View style={styles.savedStat}>
      <Text style={styles.savedStatLabel}>{label}</Text>
      <Text style={styles.savedStatValue}>
        {value}
        {unit ? <Text style={styles.savedStatUnit}> {unit}</Text> : null}
      </Text>
    </View>
  );
}

function SavedMeta({
  icon,
  text,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  text: string;
}) {
  return (
    <View style={styles.savedMetaRow}>
      <Ionicons name={icon} size={13} color={colors.muted} />
      <Text style={styles.savedMetaText} numberOfLines={2}>
        {text}
      </Text>
    </View>
  );
}

function Target({
  label,
  value,
  unit,
  accent,
}: {
  label: string;
  value: string;
  unit: string;
  accent: string;
}) {
  return (
    <View style={styles.target}>
      <Text style={styles.targetLabel}>{label}</Text>
      <Text style={[styles.targetValue, { color: accent }]}>
        {value}
        <Text style={styles.targetUnit}>{unit}</Text>
      </Text>
    </View>
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
  editButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  detailsContainer: {
    gap: 12,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  topline: {
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
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typePillText: {
    fontFamily: FONT_BOLD,
    fontSize: 10,
    letterSpacing: 0.7,
  },
  toplineRight: {
    color: colors.faint,
    ...font.label,
    fontSize: 9,
    letterSpacing: 1,
  },

  /* Targets — one row, three readings, no duplicated card art */
  targets: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 11,
    paddingHorizontal: 12,
  },
  target: { flex: 1, gap: 3, alignItems: 'center' },
  targetLabel: {
    color: colors.muted,
    ...font.label,
    fontSize: 9,
    letterSpacing: 0.6,
  },
  targetValue: {
    fontFamily: FONT_ITALIC,
    fontSize: 16,
  },
  targetUnit: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 9,
  },
  targetDivider: {
    width: 1,
    height: 28,
    backgroundColor: colors.border,
  },

  /* The single checklist — replaces the old "THE PLAN" text + step list pair */
  checklistCard: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    padding: 13,
    borderWidth: 1,
    borderColor: colors.border,
    gap: 10,
  },
  checkHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checkIconWrap: {
    width: 25,
    height: 25,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkTitle: {
    flex: 1,
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 12,
    letterSpacing: 0.7,
  },
  checkCounter: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  track: {
    height: 3,
    borderRadius: 2,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  trackFill: { height: '100%', borderRadius: 2 },
  stepList: { gap: 0 },
  stepHeading: {
    paddingTop: 8,
    paddingBottom: 3,
  },
  stepHeadingSpaced: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    marginTop: 4,
  },
  stepHeadingText: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 9.5,
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 9,
  },
  stepRowBorder: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  checkbox: {
    width: 23,
    height: 23,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: `${colors.muted}66`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxIndex: {
    color: colors.faint,
    fontFamily: FONT_BOLD,
    fontSize: 10,
  },
  stepCopy: { flex: 1, gap: 3 },
  stepRx: { color: colors.accent, fontSize: 9.5, fontWeight: '600' },
  stepLink: { padding: 2 },
  stepLabel: {
    fontFamily: FONT_BOLD,
    fontSize: 9,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
  },
  stepText: {
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
  },
  stepTextDone: {
    color: colors.faint,
    textDecorationLine: 'line-through',
  },
  detailText: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '500',
  },

  /* Saved confirmation */
  savedBlock: {
    alignItems: 'center',
    gap: 10,
    paddingVertical: 14,
    paddingBottom: 20,
  },
  savedBadge: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  savedTitle: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 26,
    letterSpacing: -0.5,
  },
  savedSub: {
    color: colors.muted,
    fontSize: 12,
    marginTop: -4,
    textAlign: 'center',
  },
  savedStats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 6,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 12,
  },
  savedStat: { flex: 1, alignItems: 'center', gap: 4 },
  savedStatLabel: {
    color: colors.muted,
    ...font.label,
    fontSize: 8.5,
    letterSpacing: 0.6,
  },
  savedStatValue: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 16,
  },
  savedStatUnit: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 9,
  },
  savedStatDivider: {
    width: 1,
    height: 26,
    backgroundColor: colors.border,
  },
  savedMeta: { alignSelf: 'stretch', gap: 6, marginTop: 2 },
  savedMetaRow: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  savedMetaText: { flex: 1, color: colors.muted, fontSize: 11, lineHeight: 15 },
  undoRow: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    marginTop: 8,
    padding: 12,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.orange}44`,
    backgroundColor: `${colors.orange}12`,
  },
  undoIcon: {
    width: 32,
    height: 32,
    borderRadius: 11,
    backgroundColor: `${colors.orange}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  undoCopy: { flex: 1, gap: 2 },
  undoTitle: {
    color: colors.orange,
    fontFamily: FONT_BOLD,
    fontSize: 12,
    letterSpacing: 0.2,
  },
  undoText: { color: colors.muted, fontSize: 10, lineHeight: 14 },

  /* Already-logged strip inside the form */
  loggedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: `${colors.green}12`,
    borderWidth: 1,
    borderColor: `${colors.green}33`,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  loggedIcon: {
    width: 28,
    height: 28,
    borderRadius: 10,
    backgroundColor: `${colors.green}1F`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loggedCopy: { flex: 1, gap: 2 },
  loggedTitle: {
    color: colors.green,
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    letterSpacing: 0.2,
  },
  loggedText: { color: colors.muted, fontSize: 10, lineHeight: 14 },
  loggedUndo: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: `${colors.orange}66`,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  loggedUndoText: {
    color: colors.orange,
    fontFamily: FONT_BOLD,
    fontSize: 9,
    letterSpacing: 0.7,
  },

  /* Log form */
  logSection: { paddingTop: 15, gap: 14 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  primaryFields: { flexDirection: 'row', gap: 10 },
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
  suffix: { color: colors.faint, ...font.label, fontSize: 9 },
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
  durationBlock: { gap: 7 },
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
  durationInputs: { flexDirection: 'row', alignItems: 'center', gap: 8 },
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
  timeUnit: { color: colors.faint, ...font.label, fontSize: 9 },
  timeColon: { color: colors.muted, fontFamily: FONT_BOLD, fontSize: 20 },
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
  paceValue: { color: colors.accentInk, fontFamily: FONT_ITALIC, fontSize: 18 },
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
  helper: { color: colors.muted, fontSize: 11, marginTop: -8 },
  effortSection: { gap: 8 },
  fieldHeading: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  effortButtons: { flexDirection: 'row', gap: 7 },
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
  effortActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  effortText: { color: colors.muted, fontFamily: FONT_BOLD, fontSize: 13 },
  effortTextActive: { color: colors.accentInk },
  pressed: { opacity: 0.72, transform: [{ scale: 0.97 }] },
  effortScale: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -3 },
  scaleText: { color: colors.faint, ...font.label, fontSize: 8, letterSpacing: 0.6 },
  notes: {
    minHeight: 76,
    fontFamily: undefined,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: 'top',
    paddingTop: 11,
  },
});

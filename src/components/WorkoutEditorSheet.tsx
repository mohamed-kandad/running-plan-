import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { addDays, dayNumber, diffDays, formatShort, todayISO, weekdayShort } from '@/lib/date';
import { paceTarget, zoneForType } from '@/lib/plan';
import type { Workout, WorkoutType } from '@/lib/types';
import {
  defaultWorkoutTitle,
  isStructuredDetail,
  joinStructuredDetail,
  makeWorkoutId,
  splitStructuredDetail,
  typeColor,
  WORKOUT_TYPE_LABEL,
  WORKOUT_TYPES,
} from '@/lib/workouts';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';
import { Sheet } from './Sheet';
import { Button, Segmented } from './ui';

const FONT_BOLD = 'SpaceGrotesk-Bold';
const FONT_ITALIC = 'Archivo-BoldItalic';

type ContentMode = 'checklist' | 'description';

/**
 * One sheet for the whole workout: build a session from scratch or rewrite any
 * session already in the plan — imported from Excel, the calendar or written here.
 * The note is stored either as numbered checklist lines or as a free description.
 */
export function WorkoutEditorSheet({
  workout,
  date,
  onClose,
}: {
  workout?: Workout | null;
  date?: string;
  onClose: () => void;
}) {
  const { plan, settings, zones, saveWorkout, deleteWorkout } = useApp();
  const today = todayISO();

  const [type, setType] = useState<WorkoutType>(workout?.type ?? 'easy');
  const [title, setTitle] = useState(workout?.title ?? defaultWorkoutTitle(workout?.type ?? 'easy'));
  const [day, setDay] = useState(workout?.date ?? date ?? today);
  const [km, setKm] = useState(`${workout?.distanceKm ?? 8}`);
  const [zone, setZone] = useState(workout?.zone ?? 2);
  const [pace, setPace] = useState(workout?.pace ?? '');

  const structured = workout ? isStructuredDetail(workout.detail) : true;
  const parsed = splitStructuredDetail(workout?.detail ?? '');
  const [mode, setMode] = useState<ContentMode>(structured ? 'checklist' : 'description');
  const [heading, setHeading] = useState(structured ? parsed.heading : '');
  const [steps, setSteps] = useState<string[]>(
    structured ? (parsed.steps.length ? parsed.steps : ['']) : ['']
  );
  const [desc, setDesc] = useState(structured ? '' : (workout?.detail ?? ''));
  const [confirmDelete, setConfirmDelete] = useState(false);

  const days = useMemo(() => {
    const list = Array.from({ length: 21 }, (_, i) => addDays(today, i - 1));
    if (!list.includes(day)) list.unshift(day);
    return list;
  }, [day, today]);

  const distance = Number.parseFloat(km.replace(',', '.')) || 0;
  const valid = distance > 0;
  const zoneInfo = zones[zone - 1];
  const suggestedPace = paceTarget(type, settings.level);

  const chooseType = (next: WorkoutType) => {
    setType(next);
    setTitle((current) =>
      !current.trim() || current === defaultWorkoutTitle(type)
        ? defaultWorkoutTitle(next)
        : current
    );
    setZone(zoneForType(next));
  };

  const setStep = (index: number, value: string) => {
    setSteps((prev) => prev.map((step, i) => (i === index ? value : step)));
  };

  const addStep = () => {
    Haptics.selectionAsync().catch(() => {});
    setSteps((prev) => [...prev, '']);
  };

  const removeStep = (index: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setSteps((prev) => (prev.length === 1 ? [''] : prev.filter((_, i) => i !== index)));
  };

  const save = () => {
    if (!valid) return;
    const detail = mode === 'checklist' ? joinStructuredDetail(heading, steps) : desc.trim();
    const next: Workout = {
      id: workout?.id ?? makeWorkoutId(day, type, plan),
      date: day,
      week: Math.max(1, Math.floor(diffDays(settings.startDate, day) / 7) + 1),
      type,
      title: title.trim() || defaultWorkoutTitle(type),
      detail,
      distanceKm: Math.round(distance * 10) / 10,
      zone,
      ...(pace.trim() ? { pace: pace.trim() } : {}),
    };
    saveWorkout(next);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    onClose();
  };

  const remove = () => {
    if (!workout) return;
    if (!confirmDelete) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => {});
      setConfirmDelete(true);
      return;
    }
    deleteWorkout(workout.id);
    onClose();
  };

  return (
    <Sheet
      visible
      onClose={onClose}
      title={workout ? 'Edit workout' : 'New workout'}
      subtitle={
        workout
          ? `${formatShort(workout.date)} · changes apply to this session`
          : 'Pick a type, a date and how the session runs'
      }
      footer={
        <View style={styles.footerRow}>
          {workout ? (
            <Pressable
              onPress={remove}
              style={[styles.deleteButton, confirmDelete && styles.deleteButtonArmed]}
              accessibilityRole="button"
              accessibilityLabel={confirmDelete ? 'Confirm delete workout' : 'Delete workout'}
            >
              <Ionicons
                name="trash-outline"
                size={17}
                color={confirmDelete ? colors.accentInk : colors.orange}
              />
              {confirmDelete ? <Text style={styles.deleteText}>Confirm</Text> : null}
            </Pressable>
          ) : null}
          <View style={styles.footerPrimary}>
            <Button
              label={workout ? 'Save changes' : 'Add workout'}
              icon={workout ? 'checkmark' : 'add'}
              onPress={save}
              disabled={!valid}
            />
          </View>
        </View>
      }
    >
      {/* Type */}
      <View style={styles.group}>
        <Text style={styles.label}>TYPE</Text>
        <View style={styles.typeGrid}>
          {WORKOUT_TYPES.map((option) => {
            const active = option === type;
            const tint = typeColor(option);
            return (
              <Pressable
                key={option}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  chooseType(option);
                }}
                style={[
                  styles.typeChip,
                  active && { backgroundColor: `${tint}1F`, borderColor: tint },
                ]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <View style={[styles.typeDot, { backgroundColor: tint }]} />
                <Text style={[styles.typeChipText, active && { color: tint }]}>
                  {WORKOUT_TYPE_LABEL[option]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* Date */}
      <View style={styles.group}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>DATE</Text>
          <Text style={styles.hint}>{formatShort(day)}</Text>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.dayStrip}
          keyboardShouldPersistTaps="handled"
        >
          {days.map((option) => {
            const active = option === day;
            return (
              <Pressable
                key={option}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setDay(option);
                }}
                style={[styles.dayChip, active && styles.dayChipActive]}
                accessibilityRole="button"
                accessibilityLabel={formatShort(option)}
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.dayName, active && styles.dayNameActive]}>
                  {weekdayShort(option).toUpperCase()}
                </Text>
                <Text style={[styles.dayNumber, active && styles.dayNumberActive]}>
                  {dayNumber(option)}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </View>

      {/* Name + numbers */}
      <View style={styles.group}>
        <Text style={styles.label}>TITLE</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          style={styles.input}
          placeholder={defaultWorkoutTitle(type)}
          placeholderTextColor={colors.faint}
        />
      </View>

      <View style={styles.row}>
        <View style={styles.half}>
          <Text style={styles.label}>DISTANCE</Text>
          <View style={styles.unitInput}>
            <TextInput
              value={km}
              onChangeText={setKm}
              keyboardType="decimal-pad"
              style={styles.unitValue}
              placeholder="0.0"
              placeholderTextColor={colors.faint}
              selectTextOnFocus
            />
            <Text style={styles.unit}>KM</Text>
          </View>
        </View>
        <View style={styles.half}>
          <Text style={styles.label}>TARGET PACE</Text>
          <View style={styles.unitInput}>
            <TextInput
              value={pace}
              onChangeText={setPace}
              style={[styles.unitValue, styles.paceValue]}
              placeholder={suggestedPace}
              placeholderTextColor={colors.faint}
            />
            <Text style={styles.unit}>/KM</Text>
          </View>
        </View>
      </View>

      <View style={styles.group}>
        <View style={styles.labelRow}>
          <Text style={styles.label}>ZONE</Text>
          <Text style={styles.hint}>
            {zoneInfo ? `${zoneInfo.min}–${zoneInfo.max} bpm` : 'heart rate band'}
          </Text>
        </View>
        <View style={styles.zoneRow}>
          {[1, 2, 3, 4, 5].map((n) => {
            const active = n === zone;
            return (
              <Pressable
                key={n}
                onPress={() => {
                  Haptics.selectionAsync().catch(() => {});
                  setZone(n);
                }}
                style={[styles.zoneChip, active && styles.zoneChipActive]}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
              >
                <Text style={[styles.zoneText, active && styles.zoneTextActive]}>Z{n}</Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      {/* How the session runs */}
      <View style={styles.group}>
        <Text style={styles.label}>SESSION DETAILS</Text>
        <Segmented
          value={mode}
          onChange={(next) => setMode(next)}
          options={[
            { value: 'checklist', label: 'Checklist' },
            { value: 'description', label: 'Description' },
          ]}
        />

        {mode === 'checklist' ? (
          <View style={styles.checklist}>
            <TextInput
              value={heading}
              onChangeText={setHeading}
              style={[styles.input, styles.headingInput]}
              placeholder="Block title (optional) — e.g. Foot & core (20–25 min)"
              placeholderTextColor={colors.faint}
            />

            {steps.map((step, index) => (
              <View key={index} style={styles.stepRow}>
                <View style={styles.stepNumber}>
                  <Text style={styles.stepNumberText}>{index + 1}</Text>
                </View>
                <TextInput
                  value={step}
                  onChangeText={(value) => setStep(index, value)}
                  style={styles.stepInput}
                  placeholder="e.g. Tibialis raises 3 × 15"
                  placeholderTextColor={colors.faint}
                  multiline
                />
                <Pressable
                  onPress={() => removeStep(index)}
                  hitSlop={8}
                  accessibilityRole="button"
                  accessibilityLabel={`Remove step ${index + 1}`}
                >
                  <Ionicons name="close-circle" size={19} color={colors.faint} />
                </Pressable>
              </View>
            ))}

            <Pressable onPress={addStep} style={styles.addStep} accessibilityRole="button">
              <Ionicons name="add" size={15} color={colors.accent} />
              <Text style={styles.addStepText}>Add step</Text>
            </Pressable>

            <Text style={styles.hint}>
              Start a row with RULE: or WHY: to keep it as a note instead of a step.
            </Text>
          </View>
        ) : (
          <TextInput
            value={desc}
            onChangeText={setDesc}
            style={[styles.input, styles.descInput]}
            placeholder="Write the session however you like. The whole plan, in your words."
            placeholderTextColor={colors.faint}
            multiline
          />
        )}
      </View>
    </Sheet>
  );
}

const styles = StyleSheet.create({
  group: { gap: 8 },
  row: { flexDirection: 'row', gap: 10 },
  half: { flex: 1, gap: 8 },
  labelRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: {
    color: colors.muted,
    ...font.label,
    fontSize: 10,
    letterSpacing: 0.5,
  },
  hint: { color: colors.faint, fontSize: 10.5, lineHeight: 15 },

  typeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 },
  typeChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 11,
    paddingVertical: 9,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  typeDot: { width: 6, height: 6, borderRadius: 3 },
  typeChipText: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    letterSpacing: 0.2,
  },

  dayStrip: { gap: 7, paddingRight: 4 },
  dayChip: {
    width: 46,
    paddingVertical: 8,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    gap: 2,
  },
  dayChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  dayName: {
    color: colors.faint,
    fontFamily: FONT_BOLD,
    fontSize: 8.5,
    letterSpacing: 0.6,
  },
  dayNameActive: { color: colors.accentInk },
  dayNumber: { color: colors.text, fontFamily: FONT_ITALIC, fontSize: 16 },
  dayNumberActive: { color: colors.accentInk },

  input: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    paddingVertical: 12,
    color: colors.text,
    fontFamily: FONT_BOLD,
    fontSize: 15,
    minHeight: 49,
  },
  unitInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingHorizontal: 12,
    minHeight: 49,
  },
  unitValue: {
    flex: 1,
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 18,
    paddingVertical: 10,
  },
  paceValue: { fontSize: 15, fontFamily: FONT_BOLD },
  unit: { color: colors.faint, ...font.label, fontSize: 9 },

  zoneRow: { flexDirection: 'row', gap: 7 },
  zoneChip: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  zoneChipActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  zoneText: { color: colors.muted, fontFamily: FONT_BOLD, fontSize: 12 },
  zoneTextActive: { color: colors.accentInk },

  checklist: { gap: 8, marginTop: 2 },
  headingInput: {
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    minHeight: 44,
    paddingVertical: 11,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingLeft: 9,
    paddingRight: 10,
    paddingVertical: 8,
  },
  stepNumber: {
    width: 22,
    height: 22,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: `${colors.muted}55`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.faint, fontFamily: FONT_BOLD, fontSize: 10 },
  stepInput: {
    flex: 1,
    color: colors.text,
    fontSize: 12.5,
    lineHeight: 17,
    fontWeight: '500',
    paddingVertical: 3,
    maxHeight: 72,
  },
  addStep: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: radius.md,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${colors.accent}55`,
  },
  addStepText: {
    color: colors.accent,
    fontFamily: FONT_BOLD,
    fontSize: 11.5,
    letterSpacing: 0.3,
  },
  descInput: {
    minHeight: 130,
    fontFamily: undefined,
    fontSize: 13,
    lineHeight: 19,
    textAlignVertical: 'top',
  },

  footerRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  footerPrimary: { flex: 1 },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 56,
    paddingHorizontal: 16,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.orange}55`,
    backgroundColor: `${colors.orange}12`,
  },
  deleteButtonArmed: { backgroundColor: colors.orange, borderColor: colors.orange },
  deleteText: {
    color: colors.accentInk,
    fontFamily: FONT_BOLD,
    fontSize: 11,
    letterSpacing: 0.4,
  },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useRef } from 'react';
import { Alert, Image, Platform, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button, Screen } from '@/components/ui';
import { ProgressBar, primaryImage } from '@/components/exercise/ExerciseUI';
import { getExercise } from '@/lib/exercises';
import { ROUTINE_BY_ID } from '@/lib/exercises/routines';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function RoutineSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = ROUTINE_BY_ID[id ?? ''];
  const {
    routineProgress,
    startRoutine,
    setRoutineIndex,
    toggleRoutineStep,
    finishRoutine,
    resetRoutine,
    customExerciseImages,
  } = useApp();

  const progress = routine ? routineProgress[routine.id] : undefined;
  const startedRef = useRef(false);

  useEffect(() => {
    if (!routine) return;
    if (startedRef.current) return;
    if (!progress || progress.finishedAt) {
      startRoutine(routine.id);
    }
    startedRef.current = true;
  }, [routine, progress, startRoutine]);

  if (!routine) {
    return (
      <Screen>
        <Text style={styles.body}>That routine does not exist.</Text>
      </Screen>
    );
  }

  const steps = routine.steps;
  const index = Math.min(progress?.index ?? 0, steps.length - 1);
  const step = steps[index];
  const exercise = getExercise(step.exerciseId);
  const completed = progress?.completed ?? [];
  const doneCount = completed.length;
  const finished = !!progress?.finishedAt;
  const key = `${step.exerciseId}-${index}`;
  const isDone = completed.includes(key);

  const leave = () => {
    if (Platform.OS === 'web') {
      if (globalThis.confirm?.('Pause this routine and leave? Your progress is saved.')) {
        router.back();
      }
      return;
    }
    Alert.alert('Pause routine?', 'Your progress is saved — you can resume later.', [
      { text: 'Keep going', style: 'cancel' },
      { text: 'Pause', style: 'destructive', onPress: () => router.back() },
    ]);
  };

  if (finished) {
    const startedAt = progress?.startedAt ? new Date(progress.startedAt) : null;
    const finishedAt = progress?.finishedAt ? new Date(progress.finishedAt) : null;
    const minutes =
      startedAt && finishedAt
        ? Math.max(1, Math.round((finishedAt.getTime() - startedAt.getTime()) / 60000))
        : 0;
    return (
      <Screen>
        <View style={styles.doneWrap}>
          <View style={styles.doneBadge}>
            <Ionicons name="checkmark" size={34} color={colors.accentInk} />
          </View>
          <Text style={styles.doneTitle}>Routine complete</Text>
          <Text style={styles.doneSub}>{routine.name}</Text>
          <View style={styles.doneStats}>
            <DoneStat label="EXERCISES" value={`${doneCount}/${steps.length}`} />
            <View style={styles.doneDivider} />
            <DoneStat label="TIME" value={minutes ? `${minutes} min` : '—'} />
            <View style={styles.doneDivider} />
            <DoneStat label="STATUS" value="Done" />
          </View>
          <Text style={styles.doneText}>
            Walk it off, drink some water, and give the muscles a day before training them hard
            again.
          </Text>
        </View>
        <Button
          label="Back to routines"
          onPress={() => {
            resetRoutine(routine.id);
            router.back();
          }}
        />
        <Button
          label="Do it again"
          variant="secondary"
          onPress={() => {
            resetRoutine(routine.id);
            startRoutine(routine.id);
          }}
        />
      </Screen>
    );
  }

  const custom = exercise ? customExerciseImages[exercise.id] : undefined;
  const image = exercise
    ? custom
      ? { source: { uri: custom }, label: 'Your image' }
      : primaryImage(exercise.id)
    : undefined;
  const nextStep = steps[index + 1];
  const nextExercise = nextStep ? getExercise(nextStep.exerciseId) : null;
  const allDone = doneCount >= steps.length;

  return (
    <Screen>
      <View style={styles.topBar}>
        <Pressable onPress={leave} hitSlop={10} style={styles.close} accessibilityRole="button" accessibilityLabel="Pause and exit">
          <Ionicons name="close" size={18} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.overline}>ROUTINE IN PROGRESS</Text>
          <Text style={styles.title} numberOfLines={1}>
            {routine.name}
          </Text>
        </View>
        <Text style={styles.counter}>
          {index + 1}/{steps.length}
        </Text>
      </View>

      <ProgressBar value={doneCount / steps.length} />

      <View style={styles.imageCard}>
        {image ? (
          <Image source={image.source} style={styles.image} resizeMode="contain" />
        ) : (
          <View style={styles.imageFallback}>
            <Ionicons name="image-outline" size={28} color={colors.faint} />
          </View>
        )}
        <View style={styles.imageLabel}>
          <Text style={styles.imageLabelText}>{image?.label ?? 'POSITION'}</Text>
        </View>
      </View>

      <View style={styles.titleRow}>
        <Text style={styles.exerciseName} numberOfLines={2}>
          {exercise?.name ?? step.exerciseId}
        </Text>
        {exercise ? (
          <Pressable onPress={() => go(`/exercise/${exercise.id}`)} hitSlop={8} style={styles.infoButton}>
            <Ionicons name="information-circle-outline" size={20} color={colors.accent} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.rxRow}>
        <Rx label="SETS" value={step.sets} />
        <View style={styles.rxDivider} />
        <Rx label="REPS / TIME" value={step.reps} />
        <View style={styles.rxDivider} />
        <Rx label="REST" value={step.restSec ? `${step.restSec}s` : '—'} />
      </View>

      {step.note ? <Text style={styles.note}>{step.note}</Text> : null}

      <View style={styles.instructions}>
        <Text style={styles.instructionsLabel}>HOW TO DO IT</Text>
        <Text style={styles.instructionsStart}>{exercise?.start}</Text>
        {(exercise?.steps ?? []).slice(0, 4).map((line, i) => (
          <View key={i} style={styles.instructionLine}>
            <Text style={styles.instructionNumber}>{i + 1}</Text>
            <Text style={styles.instructionText}>{line}</Text>
          </View>
        ))}
        {exercise && exercise.steps.length > 4 ? (
          <Text style={styles.moreText} onPress={() => go(`/exercise/${exercise.id}`)}>
            Read the full instructions →
          </Text>
        ) : null}
      </View>

      {isDone ? (
        <View style={styles.doneRow}>
          <Ionicons name="checkmark-circle" size={18} color={colors.green} />
          <Text style={styles.doneRowText}>Marked complete</Text>
        </View>
      ) : (
        <Button label="Mark exercise complete" icon="checkmark" onPress={() => toggleRoutineStep(routine.id, key)} />
      )}

      <View style={styles.navRow}>
        <Pressable
          onPress={() => setRoutineIndex(routine.id, Math.max(0, index - 1))}
          disabled={index === 0}
          style={({ pressed }) => [styles.navButton, index === 0 && styles.navDisabled, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Previous exercise">
          <Ionicons name="chevron-back" size={17} color={colors.text} />
          <Text style={styles.navText}>Previous</Text>
        </Pressable>
        <Pressable
          onPress={() => setRoutineIndex(routine.id, Math.min(steps.length - 1, index + 1))}
          disabled={index === steps.length - 1}
          style={({ pressed }) => [
            styles.navButton,
            index === steps.length - 1 && styles.navDisabled,
            pressed && { opacity: 0.7 },
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next exercise">
          <Text style={styles.navText}>Next</Text>
          <Ionicons name="chevron-forward" size={17} color={colors.text} />
        </Pressable>
      </View>

      {nextExercise ? (
        <Pressable
          onPress={() => setRoutineIndex(routine.id, index + 1)}
          style={({ pressed }) => [styles.nextUp, pressed && { opacity: 0.75 }]}>
          <Text style={styles.nextUpLabel}>NEXT UP</Text>
          <Text style={styles.nextUpTitle} numberOfLines={1}>
            {nextExercise.name}
          </Text>
          <Text style={styles.nextUpMeta}>
            {nextStep.sets} × {nextStep.reps}
          </Text>
        </Pressable>
      ) : null}

      <Button
        label={allDone ? 'Finish routine' : 'Finish early'}
        variant="secondary"
        icon="flag-outline"
        onPress={() => {
          finishRoutine(routine.id);
        }}
      />

      <Text style={styles.disclaimer}>
        Stop if an exercise hurts. Being consistent beats finishing a routine in pain.
      </Text>
    </Screen>
  );
}

function Rx({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.rx}>
      <Text style={styles.rxLabel}>{label}</Text>
      <Text style={styles.rxValue}>{value}</Text>
    </View>
  );
}

function DoneStat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.doneStat}>
      <Text style={styles.doneStatLabel}>{label}</Text>
      <Text style={styles.doneStatValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  topBar: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingTop: 6 },
  close: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  overline: { color: colors.accent, ...font.label, fontSize: 9 },
  title: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 16 },
  counter: { color: colors.muted, ...font.mono, fontSize: 12 },
  imageCard: {
    height: 260,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imageFallback: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  imageLabel: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(13,15,18,0.8)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  imageLabelText: { color: colors.accent, ...font.mono, fontSize: 9, letterSpacing: 1.4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  exerciseName: {
    flex: 1,
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 24,
    letterSpacing: -0.5,
  },
  infoButton: { padding: 4 },
  rxRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: 10,
  },
  rx: { flex: 1, alignItems: 'center', gap: 3 },
  rxLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  rxValue: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 15 },
  rxDivider: { width: 1, height: 26, backgroundColor: colors.border },
  note: { color: colors.accent, fontSize: 11.5, lineHeight: 16 },
  instructions: { gap: 7 },
  instructionsLabel: { color: colors.faint, ...font.label, fontSize: 9 },
  instructionsStart: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  instructionLine: { flexDirection: 'row', gap: 9 },
  instructionNumber: { color: colors.accent, ...font.mono, fontSize: 10, width: 14 },
  instructionText: { flex: 1, color: colors.text, fontSize: 12.5, lineHeight: 18 },
  moreText: { color: colors.accent, fontSize: 11.5, fontWeight: '600' },
  doneRow: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center' },
  doneRowText: { color: colors.green, fontSize: 12.5, fontWeight: '600' },
  navRow: { flexDirection: 'row', gap: 10 },
  navButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    height: 46,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  navDisabled: { opacity: 0.35 },
  navText: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  nextUp: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  nextUpLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  nextUpTitle: { flex: 1, color: colors.text, fontSize: 12.5, fontWeight: '600' },
  nextUpMeta: { color: colors.accent, fontSize: 11 },
  disclaimer: { color: colors.faint, fontSize: 10, textAlign: 'center', lineHeight: 15 },
  doneWrap: { alignItems: 'center', gap: 10, paddingTop: 40 },
  doneBadge: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  doneTitle: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 28 },
  doneSub: { color: colors.muted, fontSize: 13 },
  doneStats: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'stretch',
    marginTop: 10,
    paddingVertical: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  doneStat: { flex: 1, alignItems: 'center', gap: 3 },
  doneStatLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  doneStatValue: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 15 },
  doneDivider: { width: 1, height: 26, backgroundColor: colors.border },
  doneText: { color: colors.muted, fontSize: 12.5, textAlign: 'center', lineHeight: 18, paddingHorizontal: 10 },
  body: { color: colors.muted, fontSize: 13 },
});

import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Chip, ExerciseThumb, ScreenHeader } from '@/components/exercise/ExerciseUI';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { getExercise } from '@/lib/exercises';
import { ROUTINE_BY_ID, routineMinutes } from '@/lib/exercises/routines';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS } from '@/lib/exercises/types';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function RoutineDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const routine = ROUTINE_BY_ID[id ?? ''];
  const { routineProgress, resetRoutine } = useApp();

  if (!routine) {
    return (
      <Screen>
        <ScreenHeader
          title="Routine"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/routines' as Href))}
        />
        <Card>
          <Text style={styles.body}>That routine does not exist.</Text>
        </Card>
      </Screen>
    );
  }

  const progress = routineProgress[routine.id];
  const inProgress = progress && !progress.finishedAt;
  const completedSteps = progress?.completed.length ?? 0;
  const stepCount = routine.steps.length;

  return (
    <Screen>
      <ScreenHeader
        overline="ROUTINE"
        title={routine.name}
        subtitle={routine.subtitle}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/routines' as Href))}
      />

      <Card style={styles.hero}>
        <View style={styles.heroRow}>
          <Stat label="DURATION" value={`${routine.durationMin} min`} />
          <View style={styles.divider} />
          <Stat label="LEVEL" value={DIFFICULTY_LABELS[routine.level]} />
          <View style={styles.divider} />
          <Stat label="EXERCISES" value={`${stepCount}`} />
        </View>
        <Text style={styles.focus}>{routine.focus}</Text>
        <View style={styles.chips}>
          {routine.equipment.map((item) => (
            <Chip key={item} label={EQUIPMENT_LABELS[item]} color={colors.violet} />
          ))}
        </View>
        <Text style={styles.estimate}>
          About {routineMinutes(routine)} minutes including rest
        </Text>
      </Card>

      {inProgress ? (
        <Card style={styles.progressCard}>
          <View style={styles.progressHead}>
            <Text style={styles.progressTitle}>Routine in progress</Text>
            <Text style={styles.progressCount}>
              {completedSteps}/{stepCount}
            </Text>
          </View>
          <Text style={styles.progressText}>
            You can pick up where you left off, or start again from the first exercise.
          </Text>
          <View style={styles.progressActions}>
            <View style={{ flex: 1 }}>
              <Button
                label="Resume"
                icon="play"
                onPress={() => go(`/routines/${routine.id}/session`)}
              />
            </View>
            <Button label="Restart" variant="secondary" onPress={() => resetRoutine(routine.id)} />
          </View>
        </Card>
      ) : (
        <Button
          label="Start routine"
          icon="play"
          onPress={() => go(`/routines/${routine.id}/session`)}
        />
      )}

      <SectionTitle title="THE EXERCISES" action={<Text style={styles.meta}>{stepCount} steps</Text>} />
      <View style={styles.list}>
        {routine.steps.map((step, index) => {
          const exercise = getExercise(step.exerciseId);
          if (!exercise) {
            return (
              <Card key={`${step.exerciseId}-${index}`}>
                <Text style={styles.body}>Missing exercise: {step.exerciseId}</Text>
              </Card>
            );
          }
          return (
            <Pressable
              key={`${step.exerciseId}-${index}`}
              onPress={() => go(`/exercise/${exercise.id}`)}
              style={({ pressed }) => [styles.step, pressed && { opacity: 0.78 }]}
              accessibilityRole="button"
              accessibilityLabel={`${index + 1}. ${exercise.name}`}>
              <Text style={styles.stepIndex}>{String(index + 1).padStart(2, '0')}</Text>
              <ExerciseThumb id={exercise.id} size={52} rounded={12} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.stepTitle} numberOfLines={1}>
                  {exercise.name}
                </Text>
                <Text style={styles.stepMeta}>
                  {step.sets} × {step.reps}
                  {step.restSec ? ` · ${step.restSec}s rest` : ''}
                </Text>
                {step.note ? <Text style={styles.stepNote}>{step.note}</Text> : null}
              </View>
              <Ionicons name="chevron-forward" size={15} color={colors.faint} />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.disclaimer}>
        Routines are general guidance, not medical advice. Stop if something hurts and adjust the
        volume to your current training.
      </Text>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  hero: { gap: 12 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  stat: { flex: 1, alignItems: 'center', gap: 3 },
  statLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  statValue: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 14,
    textAlign: 'center',
  },
  divider: { width: 1, height: 28, backgroundColor: colors.border },
  focus: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  estimate: { color: colors.faint, fontSize: 10.5 },
  progressCard: { gap: 10, borderColor: `${colors.accent}44`, backgroundColor: colors.accentTint },
  progressHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  progressTitle: { color: colors.accent, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 14 },
  progressCount: { color: colors.text, ...font.mono, fontSize: 11 },
  progressText: { color: colors.muted, fontSize: 11.5, lineHeight: 16 },
  progressActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  meta: { color: colors.faint, ...font.mono, fontSize: 9.5 },
  list: { gap: 8 },
  step: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 10,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  stepIndex: { color: colors.faint, ...font.mono, fontSize: 9.5, width: 18 },
  stepTitle: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 13.5 },
  stepMeta: { color: colors.muted, fontSize: 11 },
  stepNote: { color: colors.faint, fontSize: 10, lineHeight: 14 },
  disclaimer: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center' },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});

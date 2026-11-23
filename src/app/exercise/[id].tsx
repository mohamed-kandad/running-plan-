import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  Chip,
  EquipmentChips,
  ExerciseRow,
  Gallery,
  MuscleChips,
  ScreenHeader,
} from '@/components/exercise/ExerciseUI';
import { Button, Card, Screen, SectionTitle } from '@/components/ui';
import { deleteExercisePhoto, pickExercisePhoto } from '@/lib/exercisePhoto';
import {
  EXERCISES,
  getExercise,
  matchExerciseInText,
  missingImageIds,
} from '@/lib/exercises';
import { CATEGORY_BY_ID } from '@/lib/exercises/categories';
import { MUSCLE_BY_ID } from '@/lib/exercises/muscles';
import { DIFFICULTY_LABELS, WHEN_LABELS } from '@/lib/exercises/types';
import { useApp } from '@/store/AppStore';
import { formatShort } from '@/lib/date';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function ExerciseDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const exercise = getExercise(id);
  const {
    plan,
    exerciseFavorites,
    toggleExerciseFavorite,
    markExerciseViewed,
    completedIds,
    customExerciseImages,
    setCustomExerciseImage,
    removeCustomExerciseImage,
  } = useApp();
  const [busy, setBusy] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (id) markExerciseViewed(String(id));
  }, [id, markExerciseViewed]);

  const inPlan = useMemo(() => {
    if (!exercise) return [];
    return plan
      .map((workout) => {
        const match = matchExerciseInText(workout.detail ?? '');
        return match && match.exercise.id === exercise.id
          ? { workout, prescription: match.prescription }
          : null;
      })
      .filter((entry): entry is { workout: (typeof plan)[number]; prescription: string | null } => !!entry)
      .slice(0, 4);
  }, [exercise, plan]);

  if (!exercise) {
    return (
      <Screen>
        <ScreenHeader
          title="Exercise"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
        />
        <Card>
          <Text style={styles.body}>
            This exercise is not in the library yet. It was probably renamed in a workbook — open the
            workout and check the session note.
          </Text>
        </Card>
      </Screen>
    );
  }

  const favorite = exerciseFavorites.includes(exercise.id);
  const category = CATEGORY_BY_ID[exercise.categories[0]];
  const related = EXERCISES.filter(
    (item) => item.id !== exercise.id && item.categories[0] === exercise.categories[0]
  ).slice(0, 4);

  return (
    <Screen>
      <ScreenHeader
        overline={category?.name.toUpperCase() ?? 'EXERCISE'}
        title={exercise.name}
        subtitle={`${DIFFICULTY_LABELS[exercise.difficulty]} · ${exercise.durationMin} min · ${exercise.primaryMuscles
          .map((muscle) => MUSCLE_BY_ID[muscle].name)
          .join(' + ')}`}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
        right={
          <Pressable
            onPress={() => toggleExerciseFavorite(exercise.id)}
            hitSlop={8}
            style={({ pressed }) => [styles.favButton, favorite && styles.favActive, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel={favorite ? 'Remove from favourites' : 'Add to favourites'}>
            <Ionicons
              name={favorite ? 'heart' : 'heart-outline'}
              size={19}
              color={favorite ? colors.accentInk : colors.text}
            />
          </Pressable>
        }
      />

      <Gallery id={exercise.id} />

      <Card style={styles.card}>
        <Text style={styles.cardLabel}>YOUR OWN IMAGE</Text>
        <Text style={styles.body}>
          Add a photo from this device to use for this exercise. It is stored locally, works offline
          and always takes priority over the built-in image. Only add images you have the right to
          use.
        </Text>
        <View style={styles.uploadActions}>
          <Button
            label={customExerciseImages[exercise.id] ? 'Replace image' : 'Choose image'}
            icon="image-outline"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setUploadError(null);
              try {
                const uri = await pickExercisePhoto(exercise.id);
                if (uri) setCustomExerciseImage(exercise.id, uri);
              } catch (error) {
                setUploadError(error instanceof Error ? error.message : 'Could not use that image.');
              } finally {
                setBusy(false);
              }
            }}
          />
          {customExerciseImages[exercise.id] ? (
            <Button
              label="Remove"
              variant="secondary"
              disabled={busy}
              onPress={async () => {
                const current = customExerciseImages[exercise.id];
                setBusy(true);
                try {
                  if (current) await deleteExercisePhoto(current);
                  removeCustomExerciseImage(exercise.id);
                } finally {
                  setBusy(false);
                }
              }}
            />
          ) : null}
        </View>
        {uploadError ? <Text style={styles.uploadError}>{uploadError}</Text> : null}
      </Card>

      <View style={styles.badges}>
        <Chip label={DIFFICULTY_LABELS[exercise.difficulty]} active color={category?.accent ?? colors.accent} />
        {exercise.when.map((when) => (
          <Chip key={when} label={WHEN_LABELS[when]} color={colors.blue} />
        ))}
        <Chip label={`${exercise.durationMin} min`} color={colors.muted} />
      </View>

      {missingImageIds().includes(exercise.id) ? (
        <Text style={styles.missing}>Illustration missing for this exercise.</Text>
      ) : null}

      <Card style={styles.card}>
        <Text style={styles.cardLabel}>TARGET MUSCLES</Text>
        <MuscleChips exercise={exercise} />
        <View style={styles.divider} />
        <Text style={styles.cardLabel}>EQUIPMENT</Text>
        <EquipmentChips exercise={exercise} />
      </Card>

      <Card style={styles.whyCard}>
        <View style={styles.whyHead}>
          <Ionicons name="flash" size={15} color={colors.accent} />
          <Text style={styles.whyLabel}>WHY RUNNERS NEED IT</Text>
        </View>
        <Text style={styles.whyText}>{exercise.why}</Text>
      </Card>

      <SectionTitle title="HOW TO DO IT" />
      <Card style={styles.card}>
        <Step number="0" title="Starting position" text={exercise.start} first />
        {exercise.steps.map((step, index) => (
          <Step key={index} number={`${index + 1}`} text={step} />
        ))}
        <View style={styles.breathBox}>
          <Ionicons name="leaf-outline" size={14} color={colors.green} />
          <Text style={styles.breathText}>{exercise.breathing}</Text>
        </View>
      </Card>

      <SectionTitle title="RECOMMENDED" />
      <Card style={styles.rxCard}>
        <View style={styles.rxRow}>
          <Rx label="SETS" value={exercise.prescription.sets} />
          <View style={styles.rxDivider} />
          <Rx label="REPS / TIME" value={exercise.prescription.reps} />
          <View style={styles.rxDivider} />
          <Rx label="REST" value={exercise.prescription.rest} />
        </View>
        <Text style={styles.rxNote}>
          General recommendation. Your workout may prescribe different numbers — always follow the
          plan you are training with.
        </Text>
      </Card>

      <SectionTitle title="COMMON MISTAKES" />
      <Card style={styles.card}>
        {exercise.mistakes.map((mistake) => (
          <Bullet key={mistake} icon="close-circle-outline" color={colors.orange} text={mistake} />
        ))}
      </Card>

      <SectionTitle title="SAFETY" />
      <Card style={styles.card}>
        {exercise.safety.map((item) => (
          <Bullet key={item} icon="shield-checkmark-outline" color={colors.green} text={item} />
        ))}
      </Card>

      {exercise.tip || exercise.easier || exercise.harder ? (
        <Card style={styles.card}>
          {exercise.tip ? <Bullet icon="bulb-outline" color={colors.accent} text={exercise.tip} /> : null}
          {exercise.easier ? <Bullet icon="arrow-down-circle-outline" color={colors.blue} text={`Easier: ${exercise.easier}`} /> : null}
          {exercise.harder ? <Bullet icon="arrow-up-circle-outline" color={colors.violet} text={`Harder: ${exercise.harder}`} /> : null}
        </Card>
      ) : null}

      {inPlan.length > 0 ? (
        <>
          <SectionTitle title="IN YOUR TRAINING PLAN" />
          <Card style={styles.card}>
            {inPlan.map(({ workout, prescription }) => (
              <Pressable
                key={workout.id}
                onPress={() => router.navigate('/plan' as Href)}
                style={({ pressed }) => [styles.planRow, pressed && { opacity: 0.75 }]}>
                <View style={styles.planIcon}>
                  <Ionicons
                    name={completedIds.has(workout.id) ? 'checkmark' : 'calendar-outline'}
                    size={14}
                    color={completedIds.has(workout.id) ? colors.green : colors.accent}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.planTitle} numberOfLines={1}>
                    {workout.title}
                  </Text>
                  <Text style={styles.planMeta}>
                    {formatShort(workout.date)} · Week {workout.week}
                    {prescription ? ` · ${prescription}` : ''}
                  </Text>
                </View>
              </Pressable>
            ))}
            <Text style={styles.rxNote}>
              The sets and reps shown are the ones written in your workout, not the general
              recommendation above.
            </Text>
          </Card>
        </>
      ) : null}

      {related.length > 0 ? (
        <>
          <SectionTitle title="RELATED EXERCISES" />
          <View style={styles.list}>
            {related.map((item) => (
              <ExerciseRow
                key={item.id}
                exercise={item}
                onPress={() => go(`/exercise/${item.id}`)}
              />
            ))}
          </View>
        </>
      ) : null}
    </Screen>
  );
}

function Step({
  number,
  title,
  text,
  first,
}: {
  number: string;
  title?: string;
  text: string;
  first?: boolean;
}) {
  return (
    <View style={[styles.step, !first && styles.stepBorder]}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <Text style={styles.stepTitle}>{title}</Text> : null}
        <Text style={styles.stepText}>{text}</Text>
      </View>
    </View>
  );
}

function Bullet({ icon, color, text }: { icon: keyof typeof Ionicons.glyphMap; color: string; text: string }) {
  return (
    <View style={styles.bullet}>
      <Ionicons name={icon} size={15} color={color} style={{ marginTop: 1 }} />
      <Text style={styles.bulletText}>{text}</Text>
    </View>
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

const styles = StyleSheet.create({
  favButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  favActive: { backgroundColor: colors.accent, borderColor: colors.accent },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  missing: { color: colors.orange, fontSize: 11.5 },
  card: { gap: 10 },
  uploadActions: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  uploadError: { color: colors.orange, fontSize: 11.5, lineHeight: 16 },
  cardLabel: { color: colors.faint, ...font.label, fontSize: 9 },
  divider: { height: 1, backgroundColor: colors.border },
  whyCard: { gap: 8, borderColor: `${colors.accent}44`, backgroundColor: colors.accentTint },
  whyHead: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  whyLabel: { color: colors.accent, ...font.label, fontSize: 9.5 },
  whyText: { color: colors.text, fontSize: 13, lineHeight: 19 },
  step: { flexDirection: 'row', gap: 11, paddingVertical: 8 },
  stepBorder: { borderTopWidth: 1, borderTopColor: colors.border },
  stepNumber: {
    width: 24,
    height: 24,
    borderRadius: 8,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepNumberText: { color: colors.accent, ...font.mono, fontSize: 10 },
  stepTitle: { color: colors.text, fontWeight: '700', fontSize: 12.5 },
  stepText: { color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  breathBox: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    backgroundColor: `${colors.green}12`,
    borderRadius: radius.md,
    padding: 10,
    marginTop: 4,
  },
  breathText: { flex: 1, color: colors.text, fontSize: 12, lineHeight: 17 },
  rxCard: { gap: 10 },
  rxRow: { flexDirection: 'row', alignItems: 'center' },
  rx: { flex: 1, alignItems: 'center', gap: 3 },
  rxLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  rxValue: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 15,
    textAlign: 'center',
  },
  rxDivider: { width: 1, height: 30, backgroundColor: colors.border },
  rxNote: { color: colors.faint, fontSize: 10.5, lineHeight: 15 },
  bullet: { flexDirection: 'row', gap: 9, alignItems: 'flex-start' },
  bulletText: { flex: 1, color: colors.muted, fontSize: 12.5, lineHeight: 18 },
  planRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  planIcon: {
    width: 30,
    height: 30,
    borderRadius: 10,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  planTitle: { color: colors.text, fontSize: 12.5, fontWeight: '600' },
  planMeta: { color: colors.faint, fontSize: 10.5 },
  list: { gap: 8 },
  body: { color: colors.muted, fontSize: 13, lineHeight: 19 },
});

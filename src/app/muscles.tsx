import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { ScreenHeader } from '@/components/exercise/ExerciseUI';
import { Screen, SectionTitle } from '@/components/ui';
import { exercisesForMuscle } from '@/lib/exercises';
import { MUSCLES } from '@/lib/exercises/muscles';
import { MUSCLE_IMAGES } from '@/lib/exercises/muscleImages';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function MusclesScreen() {
  return (
    <Screen>
      <ScreenHeader
        overline="REFERENCE"
        title="Muscle groups"
        subtitle="What each muscle does, and which exercises train it."
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
      />

      <SectionTitle title="THE RUNNER'S BODY" action={<Text style={styles.meta}>{MUSCLES.length} groups</Text>} />

      <View style={styles.list}>
        {MUSCLES.map((muscle) => {
          const count = exercisesForMuscle(muscle.id).length;
          return (
            <Pressable
              key={muscle.id}
              onPress={() => go(`/library/browse?muscle=${muscle.id}`)}
              style={({ pressed }) => [styles.card, pressed && { opacity: 0.8 }]}
              accessibilityRole="button"
              accessibilityLabel={`${muscle.name}, ${count} exercises`}>
              <View style={styles.imageWrap}>
                {MUSCLE_IMAGES[muscle.id] ? (
                  <Image source={MUSCLE_IMAGES[muscle.id]} style={styles.image} resizeMode="contain" />
                ) : (
                  <Ionicons name="body-outline" size={22} color={colors.faint} />
                )}
              </View>
              <View style={styles.copy}>
                <View style={styles.titleRow}>
                  <Text style={styles.name}>{muscle.name}</Text>
                  <Text style={styles.count}>{count}</Text>
                </View>
                <Text style={styles.role}>{muscle.role}</Text>
                <Text style={styles.description} numberOfLines={2}>
                  {muscle.description}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={16} color={colors.faint} />
            </Pressable>
          );
        })}
      </View>

      <Text style={styles.footnote}>
        Primary muscles are highlighted in lime on the exercise pages; secondary muscles are listed
        separately. Illustrations are schematic references, not medical diagrams.
      </Text>
    </Screen>
  );
}

const styles = StyleSheet.create({
  meta: { color: colors.faint, ...font.mono, fontSize: 9.5 },
  list: { gap: 8 },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  imageWrap: {
    width: 64,
    height: 84,
    borderRadius: 14,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  copy: { flex: 1, gap: 2, minWidth: 0 },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 15 },
  count: { color: colors.accent, ...font.mono, fontSize: 10 },
  role: { color: colors.muted, fontSize: 10.5, fontWeight: '600' },
  description: { color: colors.faint, fontSize: 10.5, lineHeight: 15 },
  footnote: { color: colors.faint, fontSize: 10, lineHeight: 15, textAlign: 'center' },
});

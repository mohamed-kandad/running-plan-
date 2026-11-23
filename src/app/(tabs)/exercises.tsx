import { Ionicons } from '@expo/vector-icons';
import { router, type Href } from 'expo-router';
import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import {
  CategoryCard,
  ExerciseCard,
  RoutineCard,
  ScreenHeader,
} from '@/components/exercise/ExerciseUI';
import { Screen, SectionTitle } from '@/components/ui';
import {
  categoryCount,
  EXERCISES,
  getExercise,
  POPULAR_IDS,
  TOTAL_EXERCISES,
} from '@/lib/exercises';
import { CATEGORIES } from '@/lib/exercises/categories';
import { ROUTINES } from '@/lib/exercises/routines';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function ExercisesScreen() {
  const { exerciseFavorites, exerciseRecent } = useApp();
  const [query, setQuery] = useState('');

  const favorites = exerciseFavorites.map(getExercise).filter((e): e is NonNullable<typeof e> => !!e);
  const recent = exerciseRecent.map(getExercise).filter((e): e is NonNullable<typeof e> => !!e);
  const popular = POPULAR_IDS.map(getExercise).filter((e): e is NonNullable<typeof e> => !!e);

  const search = () => {
    const term = query.trim();
    go(term ? `/library/browse?q=${encodeURIComponent(term)}` : '/library/browse');
  };

  return (
    <Screen>
      <ScreenHeader
        overline="EXERCISE LIBRARY"
        title="Exercises"
        subtitle="Train smarter. Move better. Run stronger."
        right={
          <Pressable
            onPress={() => go('/library/favorites')}
            hitSlop={8}
            style={({ pressed }) => [styles.iconButton, pressed && { opacity: 0.7 }]}
            accessibilityRole="button"
            accessibilityLabel="Favourite exercises">
            <Ionicons name="heart" size={18} color={colors.accent} />
          </Pressable>
        }
      />

      <View style={styles.searchBar}>
        <Ionicons name="search" size={17} color={colors.faint} />
        <TextInput
          value={query}
          onChangeText={setQuery}
          onSubmitEditing={search}
          placeholder="Search exercises, muscles, equipment…"
          placeholderTextColor={colors.faint}
          returnKeyType="search"
          style={styles.searchInput}
          accessibilityLabel="Search exercises"
        />
        {query.length > 0 ? (
          <Pressable onPress={() => setQuery('')} hitSlop={8}>
            <Ionicons name="close-circle" size={16} color={colors.faint} />
          </Pressable>
        ) : null}
      </View>

      <View style={styles.stats}>
        <Stat value={`${TOTAL_EXERCISES}`} label="EXERCISES" />
        <View style={styles.statDivider} />
        <Stat value={`${CATEGORIES.length}`} label="CATEGORIES" />
        <View style={styles.statDivider} />
        <Stat value={`${ROUTINES.length}`} label="ROUTINES" />
      </View>

      {favorites.length > 0 ? (
        <>
          <SectionTitle
            title="YOUR FAVOURITES"
            action={
              <Pressable onPress={() => go('/library/favorites')} hitSlop={8}>
                <Text style={styles.link}>See all</Text>
              </Pressable>
            }
          />
          <ExerciseScroller exercises={favorites} />
        </>
      ) : null}

      {recent.length > 0 ? (
        <>
          <SectionTitle title="RECENTLY VIEWED" />
          <ExerciseScroller exercises={recent} />
        </>
      ) : null}

      <SectionTitle
        title="READY-MADE ROUTINES"
        action={
          <Pressable onPress={() => go('/routines')} hitSlop={8}>
            <Text style={styles.link}>See all</Text>
          </Pressable>
        }
      />
      <View style={styles.routineList}>
        {ROUTINES.slice(0, 3).map((routine) => (
          <RoutineCard
            key={routine.id}
            routine={routine}
            onPress={() => go(`/routines/${routine.id}`)}
          />
        ))}
      </View>

      <SectionTitle title="FEATURED CATEGORIES" />
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tileRow}>
        {CATEGORIES.map((category) => (
          <Pressable
            key={category.id}
            onPress={() => go(`/library/category/${category.id}`)}
            style={({ pressed }) => [styles.tile, pressed && { opacity: 0.8 }]}
            accessibilityRole="button"
            accessibilityLabel={`${category.name}, ${categoryCount(category.id)} exercises`}>
            <View style={[styles.tileIcon, { backgroundColor: `${category.accent}20` }]}>
              <Ionicons
                name={category.icon as keyof typeof Ionicons.glyphMap}
                size={20}
                color={category.accent}
              />
            </View>
            <Text style={styles.tileTitle} numberOfLines={2}>
              {category.name}
            </Text>
            <Text style={styles.tileCount}>{categoryCount(category.id)}</Text>
          </Pressable>
        ))}
      </ScrollView>

      <SectionTitle title="POPULAR WITH RUNNERS" />
      <ExerciseScroller exercises={popular} />

      <SectionTitle title="ALL CATEGORIES" />
      <View style={styles.categoryList}>
        {CATEGORIES.map((category) => (
          <CategoryCard
            key={category.id}
            category={category}
            count={categoryCount(category.id)}
            onPress={() => go(`/library/category/${category.id}`)}
          />
        ))}
      </View>

      <Pressable
        onPress={() => go('/muscles')}
        style={({ pressed }) => [styles.muscleCard, pressed && { opacity: 0.8 }]}
        accessibilityRole="button"
        accessibilityLabel="Muscle group reference">
        <View style={styles.muscleIcon}>
          <Ionicons name="body-outline" size={18} color={colors.blue} />
        </View>
        <View style={{ flex: 1, gap: 2 }}>
          <Text style={styles.muscleTitle}>Muscle group reference</Text>
          <Text style={styles.muscleText}>See what each muscle does and which exercises train it.</Text>
        </View>
        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
      </Pressable>

      <Text style={styles.footnote}>
        {EXERCISES.length} exercises · works offline · real photos from the public-domain Free Exercise
        DB where available, illustrated movement guides for the rest
      </Text>
    </Screen>
  );
}

function ExerciseScroller({ exercises }: { exercises: NonNullable<ReturnType<typeof getExercise>>[] }) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.cardRow}>
      {exercises.map((exercise) => (
        <ExerciseCard
          key={exercise.id}
          exercise={exercise}
          onPress={() => go(`/exercise/${exercise.id}`)}
        />
      ))}
    </ScrollView>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  iconButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    height: 48,
  },
  searchInput: { flex: 1, color: colors.text, fontSize: 13.5 },
  stats: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    paddingVertical: 12,
  },
  stat: { flex: 1, alignItems: 'center', gap: 2 },
  statValue: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 20,
  },
  statLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  statDivider: { width: 1, height: 26, backgroundColor: colors.border },
  link: { color: colors.accent, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 12 },
  cardRow: { gap: 10, paddingRight: 8 },
  routineList: { gap: 8 },
  tileRow: { gap: 10, paddingRight: 8 },
  tile: {
    width: 104,
    padding: 12,
    gap: 8,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tileIcon: { width: 36, height: 36, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  tileTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 12.5,
    lineHeight: 15,
    minHeight: 30,
  },
  tileCount: { color: colors.faint, ...font.mono, fontSize: 9 },
  categoryList: { gap: 8 },
  muscleCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  muscleIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: `${colors.blue}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  muscleTitle: { color: colors.text, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 13.5 },
  muscleText: { color: colors.muted, fontSize: 11, lineHeight: 15 },
  footnote: { color: colors.faint, fontSize: 10, textAlign: 'center', lineHeight: 15 },
});

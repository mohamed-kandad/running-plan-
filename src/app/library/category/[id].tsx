import { Ionicons } from '@expo/vector-icons';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import React from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';

import { ExerciseRow, ScreenHeader, useExerciseImage } from '@/components/exercise/ExerciseUI';
import { Card, Screen } from '@/components/ui';
import { categoryCount, exercisesInCategory } from '@/lib/exercises';
import { CATEGORY_BY_ID } from '@/lib/exercises/categories';
import type { CategoryId } from '@/lib/exercises/types';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function CategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const category = CATEGORY_BY_ID[id as CategoryId];
  const hero = useExerciseImage(category?.heroExerciseId ?? '');

  if (!category) {
    return (
      <Screen>
        <ScreenHeader
          title="Category"
          onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
        />
        <Card>
          <Text style={styles.body}>That category does not exist.</Text>
        </Card>
      </Screen>
    );
  }

  const exercises = exercisesInCategory(category.id);

  return (
    <Screen>
      <ScreenHeader
        overline="CATEGORY"
        title={category.name}
        subtitle={category.tagline}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
      />

      <View style={styles.hero}>
        {hero ? (
          <Image source={hero.source} style={styles.heroImage} resizeMode="cover" />
        ) : null}
        <View style={styles.heroScrim} />
        <View style={styles.heroContent}>
          <View style={[styles.heroIcon, { backgroundColor: `${category.accent}22` }]}>
            <Ionicons
              name={category.icon as keyof typeof Ionicons.glyphMap}
              size={18}
              color={category.accent}
            />
          </View>
          <Text style={styles.heroCount}>
            {categoryCount(category.id)} exercises · {category.groups.length} groups
          </Text>
        </View>
      </View>

      <Text style={styles.description}>{category.description}</Text>

      {category.groups.map((group) => {
        const groupExercises = exercises.filter((exercise) => exercise.groups.includes(group.id));
        if (groupExercises.length === 0) return null;
        return (
          <View key={group.id} style={styles.group}>
            <View style={styles.groupHead}>
              <Text style={styles.groupTitle}>{group.name}</Text>
              <Text style={styles.groupCount}>{groupExercises.length}</Text>
            </View>
            <Text style={styles.groupBlurb}>{group.blurb}</Text>
            <View style={styles.list}>
              {groupExercises.map((exercise) => (
                <ExerciseRow
                  key={exercise.id}
                  exercise={exercise}
                  onPress={() => go(`/exercise/${exercise.id}`)}
                />
              ))}
            </View>
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  hero: {
    height: 190,
    borderRadius: radius.lg,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  heroImage: { width: '100%', height: '100%' },
  heroScrim: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    backgroundColor: 'rgba(13,15,18,0.35)',
  },
  heroContent: {
    position: 'absolute',
    left: 14,
    right: 14,
    bottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  heroCount: {
    color: colors.text,
    ...font.mono,
    fontSize: 10,
    backgroundColor: 'rgba(13,15,18,0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: radius.pill,
    overflow: 'hidden',
  },
  description: { color: colors.muted, fontSize: 13, lineHeight: 19 },
  group: { gap: 8 },
  groupHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  groupTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 18,
  },
  groupCount: { color: colors.accent, ...font.mono, fontSize: 11 },
  groupBlurb: { color: colors.faint, fontSize: 11.5, marginTop: -4 },
  list: { gap: 8 },
  body: { color: colors.muted, fontSize: 13 },
});

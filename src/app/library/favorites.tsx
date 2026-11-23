import { router, type Href } from 'expo-router';
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { EmptyState, ExerciseRow, ScreenHeader } from '@/components/exercise/ExerciseUI';
import { Screen, SectionTitle } from '@/components/ui';
import { getExercise } from '@/lib/exercises';
import { useApp } from '@/store/AppStore';
import { colors } from '@/theme';

const go = (path: string) => router.push(path as Href);

export default function FavoritesScreen() {
  const { exerciseFavorites, clearExerciseHistory } = useApp();
  const favorites = exerciseFavorites.map(getExercise).filter((e): e is NonNullable<typeof e> => !!e);

  return (
    <Screen>
      <ScreenHeader
        overline="LIBRARY"
        title="Favourites"
        subtitle={`${favorites.length} saved exercise${favorites.length === 1 ? '' : 's'}`}
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
      />

      {favorites.length === 0 ? (
        <EmptyState
          title="No favourites yet"
          body="Tap the heart on any exercise to keep it here. Favourites are stored on this device and survive a restart."
        />
      ) : (
        <>
          <SectionTitle
            title="SAVED"
            action={
              <Pressable onPress={clearExerciseHistory} hitSlop={8}>
                <Text style={styles.link}>Clear history</Text>
              </Pressable>
            }
          />
          <View style={styles.list}>
            {favorites.map((exercise) => (
              <ExerciseRow
                key={exercise.id}
                exercise={exercise}
                onPress={() => go(`/exercise/${exercise.id}`)}
              />
            ))}
          </View>
        </>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  list: { gap: 8 },
  link: { color: colors.muted, fontSize: 11.5, fontWeight: '600' },
});

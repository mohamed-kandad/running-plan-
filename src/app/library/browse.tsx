import { router, useLocalSearchParams, type Href } from 'expo-router';
import React, { useMemo, useState } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';

import { Chip, ExerciseRow, ScreenHeader } from '@/components/exercise/ExerciseUI';
import { Screen, SectionTitle } from '@/components/ui';
import { filterExercises, TOTAL_EXERCISES } from '@/lib/exercises';
import { CATEGORIES, CATEGORY_BY_ID } from '@/lib/exercises/categories';
import { MUSCLE_BY_ID } from '@/lib/exercises/muscles';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS, PURPOSE_LABELS, WHEN_LABELS } from '@/lib/exercises/types';
import type {
  CategoryId,
  Difficulty,
  EquipmentId,
  MuscleId,
  PurposeId,
  WhenId,
} from '@/lib/exercises/types';
import { colors, font, radius } from '@/theme';

const go = (path: string) => router.push(path as Href);

const DIFFICULTIES: Difficulty[] = ['beginner', 'intermediate', 'advanced'];
const EQUIPMENT: EquipmentId[] = ['none', 'band', 'dumbbells', 'kettlebell', 'box', 'mat', 'wall', 'chair', 'foam-roller', 'towel', 'hill', 'stairs'];
const PURPOSES: PurposeId[] = ['warm-up', 'cool-down', 'strength', 'stability', 'mobility', 'technique', 'trail', 'recovery'];
const WHENS: WhenId[] = ['pre-run', 'post-run', 'rest-day', 'gym', 'anytime', 'pre-race'];

const toggle = <T,>(list: T[], value: T): T[] =>
  list.includes(value) ? list.filter((item) => item !== value) : [...list, value];

export default function BrowseScreen() {
  const params = useLocalSearchParams<{ q?: string; category?: string; muscle?: string }>();
  const [query, setQuery] = useState(params.q ?? '');
  const [category, setCategory] = useState<CategoryId | null>(
    (params.category as CategoryId | undefined) ?? null
  );
  const [muscle, setMuscle] = useState<MuscleId | null>((params.muscle as MuscleId | undefined) ?? null);
  const [difficulty, setDifficulty] = useState<Difficulty[]>([]);
  const [equipment, setEquipment] = useState<EquipmentId[]>([]);
  const [purpose, setPurpose] = useState<PurposeId[]>([]);
  const [when, setWhen] = useState<WhenId[]>([]);

  const results = useMemo(
    () => filterExercises(query, { category, muscle, difficulty, equipment, purpose, when }),
    [query, category, muscle, difficulty, equipment, purpose, when]
  );

  const activeFilters =
    difficulty.length + equipment.length + purpose.length + when.length + (category ? 1 : 0) + (muscle ? 1 : 0);

  const reset = () => {
    setDifficulty([]);
    setEquipment([]);
    setPurpose([]);
    setWhen([]);
    setCategory(null);
    setMuscle(null);
  };

  return (
    <Screen>
      <ScreenHeader
        overline="LIBRARY"
        title="Find an exercise"
        onBack={() => (router.canGoBack() ? router.back() : router.replace('/exercises' as Href))}
      />

      <View style={styles.searchBar}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Search name, muscle, equipment…"
          placeholderTextColor={colors.faint}
          style={styles.searchInput}
          returnKeyType="search"
          autoFocus={!params.q && !params.muscle && !params.category}
        />
      </View>

      {category || muscle ? (
        <View style={styles.activeRow}>
          {category ? (
            <Chip
              label={CATEGORY_BY_ID[category].name}
              active
              onPress={() => setCategory(null)}
            />
          ) : null}
          {muscle ? (
            <Chip
              label={MUSCLE_BY_ID[muscle].name}
              active
              onPress={() => setMuscle(null)}
            />
          ) : null}
        </View>
      ) : null}

      <SectionTitle
        title={`${results.length} OF ${TOTAL_EXERCISES}`}
        action={
          activeFilters > 0 ? (
            <Text style={styles.reset} onPress={reset}>
              Reset filters
            </Text>
          ) : undefined
        }
      />

      <FilterRow label="CATEGORY">
        {CATEGORIES.map((item) => (
          <Chip
            key={item.id}
            label={item.name}
            active={category === item.id}
            color={item.accent}
            onPress={() => setCategory(category === item.id ? null : item.id)}
          />
        ))}
      </FilterRow>

      <FilterRow label="DIFFICULTY">
        {DIFFICULTIES.map((item) => (
          <Chip
            key={item}
            label={DIFFICULTY_LABELS[item]}
            active={difficulty.includes(item)}
            onPress={() => setDifficulty(toggle(difficulty, item))}
          />
        ))}
      </FilterRow>

      <FilterRow label="EQUIPMENT">
        {EQUIPMENT.map((item) => (
          <Chip
            key={item}
            label={EQUIPMENT_LABELS[item]}
            active={equipment.includes(item)}
            color={colors.violet}
            onPress={() => setEquipment(toggle(equipment, item))}
          />
        ))}
      </FilterRow>

      <FilterRow label="PURPOSE">
        {PURPOSES.map((item) => (
          <Chip
            key={item}
            label={PURPOSE_LABELS[item]}
            active={purpose.includes(item)}
            color={colors.blue}
            onPress={() => setPurpose(toggle(purpose, item))}
          />
        ))}
      </FilterRow>

      <FilterRow label="WHEN">
        {WHENS.map((item) => (
          <Chip
            key={item}
            label={WHEN_LABELS[item]}
            active={when.includes(item)}
            color={colors.green}
            onPress={() => setWhen(toggle(when, item))}
          />
        ))}
      </FilterRow>

      <View style={styles.results}>
        {results.length === 0 ? (
          <Text style={styles.empty}>No exercises match those filters. Try clearing one.</Text>
        ) : (
          results.map((exercise) => (
            <ExerciseRow
              key={exercise.id}
              exercise={exercise}
              onPress={() => go(`/exercise/${exercise.id}`)}
            />
          ))
        )}
      </View>
    </Screen>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.filterRow}>
      <Text style={styles.filterLabel}>{label}</Text>
      <View style={styles.chips}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  searchBar: {
    height: 48,
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchInput: { color: colors.text, fontSize: 13.5 },
  activeRow: { flexDirection: 'row', gap: 6 },
  reset: { color: colors.accent, fontSize: 11.5, fontWeight: '700' },
  filterRow: { gap: 7 },
  filterLabel: { color: colors.faint, ...font.label, fontSize: 8.5 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  results: { gap: 8 },
  empty: { color: colors.muted, fontSize: 12.5, lineHeight: 18, paddingVertical: 12 },
});

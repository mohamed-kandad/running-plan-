import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import {
  Animated,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { CATEGORY_BY_ID } from '@/lib/exercises/categories';
import { getExerciseImages } from '@/lib/exercises';
import type { Category, Exercise, Routine } from '@/lib/exercises/types';
import { DIFFICULTY_LABELS, EQUIPMENT_LABELS } from '@/lib/exercises/types';
import { MUSCLE_BY_ID } from '@/lib/exercises/muscles';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

/* --------------------------------------------------------------------------- */
/* Header                                                                       */
/* --------------------------------------------------------------------------- */
export function ScreenHeader({
  title,
  overline,
  subtitle,
  onBack,
  right,
}: {
  title: string;
  overline?: string;
  subtitle?: string;
  onBack?: () => void;
  right?: React.ReactNode;
}) {
  return (
    <View style={styles.header}>
      {onBack ? (
        <Pressable
          onPress={onBack}
          hitSlop={10}
          style={({ pressed }) => [styles.back, pressed && { opacity: 0.7 }]}
          accessibilityRole="button"
          accessibilityLabel="Go back">
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>
      ) : null}
      <View style={styles.headerText}>
        {overline ? <Text style={styles.overline}>{overline}</Text> : null}
        <Text style={styles.title} numberOfLines={1}>
          {title}
        </Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  );
}

/* --------------------------------------------------------------------------- */
/* Images                                                                       */
/* --------------------------------------------------------------------------- */
/** The runner's own photo wins over everything else for this exercise. */
export function useExerciseImage(id: string) {
  const { customExerciseImages } = useApp();
  const custom = customExerciseImages[id];
  if (custom) return { source: { uri: custom }, label: 'Your image' };
  return primaryImage(id);
}

/** Cards prefer the last real photo (the working position); falls back to the first image. */
export function primaryImage(id: string) {
  const images = getExerciseImages(id);
  const photos = images.filter((image) => image.label.startsWith('Photo'));
  return photos.length > 0 ? photos[photos.length - 1] : images[0];
}

export function ExerciseThumb({
  id,
  size = 62,
  rounded = 16,
}: {
  id: string;
  size?: number;
  rounded?: number;
}) {
  const image = useExerciseImage(id);
  if (!image) {
    return (
      <View
        style={[
          styles.thumbFallback,
          { width: size, height: size, borderRadius: rounded },
        ]}>
        <Ionicons name="fitness-outline" size={size * 0.38} color={colors.faint} />
      </View>
    );
  }
  return (
    <Image
      source={image.source}
      style={{ width: size, height: size, borderRadius: rounded, backgroundColor: colors.surfaceAlt }}
      resizeMode="cover"
      accessibilityIgnoresInvertColors
    />
  );
}

/** Paged illustration gallery with frame labels. */
export function Gallery({ id }: { id: string }) {
  const { customExerciseImages } = useApp();
  const custom = customExerciseImages[id];
  const images = custom
    ? [{ source: { uri: custom } as const, label: 'Your image' }, ...getExerciseImages(id)]
    : getExerciseImages(id);
  const customCount = custom ? 1 : 0;
  const { width } = useWindowDimensions();
  const [index, setIndex] = useState(0);
  const photoCount = images.filter((image) => image.label.startsWith('Photo')).length;
  const guideCount = images.length - photoCount;
  const pageWidth = Math.min(width - 40, 460);
  const pageHeight = Math.round(pageWidth * 0.82);

  if (images.length === 0) {
    return (
      <View style={[styles.galleryEmpty, { height: pageHeight }]}>
        <Ionicons name="image-outline" size={30} color={colors.faint} />
        <Text style={styles.galleryEmptyText}>No illustration available</Text>
      </View>
    );
  }

  return (
    <View style={styles.gallery}>
      <ScrollView
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) =>
          setIndex(Math.round(event.nativeEvent.contentOffset.x / pageWidth))
        }>
        {images.map((image, i) => (
          <View key={i} style={{ width: pageWidth }}>
            <View style={[styles.galleryFrame, { height: pageHeight }]}>
              <Image
                source={image.source}
                style={{ width: '100%', height: '100%' }}
                resizeMode="contain"
                accessibilityIgnoresInvertColors
                accessibilityLabel={`${image.label} position`}
              />
              <View style={styles.galleryLabel}>
                <Text style={styles.galleryLabelText}>{image.label.toUpperCase()}</Text>
              </View>
            </View>
          </View>
        ))}
      </ScrollView>
      {images.length > 1 ? (
        <View style={styles.dots}>
          {images.map((_, i) => (
            <View key={i} style={[styles.dot, i === index && styles.dotActive]} />
          ))}
        </View>
      ) : null}
      <Text style={styles.galleryHint}>
        {customCount > 0 ? 'Your image' : ''}
        {customCount > 0 && (photoCount > 0 || guideCount > 0) ? ' · ' : ''}
        {photoCount > 0
          ? `${photoCount} photo${photoCount === 1 ? '' : 's'}${
              guideCount ? ` + ${guideCount} illustrated frame${guideCount === 1 ? '' : 's'}` : ''
            }`
          : guideCount > 0
            ? `Schematic movement guide · ${guideCount} frame${guideCount === 1 ? '' : 's'}`
            : ''}
      </Text>
      {photoCount > 0 ? (
        <Text style={styles.galleryCredit}>
          Photos:{' '}
          {[...new Set(images.map((image) => image.credit).filter(Boolean))].join(' · ') ||
            'Free Exercise DB · public domain'}
        </Text>
      ) : null}
    </View>
  );
}

/* --------------------------------------------------------------------------- */
/* Cards                                                                        */
/* --------------------------------------------------------------------------- */
export function ExerciseRow({
  exercise,
  onPress,
  prescription,
}: {
  exercise: Exercise;
  onPress: () => void;
  prescription?: string | null;
}) {
  const category = CATEGORY_BY_ID[exercise.categories[0]];
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${exercise.name}, ${DIFFICULTY_LABELS[exercise.difficulty]}`}>
      <ExerciseThumb id={exercise.id} size={58} rounded={14} />
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.rowMeta} numberOfLines={1}>
          {category?.name}
          {exercise.primaryMuscles.length
            ? ` · ${exercise.primaryMuscles
                .slice(0, 2)
                .map((id) => MUSCLE_BY_ID[id].name)
                .join(', ')}`
            : ''}
        </Text>
        {prescription ? (
          <Text style={styles.rowRx} numberOfLines={1}>
            {prescription} in this workout
          </Text>
        ) : null}
      </View>
      <View style={styles.rowRight}>
        <Text style={styles.rowDifficulty}>{DIFFICULTY_LABELS[exercise.difficulty]}</Text>
        <Ionicons name="chevron-forward" size={15} color={colors.faint} />
      </View>
    </Pressable>
  );
}

export function ExerciseCard({
  exercise,
  onPress,
  width = 178,
}: {
  exercise: Exercise;
  onPress: () => void;
  width?: number;
}) {
  const category = CATEGORY_BY_ID[exercise.categories[0]];
  const image = useExerciseImage(exercise.id);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.card, { width }, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={exercise.name}>
      <View style={[styles.cardImageWrap, { height: width * 0.72 }]}>
        {image ? (
          <Image source={image.source} style={styles.cardImage} resizeMode="cover" />
        ) : null}
        <View style={[styles.cardCategory, { borderColor: `${category?.accent ?? colors.accent}66` }]}>
          <Text style={[styles.cardCategoryText, { color: category?.accent ?? colors.accent }]}>
            {category?.name ?? 'Exercise'}
          </Text>
        </View>
      </View>
      <View style={styles.cardCopy}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {exercise.name}
        </Text>
        <Text style={styles.cardMeta} numberOfLines={1}>
          {DIFFICULTY_LABELS[exercise.difficulty]} · {exercise.durationMin} min
        </Text>
      </View>
    </Pressable>
  );
}

export function CategoryCard({
  category,
  count,
  onPress,
}: {
  category: Category;
  count: number;
  onPress: () => void;
}) {
  const hero = useExerciseImage(category.heroExerciseId);
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.categoryCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${category.name}, ${count} exercises`}>
      <View style={styles.categoryImageWrap}>
        {hero ? <Image source={hero.source} style={styles.categoryImage} resizeMode="cover" /> : null}
        <View style={[styles.categoryIcon, { backgroundColor: `${category.accent}22` }]}>
          <Ionicons
            name={category.icon as keyof typeof Ionicons.glyphMap}
            size={16}
            color={category.accent}
          />
        </View>
      </View>
      <View style={styles.categoryCopy}>
        <View style={styles.categoryTitleRow}>
          <Text style={styles.categoryTitle} numberOfLines={1}>
            {category.name}
          </Text>
          <Text style={[styles.categoryCount, { color: category.accent }]}>{count}</Text>
        </View>
        <Text style={styles.categoryDesc} numberOfLines={2}>
          {category.description}
        </Text>
      </View>
      <Ionicons name="chevron-forward" size={16} color={colors.faint} />
    </Pressable>
  );
}

export function RoutineCard({ routine, onPress }: { routine: Routine; onPress: () => void }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [styles.routineCard, pressed && styles.pressed]}
      accessibilityRole="button"
      accessibilityLabel={`${routine.name}, ${routine.durationMin} minutes`}>
      <View style={styles.routineIcon}>
        <Ionicons name="timer-outline" size={18} color={colors.accent} />
      </View>
      <View style={styles.routineCopy}>
        <Text style={styles.routineTitle} numberOfLines={1}>
          {routine.name}
        </Text>
        <Text style={styles.routineMeta} numberOfLines={1}>
          {routine.durationMin} min · {routine.steps.length} exercises
        </Text>
      </View>
      <Ionicons name="play-circle" size={24} color={colors.accent} />
    </Pressable>
  );
}

/* --------------------------------------------------------------------------- */
/* Chips                                                                        */
/* --------------------------------------------------------------------------- */
export function Chip({
  label,
  active,
  onPress,
  color = colors.accent,
}: {
  label: string;
  active?: boolean;
  onPress?: () => void;
  color?: string;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={!onPress}
      style={({ pressed }) => [
        styles.chip,
        active && { backgroundColor: `${color}22`, borderColor: color },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityState={onPress ? { selected: !!active } : undefined}>
      <Text style={[styles.chipText, active && { color }]}>{label}</Text>
    </Pressable>
  );
}

export function MuscleChips({ exercise }: { exercise: Exercise }) {
  return (
    <View style={styles.muscleGroups}>
      <View style={styles.muscleGroup}>
        <Text style={styles.muscleGroupLabel}>PRIMARY</Text>
        <View style={styles.chipRow}>
          {exercise.primaryMuscles.map((id) => (
            <Chip key={id} label={MUSCLE_BY_ID[id].name} active color={colors.accent} />
          ))}
        </View>
      </View>
      {exercise.secondaryMuscles.length > 0 ? (
        <View style={styles.muscleGroup}>
          <Text style={styles.muscleGroupLabel}>SECONDARY</Text>
          <View style={styles.chipRow}>
            {exercise.secondaryMuscles.map((id) => (
              <Chip key={id} label={MUSCLE_BY_ID[id].name} color={colors.blue} />
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

export function EquipmentChips({ exercise }: { exercise: Exercise }) {
  return (
    <View style={styles.chipRow}>
      {exercise.equipment.map((id) => (
        <Chip key={id} label={EQUIPMENT_LABELS[id]} color={colors.violet} />
      ))}
    </View>
  );
}

/* --------------------------------------------------------------------------- */
/* Small pieces                                                                 */
/* --------------------------------------------------------------------------- */
export function EmptyState({ title, body }: { title: string; body: string }) {
  return (
    <View style={styles.empty}>
      <Ionicons name="book-outline" size={26} color={colors.faint} />
      <Text style={styles.emptyTitle}>{title}</Text>
      <Text style={styles.emptyBody}>{body}</Text>
    </View>
  );
}

export function ProgressBar({ value, color = colors.accent }: { value: number; color?: string }) {
  return (
    <View style={styles.progressTrack}>
      <View
        style={[
          styles.progressFill,
          { width: `${Math.round(Math.min(1, Math.max(0, value)) * 100)}%`, backgroundColor: color },
        ]}
      />
    </View>
  );
}

export function FadeIn({ children }: { children: React.ReactNode }) {
  const [value] = useState(() => new Animated.Value(0));
  React.useEffect(() => {
    Animated.timing(value, { toValue: 1, duration: 260, useNativeDriver: true }).start();
  }, [value]);
  return <Animated.View style={{ opacity: value }}>{children}</Animated.View>;
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingTop: 8,
    paddingBottom: 2,
  },
  back: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerText: { flex: 1, gap: 2 },
  overline: { color: colors.muted, ...font.label, fontSize: 10 },
  title: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 27,
    letterSpacing: -0.6,
  },
  subtitle: { color: colors.muted, fontSize: 12.5, lineHeight: 17 },

  thumbFallback: {
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },

  gallery: { gap: 10 },
  galleryFrame: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  galleryLabel: {
    position: 'absolute',
    left: 12,
    top: 12,
    backgroundColor: 'rgba(13,15,18,0.8)',
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  galleryLabelText: { color: colors.accent, ...font.mono, fontSize: 9, letterSpacing: 1.4 },
  galleryHint: { color: colors.faint, fontSize: 10.5, textAlign: 'center' },
  galleryCredit: { color: colors.muted, fontSize: 9, textAlign: 'center', marginTop: -4 },
  galleryEmpty: {
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  galleryEmptyText: { color: colors.faint, fontSize: 12 },
  dots: { flexDirection: 'row', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.surfaceAlt },
  dotActive: { backgroundColor: colors.accent, width: 16 },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  rowCopy: { flex: 1, gap: 3, minWidth: 0 },
  rowTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 14.5,
  },
  rowMeta: { color: colors.muted, fontSize: 11.5 },
  rowRx: { color: colors.accent, fontSize: 10.5, fontWeight: '600' },
  rowRight: { alignItems: 'flex-end', gap: 6 },
  rowDifficulty: { color: colors.faint, ...font.mono, fontSize: 8.5, textTransform: 'uppercase' },

  card: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  cardImageWrap: { backgroundColor: colors.surfaceAlt },
  cardImage: { width: '100%', height: '100%' },
  cardCategory: {
    position: 'absolute',
    left: 8,
    bottom: 8,
    backgroundColor: 'rgba(13,15,18,0.82)',
    borderRadius: radius.pill,
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  cardCategoryText: { fontSize: 8.5, fontWeight: '700', letterSpacing: 0.4 },
  cardCopy: { padding: 10, gap: 2 },
  cardTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 13.5,
  },
  cardMeta: { color: colors.faint, fontSize: 10 },

  categoryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  categoryImageWrap: {
    width: 64,
    height: 64,
    borderRadius: 16,
    overflow: 'hidden',
    backgroundColor: colors.surfaceAlt,
  },
  categoryImage: { width: '100%', height: '100%' },
  categoryIcon: {
    position: 'absolute',
    left: 4,
    top: 4,
    width: 24,
    height: 24,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  categoryCopy: { flex: 1, gap: 3, minWidth: 0 },
  categoryTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  categoryTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 15,
    flexShrink: 1,
  },
  categoryCount: { ...font.mono, fontSize: 10 },
  categoryDesc: { color: colors.muted, fontSize: 11, lineHeight: 15 },

  routineCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
  },
  routineIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: colors.accentTint,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineCopy: { flex: 1, gap: 2 },
  routineTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 14,
  },
  routineMeta: { color: colors.muted, fontSize: 11 },

  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  chipText: { color: colors.muted, fontSize: 11, fontWeight: '600' },

  muscleGroups: { gap: 10 },
  muscleGroup: { gap: 6 },
  muscleGroupLabel: { color: colors.faint, ...font.label, fontSize: 9 },

  empty: {
    alignItems: 'center',
    gap: 8,
    padding: 26,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: colors.borderStrong,
  },
  emptyTitle: { color: colors.text, fontWeight: '700', fontSize: 14 },
  emptyBody: { color: colors.muted, fontSize: 11.5, textAlign: 'center', lineHeight: 16 },

  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: { height: '100%', borderRadius: 3 },

  pressed: { opacity: 0.78, transform: [{ scale: 0.995 }] },
});

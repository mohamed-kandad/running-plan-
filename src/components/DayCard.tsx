import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import React, { useEffect, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import type { Workout } from '@/lib/types';
import { colors, radius } from '@/theme';

type DayCardProps = {
  index?: number;
  date: string;
  workout: Workout | null;
  completed: boolean;
  today: boolean;
  weekMaxKm: number;
  onPress?: () => void;
};

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

export function DayCard({
  index = 0,
  date,
  workout,
  completed,
  today,
  weekMaxKm,
  onPress,
}: DayCardProps) {
  // These props remain part of the existing PlanScreen API.
  // The compact weekly-card design does not use distance scaling.
  void weekMaxKm;

  const [fade] = useState(() => new Animated.Value(0));
  const [translateY] = useState(() => new Animated.Value(6));
  const [scale] = useState(() => new Animated.Value(1));

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fade, {
        toValue: 1,
        duration: 240,
        delay: Math.min(index * 30, 180),
        useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0,
        friction: 8,
        tension: 75,
        delay: Math.min(index * 30, 180),
        useNativeDriver: true,
      }),
    ]).start();
  }, [fade, index, translateY]);

  const parsedDate = (() => {
    const [year, month, day] = date.split('-').map(Number);
    return new Date(year, month - 1, day);
  })();

  const dayLabel = DAY_LABELS[parsedDate.getDay()];
  const dayNumber = date.slice(8, 10);

  const handlePressIn = () => {
    if (!workout || !onPress) return;
    Animated.spring(scale, {
      toValue: 0.99,
      friction: 7,
      tension: 140,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      friction: 6,
      tension: 120,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (!workout || !onPress) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
    onPress();
  };

  return (
    <Animated.View
      style={{
        opacity: fade,
        transform: [{ translateY }, { scale }],
      }}
    >
      <Pressable
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={!workout || !onPress}
        accessibilityRole={workout && onPress ? 'button' : undefined}
        accessibilityLabel={
          workout
            ? `${dayLabel} ${dayNumber}, ${workout.title}, ${workout.distanceKm} kilometres${completed ? ', completed' : ''}`
            : `${dayLabel} ${dayNumber}, rest day`
        }
        style={({ pressed }) => [
          styles.card,
          today && styles.cardToday,
          completed && workout && styles.cardCompleted,
          pressed && workout && styles.cardPressed,
        ]}
      >
        <View style={styles.date}>
          <Text style={[styles.dayName, today && styles.todayText]}>
            {dayLabel}
          </Text>
          <Text style={styles.dayNumber}>{dayNumber}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.info}>
          <Text style={styles.title} numberOfLines={1}>
            {workout ? workout.title : 'Rest day'}
          </Text>
          <Text style={styles.type} numberOfLines={1}>
            {workout ? workout.type.toUpperCase() : 'RECOVERY'}
          </Text>
        </View>

        <View style={styles.right}>
          {workout ? (
            <>
              <Text style={styles.distance}>{workout.distanceKm} km</Text>
              <View style={[styles.status, completed && styles.statusDone]}>
                <Ionicons
                  name={completed ? 'checkmark' : 'chevron-forward'}
                  size={12}
                  color={completed ? colors.accent : colors.faint}
                />
              </View>
            </>
          ) : (
            <Ionicons name="moon-outline" size={17} color={colors.faint} />
          )}
        </View>
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 62,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.md ?? 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 11,
  },
  cardToday: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  cardCompleted: {
    borderColor: `${colors.accent}55`,
  },
  cardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  date: {
    width: 35,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  dayName: {
    color: colors.faint,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  todayText: {
    color: colors.accent,
  },
  dayNumber: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  divider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  info: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  title: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '700',
  },
  type: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  right: {
    minWidth: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
  },
  distance: {
    color: colors.accent,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 12,
    fontWeight: '700',
    fontStyle: 'italic',
  },
  status: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  statusDone: {
    backgroundColor: `${colors.accent}1A`,
  },
});

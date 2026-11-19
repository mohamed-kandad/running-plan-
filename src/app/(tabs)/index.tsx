import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import { Animated, Pressable, StyleSheet, Text, View } from 'react-native';

import { LogRunSheet } from '@/components/LogRunSheet';
import { NoPlanCard } from '@/components/NoPlanCard';
import { Screen, SectionTitle } from '@/components/ui';
import { addDays, diffDays, formatLongShort, startOfWeek, todayISO } from '@/lib/date';
import { paceTarget, phaseLabel, planWeeks } from '@/lib/plan';
import { currentWeek, kmThisWeek } from '@/lib/stats';
import type { Workout } from '@/lib/types';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

export default function TodayScreen() {
  const { plan, runs, completedIds, settings, zones, completeWorkout, logRun } = useApp();
  const today = todayISO();
  const [sheetWorkout, setSheetWorkout] = useState<Workout | null>(null);
  const [quickLog, setQuickLog] = useState(false);

  const todayWorkout = plan.find((w) => w.date === today) ?? null;
  const doneToday = todayWorkout ? completedIds.has(todayWorkout.id) : false;
  const week = currentWeek(plan, today);
  const daysToRace = Math.max(0, diffDays(today, settings.raceDate));
  const weekDone = plan.filter((w) => w.week === week && completedIds.has(w.id)).length;
  const weekTotal = plan.filter((w) => w.week === week).length;
  const totalWeeks = planWeeks(settings);
  const phase = plan.length > 0 ? phaseLabel(week, totalWeeks) : 'No plan';

  const weekStart = startOfWeek(today);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
    const workout = plan.find((w) => w.date === date) ?? null;
    return { date, workout, completed: workout ? completedIds.has(workout.id) : false };
  });
  const weekTargetKm = plan
    .filter((w) => w.week === week)
    .reduce((sum, w) => sum + w.distanceKm, 0);
  const thisWeekKm = kmThisWeek(runs, today);

  const volumeRatio = weekTargetKm > 0 ? Math.min(1, thisWeekKm / weekTargetKm) : 0;
  const [progressAnim] = useState(() => new Animated.Value(0));

  useEffect(() => {
    Animated.timing(progressAnim, {
      toValue: volumeRatio,
      duration: 600,
      delay: 120,
      useNativeDriver: false,
    }).start();
  }, [volumeRatio, progressAnim]);

  const progressWidth = useMemo(
    () =>
      progressAnim.interpolate({
        inputRange: [0, 1],
        outputRange: ['0%', '100%'],
      }),
    [progressAnim]
  );

  const zone = todayWorkout ? zones[todayWorkout.zone - 1] : undefined;
  const hrTarget = zone ? `${zone.min}–${zone.max}` : '—';
  const paceText = todayWorkout ? paceTarget(todayWorkout.type, settings.level) : '—';
  const typeText = todayWorkout
    ? todayWorkout.type.charAt(0).toUpperCase() + todayWorkout.type.slice(1)
    : '';

  const handleSubmit = (input: Parameters<typeof completeWorkout>[1]) => {
    if (sheetWorkout) completeWorkout(sheetWorkout, input);
    else logRun({ ...input, date: today });
    setSheetWorkout(null);
    setQuickLog(false);
  };

  const openLog = () => (todayWorkout ? setSheetWorkout(todayWorkout) : setQuickLog(true));

  return (
    <Screen>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.overline}>{formatLongShort(today).toUpperCase()}</Text>
          <Text style={styles.greeting}>
            {plan.length === 0
              ? 'Ready when you are?'
              : daysToRace > 0
                ? `Ready to race in ${daysToRace}d?`
                : 'Ready to run?'}
          </Text>
        </View>
      </View>

      {plan.length === 0 ? (
        <>
          <NoPlanCard />
          <Pressable
            onPress={() => setQuickLog(true)}
            style={({ pressed }) => [styles.quickLog, pressed && { opacity: 0.85 }]}
          >
            <Ionicons name="add" size={16} color={colors.accent} />
            <Text style={styles.quickLogText}>Log a run instead</Text>
          </Pressable>
        </>
      ) : (
        <>
      {/* Weekly Volume Card */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>WEEKLY VOLUME</Text>
          <Text style={styles.cardAccent}>
            {thisWeekKm.toFixed(1)} / {weekTargetKm > 0 ? `${weekTargetKm} km` : 'no plan'}
          </Text>
        </View>

        <View style={styles.bigRow}>
          <Text style={styles.bigValue}>{thisWeekKm.toFixed(1)}</Text>
          <Text style={styles.bigUnit}>km</Text>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>
              {weekTargetKm > 0 ? Math.round((thisWeekKm / weekTargetKm) * 100) : 0}%
            </Text>
          </View>
          {weekTotal > 0 ? (
            <Text style={styles.bigSide}>
              {weekDone}/{weekTotal} done
            </Text>
          ) : null}
        </View>

        <View style={styles.progressTrack}>
          <Animated.View style={[styles.progressFill, { width: progressWidth }]} />
        </View>

        {/* Mini Bar Graph */}
        <View style={styles.miniBarsRow}>
          {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((dayLabel, idx) => {
            const dayInfo = weekDays[idx];
            const hasRun = dayInfo?.completed;
            const isTodayDay = dayInfo?.date === today;
            return (
              <View key={idx} style={styles.miniBarCol}>
                <View
                  style={[
                    styles.miniBar,
                    hasRun && styles.miniBarActive,
                    isTodayDay && !hasRun && styles.miniBarToday,
                  ]}
                />
                <Text style={[styles.miniBarText, isTodayDay && { color: colors.accent }]}>
                  {dayLabel}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Today's Workout Card (same design as Weekly Volume) */}
      <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardLabel}>TODAY&apos;S WORKOUT</Text>
          <Text style={styles.cardAccent}>{phase}</Text>
        </View>

        {todayWorkout ? (
          <>
            <View style={styles.bigRow}>
              <Text style={styles.bigValue}>{todayWorkout.distanceKm}</Text>
              <Text style={styles.bigUnit}>km</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{doneToday ? 'DONE' : typeText.toUpperCase()}</Text>
              </View>
              <Text style={styles.bigSide}>Zone {todayWorkout.zone}</Text>
            </View>

            <Text style={styles.workoutTitle} numberOfLines={1}>
              {todayWorkout.title}
            </Text>

            <View style={styles.statsRow}>
              <View style={styles.statCol}>
                <Ionicons name="speedometer-outline" size={14} color={colors.muted} />
                <Text style={styles.statValue}>{paceText}</Text>
                <Text style={styles.statLabel}>PACE</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Ionicons name="heart-outline" size={14} color={colors.muted} />
                <Text style={styles.statValue}>{hrTarget}</Text>
                <Text style={styles.statLabel}>HR (BPM)</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statCol}>
                <Ionicons name="fitness-outline" size={14} color={colors.muted} />
                <Text style={styles.statValue}>{typeText}</Text>
                <Text style={styles.statLabel}>TYPE</Text>
              </View>
            </View>
          </>
        ) : (
          <>
            <View style={styles.bigRow}>
              <Text style={styles.bigValue}>Rest</Text>
              <View style={styles.badge}>
                <Text style={styles.badgeText}>RECOVERY</Text>
              </View>
            </View>
            <Text style={styles.workoutTitle}>No workout planned today</Text>
          </>
        )}

        <View style={styles.actionsRow}>
          <Pressable
            onPress={openLog}
            style={({ pressed }) => [
              styles.primaryBtn,
              doneToday && styles.primaryBtnDone,
              pressed && { opacity: 0.9 },
            ]}
          >
            <Ionicons
              name={doneToday ? 'checkmark' : 'play'}
              size={16}
              color={doneToday ? colors.accent : colors.accentInk}
            />
            <Text style={[styles.primaryBtnText, doneToday && { color: colors.accent }]}>
              {doneToday ? 'Completed' : todayWorkout ? 'Log run' : 'Log a run'}
            </Text>
          </Pressable>
          <Pressable
            onPress={() => router.navigate('/plan')}
            style={({ pressed }) => [styles.secondaryBtn, pressed && { opacity: 0.8 }]}
          >
            <Text style={styles.secondaryBtnText}>Plan</Text>
          </Pressable>
        </View>
      </View>

      <SectionTitle
        title="This week"
        action={
          <Pressable onPress={() => router.navigate('/plan')} hitSlop={8}>
            <Text style={styles.link}>See plan</Text>
          </Pressable>
        }
      />
      <View style={styles.weekList}>
        {weekDays.map(({ date, workout, completed }, index) => {
          const isToday = date === today;
          const dayLabel = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'][index];
          const dayNumber = date.slice(8, 10);

          return (
            <Pressable
              key={date}
              disabled={!workout}
              onPress={workout ? () => setSheetWorkout(workout) : undefined}
              style={({ pressed }) => [
                styles.weekDayCard,
                isToday && styles.weekDayCardToday,
                completed && styles.weekDayCardCompleted,
                pressed && workout && styles.weekDayCardPressed,
              ]}
            >
              <View style={styles.weekDayDate}>
                <Text style={[styles.weekDayName, isToday && styles.weekDayTodayText]}>
                  {dayLabel}
                </Text>
                <Text style={styles.weekDayNumber}>{dayNumber}</Text>
              </View>

              <View style={styles.weekDayDivider} />

              <View style={styles.weekDayInfo}>
                <Text style={styles.weekDayTitle} numberOfLines={1}>
                  {workout ? workout.title : 'Rest day'}
                </Text>
                <Text style={styles.weekDayType} numberOfLines={1}>
                  {workout ? workout.type.toUpperCase() : 'RECOVERY'}
                </Text>
              </View>

              <View style={styles.weekDayRight}>
                {workout ? (
                  <>
                    <Text style={styles.weekDayDistance}>{workout.distanceKm} km</Text>
                    <View style={[styles.weekDayStatus, completed && styles.weekDayStatusDone]}>
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
          );
        })}
      </View>
        </>
      )}

      <LogRunSheet
        key={sheetWorkout?.id ?? (quickLog ? 'quick' : 'none')}
        workout={sheetWorkout ?? (quickLog ? quickWorkout : null)}
        onClose={() => {
          setSheetWorkout(null);
          setQuickLog(false);
        }}
        onSubmit={handleSubmit}
      />
    </Screen>
  );
}

const quickWorkout: Workout = {
  id: '',
  date: todayISO(),
  week: 0,
  type: 'easy',
  title: 'Easy run',
  detail: '',
  distanceKm: 5,
  zone: 2,
};

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'flex-start', paddingTop: 8 },
  headerText: { flex: 1, gap: 4 },
  overline: {
    color: colors.accent,
    ...font.label,
    fontSize: 11,
  },
  greeting: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.5,
  },

  /* ---------- Shared card design (Weekly Volume + Today's Workout) ---------- */
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 16,
    paddingHorizontal: 18,
    gap: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardLabel: {
    color: colors.muted,
    fontWeight: '500' as const,
    fontSize: 11,
    fontFamily: 'Archivo-BoldItalic',
    letterSpacing: 1.1,
    textTransform: 'uppercase' as const,

  },
  cardAccent: {
    color: colors.accent,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 13,
    fontWeight: '700',
  },
  bigRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  bigValue: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 36,
    letterSpacing: -1,
  },
  bigUnit: {
    color: colors.muted,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 16,
    fontWeight: '700',
  },
  badge: {
    backgroundColor: `${colors.accent}1A`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: radius.pill,
    marginLeft: 8,
  },
  badgeText: {
    color: colors.accent,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 13,
    fontWeight: '700',
  },
  bigSide: {
    color: colors.faint,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
    marginLeft: 6,
  },

  /* ---------- Weekly volume specifics ---------- */
  progressTrack: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.surfaceAlt,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accent,
  },
  miniBarsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 4,
  },
  miniBarCol: {
    alignItems: 'center',
    gap: 6,
    flex: 1,
  },
  miniBar: {
    width: 24,
    height: 28,
    borderRadius: 6,
    backgroundColor: colors.surfaceAlt,
  },
  miniBarActive: {
    backgroundColor: colors.accent,
  },
  miniBarToday: {
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  miniBarText: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
    fontStyle: 'italic',
  },

  /* ---------- Today's workout specifics ---------- */
  workoutTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 16,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md ?? 12,
    paddingVertical: 12,
  },
  statCol: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  statDivider: {
    width: 1,
    height: 32,
    backgroundColor: colors.border,
  },
  statValue: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 14,
  },
  statLabel: {
    color: colors.faint,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.5,
    fontStyle: 'italic',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: colors.accent,
    borderRadius: radius.pill,
    paddingVertical: 12,
    borderWidth: 1.5,
    borderColor: colors.accent,
  },
  primaryBtnDone: {
    backgroundColor: `${colors.accent}1A`,
  },
  primaryBtnText: {
    color: colors.accentInk,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 14,
  },
  secondaryBtn: {
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  secondaryBtnText: {
    color: colors.muted,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 13,
  },

  link: { color: colors.accent, fontFamily: 'Archivo-BoldItalic', fontWeight: '700', fontSize: 12 },
  quickLog: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceAlt,
  },
  quickLogText: {
    color: colors.muted,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 13,
  },
  /* ---------- Compact This Week cards ---------- */
  weekList: {
    gap: 7,
  },
  weekDayCard: {
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
  weekDayCardToday: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceAlt,
  },
  weekDayCardCompleted: {
    borderColor: `${colors.accent}55`,
  },
  weekDayCardPressed: {
    opacity: 0.75,
    transform: [{ scale: 0.99 }],
  },
  weekDayDate: {
    width: 35,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  weekDayName: {
    color: colors.faint,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 9,
    letterSpacing: 0.6,
  },
  weekDayTodayText: {
    color: colors.accent,
  },
  weekDayNumber: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  weekDayDivider: {
    width: 1,
    height: 30,
    backgroundColor: colors.border,
  },
  weekDayInfo: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  weekDayTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 12,
    fontWeight: '700',
  },
  weekDayType: {
    color: colors.faint,
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.7,
  },
  weekDayRight: {
    minWidth: 55,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 7,
  },
  weekDayDistance: {
    color: colors.accent,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 12,
    fontWeight: '700',
  },
  weekDayStatus: {
    width: 21,
    height: 21,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  weekDayStatusDone: {
    backgroundColor: `${colors.accent}1A`,
  },
});
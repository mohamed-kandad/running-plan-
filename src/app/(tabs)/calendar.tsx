import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { DayCard } from '@/components/DayCard';
import { LogRunSheet } from '@/components/LogRunSheet';
import { Button, Card, Screen, SectionTitle, Stat } from '@/components/ui';
import {
  addDays,
  addMonths,
  dayNumber,
  formatDuration,
  formatPace,
  formatShort,
  inMonth,
  isToday,
  monthGrid,
  monthLabel,
  startOfMonth,
  startOfWeek,
  todayISO,
} from '@/lib/date';
import { typeColor } from '@/lib/workouts';
import type { RunLog, Workout } from '@/lib/types';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

const WEEKDAY_HEADERS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function weekStreak(runs: RunLog[], today: string): number {
  const weeks = new Set(runs.map((run) => startOfWeek(run.date)));
  let cursor = startOfWeek(today);
  if (!weeks.has(cursor)) cursor = addDays(cursor, -7);
  let streak = 0;
  while (weeks.has(cursor)) {
    streak += 1;
    cursor = addDays(cursor, -7);
  }
  return streak;
}

export default function CalendarScreen() {
  const { plan, runs, completedIds, completeWorkout } = useApp();
  const today = todayISO();
  const [month, setMonth] = useState(() => startOfMonth(today));
  const [selected, setSelected] = useState(today);
  const [sheetWorkout, setSheetWorkout] = useState<Workout | null>(null);

  const days = useMemo(() => monthGrid(month), [month]);
  const plannedByDate = useMemo(() => {
    const map = new Map<string, Workout>();
    plan.forEach((workout) => map.set(workout.date, workout));
    return map;
  }, [plan]);
  const runsByDate = useMemo(() => {
    const map = new Map<string, RunLog[]>();
    runs.forEach((run) => {
      const list = map.get(run.date) ?? [];
      list.push(run);
      map.set(run.date, list);
    });
    return map;
  }, [runs]);

  const changeMonth = (delta: number) => {
    const next = addMonths(month, delta);
    setMonth(next);
    if (!inMonth(selected, next)) setSelected(next);
  };

  const monthRuns = runs.filter((run) => inMonth(run.date, month));
  const monthKm = monthRuns.reduce((sum, run) => sum + run.distanceKm, 0);
  const streak = weekStreak(runs, today);
  const selectedRuns = runsByDate.get(selected) ?? [];
  const selectedWorkout = plannedByDate.get(selected) ?? null;

  return (
    <Screen>
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.overline}>TRAINING LOG</Text>
          <Text style={styles.title}>Calendar</Text>
        </View>
        <View style={styles.monthNav}>
          <Pressable onPress={() => changeMonth(-1)} hitSlop={8} style={styles.navButton}>
            <Ionicons name="chevron-back" size={17} color={colors.text} />
          </Pressable>
          <Pressable onPress={() => changeMonth(1)} hitSlop={8} style={styles.navButton}>
            <Ionicons name="chevron-forward" size={17} color={colors.text} />
          </Pressable>
        </View>
      </View>

      <Card style={styles.monthCard}>
        <View style={styles.monthHeader}>
          <Text style={styles.monthTitle}>{monthLabel(month)}</Text>
          <Pressable
            onPress={() => {
              setMonth(startOfMonth(today));
              setSelected(today);
            }}
            hitSlop={8}
          >
            <Text style={styles.todayLink}>Today</Text>
          </Pressable>
        </View>

        <View style={styles.statsRow}>
          <Stat value={`${streak}`} label={streak === 1 ? 'week streak' : 'weeks streak'} accent={colors.accent} />
          <Stat value={`${monthRuns.length}`} label="sessions" />
          <Stat value={`${monthKm.toFixed(0)}`} label="km this month" />
        </View>

        <View style={styles.weekHeader}>
          {WEEKDAY_HEADERS.map((letter, index) => (
            <Text key={`${letter}-${index}`} style={styles.weekHeaderText}>
              {letter}
            </Text>
          ))}
        </View>

        <View style={styles.grid}>
          {days.map((date) => {
            const dayRuns = runsByDate.get(date) ?? [];
            const workout = plannedByDate.get(date);
            const trained = dayRuns.length > 0;
            const outside = !inMonth(date, month);
            const todayCell = isToday(date);
            const selectedCell = date === selected;
            return (
              <Pressable
                key={date}
                onPress={() => setSelected(date)}
                style={styles.cell}
                hitSlop={2}
              >
                <View
                  style={[
                    styles.dayCircle,
                    outside && styles.dayCircleOutside,
                    todayCell && styles.dayCircleToday,
                    selectedCell && !todayCell && styles.dayCircleSelected,
                  ]}
                >
                  {trained ? (
                    <View style={[styles.trainedCircle, outside && styles.trainedCircleOutside]}>
                      <MaterialCommunityIcons
                        name="shoe-sneaker"
                        size={22}
                        color={colors.accentInk}
                      />
                    </View>
                  ) : (
                    <Text
                      style={[
                        styles.dayNumberText,
                        outside && styles.dayNumberOutside,
                        todayCell && styles.dayNumberToday,
                      ]}
                    >
                      {dayNumber(date)}
                    </Text>
                  )}
                </View>
                {workout && !trained && !outside ? (
                  <View style={[styles.calDot, { backgroundColor: typeColor(workout.type) }]} />
                ) : (
                  <View style={styles.dotPlaceholder} />
                )}
              </Pressable>
            );
          })}
        </View>

        <View style={styles.legend}>
          <View style={styles.legendItem}>
            <View style={styles.legendShoe}>
              <MaterialCommunityIcons name="shoe-sneaker" size={13} color={colors.accentInk} />
            </View>
            <Text style={styles.legendText}>trained</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendDot, { backgroundColor: colors.blue }]} />
            <Text style={styles.legendText}>scheduled</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={styles.legendRing} />
            <Text style={styles.legendText}>today</Text>
          </View>
        </View>
      </Card>

      <SectionTitle
        title={isToday(selected) ? 'TODAY' : formatShort(selected).toUpperCase()}
        action={
          selectedWorkout ? (
            <Text style={styles.meta}>
              {completedIds.has(selectedWorkout.id) ? 'completed' : 'planned'}
            </Text>
          ) : undefined
        }
      />

      {selectedRuns.length > 0 ? (
        <View style={styles.runList}>
          {selectedRuns.map((run) => (
            <View key={run.id} style={styles.runRow}>
              <View style={styles.runIcon}>
                <MaterialCommunityIcons name="shoe-sneaker" size={17} color={colors.accent} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text style={styles.runTitle}>
                  {selectedWorkout?.title ?? 'Run'}
                </Text>
                <Text style={styles.meta}>
                  {run.distanceKm} km · {formatDuration(run.durationSec)} ·{' '}
                  {formatPace(run.durationSec / run.distanceKm)} /km
                  {run.avgHr ? ` · ${run.avgHr} bpm` : ''}
                </Text>
              </View>
            </View>
          ))}
        </View>
      ) : selectedWorkout ? (
        <DayCard
          date={selected}
          workout={selectedWorkout}
          completed={completedIds.has(selectedWorkout.id)}
          today={isToday(selected)}
          weekMaxKm={Math.max(1, selectedWorkout.distanceKm)}
          onPress={() => setSheetWorkout(selectedWorkout)}
        />
      ) : (
        <Card>
          <Text style={styles.empty}>
            {selected === today
              ? 'No session scheduled today. Log a run from the Today tab if you get one in.'
              : 'Nothing logged on this day.'}
          </Text>
        </Card>
      )}

      {selectedWorkout && selectedRuns.length > 0 ? (
        <Button
          label="Log another run"
          variant="secondary"
          icon="add"
          onPress={() => setSheetWorkout(selectedWorkout)}
        />
      ) : null}

      <LogRunSheet
        key={sheetWorkout?.id ?? 'none'}
        workout={sheetWorkout}
        onClose={() => setSheetWorkout(null)}
        onSubmit={(input) => {
          if (sheetWorkout) completeWorkout(sheetWorkout, input);
          setSheetWorkout(null);
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center', paddingTop: 8 },
  overline: {
    color: colors.muted,
    ...font.label,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  monthNav: { flexDirection: 'row', gap: 8 },
  navButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  monthCard: { gap: 14 },
  monthHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  monthTitle: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontWeight: '700',
    fontSize: 20,
    letterSpacing: -0.3,
  },
  todayLink: { color: colors.accent, fontSize: 12, fontWeight: '700' },
  statsRow: { flexDirection: 'row', gap: 12 },
  weekHeader: { flexDirection: 'row', marginTop: 2 },
  weekHeaderText: {
    flex: 1,
    textAlign: 'center',
    color: colors.faint,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: `${100 / 7}%`,
    alignItems: 'center',
    gap: 4,
    paddingVertical: 6,
  },
  dayCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'transparent',
    backgroundColor: colors.surfaceAlt,
  },
  dayCircleOutside: { opacity: 0.45, backgroundColor: 'transparent' },
  dayCircleToday: { borderColor: colors.accent },
  dayCircleSelected: { borderColor: colors.faint, backgroundColor: colors.surfaceAlt },
  trainedCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  trainedCircleOutside: { opacity: 0.65 },
  dayNumberText: { color: colors.text, fontSize: 16, fontWeight: '600' },
  dayNumberOutside: { color: colors.faint },
  dayNumberToday: { color: colors.accent, fontWeight: '800' },
  calDot: { width: 5, height: 5, borderRadius: 3 },
  dotPlaceholder: { width: 5, height: 5 },
  legend: { flexDirection: 'row', gap: 16, paddingTop: 2 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendShoe: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.accent,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendDot: { width: 6, height: 6, borderRadius: 3 },
  legendRing: {
    width: 14,
    height: 14,
    borderRadius: 7,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  legendText: { color: colors.faint, fontSize: 11, fontWeight: '600' },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  runList: { gap: 8 },
  runRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 16,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  runIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${colors.accent}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  runTitle: { color: colors.text, fontSize: 14, fontWeight: '600' },
  empty: { color: colors.muted, fontSize: 13, lineHeight: 20 },
});

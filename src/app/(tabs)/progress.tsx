import { Ionicons } from '@expo/vector-icons';
import React from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card, Pill, Screen, SectionTitle, Stat } from '@/components/ui';
import {
  formatDuration,
  formatPace,
  formatShort,
  plural,
  todayISO,
} from '@/lib/date';
import { GOAL_LABEL } from '@/lib/plan';
import { adherence, dayStreak, kmThisWeek, paceOf, totals, weeklyBuckets } from '@/lib/stats';
import type { RunLog } from '@/lib/types';
import { useApp } from '@/store/AppStore';
import { zoneColor } from '@/lib/zones';
import { colors, font, radius } from '@/theme';

export default function ProgressScreen() {
  const { runs, plan, settings, zones, completedIds, deleteRun, clearAllData } = useApp();
  const today = todayISO();
  const summary = totals(runs);
  const buckets = weeklyBuckets(runs, today, 8);
  const peak = Math.max(1, ...buckets.map((b) => b.km));
  const adherencePct = Math.round(adherence(plan, runs, today) * 100);
  const dueSessions = plan.filter((w) => w.date <= today).length;
  const zoneCounts = countZones(runs, zones);

  const confirmReset = () => {
    Alert.alert('Erase all local data?', 'Your plan, workouts, runs and zones will be erased.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Erase', style: 'destructive', onPress: clearAllData },
    ]);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.overline}>{GOAL_LABEL[settings.goal]} BLOCK</Text>
        <Text style={styles.title}>Progress</Text>
      </View>

      {/* Hero stat card */}
      <Card style={styles.hero}>
        <Text style={styles.heroLabel}>TOTAL DISTANCE</Text>
        <View style={styles.heroRow}>
          <Text style={styles.heroValue}>{summary.km.toFixed(1)}</Text>
          <Text style={styles.heroUnit}>KM</Text>
        </View>
        <View style={styles.heroMeta}>
          <Text style={styles.meta}>{plural(summary.runs, 'run')}</Text>
          <Text style={styles.meta}>{formatDuration(summary.seconds)} moving</Text>
          <Text style={styles.meta}>{Math.round((summary.km / Math.max(1, plan.reduce((s, w) => s + w.distanceKm, 0))) * 100)}% of plan</Text>
        </View>
      </Card>

      {/* Stats row */}
      <View style={styles.statsRow}>
        <Card style={styles.statCard}>
          <Stat value={`${kmThisWeek(runs, today).toFixed(1)}`} label="km this week" unit="KM" />
        </Card>
        <Card style={styles.statCard}>
          <Stat value={formatPace(summary.avgPace)} label="avg pace" unit="/KM" />
        </Card>
        <Card style={styles.statCard}>
          <Stat value={`${dayStreak(runs, today)}`} label="day streak" accent={colors.accent} />
        </Card>
      </View>

      <SectionTitle title="LAST 8 WEEKS" action={<Text style={styles.meta}>km</Text>} />
      <Card style={styles.chartCard}>
        <View style={styles.chart}>
          {buckets.map((bucket, index) => {
            const height = Math.round((bucket.km / peak) * 92);
            const isCurrent = index === buckets.length - 1;
            return (
              <View key={bucket.weekStart} style={styles.barColumn}>
                <Text style={styles.barValue}>{bucket.km > 0 ? bucket.km.toFixed(0) : ''}</Text>
                <View style={styles.barTrack}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: Math.max(bucket.km > 0 ? 4 : 2, height),
                        backgroundColor: isCurrent ? colors.accent : `${colors.accent}4D`,
                        borderRadius: 6,
                      },
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>
                  {formatShort(bucket.weekStart).split(' ')[1]}
                </Text>
              </View>
            );
          })}
        </View>
      </Card>

      <SectionTitle title="PLAN ADHERENCE" />
      <Card style={styles.adherenceCard}>
        <View style={styles.adherenceRow}>
          <Text style={styles.adherenceValue}>{adherencePct}%</Text>
          <Text style={styles.meta}>
            {plan.filter((w) => completedIds.has(w.id) && w.date <= today).length} of{' '}
            {dueSessions} due so far
          </Text>
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${adherencePct}%` }]} />
        </View>
        <Text style={styles.hint}>
          Consistency beats intensity. Hitting 80% of sessions is a great block.
        </Text>
      </Card>

      {summary.runs > 0 ? (
        <>
          <SectionTitle title="TIME IN ZONES" />
          <Card style={styles.zoneCard}>
            <View style={styles.zoneBar}>
              {zoneCounts.map((count, index) =>
                count > 0 ? (
                  <View
                    key={index}
                    style={{
                      flex: count,
                      backgroundColor: zoneColor(index + 1),
                    }}
                  />
                ) : null
              )}
              {zoneCounts.every((c) => c === 0) ? (
                <View style={{ flex: 1, backgroundColor: colors.surfaceAlt }} />
              ) : null}
            </View>
            <View style={styles.zoneLegend}>
              {zoneCounts.map((count, index) => (
                <View key={index} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: zoneColor(index + 1) }]} />
                  <Text style={styles.meta}>
                    Z{index + 1} · {count}
                  </Text>
                </View>
              ))}
            </View>
            {zoneCounts.every((c) => c === 0) ? (
              <Text style={styles.hint}>Log average heart rate on a run to see this split.</Text>
            ) : null}
          </Card>
        </>
      ) : null}

      <SectionTitle title="RECENT RUNS" action={<Pill label={`${runs.length} total`} />} />
      <View style={styles.runs}>
        {runs.length === 0 ? (
          <Card>
            <Text style={styles.hint}>
              No runs yet. Log the session from the Today tab and it will show up here.
            </Text>
          </Card>
        ) : (
          runs.slice(0, 8).map((run) => (
            <RunRow key={run.id} run={run} title={plan.find((w) => w.id === run.workoutId)?.title} onDelete={() => deleteRun(run.id)} />
          ))
        )}
      </View>

      <Pressable onPress={confirmReset} style={styles.resetRow}>
        <Ionicons name="trash-outline" size={15} color={colors.accent} />
        <Text style={styles.resetText}>Erase all local data</Text>
      </Pressable>
      <Text style={styles.footnote}>
        Everything is stored on this device only — no account, no server.
      </Text>
    </Screen>
  );
}

function RunRow({
  run,
  title,
  onDelete,
}: {
  run: RunLog;
  title?: string;
  onDelete: () => void;
}) {
  const confirm = () => {
    Alert.alert('Delete run?', `${run.distanceKm} km on ${formatShort(run.date)}`, [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onDelete },
    ]);
  };

  return (
    <View style={styles.runRow}>
      <View style={styles.runIcon}>
        <Ionicons name="walk-outline" size={17} color={colors.accent} />
      </View>
      <View style={{ flex: 1, gap: 3 }}>
        <Text style={styles.runTitle} numberOfLines={1}>
          {title ?? 'Run'}
        </Text>
        <Text style={styles.meta}>
          {formatShort(run.date)} · {run.distanceKm} km · {formatDuration(run.durationSec)} ·{' '}
          {formatPace(paceOf(run))} /km
          {run.avgHr ? ` · ${run.avgHr} bpm` : ''}
        </Text>
        {run.notes ? (
          <Text style={styles.runNote} numberOfLines={2}>
            &ldquo;{run.notes}&rdquo;
          </Text>
        ) : null}
      </View>
      <Pressable onPress={confirm} hitSlop={10} style={styles.deleteButton}>
        <Ionicons name="close" size={15} color={colors.faint} />
      </Pressable>
    </View>
  );
}

function countZones(runs: RunLog[], zones: { min: number; max: number }[]): number[] {
  const counts = [0, 0, 0, 0, 0];
  runs.forEach((run) => {
    if (!run.avgHr) return;
    const index = zones.findIndex((z) => run.avgHr! >= z.min && run.avgHr! <= z.max);
    if (index >= 0) counts[index] += 1;
  });
  return counts;
}

const styles = StyleSheet.create({
  header: { paddingTop: 8, gap: 4 },
  overline: {
    color: colors.muted,
    ...font.label,
    fontSize: 11,
  },
  title: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    fontSize: 28,
    letterSpacing: -0.5,
  },
  hero: { gap: 8 },
  heroLabel: {
    color: colors.muted,
    ...font.label,
    fontSize: 11,
  },
  heroRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 4,
  },
  heroValue: {
    color: colors.text,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    fontSize: 48,
    letterSpacing: -1.5,
  },
  heroUnit: {
    color: colors.muted,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    fontSize: 18,
  },
  heroMeta: { flexDirection: 'row', gap: 12, flexWrap: 'wrap', marginTop: 2 },
  meta: { color: colors.muted, fontSize: 12, fontWeight: '500' },
  statsRow: { flexDirection: 'row', gap: 10 },
  statCard: { flex: 1, paddingVertical: 14 },
  chartCard: { paddingBottom: 12 },
  chart: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, height: 140 },
  barColumn: { flex: 1, alignItems: 'center', gap: 6, justifyContent: 'flex-end' },
  barValue: { color: colors.faint, fontSize: 9, fontWeight: '700', height: 12 },
  barTrack: { width: '100%', justifyContent: 'flex-end', height: 96 },
  bar: { width: '100%' },
  barLabel: { color: colors.faint, fontSize: 10, fontWeight: '600' },
  adherenceCard: { gap: 10 },
  adherenceRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between' },
  adherenceValue: {
    color: colors.accent,
    fontFamily: 'SpaceGrotesk-Bold',
    fontWeight: '700',
    fontSize: 36,
    letterSpacing: -0.8,
  },
  track: { height: 8, borderRadius: 4, backgroundColor: colors.surfaceAlt, overflow: 'hidden' },
  fill: { height: '100%', backgroundColor: colors.accent, borderRadius: 4 },
  hint: { color: colors.faint, fontSize: 12, lineHeight: 18 },
  zoneCard: { gap: 12 },
  zoneBar: { flexDirection: 'row', height: 12, borderRadius: 6, overflow: 'hidden', gap: 2 },
  zoneLegend: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  runs: { gap: 8 },
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
  runNote: { color: colors.muted, fontSize: 12, fontStyle: 'italic' },
  deleteButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceAlt,
  },
  resetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, paddingTop: 6 },
  resetText: { color: colors.accent, fontSize: 13, fontWeight: '600' },
  footnote: { color: colors.faint, fontSize: 11, textAlign: 'center', marginTop: -8 },
});

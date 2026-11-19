import { Ionicons } from '@expo/vector-icons';
import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui';
import { importPlanFromCalendar } from '@/lib/calendarSync';
import { importPlanFromFile } from '@/lib/importPlan';
import { useApp } from '@/store/AppStore';
import { colors, radius } from '@/theme';

type Busy = null | 'excel' | 'calendar';

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? '' : 's'}`;

const PLAN_COLUMNS = [
  { label: 'Date', sample: '2026-11-10' },
  { label: 'Session', sample: 'Long run' },
  { label: 'Type', sample: 'long' },
  { label: 'Distance (km)', sample: '14' },
  { label: 'Zone', sample: '2' },
];

const RUN_COLUMNS = [
  { label: 'Date', sample: '2026-11-10' },
  { label: 'Distance (km)', sample: '14' },
  { label: 'Duration', sample: '1:24:00' },
  { label: 'Avg HR', sample: '148' },
];

/** Empty-plan prompt: a plan can only come from an Excel workbook or the calendar. */
export function NoPlanCard() {
  const { importPlanData } = useApp();
  const [busy, setBusy] = useState<Busy>(null);
  const [status, setStatus] = useState<string | null>(null);

  const importExcel = async () => {
    setBusy('excel');
    setStatus(null);
    try {
      const result = await importPlanFromFile();
      if (!result) {
        setStatus('Import cancelled.');
        return;
      }
      importPlanData({ workouts: result.workouts, runs: result.runs });
      setStatus(
        result.workouts.length > 0
          ? `${plural(result.workouts.length, 'session')} imported from ${result.fileName}.`
          : 'That workbook had no sessions in it. Check the Date and Session columns and try again.'
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not read that workbook.');
    } finally {
      setBusy(null);
    }
  };

  const importCalendar = async () => {
    setBusy('calendar');
    setStatus(null);
    try {
      const result = await importPlanFromCalendar();
      importPlanData({ workouts: result.workouts, runs: result.runs });
      setStatus(
        result.workouts.length > 0
          ? `${plural(result.workouts.length, 'session')} imported from your calendar.`
          : 'No upcoming training sessions found in your calendar.'
      );
    } catch (error) {
      setStatus(error instanceof Error ? error.message : 'Could not read your calendar.');
    } finally {
      setBusy(null);
    }
  };

  return (
    <View style={styles.card}>
      <View style={styles.top}>
        <View style={styles.icon}>
          <Ionicons name="calendar-outline" size={18} color={colors.accent} />
        </View>
        <View style={styles.copy}>
          <Text style={styles.title}>No plan yet</Text>
          <Text style={styles.text}>
            Plans are imported, never generated. Bring your training in from an Excel workbook or
            from sessions already in your calendar.
          </Text>
        </View>
      </View>

      <Button
        label="Import from Excel"
        icon="document-text-outline"
        onPress={importExcel}
        disabled={busy !== null}
      />
      <Button
        label="Import from Calendar"
        icon="calendar-outline"
        variant="secondary"
        onPress={importCalendar}
        disabled={busy !== null}
      />

      {busy ? <ActivityIndicator color={colors.accent} size="small" /> : null}
      {status && !busy ? (
        <View style={styles.status}>
          <Ionicons name="information-circle-outline" size={15} color={colors.accent} />
          <Text style={styles.statusText}>{status}</Text>
        </View>
      ) : null}

      <View style={styles.format}>
        <View style={styles.formatHead}>
          <Ionicons name="grid-outline" size={13} color={colors.accent} />
          <Text style={styles.formatTitle}>RECOMMENDED EXCEL FORMAT</Text>
        </View>

        <FormatTable name="Plan sheet · required" columns={PLAN_COLUMNS} />
        <FormatTable name="Runs sheet · optional" columns={RUN_COLUMNS} />

        <View style={styles.rules}>
          <Text style={styles.rule}>• Date and Session are enough to create a plan.</Text>
          <Text style={styles.rule}>
            • Dates: 2026-11-10, 10/11/2026 or a real Excel date.
          </Text>
          <Text style={styles.rule}>
            • Distance in km. Duration as 1:24:00 or minutes. Runs need Date, Distance, Duration.
          </Text>
          <Text style={styles.rule}>• Extra columns and sheets are ignored.</Text>
        </View>
      </View>
    </View>
  );
}

function FormatTable({
  name,
  columns,
}: {
  name: string;
  columns: { label: string; sample: string }[];
}) {
  return (
    <View style={styles.sheet}>
      <Text style={styles.sheetName}>{name}</Text>
      <View style={styles.sheetRow}>
        {columns.map((column) => (
          <Text key={column.label} style={[styles.cell, styles.cellHead]} numberOfLines={2}>
            {column.label}
          </Text>
        ))}
      </View>
      <View style={[styles.sheetRow, styles.sheetSample]}>
        {columns.map((column) => (
          <Text key={column.label} style={styles.cell} numberOfLines={1}>
            {column.sample}
          </Text>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 10,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  icon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.accent}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: { flex: 1, gap: 4 },
  title: {
    color: colors.text,
    fontFamily: 'Archivo-BoldItalic',
    fontSize: 18,
    letterSpacing: -0.3,
  },
  text: { color: colors.muted, fontSize: 11.5, lineHeight: 17 },
  status: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
  },
  statusText: { flex: 1, color: colors.text, fontSize: 11, lineHeight: 16 },

  /* ---------- Recommended workbook format ---------- */
  format: {
    gap: 8,
    marginTop: 2,
    padding: 12,
    borderRadius: radius.md ?? 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
  },
  formatHead: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  formatTitle: {
    color: colors.muted,
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sheet: {
    gap: 4,
    padding: 8,
    borderRadius: 10,
    backgroundColor: colors.bg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sheetName: {
    color: colors.accent,
    fontSize: 9.5,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  sheetRow: { flexDirection: 'row', gap: 4 },
  sheetSample: { opacity: 0.75 },
  cell: {
    flex: 1,
    color: colors.text,
    fontSize: 9,
    lineHeight: 12,
  },
  cellHead: { color: colors.muted, fontWeight: '700' },
  rules: { gap: 3, marginTop: 2 },
  rule: { color: colors.faint, fontSize: 9.5, lineHeight: 14 },
});

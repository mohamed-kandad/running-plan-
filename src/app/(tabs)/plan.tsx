import { Ionicons } from '@expo/vector-icons';
import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { DayCard } from '@/components/DayCard';
import { LogRunSheet } from '@/components/LogRunSheet';
import { NoPlanCard } from '@/components/NoPlanCard';
import { WorkoutEditorSheet } from '@/components/WorkoutEditorSheet';
import { Sheet } from '@/components/Sheet';
import { Button, Card, Divider, Screen, SectionTitle, Segmented, Stepper } from '@/components/ui';
import {
  addPlanToCalendar,
  calendarSupported,
  describeExport,
  describeImport,
  importRunsFromCalendar,
} from '@/lib/calendarSync';
import { addDays, diffDays, formatShort, todayISO } from '@/lib/date';
import { exportPlanToExcel } from '@/lib/exportPlan';
import { describeImport as describeExcelImport, importPlanFromFile } from '@/lib/importPlan';
import { GOAL_LABEL, phaseLabel, planWeeks, weekKm } from '@/lib/plan';
import { currentWeek } from '@/lib/stats';
import type { Goal, Level, Workout } from '@/lib/types';
import { useApp } from '@/store/AppStore';
import { colors, font, radius } from '@/theme';

const FONT_BOLD = 'SpaceGrotesk-Bold';
const FONT_ITALIC = 'Archivo-BoldItalic';
const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

export default function PlanScreen() {
  const {
    plan,
    settings,
    runs,
    completedIds,
    calendarEventIds,
    completeWorkout,
    updateSettings,
    linkCalendarEvents,
    importPlanData,
    addRuns,
  } = useApp();
  const today = todayISO();
  const thisWeek = currentWeek(plan, today);
  const [selectedWeek, setSelectedWeek] = useState(() => thisWeek);
  const [sheetWorkout, setSheetWorkout] = useState<Workout | null>(null);
  const [editor, setEditor] = useState<{ workout?: Workout; date?: string } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [syncBusy, setSyncBusy] = useState<null | 'excel' | 'import-excel' | 'add' | 'import'>(null);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  const weeks = planWeeks(settings);
  const totalKm = useMemo(() => plan.reduce((sum, w) => sum + w.distanceKm, 0), [plan]);
  const doneCount = plan.filter((w) => completedIds.has(w.id)).length;
  const progress = plan.length ? doneCount / plan.length : 0;
  const progressPct = Math.round(progress * 100);
  const daysToRace = Math.max(0, diffDays(today, settings.raceDate));
  const weekWorkouts = plan.filter((w) => w.week === selectedWeek);
  const weekStart = addDays(settings.startDate, (selectedWeek - 1) * 7);
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)).map((date) => {
    const workout = plan.find((w) => w.date === date) ?? null;
    return { date, workout, completed: workout ? completedIds.has(workout.id) : false };
  });
  const weekMaxKm = Math.max(1, ...weekDays.map((day) => day.workout?.distanceKm ?? 0));
  const weekEnd = addDays(weekStart, 6);
  const seedDate = today >= weekStart && today <= weekEnd ? today : weekStart;

  const selectedKm = weekKm(plan, selectedWeek);
  const selectedDone = weekWorkouts.filter((w) => completedIds.has(w.id)).length;
  const selectedPhase = phaseLabel(selectedWeek, weeks);

  const weekProgress = (week: number) => {
    const list = plan.filter((w) => w.week === week);
    const done = list.filter((w) => completedIds.has(w.id)).length;
    return list.length ? done / list.length : 0;
  };

  const [draftGoal, setDraftGoal] = useState<Goal>(settings.goal);
  const [draftDays, setDraftDays] = useState<3 | 4 | 5>(settings.daysPerWeek);
  const [draftLevel, setDraftLevel] = useState<Level>(settings.level);
  const [draftWeeks, setDraftWeeks] = useState(() =>
    Math.ceil((diffDays(settings.startDate, settings.raceDate) + 1) / 7)
  );

  const openSettings = () => {
    setDraftGoal(settings.goal);
    setDraftDays(settings.daysPerWeek);
    setDraftLevel(settings.level);
    setDraftWeeks(Math.ceil((diffDays(settings.startDate, settings.raceDate) + 1) / 7));
    setSettingsOpen(true);
  };

  const handleExport = async () => {
    setSyncBusy('excel');
    setSyncStatus(null);
    try {
      const result = await exportPlanToExcel({ plan, runs, settings, completedIds });
      setSyncStatus(
        result === 'downloaded'
          ? 'Spreadsheet downloaded.'
          : result === 'shared'
            ? 'Spreadsheet ready to share.'
            : 'Sharing is not available on this device.'
      );
    } catch (error) {
      setSyncStatus(errorMessage(error));
    } finally {
      setSyncBusy(null);
    }
  };

  const handleImportExcel = async () => {
    setSyncBusy('import-excel');
    setSyncStatus(null);
    try {
      const result = await importPlanFromFile();
      if (!result) {
        setSyncStatus('Import cancelled.');
        return;
      }
      importPlanData({ workouts: result.workouts, runs: result.runs });
      setSyncStatus(describeExcelImport(result));
      setSelectedWeek(1);
    } catch (error) {
      setSyncStatus(errorMessage(error));
    } finally {
      setSyncBusy(null);
    }
  };

  const handleAddToCalendar = async () => {
    if (!calendarSupported()) {
      setSyncStatus('Calendar sync needs the iOS or Android app.');
      return;
    }
    setSyncBusy('add');
    setSyncStatus(null);
    try {
      const result = await addPlanToCalendar(plan, settings, calendarEventIds);
      linkCalendarEvents(result.eventIds);
      setSyncStatus(describeExport(result));
    } catch (error) {
      setSyncStatus(errorMessage(error));
    } finally {
      setSyncBusy(null);
    }
  };

  const handleImport = async () => {
    if (!calendarSupported()) {
      setSyncStatus('Calendar import needs the iOS or Android app.');
      return;
    }
    setSyncBusy('import');
    setSyncStatus(null);
    try {
      const found = await importRunsFromCalendar(plan, runs);
      found.sessions.forEach((entry) => {
        completeWorkout(entry.workout, {
          distanceKm: entry.distanceKm,
          durationSec: entry.durationSec,
          date: entry.workout.date,
          notes: 'Imported from Calendar',
        });
      });
      addRuns(found.extraRuns);
      setSyncStatus(describeImport(found));
    } catch (error) {
      setSyncStatus(errorMessage(error));
    } finally {
      setSyncBusy(null);
    }
  };

  const saveSettings = () => {
    updateSettings({
      goal: draftGoal,
      daysPerWeek: draftDays,
      level: draftLevel,
      raceDate: addDays(settings.startDate, draftWeeks * 7 - 1),
    });
    setSettingsOpen(false);
    setSelectedWeek(1);
  };

  return (
    <Screen>
      <View style={styles.header}>
        <View style={styles.headerCopy}>
          <Text style={styles.overline}>YOUR TRAINING</Text>
          <Text style={styles.title}>Training plan</Text>
          <Text style={styles.headerSubtitle}>One week at a time. One step closer.</Text>
        </View>
        <Pressable
          onPress={openSettings}
          style={({ pressed }) => [styles.settingsButton, pressed && styles.pressed]}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Adjust training plan"
        >
          <Ionicons name="options-outline" size={19} color={colors.text} />
        </Pressable>
      </View>

      {plan.length === 0 ? (
        <>
          <NoPlanCard />
          <Button
            label="Create a workout"
            variant="secondary"
            icon="add"
            onPress={() => setEditor({ date: today })}
          />
        </>
      ) : null}

      {plan.length > 0 ? (
        <>
      {/* Hero: solid accent block */}
      <View style={styles.hero}>
        <View style={styles.heroTop}>
          <Text style={styles.heroOverline}>
            {GOAL_LABEL[settings.goal].toUpperCase()} · {formatShort(settings.raceDate)}
          </Text>
          <Text style={styles.heroPct}>{progressPct}% DONE</Text>
        </View>

        <View style={styles.heroBigRow}>
          {daysToRace > 0 ? (
            <>
              <Text style={styles.heroBig}>{daysToRace}</Text>
              <Text style={styles.heroBigUnit}>{'days\nto race'}</Text>
            </>
          ) : (
            <Text style={styles.heroBig}>Race day</Text>
          )}
        </View>

        {/* One segment per week */}
        <View style={styles.heroSegments}>
          {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => (
            <View key={week} style={styles.heroSegment}>
              <View
                style={[
                  styles.heroSegmentFill,
                  { width: `${Math.round(weekProgress(week) * 100)}%` },
                ]}
              />
            </View>
          ))}
        </View>

        <Text style={styles.heroMeta}>
          {weeks} weeks · {settings.daysPerWeek} runs/week · {Math.round(totalKm)} km ·{' '}
          {doneCount}/{plan.length} done
        </Text>
      </View>

      {/* Week picker */}
      <View style={styles.weekPickerHeader}>
        <SectionTitle title="YOUR WEEKS" action={<Text style={styles.link}>{weeks} weeks total</Text>} />
      </View>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.weekChips}
      >
        {Array.from({ length: weeks }, (_, i) => i + 1).map((week) => {
          const active = week === selectedWeek;
          const isCurrent = week === thisWeek;
          const complete = weekProgress(week) >= 1;
          return (
            <Pressable
              key={week}
              onPress={() => setSelectedWeek(week)}
              style={({ pressed }) => [
                styles.weekPill,
                complete && !active && styles.weekPillComplete,
                active && styles.weekPillActive,
                pressed && styles.pressed,
              ]}
              accessibilityRole="button"
              accessibilityLabel={`Week ${week}`}
              accessibilityState={{ selected: active }}
            >
              <Text
                style={[
                  styles.weekPillText,
                  complete && !active && styles.weekPillTextComplete,
                  active && styles.weekPillTextActive,
                ]}
              >
                {week}
              </Text>
              {isCurrent ? (
                <View style={[styles.nowDot, active && styles.nowDotActive]} />
              ) : null}
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Selected week: open header, no card */}
      <View style={styles.weekHead}>
        <View style={styles.weekHeadLeft}>
          <Text style={styles.weekPhase}>{String(selectedPhase).toUpperCase()}</Text>
          <Text style={styles.weekTitle}>Week {String(selectedWeek).padStart(2, '0')}</Text>
        </View>
        <View style={styles.weekHeadRight}>
          <Text style={styles.weekKm}>
            {selectedKm.toFixed(1)}
            <Text style={styles.weekKmUnit}> km</Text>
          </Text>
          <Text style={styles.weekDone}>
            {weekWorkouts.length > 0
              ? `${selectedDone}/${weekWorkouts.length} done`
              : 'Rest week'}
          </Text>
        </View>
      </View>

      <View style={styles.dotsRow}>
        {DAY_LABELS.map((dayLabel, idx) => {
          const day = weekDays[idx];
          const isTodayDay = day?.date === today;
          const hasWorkout = !!day?.workout;
          return (
            <View
              key={idx}
              style={[
                styles.dayDot,
                hasWorkout && styles.dayDotPlanned,
                day?.completed && styles.dayDotDone,
                isTodayDay && styles.dayDotToday,
              ]}
            >
              <Text
                style={[
                  styles.dayDotText,
                  hasWorkout && styles.dayDotTextPlanned,
                  day?.completed && styles.dayDotTextDone,
                ]}
              >
                {dayLabel}
              </Text>
            </View>
          );
        })}
      </View>

      <View style={styles.list}>
        {weekDays.map(({ date, workout, completed }, index) => (
          <DayCard
            key={`${selectedWeek}-${date}`}
            index={index}
            date={date}
            workout={workout}
            completed={completed}
            today={date === today}
            weekMaxKm={weekMaxKm}
            onPress={workout ? () => setSheetWorkout(workout) : undefined}
            onAdd={() => setEditor({ date })}
          />
        ))}
      </View>

      <Button
        label="Add workout"
        variant="secondary"
        icon="add"
        onPress={() => setEditor({ date: seedDate })}
      />
        </>
      ) : null}

      <View style={styles.syncHeading}>
        <SectionTitle title="SYNC & BACKUP" action={<Text style={styles.link}>EXCEL · CALENDAR</Text>} />
      </View>
      <Card style={styles.syncCard}>
        <SyncRow
          icon="document-text-outline"
          title="Export to Excel"
          subtitle="Save your plan, runs and progress"
          busy={syncBusy === 'excel'}
          onPress={handleExport}
        />
        <Divider />
        <SyncRow
          icon="cloud-upload-outline"
          title="Import from Excel"
          subtitle="Restore or update from a workbook"
          busy={syncBusy === 'import-excel'}
          onPress={handleImportExcel}
        />
        <Divider />
        <SyncRow
          icon="calendar-outline"
          title="Add to Calendar"
          subtitle="Keep upcoming sessions in your calendar"
          busy={syncBusy === 'add'}
          onPress={handleAddToCalendar}
        />
        <Divider />
        <SyncRow
          icon="cloud-download-outline"
          title="Import from Calendar"
          subtitle="Log completed sessions and extra runs"
          busy={syncBusy === 'import'}
          onPress={handleImport}
        />
      </Card>
      <Text style={styles.syncHint}>
        Excel format · Plan sheet: Date, Session, Type, Distance (km), Zone, Notes · Runs sheet:
        Date, Distance (km), Duration, Avg HR. Only Date and Session are required for a plan.
      </Text>
      <Text style={styles.syncHint}>
        Your plan stays yours. Export a backup, edit it in Excel, and import it whenever you need.
      </Text>
      {syncStatus ? (
        <View style={styles.statusMessage}>
          <Ionicons name="information-circle-outline" size={16} color={colors.accent} />
          <Text style={styles.syncStatus}>{syncStatus}</Text>
        </View>
      ) : null}

      {plan.length > 0 ? (
        <Pressable
          onPress={openSettings}
          style={({ pressed }) => [styles.adjustRow, pressed && styles.pressed]}
        >
          <View style={styles.adjustIcon}>
            <Ionicons name="options-outline" size={17} color={colors.accent} />
          </View>
          <View style={styles.adjustCopy}>
            <Text style={styles.adjustTitle}>Make it your plan</Text>
            <Text style={styles.adjustText}>Adjust your goal, weekly runs or experience level</Text>
          </View>
          <Ionicons name="chevron-forward" size={17} color={colors.faint} />
        </Pressable>
      ) : null}

      <LogRunSheet
        key={sheetWorkout?.id ?? 'none'}
        workout={sheetWorkout}
        onClose={() => setSheetWorkout(null)}
        onSubmit={(input) => {
          // The sheet keeps itself open so the saved run can be undone there.
          if (sheetWorkout) completeWorkout(sheetWorkout, input);
        }}
        onEdit={
          sheetWorkout
            ? () => {
                const target = sheetWorkout;
                setSheetWorkout(null);
                setEditor({ workout: target, date: target.date });
              }
            : undefined
        }
      />

      {editor ? (
        <WorkoutEditorSheet
          key={editor.workout?.id ?? `new-${editor.date ?? seedDate}`}
          workout={editor.workout ?? null}
          date={editor.date ?? seedDate}
          onClose={() => setEditor(null)}
        />
      ) : null}

      <Sheet
        visible={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        title="Adjust your plan"
        subtitle="Fine-tune your training. Your logged runs will be kept."
        footer={<Button label="Save plan" icon="checkmark" onPress={saveSettings} />}
      >
        <View style={styles.settingsContent}>
          <SettingsGroup label="RACE GOAL" hint="What are you training for?">
            <Segmented
              value={draftGoal}
              onChange={setDraftGoal}
              options={[
                { value: '5K', label: '5K' },
                { value: '10K', label: '10K' },
                { value: 'HALF', label: 'Half' },
              ]}
            />
          </SettingsGroup>

          <SettingsGroup label="RUNS PER WEEK" hint="Choose a rhythm you can maintain.">
            <Segmented
              value={draftDays}
              onChange={setDraftDays}
              options={[
                { value: 3, label: '3 days' },
                { value: 4, label: '4 days' },
                { value: 5, label: '5 days' },
              ]}
            />
          </SettingsGroup>

          <SettingsGroup label="EXPERIENCE" hint="We'll adapt the training load.">
            <Segmented
              value={draftLevel}
              onChange={setDraftLevel}
              options={[
                { value: 'beginner', label: 'Beginner' },
                { value: 'intermediate', label: 'Intermediate' },
              ]}
            />
          </SettingsGroup>

          <View style={styles.settingsWeeks}>
            <View style={styles.settingsWeeksCopy}>
              <Text style={styles.fieldLabel}>PLAN LENGTH</Text>
              <Text style={styles.fieldHint}>
                Race date · {formatShort(addDays(settings.startDate, draftWeeks * 7 - 1))}
              </Text>
            </View>
            <Stepper
              value={draftWeeks}
              onChange={setDraftWeeks}
              step={1}
              min={4}
              max={20}
              suffix=" wks"
            />
          </View>
        </View>
      </Sheet>
    </Screen>
  );
}

function SettingsGroup({
  label,
  hint,
  children,
}: {
  label: string;
  hint: string;
  children: React.ReactNode;
}) {
  return (
    <View style={styles.settingsGroup}>
      <View style={styles.settingsGroupCopy}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Text style={styles.fieldHint}>{hint}</Text>
      </View>
      {children}
    </View>
  );
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.';
}

function SyncRow({
  icon,
  title,
  subtitle,
  busy,
  onPress,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  title: string;
  subtitle: string;
  busy: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={busy}
      style={({ pressed }) => [styles.syncRow, (pressed || busy) && styles.pressed]}
    >
      <View style={styles.syncIcon}>
        <Ionicons name={icon} size={17} color={colors.accent} />
      </View>
      <View style={styles.syncCopy}>
        <Text style={styles.syncTitle}>{title}</Text>
        <Text style={styles.syncSubtitle}>{subtitle}</Text>
      </View>
      {busy ? (
        <ActivityIndicator color={colors.accent} size="small" />
      ) : (
        <Ionicons name="chevron-forward" size={16} color={colors.faint} />
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 8,
    paddingBottom: 4,
    gap: 12,
  },
  headerCopy: { flex: 1, gap: 2 },
  overline: {
    color: colors.accent,
    ...font.label,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  title: {
    color: colors.text,
    fontSize: 29,
    letterSpacing: -0.8,
    fontFamily: FONT_ITALIC,
    fontWeight: '700' as const,
  },
  headerSubtitle: {
    color: colors.muted,
    fontSize: 12,
    marginTop: 1,
  },
  settingsButton: {
    width: 42,
    height: 42,
    borderRadius: radius.md,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: { opacity: 0.72, transform: [{ scale: 0.985 }] },

  /* ---------- Empty plan ---------- */
  emptyCard: {
    gap: 12,
    padding: 16,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 12,
    backgroundColor: `${colors.accent}1A`,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyCopy: { gap: 4 },
  emptyTitle: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 18,
    letterSpacing: -0.3,
  },
  emptyText: { color: colors.muted, fontSize: 11.5, lineHeight: 17 },

  /* ---------- Hero ---------- */
  hero: {
    backgroundColor: colors.accent,
    borderRadius: radius.lg,
    paddingVertical: 18,
    paddingHorizontal: 20,
    gap: 10,
  },
  heroTop: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  heroOverline: {
    color: colors.accentInk,
    fontFamily: FONT_ITALIC,
    fontSize: 11,
    letterSpacing: 1.1,
    opacity: 0.75,
  },
  heroPct: {
    color: colors.accentInk,
    fontFamily: FONT_ITALIC,
    fontSize: 11,
    letterSpacing: 0.8,
  },
  heroBigRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 10,
  },
  heroBig: {
    color: colors.accentInk,
    fontFamily: FONT_ITALIC,
    fontSize: 64,
    lineHeight: 66,
    letterSpacing: -2.5,
  },
  heroBigUnit: {
    color: colors.accentInk,
    fontFamily: FONT_ITALIC,
    fontSize: 13,
    lineHeight: 15,
    opacity: 0.75,
    paddingBottom: 9,
  },
  heroSegments: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
  },
  heroSegment: {
    flex: 1,
    height: 6,
    borderRadius: 3,
    backgroundColor: `${colors.accentInk}33`,
    overflow: 'hidden',
  },
  heroSegmentFill: {
    height: '100%',
    borderRadius: 3,
    backgroundColor: colors.accentInk,
  },
  heroMeta: {
    color: colors.accentInk,
    fontFamily: FONT_ITALIC,
    fontSize: 11,
    letterSpacing: 0.3,
    opacity: 0.8,
  },

  /* ---------- Week picker ---------- */
  weekPickerHeader: { marginBottom: -2 },
  weekChips: {
    gap: 8,
    paddingVertical: 2,
    paddingRight: 8,
  },
  weekPill: {
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekPillComplete: {
    backgroundColor: `${colors.accent}1A`,
    borderColor: `${colors.accent}55`,
  },
  weekPillActive: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  weekPillText: {
    color: colors.muted,
    fontFamily: FONT_ITALIC,
    fontSize: 17,
  },
  weekPillTextComplete: { color: colors.accent },
  weekPillTextActive: { color: colors.accentInk },
  nowDot: {
    position: 'absolute',
    bottom: 6,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.accent,
  },
  nowDotActive: { backgroundColor: colors.accentInk },
  link: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 10,
  },

  /* ---------- Selected week ---------- */
  weekHead: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  weekHeadLeft: { flex: 1, gap: 2 },
  weekHeadRight: { alignItems: 'flex-end', gap: 2 },
  weekPhase: {
    color: colors.accent,
    ...font.label,
    fontSize: 10,
    letterSpacing: 1.1,
  },
  weekTitle: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 30,
    letterSpacing: -0.8,
  },
  weekKm: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 22,
    letterSpacing: -0.5,
  },
  weekKmUnit: {
    color: colors.muted,
    fontFamily: FONT_BOLD,
    fontSize: 12,
  },
  weekDone: {
    color: colors.faint,
    fontFamily: FONT_ITALIC,
    fontSize: 10,
    letterSpacing: 0.4,
  },
  dotsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayDot: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: 'transparent',
  },
  dayDotPlanned: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
  },
  dayDotDone: {
    backgroundColor: colors.accent,
    borderColor: colors.accent,
  },
  dayDotToday: {
    borderColor: colors.accent,
  },
  dayDotText: {
    color: colors.faint,
    fontFamily: FONT_ITALIC,
    fontSize: 12,
  },
  dayDotTextPlanned: { color: colors.text },
  dayDotTextDone: { color: colors.accentInk },

  /* ---------- Rest ---------- */
  list: { gap: 9 },
  syncHeading: { marginTop: 2 },
  syncCard: {
    paddingVertical: 2,
    paddingHorizontal: 0,
    borderRadius: radius.lg,
    overflow: 'hidden',
  },
  syncRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    paddingHorizontal: 13,
    paddingVertical: 12,
  },
  syncIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  syncCopy: { flex: 1, gap: 3 },
  syncTitle: {
    color: colors.text,
    fontFamily: FONT_BOLD,
    fontSize: 12,
  },
  syncSubtitle: {
    color: colors.faint,
    fontSize: 10,
    lineHeight: 14,
  },
  syncHint: {
    color: colors.faint,
    fontSize: 10,
    lineHeight: 15,
    marginTop: -5,
    paddingHorizontal: 2,
  },
  statusMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: colors.surfaceAlt,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: 10,
    marginTop: -3,
  },
  syncStatus: {
    flex: 1,
    color: colors.text,
    fontSize: 11,
    lineHeight: 16,
  },
  adjustRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    padding: 13,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 8,
  },
  adjustIcon: {
    width: 35,
    height: 35,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
    justifyContent: 'center',
  },
  adjustCopy: { flex: 1, gap: 3 },
  adjustTitle: {
    color: colors.text,
    fontFamily: FONT_ITALIC,
    fontSize: 13,
  },
  adjustText: {
    color: colors.muted,
    fontSize: 10,
    lineHeight: 14,
  },
  settingsContent: { gap: 19, paddingBottom: 5 },
  settingsGroup: { gap: 9 },
  settingsGroupCopy: { gap: 3 },
  fieldLabel: {
    color: colors.text,
    ...font.label,
    fontSize: 10,
    letterSpacing: 0.6,
  },
  fieldHint: {
    color: colors.faint,
    fontSize: 11,
    lineHeight: 15,
  },
  settingsWeeks: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    paddingTop: 13,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  settingsWeeksCopy: { flex: 1, gap: 4 },
});
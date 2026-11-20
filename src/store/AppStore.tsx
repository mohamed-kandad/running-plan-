import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';

import { addDays, diffDays, todayISO } from '@/lib/date';
import { defaultSettings, generatePlan } from '@/lib/plan';
import type { AppState, PlanSettings, RunLog, Workout } from '@/lib/types';
import { adjustZone, zonesFromMaxHr } from '@/lib/zones';
import { colors } from '@/theme';

const STORAGE_KEY = 'stride/state/v1';
const DEFAULT_MAX_HR = 186;
const DEFAULT_RESTING_HR = 55;

/**
 * A state with nothing in it at all: no plan, no workouts, no runs. Plans are never
 * generated on the device — they arrive by importing an Excel workbook or the calendar.
 */
export function createInitialState(): AppState {
  const settings = defaultSettings(todayISO());
  return {
    settings,
    plan: [],
    runs: [],
    maxHr: DEFAULT_MAX_HR,
    restingHr: DEFAULT_RESTING_HR,
    zones: zonesFromMaxHr(DEFAULT_MAX_HR),
    calendarEventIds: {},
  };
}

export type RunInput = {
  distanceKm: number;
  durationSec: number;
  avgHr?: number;
  effort?: number;
  notes?: string;
  date?: string;
};

export type SavedRunToast = {
  id: string;
  title: string;
  distanceKm: number;
  durationSec: number;
};

interface AppContextValue extends AppState {
  ready: boolean;
  completedIds: Set<string>;
  lastSavedRun: SavedRunToast | null;
  logRun: (input: RunInput) => void;
  completeWorkout: (workout: Workout, input: RunInput) => void;
  deleteRun: (id: string) => void;
  undoLastRun: () => void;
  dismissUndoToast: () => void;
  updateSettings: (patch: Partial<PlanSettings>) => void;
  linkCalendarEvents: (ids: Record<string, string>) => void;
  importPlanData: (data: { workouts: Workout[]; runs: RunLog[] }) => void;
  addRuns: (runs: RunLog[]) => void;
  /** Creates a workout, or replaces the one that already owns this id. */
  saveWorkout: (workout: Workout) => void;
  /** Removes a workout from the plan; logged runs keep their history. */
  deleteWorkout: (id: string) => void;
  adjustZoneEdge: (id: number, edge: 'min' | 'max', delta: number) => void;
  setMaxHr: (maxHr: number) => void;
  setRestingHr: (restingHr: number) => void;
  resetZones: () => void;
  /** Wipes every stored thing: plan, workouts, runs, zones and settings. */
  clearAllData: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>(createInitialState);
  const [ready, setReady] = useState(false);
  const [lastSavedRun, setLastSavedRun] = useState<SavedRunToast | null>(null);
  const loaded = useRef(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(STORAGE_KEY);
        if (raw && !cancelled) {
          const parsed = JSON.parse(raw) as Partial<AppState>;
          if (parsed.settings) {
            setState((prev) => ({
              ...prev,
              ...parsed,
              settings: { ...prev.settings, ...parsed.settings },
              // An explicitly empty plan (after "Clear all data") must stay empty.
              plan: Array.isArray(parsed.plan)
                ? parsed.plan
                : generatePlan({ ...prev.settings, ...parsed.settings }),
              runs: parsed.runs ?? [],
              zones: parsed.zones ?? prev.zones,
              calendarEventIds: parsed.calendarEventIds ?? {},
            }));
          }
        }
      } catch (error) {
        console.warn('Failed to load saved data, starting fresh.', error);
      } finally {
        if (!cancelled) {
          loaded.current = true;
          setReady(true);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!loaded.current) return;
    AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(state)).catch((error) =>
      console.warn('Failed to save data.', error)
    );
  }, [state]);

  const logRun = useCallback((input: RunInput) => {
    const run: RunLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      date: input.date ?? todayISO(),
      distanceKm: input.distanceKm,
      durationSec: input.durationSec,
      avgHr: input.avgHr,
      effort: input.effort,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
    };
    setState((prev) => ({ ...prev, runs: [run, ...prev.runs] }));
    setLastSavedRun({
      id: run.id,
      title: 'Run logged',
      distanceKm: run.distanceKm,
      durationSec: run.durationSec,
    });
  }, []);

  const completeWorkout = useCallback((workout: Workout, input: RunInput) => {
    const run: RunLog = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      workoutId: workout.id,
      date: input.date ?? workout.date,
      distanceKm: input.distanceKm,
      durationSec: input.durationSec,
      avgHr: input.avgHr,
      effort: input.effort,
      notes: input.notes?.trim() ? input.notes.trim() : undefined,
    };
    setState((prev) => ({
      ...prev,
      runs: [run, ...prev.runs.filter((r) => r.workoutId !== workout.id)],
    }));
    setLastSavedRun({
      id: run.id,
      title: workout.title,
      distanceKm: run.distanceKm,
      durationSec: run.durationSec,
    });
  }, []);

  const deleteRun = useCallback((id: string) => {
    setState((prev) => ({ ...prev, runs: prev.runs.filter((r) => r.id !== id) }));
  }, []);

  const undoLastRun = useCallback(() => {
    if (!lastSavedRun) return;
    deleteRun(lastSavedRun.id);
    setLastSavedRun(null);
  }, [lastSavedRun, deleteRun]);

  const dismissUndoToast = useCallback(() => {
    setLastSavedRun(null);
  }, []);

  const updateSettings = useCallback((patch: Partial<PlanSettings>) => {
    setState((prev) => {
      const settings = { ...prev.settings, ...patch };
      // Keep at least four training weeks between start and race day.
      if (diffDays(settings.startDate, settings.raceDate) < 27) {
        settings.raceDate = addDays(settings.startDate, 27);
      }
      // Only re-shape a plan that already exists; a missing plan is rebuilt by importing.
      return {
        ...prev,
        settings,
        plan: prev.plan.length > 0 ? generatePlan(settings) : prev.plan,
      };
    });
  }, []);

  const linkCalendarEvents = useCallback((ids: Record<string, string>) => {
    if (Object.keys(ids).length === 0) return;
    setState((prev) => ({
      ...prev,
      calendarEventIds: { ...prev.calendarEventIds, ...ids },
    }));
  }, []);

  /** Merges runs, skipping duplicates and releases workout links already taken. */
  const mergeRuns = (existing: RunLog[], incoming: RunLog[]): RunLog[] => {
    const key = (run: RunLog) => `${run.date}|${run.distanceKm}|${run.durationSec}`;
    const known = new Set(existing.map(key));
    const linked = new Set(existing.map((run) => run.workoutId).filter(Boolean));
    const fresh: RunLog[] = [];

    for (const run of incoming) {
      if (known.has(key(run))) continue;
      known.add(key(run));
      const workoutId = run.workoutId && !linked.has(run.workoutId) ? run.workoutId : undefined;
      if (workoutId) linked.add(workoutId);
      fresh.push({ ...run, workoutId });
    }

    return fresh.length ? [...fresh, ...existing] : existing;
  };

  /** Replaces the generated plan with an imported one (or adds runs only). */
  const importPlanData = useCallback((data: { workouts: Workout[]; runs: RunLog[] }) => {
    setState((prev) => {
      let next = prev;

      if (data.workouts.length > 0) {
        const plan = [...data.workouts].sort((a, b) => a.date.localeCompare(b.date));
        next = {
          ...next,
          plan,
          settings: {
            ...next.settings,
            startDate: plan[0].date,
            raceDate: plan[plan.length - 1].date,
          },
          // Imported sessions have no events in the device calendar yet.
          calendarEventIds: {},
        };
      }

      const runs = mergeRuns(next.runs, data.runs);
      return runs === next.runs ? next : { ...next, runs };
    });
  }, []);

  const addRuns = useCallback((incoming: RunLog[]) => {
    if (incoming.length === 0) return;
    setState((prev) => ({ ...prev, runs: mergeRuns(prev.runs, incoming) }));
  }, []);

  const saveWorkout = useCallback((workout: Workout) => {
    setState((prev) => {
      const existing = prev.plan.find((item) => item.id === workout.id);
      const plan = existing
        ? prev.plan.map((item) => (item.id === workout.id ? workout : item))
        : [...prev.plan, workout];
      plan.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

      // A moved session no longer matches its calendar event.
      const staleEvent = existing && existing.date !== workout.date;
      const calendarEventIds = staleEvent
        ? Object.fromEntries(
            Object.entries(prev.calendarEventIds).filter(([id]) => id !== workout.id)
          )
        : prev.calendarEventIds;

      return { ...prev, plan, calendarEventIds };
    });
  }, []);

  const deleteWorkout = useCallback((id: string) => {
    setState((prev) => ({
      ...prev,
      plan: prev.plan.filter((workout) => workout.id !== id),
      calendarEventIds: Object.fromEntries(
        Object.entries(prev.calendarEventIds).filter(([key]) => key !== id)
      ),
    }));
  }, []);

  const adjustZoneEdge = useCallback((id: number, edge: 'min' | 'max', delta: number) => {
    setState((prev) => ({ ...prev, zones: adjustZone(prev.zones, id, edge, delta) }));
  }, []);

  const setMaxHr = useCallback((maxHr: number) => {
    const clamped = Math.min(220, Math.max(120, Math.round(maxHr)));
    setState((prev) => ({ ...prev, maxHr: clamped, zones: zonesFromMaxHr(clamped) }));
  }, []);

  const setRestingHr = useCallback((restingHr: number) => {
    setState((prev) => ({
      ...prev,
      restingHr: Math.min(110, Math.max(30, Math.round(restingHr))),
    }));
  }, []);

  const resetZones = useCallback(() => {
    setState((prev) => ({ ...prev, zones: zonesFromMaxHr(prev.maxHr) }));
  }, []);

  const clearAllData = useCallback(() => {
    setState(createInitialState());
    setLastSavedRun(null);
    // Drop the persisted copy too, so nothing comes back on reload.
    AsyncStorage.removeItem(STORAGE_KEY).catch((error) =>
      console.warn('Failed to clear saved data.', error)
    );
  }, []);

  const completedIds = useMemo(
    () => new Set(state.runs.map((r) => r.workoutId).filter((id): id is string => !!id)),
    [state.runs]
  );

  const value = useMemo<AppContextValue>(
    () => ({
      ...state,
      ready,
      completedIds,
      lastSavedRun,
      logRun,
      completeWorkout,
      deleteRun,
      undoLastRun,
      dismissUndoToast,
      updateSettings,
      linkCalendarEvents,
      importPlanData,
      addRuns,
      saveWorkout,
      deleteWorkout,
      adjustZoneEdge,
      setMaxHr,
      setRestingHr,
      resetZones,
      clearAllData,
    }),
    [
      state,
      ready,
      completedIds,
      lastSavedRun,
      logRun,
      completeWorkout,
      deleteRun,
      undoLastRun,
      dismissUndoToast,
      updateSettings,
      linkCalendarEvents,
      importPlanData,
      addRuns,
      saveWorkout,
      deleteWorkout,
      adjustZoneEdge,
      setMaxHr,
      setRestingHr,
      resetZones,
      clearAllData,
    ]
  );

  if (!ready) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator color={colors.accent} />
        <Text style={styles.loadingText}>Loading your plan…</Text>
      </View>
    );
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used inside <AppProvider>');
  return ctx;
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  loadingText: { color: colors.muted, fontSize: 14 },
});

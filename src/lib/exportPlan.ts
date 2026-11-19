import { Platform } from 'react-native';

import { formatDuration, formatPace, todayISO } from './date';
import { GOAL_LABEL, paceTarget } from './plan';
import type { PlanSettings, RunLog, Workout } from './types';

export const XLSX_MIME =
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export type ExportResult = 'shared' | 'downloaded' | 'unavailable';

interface ExportInput {
  plan: Workout[];
  runs: RunLog[];
  settings: PlanSettings;
  completedIds: Set<string>;
}

export function buildWorkbook(XLSX: typeof import('xlsx'), input: ExportInput) {
  const { plan, runs, settings, completedIds } = input;

  const planRows: (string | number)[][] = [
    ['Date', 'Week', 'Session', 'Type', 'Distance (km)', 'Zone', 'Target pace /km', 'Status', 'Notes'],
    ...plan.map((workout) => [
      workout.date,
      workout.week,
      workout.title,
      workout.type,
      workout.distanceKm,
      `Z${workout.zone}`,
      paceTarget(workout.type, settings.level),
      completedIds.has(workout.id) ? 'Completed' : 'Planned',
      workout.detail,
    ]),
  ];

  const runRows: (string | number)[][] = [
    ['Date', 'Distance (km)', 'Duration', 'Pace /km', 'Avg HR (bpm)', 'Effort', 'Notes'],
    ...runs.map((run) => [
      run.date,
      run.distanceKm,
      formatDuration(run.durationSec),
      formatPace(run.distanceKm > 0 ? run.durationSec / run.distanceKm : 0),
      run.avgHr ?? '',
      run.effort ?? '',
      run.notes ?? '',
    ]),
  ];

  const settingsRows: (string | number)[][] = [
    ['Setting', 'Value'],
    ['Goal', GOAL_LABEL[settings.goal]],
    ['Level', settings.level],
    ['Runs per week', settings.daysPerWeek],
    ['Plan start', settings.startDate],
    ['Race date', settings.raceDate],
    ['Exported', todayISO()],
  ];

  const workbook = XLSX.utils.book_new();
  const planSheet = XLSX.utils.aoa_to_sheet(planRows);
  planSheet['!cols'] = [
    { wch: 12 },
    { wch: 6 },
    { wch: 22 },
    { wch: 11 },
    { wch: 14 },
    { wch: 6 },
    { wch: 16 },
    { wch: 12 },
    { wch: 70 },
  ];
  const runSheet = XLSX.utils.aoa_to_sheet(runRows);
  runSheet['!cols'] = [
    { wch: 12 },
    { wch: 14 },
    { wch: 12 },
    { wch: 12 },
    { wch: 14 },
    { wch: 8 },
    { wch: 40 },
  ];
  const settingsSheet = XLSX.utils.aoa_to_sheet(settingsRows);
  settingsSheet['!cols'] = [{ wch: 16 }, { wch: 24 }];

  XLSX.utils.book_append_sheet(workbook, planSheet, 'Plan');
  XLSX.utils.book_append_sheet(workbook, runSheet, 'Runs');
  XLSX.utils.book_append_sheet(workbook, settingsSheet, 'Settings');
  return workbook;
}

function downloadInBrowser(bytes: Uint8Array, filename: string) {
  const blobPart = new Uint8Array(bytes);
  const blob = new Blob([blobPart], { type: XLSX_MIME });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  setTimeout(() => {
    anchor.remove();
    URL.revokeObjectURL(url);
  }, 1000);
}

/** Builds a real .xlsx of the plan and logged runs, then shares or downloads it. */
export async function exportPlanToExcel(input: ExportInput): Promise<ExportResult> {
  const XLSX = await import('xlsx');
  const workbook = buildWorkbook(XLSX, input);
  const filename = `stride-${input.settings.goal.toLowerCase()}-${todayISO()}.xlsx`;

  if (Platform.OS === 'web') {
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    downloadInBrowser(new Uint8Array(data), filename);
    return 'downloaded';
  }

  const Sharing = await import('expo-sharing');
  let targetUri: string | null = null;

  // 1. Try modern expo-file-system File API
  try {
    const { File, Paths } = await import('expo-file-system');
    const data = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const bytes = new Uint8Array(data);
    const file = new File(Paths.cache, filename);
    if (file.exists) {
      try {
        file.delete();
      } catch {
        // ignore
      }
    }
    file.create({ intermediates: true, overwrite: true });
    await file.write(bytes);
    targetUri = file.uri;
  } catch {
    // 2. Fallback to legacy expo-file-system base64 write
    try {
      const FileSystem = await import('expo-file-system/legacy');
      const base64Data = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
      const path = `${FileSystem.cacheDirectory}${filename}`;
      await FileSystem.writeAsStringAsync(path, base64Data, {
        encoding: FileSystem.EncodingType.Base64,
      });
      targetUri = path;
    } catch (err) {
      console.warn('Failed to write spreadsheet file on native:', err);
    }
  }

  if (!targetUri) {
    throw new Error('Unable to create the spreadsheet on this device.');
  }

  if (!(await Sharing.isAvailableAsync())) {
    return 'unavailable';
  }

  await Sharing.shareAsync(targetUri, {
    mimeType: XLSX_MIME,
    UTI: 'org.openxmlformats.spreadsheetml.sheet',
    dialogTitle: 'Export training plan',
  });
  return 'shared';
}

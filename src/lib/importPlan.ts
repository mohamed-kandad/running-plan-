import { Platform } from 'react-native';

import { diffDays, toISO } from './date';
import { XLSX_MIME } from './exportPlan';
import { zoneForType } from './plan';
import type { RunLog, Workout, WorkoutType } from './types';

export { XLSX_MIME };

export interface ImportedWorkbook {
  fileName: string;
  workouts: Workout[];
  runs: RunLog[];
  warnings: string[];
}

type XLSX = typeof import('xlsx');
type Row = Record<string, unknown>;

const TYPES: WorkoutType[] = ['easy', 'tempo', 'intervals', 'long', 'recovery', 'race'];

const TYPE_WORDS: [WorkoutType, string[]][] = [
  ['intervals', ['interval', 'rep ', 'track', 'fartlek', 'stride']],
  ['tempo', ['tempo', 'threshold', 'cruise']],
  ['long', ['long', 'endurance']],
  ['recovery', ['recovery', 'shakeout']],
  ['race', ['race', 'parkrun']],
  ['easy', ['easy', 'jog', 'aerobic', 'base']],
];

const HEADER_ALIASES = {
  date: ['date', 'day', 'when', 'scheduled'],
  title: ['session', 'title', 'workout', 'name', 'sessionname'],
  type: ['type', 'sessiontype', 'kind'],
  distance: ['distance', 'distancekm', 'km', 'distanceinkm', 'distancekmplanned'],
  zone: ['zone', 'hrzone', 'heartratezone', 'zonenumber'],
  notes: ['notes', 'detail', 'description', 'coachnotes', 'comment', 'comments'],
  week: ['week', 'weeknumber', 'wk'],
  duration: ['duration', 'time', 'totaltime', 'elapsed'],
  avgHr: ['avghr', 'avghrbpm', 'hr', 'heartrate', 'bpm'],
  effort: ['effort', 'rpe', 'perceivedeffort'],
};

const normalizeHeader = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, '');

function pick(row: Row, keys: string[]): unknown {
  for (const key of keys) {
    const value = row[key];
    if (value !== undefined && value !== null && `${value}`.trim() !== '') return value;
  }
  return undefined;
}

export function parseDate(value: unknown, xlsx: XLSX): string | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return toISO(value);

  if (typeof value === 'number' && Number.isFinite(value)) {
    const code = xlsx.SSF.parse_date_code(value);
    if (code?.y && code.m && code.d) {
      return `${code.y}-${`${code.m}`.padStart(2, '0')}-${`${code.d}`.padStart(2, '0')}`;
    }
    return null;
  }

  const text = `${value ?? ''}`.trim();
  if (!text) return null;

  const iso = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (iso) return `${iso[1]}-${iso[2].padStart(2, '0')}-${iso[3].padStart(2, '0')}`;

  // Day-first slash dates (17/11/2026), the format most of the world writes.
  const slash = text.match(/^(\d{1,2})[/.](\d{1,2})[/.](\d{2,4})$/);
  if (slash) {
    const day = Number(slash[1]);
    const month = Number(slash[2]);
    const year = Number(slash[3].length === 2 ? `20${slash[3]}` : slash[3]);
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      return `${year}-${`${month}`.padStart(2, '0')}-${`${day}`.padStart(2, '0')}`;
    }
  }

  const parsed = new Date(text);
  return Number.isNaN(parsed.getTime()) ? null : toISO(parsed);
}

function parseNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  const match = `${value ?? ''}`.replace(',', '.').match(/-?\d+(\.\d+)?/);
  return match ? Number(match[0]) : null;
}

/** Seconds from `h:mm:ss`, `mm:ss`, or a plain number of minutes. */
export function parseDuration(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return Math.round(value * 60);
  }
  const text = `${value ?? ''}`.trim();
  if (!text) return null;
  const parts = text.split(':').map((part) => Number(part));
  if (parts.some((part) => Number.isNaN(part))) return null;
  if (parts.length === 3) return Math.round(parts[0] * 3600 + parts[1] * 60 + parts[2]);
  if (parts.length === 2) return Math.round(parts[0] * 60 + parts[1]);
  if (parts.length === 1 && parts[0] > 0) return Math.round(parts[0] * 60);
  return null;
}

function parseType(value: unknown, title: string, distanceKm: number): WorkoutType {
  const text = `${value ?? ''}`.toLowerCase().trim();
  const direct = TYPES.find(
    (type) => type === text || (type === 'intervals' && text === 'interval')
  );
  if (direct) return direct;

  for (const haystack of [text, title.toLowerCase()]) {
    for (const [type, keywords] of TYPE_WORDS) {
      if (keywords.some((keyword) => haystack.includes(keyword))) return type;
    }
  }
  return distanceKm >= 12 ? 'long' : 'easy';
}

function titleFor(type: WorkoutType): string {
  switch (type) {
    case 'intervals':
      return 'Intervals';
    case 'tempo':
      return 'Tempo run';
    case 'long':
      return 'Long run';
    case 'recovery':
      return 'Recovery jog';
    case 'race':
      return 'Race day';
    default:
      return 'Easy run';
  }
}

function normalizeRows(sheet: import('xlsx').WorkSheet, xlsx: XLSX): Row[] {
  const raw = xlsx.utils.sheet_to_json<Row>(sheet, { defval: '', raw: true });
  return raw.map((row) => {
    const normalized: Row = {};
    for (const [key, value] of Object.entries(row)) normalized[normalizeHeader(key)] = value;
    return normalized;
  });
}

function headerKeys(rows: Row[]): Set<string> {
  const keys = new Set<string>();
  for (const row of rows.slice(0, 3)) Object.keys(row).forEach((key) => keys.add(key));
  return keys;
}

const hasAny = (keys: Set<string>, aliases: string[]) => aliases.some((key) => keys.has(key));

/**
 * Reads a workbook written by Stride (or by hand in the same shape) and turns it into
 * plan sessions and logged runs. Unknown columns are ignored and values are coerced
 * generously, so a template edited in Excel, Numbers or Google Sheets still imports.
 */
export function parseWorkbook(
  xlsx: XLSX,
  data: Uint8Array | ArrayBuffer
): Omit<ImportedWorkbook, 'fileName'> {
  const workbook = xlsx.read(data, { type: 'array', cellDates: true });
  const warnings: string[] = [];

  const sheets = workbook.SheetNames.map((name) => ({
    name,
    rows: normalizeRows(workbook.Sheets[name], xlsx),
  }));

  const looksLikePlan = (rows: Row[]) => {
    const keys = headerKeys(rows);
    return hasAny(keys, HEADER_ALIASES.date) && hasAny(keys, HEADER_ALIASES.title);
  };

  const sessions = sheets.find((sheet) => /^(plan|sessions?|training)$/i.test(sheet.name.trim()))
    ?? sheets.find((sheet) => looksLikePlan(sheet.rows));

  const runs = sheets.find((sheet) => {
    if (sheet === sessions) return false;
    if (/^runs?$/i.test(sheet.name.trim())) return true;
    const keys = headerKeys(sheet.rows);
    return (
      hasAny(keys, HEADER_ALIASES.distance) &&
      hasAny(keys, HEADER_ALIASES.duration) &&
      !hasAny(keys, HEADER_ALIASES.title)
    );
  });

  const workouts: Workout[] = [];
  const weekByDate = new Map<string, number>();

  sessions?.rows.forEach((row, index) => {
    const date = parseDate(pick(row, HEADER_ALIASES.date), xlsx);
    if (!date) {
      if (pick(row, HEADER_ALIASES.date) !== undefined) {
        warnings.push(`Session row ${index + 2}: couldn't read the date — skipped.`);
      }
      return;
    }

    const week = parseNumber(pick(row, HEADER_ALIASES.week));
    if (week && week >= 1) weekByDate.set(date, Math.round(week));

    const rawDistance = parseNumber(pick(row, HEADER_ALIASES.distance));
    const distanceKm = Math.min(
      80,
      Math.max(0.5, rawDistance && rawDistance > 0 ? Math.round(rawDistance * 10) / 10 : 5)
    );
    const title = `${pick(row, HEADER_ALIASES.title) ?? ''}`.trim();
    const type = parseType(pick(row, HEADER_ALIASES.type), title, distanceKm);
    const rawZone = parseNumber(pick(row, HEADER_ALIASES.zone));
    const zone = rawZone && rawZone >= 1 && rawZone <= 5 ? Math.round(rawZone) : zoneForType(type);
    const notes = `${pick(row, HEADER_ALIASES.notes) ?? ''}`.trim();

    workouts.push({
      id: `${date}-${type}`,
      date,
      week: 0,
      type,
      title: title || titleFor(type),
      detail: notes || `Imported session — ${distanceKm} km in Z${zone}.`,
      distanceKm,
      zone,
    });
  });

  const startDate = workouts.map((workout) => workout.date).sort()[0];
  const seen = new Map<string, number>();
  const plan = workouts
    .map((workout) => {
      const base = `${workout.date}-${workout.type}`;
      const count = seen.get(base) ?? 0;
      seen.set(base, count + 1);
      const week =
        weekByDate.get(workout.date) ??
        (startDate ? Math.floor(diffDays(startDate, workout.date) / 7) + 1 : 1);
      return { ...workout, week, id: count === 0 ? base : `${base}-${count + 1}` };
    })
    .sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

  const loggedRuns: RunLog[] = [];
  runs?.rows.forEach((row, index) => {
    const date = parseDate(pick(row, HEADER_ALIASES.date), xlsx);
    const distanceKm = parseNumber(pick(row, HEADER_ALIASES.distance));
    const durationSec = parseDuration(pick(row, HEADER_ALIASES.duration));
    if (!date || !distanceKm || !durationSec) {
      if (date || distanceKm || durationSec) {
        warnings.push(`Run row ${index + 2}: needs a date, distance and duration — skipped.`);
      }
      return;
    }

    const avgHr = parseNumber(pick(row, HEADER_ALIASES.avgHr));
    const effort = parseNumber(pick(row, HEADER_ALIASES.effort));
    const notes = `${pick(row, HEADER_ALIASES.notes) ?? ''}`.trim();
    const session = plan.find((workout) => workout.date === date);
    const alreadyLinked = loggedRuns.some((run) => run.workoutId === session?.id);

    loggedRuns.push({
      id: `xlsx-${date}-${index}`,
      workoutId: session && !alreadyLinked ? session.id : undefined,
      date,
      distanceKm: Math.round(distanceKm * 100) / 100,
      durationSec,
      avgHr: avgHr ? Math.round(avgHr) : undefined,
      effort: effort ? Math.min(10, Math.max(1, Math.round(effort))) : undefined,
      notes: notes || undefined,
    });
  });

  if (!sessions && !runs) {
    warnings.push(
      'No plan or runs sheet found. Expected columns like Date, Session, Type and Distance (km).'
    );
  }

  return { workouts: plan, runs: loggedRuns, warnings };
}

async function readPickedBytes(asset: {
  uri: string;
  file?: { arrayBuffer(): Promise<ArrayBuffer> };
  base64?: string;
}): Promise<Uint8Array> {
  // Web: File object, base64, or blob URI fetch
  if (Platform.OS === 'web') {
    if (asset.file) {
      return new Uint8Array(await asset.file.arrayBuffer());
    }
    if (asset.base64) {
      const clean = asset.base64.replace(/^data:.*?;base64,/, '');
      const binary = atob(clean);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
      return bytes;
    }
    const response = await fetch(asset.uri);
    return new Uint8Array(await response.arrayBuffer());
  }

  // Native: try new File API
  try {
    const { File } = await import('expo-file-system');
    const file = new File(asset.uri);
    if (file.exists) {
      return await file.bytes();
    }
  } catch {
    // fallback
  }

  // Native: try fetch (React Native fetch supports local file:// and content://)
  try {
    const response = await fetch(asset.uri);
    return new Uint8Array(await response.arrayBuffer());
  } catch {
    // fallback
  }

  // Native: fallback to legacy FileSystem with base64
  const FileSystem = await import('expo-file-system/legacy');
  const base64 = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.Base64,
  });
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/** Opens the system file picker and parses the chosen workbook. `null` when cancelled. */
export async function importPlanFromFile(): Promise<ImportedWorkbook | null> {
  const DocumentPicker = await import('expo-document-picker');
  const result = await DocumentPicker.getDocumentAsync({
    type: [
      XLSX_MIME,
      'application/vnd.ms-excel',
      'text/csv',
      'application/octet-stream',
      '*/*',
    ],
    copyToCacheDirectory: true,
    multiple: false,
  });
  if (result.canceled || !result.assets?.length) return null;

  const asset = result.assets[0];
  const xlsx = await import('xlsx');
  const bytes = await readPickedBytes(asset);
  const parsed = parseWorkbook(xlsx, bytes);
  return { ...parsed, fileName: asset.name ?? 'workbook.xlsx' };
}

/** One-line summary of what an import contained, for the sync status row. */
export function describeImport(result: ImportedWorkbook): string {
  const parts: string[] = [];
  if (result.workouts.length) {
    parts.push(`${result.workouts.length} session${result.workouts.length === 1 ? '' : 's'}`);
  }
  if (result.runs.length) parts.push(`${result.runs.length} run${result.runs.length === 1 ? '' : 's'}`);
  if (parts.length === 0) {
    const reason = result.warnings[0] ?? 'no plan or runs sheet found';
    return `Nothing to import from ${result.fileName} — ${reason}`;
  }
  const summary = `Imported ${parts.join(' and ')} from ${result.fileName}.`;
  return result.warnings.length
    ? `${summary} ${result.warnings.length} row${result.warnings.length === 1 ? '' : 's'} skipped.`
    : summary;
}

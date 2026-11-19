/** Local-date helpers. All app dates are `YYYY-MM-DD` strings in the device timezone. */

export function toISO(d: Date): string {
  const y = d.getFullYear();
  const m = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function fromISO(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISO(new Date());
}

export function addDays(iso: string, days: number): string {
  const d = fromISO(iso);
  d.setDate(d.getDate() + days);
  return toISO(d);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function diffDays(a: string, b: string): number {
  const ms = fromISO(b).getTime() - fromISO(a).getTime();
  return Math.round(ms / 86_400_000);
}

/** Monday-based start of the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const d = fromISO(iso);
  const shift = (d.getDay() + 6) % 7;
  return addDays(iso, -shift);
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function weekdayLetter(iso: string): string {
  return WEEKDAYS[(fromISO(iso).getDay() + 6) % 7][0];
}

export function weekdayShort(iso: string): string {
  return WEEKDAYS[(fromISO(iso).getDay() + 6) % 7];
}

export function dayNumber(iso: string): number {
  return fromISO(iso).getDate();
}

export function formatShort(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

const MONTHS_FULL = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

const WEEKDAYS_FULL = [
  'Monday',
  'Tuesday',
  'Wednesday',
  'Thursday',
  'Friday',
  'Saturday',
  'Sunday',
];

export function formatLong(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS_FULL[(d.getDay() + 6) % 7]}, ${d.getDate()} ${MONTHS[d.getMonth()]} ${d.getFullYear()}`;
}

export function formatLongShort(iso: string): string {
  const d = fromISO(iso);
  return `${WEEKDAYS[(d.getDay() + 6) % 7]} ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function isToday(iso: string): boolean {
  return iso === todayISO();
}

export function startOfMonth(iso: string): string {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth(), 1));
}

export function addMonths(iso: string, months: number): string {
  const d = fromISO(iso);
  return toISO(new Date(d.getFullYear(), d.getMonth() + months, 1));
}

export function monthLabel(iso: string): string {
  const d = fromISO(iso);
  return `${MONTHS_FULL[d.getMonth()]} ${d.getFullYear()}`;
}

export function inMonth(iso: string, monthIso: string): boolean {
  return iso.slice(0, 7) === monthIso.slice(0, 7);
}

/** Six Monday-first weeks covering the month of `iso`. */
export function monthGrid(iso: string): string[] {
  const gridStart = startOfWeek(startOfMonth(iso));
  return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i));
}

export function inDays(iso: string): number {
  return diffDays(todayISO(), iso);
}

export function formatDuration(sec: number): string {
  const total = Math.max(0, Math.round(sec));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${`${m}`.padStart(2, '0')}:${`${s}`.padStart(2, '0')}`;
  return `${m}:${`${s}`.padStart(2, '0')}`;
}

export function formatPace(secPerKm: number): string {
  if (!Number.isFinite(secPerKm) || secPerKm <= 0) return '—';
  const total = Math.round(secPerKm);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${`${s}`.padStart(2, '0')}`;
}

export function plural(n: number, word: string): string {
  return `${n} ${word}${n === 1 ? '' : 's'}`;
}

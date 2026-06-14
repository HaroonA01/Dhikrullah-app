import { getMeta, setMeta } from '@/db/queries';

// Number of individual dhikrs the user must finish in a day to extend their streak.
export const STREAK_DHIKR_THRESHOLD = 10;

export const META_KEY_LIFETIME_DHIKR = 'lifetime_total_dhikr';
export const META_KEY_LIFETIME_SECONDS = 'lifetime_time_seconds';
export const META_KEY_CURRENT_STREAK = 'current_streak';
export const META_KEY_LONGEST_STREAK = 'longest_streak';
export const META_KEY_LONGEST_STREAK_END = 'longest_streak_end_date';
export const META_KEY_LAST_STREAK_DATE = 'last_streak_date';
export const META_KEY_LIFETIME_BACKFILL_DONE = 'lifetime_backfill_done';

const pad2 = (n: number) => String(n).padStart(2, '0');

export const dateKeyFor = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

export const todayKey = (): string => dateKeyFor(new Date());

const parseDateKey = (key: string): Date => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const MS_PER_DAY = 24 * 60 * 60 * 1000;

export const daysBetween = (a: string, b: string): number => {
  const ad = parseDateKey(a).getTime();
  const bd = parseDateKey(b).getTime();
  return Math.round((bd - ad) / MS_PER_DAY);
};

export const lastNDays = (n: number): string[] => {
  const today = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth(), today.getDate() - i);
    out.push(dateKeyFor(d));
  }
  return out;
};

export const currentWeekDays = (): string[] => {
  const d = new Date();
  const monOffset = (d.getDay() + 6) % 7;
  const monday = new Date(
    d.getFullYear(),
    d.getMonth(),
    d.getDate() - monOffset,
  );
  return Array.from({ length: 7 }, (_, i) =>
    dateKeyFor(
      new Date(monday.getFullYear(), monday.getMonth(), monday.getDate() + i),
    ),
  );
};

export const monthKeyFor = (d: Date): string =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-01`;

export const lastNMonths = (n: number): string[] => {
  const today = new Date();
  const out: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    out.push(monthKeyFor(new Date(today.getFullYear(), today.getMonth() - i, 1)));
  }
  return out;
};

export const monthEndDateKey = (monthStartKey: string): string => {
  const [y, m] = monthStartKey.split('-').map(Number);
  const last = new Date(y, m, 0);
  return dateKeyFor(last);
};

export async function bumpStreak(): Promise<number> {
  const today = todayKey();
  const last = await getMeta(META_KEY_LAST_STREAK_DATE);
  const cur = Number((await getMeta(META_KEY_CURRENT_STREAK)) ?? '0');
  if (last === today) return cur;
  const next = last && daysBetween(last, today) === 1 ? cur + 1 : 1;
  await setMeta(META_KEY_CURRENT_STREAK, String(next));
  await setMeta(META_KEY_LAST_STREAK_DATE, today);
  const longest = Number((await getMeta(META_KEY_LONGEST_STREAK)) ?? '0');
  if (next > longest) {
    await setMeta(META_KEY_LONGEST_STREAK, String(next));
    await setMeta(META_KEY_LONGEST_STREAK_END, today);
  }
  return next;
}

export async function getDisplayStreak(): Promise<number> {
  const last = await getMeta(META_KEY_LAST_STREAK_DATE);
  const cur = Number((await getMeta(META_KEY_CURRENT_STREAK)) ?? '0');
  if (!last) return 0;
  return daysBetween(last, todayKey()) > 1 ? 0 : cur;
}

export function formatHM(totalSeconds: number): string {
  if (totalSeconds < 60) return `${totalSeconds}s`;
  const mins = Math.floor(totalSeconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  return remMins === 0 ? `${hours}h` : `${hours}h ${remMins}m`;
}

// Compact count formatter for high-value stats (e.g. lifetime dhikr).
// < 10,000        → raw with commas (e.g. "9,999")
// 10,000–999,999  → "X.Xk" (e.g. "10.0k", "999.9k")
// ≥ 1,000,000     → "X.XXm" (e.g. "1.00m", "12.34m")
export function formatCompactCount(n: number): string {
  if (n < 10_000) return n.toLocaleString();
  if (n < 1_000_000) return `${(n / 1_000).toFixed(1)}k`;
  return `${(n / 1_000_000).toFixed(2)}m`;
}

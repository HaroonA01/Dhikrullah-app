import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import type { CategoryId } from '@/types';
import type { NotifOffset } from '@/context/PrefsContext';
import type { NotifSoundId } from '@/lib/soundMap';
import { NOTIF_SOUND_FILENAME } from '@/lib/soundMap';
import {
  computeExtendedTimes,
  computeTomorrowFajr,
  computeCategoryWindows,
  type TimeWindow,
  type Coords,
  type MethodId,
  type Madhab,
} from '@/lib/prayer';
import { getMeta, getDailyStatsForDate } from '@/db/queries';
import {
  STREAK_DHIKR_THRESHOLD,
  META_KEY_CURRENT_STREAK,
  META_KEY_LAST_STREAK_DATE,
  todayKey,
  daysBetween,
} from '@/lib/stats';

let _soundEnabled = true;
// Resolved sound value from the last full schedule, reused by standalone
// streak refreshes (which run without the full ScheduleArgs).
let _streakSoundValue: boolean | string = true;

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: _soundEnabled,
    shouldSetBadge: false,
  }),
});

if (Platform.OS === 'android') {
  Notifications.setNotificationChannelAsync('default', {
    name: 'Dhikr Reminders',
    importance: Notifications.AndroidImportance.HIGH,
    sound: 'default',
    vibrationPattern: [0, 250, 250, 250],
    lightColor: '#A78BFA',
  }).catch(() => {});
}

export const requestNotificationPermission = async (): Promise<boolean> => {
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
};

const CATEGORY_MESSAGES: Record<CategoryId, { titles: string[]; bodies: string[] }> = {
  all_day: {
    titles: [
      'All Day Dhikr',
      'Daily Dhikr Reminder',
      'Your All Day Dhikr',
      'All Day Reminder',
      'Time for Daily Dhikr',
    ],
    bodies: [
      'Verily, in the remembrance of Allah do hearts find rest.',
      'So remember Me; I will remember you.',
      'O you who believe! Remember Allah with much remembrance.',
      'The example of the one who remembers Allah and the one who does not is like the living and the dead.',
      'Shall I not inform you of the best of your deeds…? It is the remembrance of Allah.',
      'I am with My servant when he remembers Me.',
    ],
  },
  fajr: {
    titles: [
      'Fajr Adhkar',
      'Time for Fajr',
      'Fajr Reminder',
      'Rise for Fajr',
      'Fajr Dhikr',
    ],
    bodies: [
      'Begin your day with the remembrance of Allah.',
      "Fajr is here. Rise and seek Allah's mercy.",
      'Start the morning with prayer and peace.',
      'The day begins best with Allah in your heart.',
      'Wake for Fajr and welcome the blessings of the day.',
    ],
  },
  waking_up: {
    titles: [
      'Waking Up Adhkar',
      'Time for Waking Up Dhikr',
      'Your Waking Up Dhikr',
      'Waking Up Reminder',
    ],
    bodies: [
      "You have awakened by Allah's mercy.",
      'Start this new day with dhikr.',
      'Thank Allah for returning your soul.',
      'Wake up with gratitude and remembrance.',
    ],
  },
  morning: {
    titles: [
      'Morning Adhkar',
      'Your Morning Dhikr',
      'Morning Reminder',
      'Time for Morning Adhkar',
      'Begin the Morning',
    ],
    bodies: [
      'Begin your morning with gratitude to Allah.',
      'Recite your morning adhkar and seek protection.',
      'A peaceful morning starts with remembering Allah.',
      'Ask Allah to bless your day ahead.',
      'Let your first thoughts be of Allah.',
    ],
  },
  dhuhr: {
    titles: [
      'Dhuhr Dhikr',
      'Time for Dhuhr',
      'Dhuhr Reminder',
    ],
    bodies: [
      'Pause your day and return to Allah.',
      'Step away from the world and remember Allah.',
      'Renew your focus with Dhuhr and dhikr.',
    ],
  },
  asr: {
    titles: [
      'Asr Dhikr',
      'Time for Asr',
      'Asr Reminder',
      'Your Asr Dhikr',
    ],
    bodies: [
      'Guard your Asr and remember Allah.',
      'Take a moment before the day slips away.',
      'Asr is here. Return your heart to Allah.',
      'Let your afternoon be filled with remembrance of Allah.',
    ],
  },
  evening: {
    titles: [
      'Evening Adhkar',
      'Evening Reminder',
      'Your Evening Adhkar',
      'Time for Evening Dhikr',
      'Evening Dhikr',
    ],
    bodies: [
      'End the day with gratitude and dhikr.',
      'Recite your evening adhkar for peace and protection.',
      'As the day fades, remember Allah.',
      "Let your evening be calm with Allah's remembrance.",
      'Thank Allah for the blessings of today.',
    ],
  },
  maghrib: {
    titles: [
      'Maghrib Dhikr',
      'Time for Maghrib',
      'Maghrib Reminder',
    ],
    bodies: [
      'Let Maghrib bring peace to your heart.',
      'Thank Allah as the sun sets.',
      'Pause at sunset and return to Allah.',
    ],
  },
  isha: {
    titles: [
      'Isha Dhikr',
      'Time for Isha',
      'Isha Reminder',
      'Your Isha Dhikr',
    ],
    bodies: [
      'Isha is here. Seek peace with Allah.',
      'Close the day by turning back to Allah.',
      'Let your night begin with worship.',
      'Remember Allah before the world becomes quiet.',
    ],
  },
  witr: {
    titles: [
      'Witr Dhikr',
      'Time for Witr',
      'Witr Reminder',
    ],
    bodies: [
      'Stand before Allah in the stillness of the night.',
      'Let Witr be your final prayer tonight.',
      'Complete your night with prayer and hope.',
    ],
  },
  before_bed: {
    titles: [
      'Bedtime Adhkar',
      'Before You Sleep',
      'Bedtime Reminder',
      'Your Bedtime Dhikr',
    ],
    bodies: [
      'Sleep with the remembrance of Allah.',
      'Recite your bedtime adhkar and rest in peace.',
      'Place your trust in Allah before you sleep.',
      'Let your last words tonight be dhikr.',
    ],
  },
};

const PRAYER_OFFSET_IDS: ReadonlySet<CategoryId> = new Set([
  'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr',
]);

type PairKey = 'fajr_morning' | 'asr_evening' | 'isha_witr';

const COMBINE_PAIRS: ReadonlyArray<{ key: PairKey; primary: CategoryId; secondary: CategoryId }> = [
  { key: 'fajr_morning', primary: 'fajr', secondary: 'morning' },
  { key: 'asr_evening',  primary: 'asr',  secondary: 'evening' },
  { key: 'isha_witr',    primary: 'isha', secondary: 'witr' },
];

const COMBINED_MESSAGES: Record<PairKey, { titles: string[]; bodies: string[] }> = {
  fajr_morning: {
    titles: [
      'Fajr & Morning Adhkar',
      'Time for Fajr & Morning Adhkar',
      'Fajr + Morning Dhikr',
      'Dhikr: Fajr & Morning',
    ],
    bodies: [
      'Begin the day with Fajr and your morning adhkar.',
      'Pause for Fajr and recite the morning remembrances.',
      'Start the day with prayer and protection.',
      'Welcome the morning with Fajr and dhikr.',
    ],
  },
  asr_evening: {
    titles: [
      'Asr & Evening Adhkar',
      'Time for Asr & Evening Adhkar',
      'Asr + Evening Dhikr',
      'Dhikr: Asr & Evening',
    ],
    bodies: [
      'Take a moment for Asr and your evening adhkar.',
      'Asr is here. Recite the evening remembrances too.',
      'Return to Allah with Asr and your evening dhikr.',
      'Guard your afternoon with Asr and evening adhkar.',
    ],
  },
  isha_witr: {
    titles: [
      'Isha & Witr',
      'Time for Isha & Witr',
      'Isha + Witr Dhikr',
      'Dhikr: Isha & Witr',
    ],
    bodies: [
      'Close the day with Isha and Witr.',
      'Pray Isha and complete the night with Witr.',
      'End the day with Isha and Witr.',
      'Let your night begin with Isha and Witr.',
    ],
  },
};

const FRIDAY_REMINDER_MESSAGES: { titles: string[]; bodies: string[] } = {
  titles: [
    'Friday Dhikr Reminder',
    "Jumu'ah Dhikr",
    'Your Friday Dhikr',
    'Friday Blessings',
    'A Blessed Jumu‘ah',
  ],
  bodies: [
    'Send blessings on the Prophet ﷺ this Jumu‘ah.',
    "It's Friday — take a moment for dhikr.",
    'Reconnect with Allah on this blessed day.',
    'A blessed Friday. Return to your dhikr.',
    'Pause this Jumu‘ah and remember Allah.',
  ],
};

// Streak-loss warning. A distinct notification type (not a CategoryId): fixed
// 8pm local, always on, no prayer window. Tagged via data.type so it can be
// cancelled/rescheduled independently of the prayer/Friday set.
const STREAK_NOTIF_TYPE = 'streak';
const STREAK_NOTIF_HOUR = 20;

const streakWord = (y: number): string => `${y}-day streak`;

// Today: user has a live streak from yesterday and hasn't yet hit the daily
// threshold. X = dhikr remaining today, Y = streak about to be lost.
const STREAK_SAVE_TITLES = [
  'Streak at Risk',
  'Keep Your Streak Alive',
  "Don't Lose Your Streak",
  'Streak Reminder',
];
const STREAK_SAVE_BODIES: ReadonlyArray<(x: number, y: number) => string> = [
  (x, y) => `${x} more dhikr to keep your ${streakWord(y)} alive.`,
  (x, y) => `Don't break your ${streakWord(y)} — ${x} dhikr to go today.`,
  (x, y) => `Your ${streakWord(y)} needs ${x} more dhikr before midnight.`,
  (x, y) => `So close — ${x} dhikr left to protect your ${streakWord(y)}.`,
];

// Tomorrow: today's streak is already secured. Default X = threshold (fresh
// day), Y = current streak (already includes today).
const STREAK_KEEP_TITLES = [
  'Keep Your Streak Going',
  'Protect Your Streak',
  'Another Day of Dhikr',
  'Streak Reminder',
];
const STREAK_KEEP_BODIES: ReadonlyArray<(y: number) => string> = [
  (y) => `Complete ${STREAK_DHIKR_THRESHOLD} dhikr today to protect your ${streakWord(y)}.`,
  (y) => `Keep your ${streakWord(y)} going — ${STREAK_DHIKR_THRESHOLD} dhikr today.`,
  (y) => `Don't let your ${streakWord(y)} slip. ${STREAK_DHIKR_THRESHOLD} dhikr keeps it alive.`,
];

const WEEKLY_REMINDER_COUNT = 3;
const FRIDAY_DOW = 5;
const FRIDAY_HOUR = 12;

const addMinutesToDate = (date: Date, minutes: number): Date =>
  new Date(date.getTime() + minutes * 60 * 1000);

const sameMinute = (a: Date, b: Date): boolean =>
  Math.floor(a.getTime() / 60000) === Math.floor(b.getTime() / 60000);

const pickRandom = <T,>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)];

const getNextFridaysAtNoon = (from: Date, count: number): Date[] => {
  const result: Date[] = [];
  const first = new Date(from);
  first.setHours(FRIDAY_HOUR, 0, 0, 0);
  const dayDiff = (FRIDAY_DOW - first.getDay() + 7) % 7;
  first.setDate(first.getDate() + dayDiff);
  for (let i = 0; i < count; i++) {
    const friday = new Date(first);
    friday.setDate(friday.getDate() + i * 7);
    result.push(friday);
  }
  return result;
};

// True if `now` falls within Thursday 00:00 -> the given Friday 12:00 (the active-this-week window).
const isInActiveWindowForFriday = (now: Date, friday: Date): boolean => {
  const thursdayStart = new Date(friday);
  thursdayStart.setDate(thursdayStart.getDate() - 1);
  thursdayStart.setHours(0, 0, 0, 0);
  return now >= thursdayStart && now < friday;
};

interface ScheduleArgs {
  notifEnabled: Record<CategoryId, boolean>;
  notifOffset: Partial<Record<CategoryId, NotifOffset>>;
  coords: Coords | null;
  methodId: MethodId;
  madhab: Madhab;
  wakingUpMinutes: number;
  beforeBedMinutes: number;
  notifSound: NotifSoundId;
  allDayMinutes: number;
}

// Mutex + replay-latest. Prevents the duplication race where two concurrent
// scheduleAllNotifications calls both capture the same "old IDs" snapshot
// and both schedule fresh sets, doubling the notification count.
let _scheduling = false;
let _pendingArgs: ScheduleArgs | null = null;

export const scheduleAllNotifications = async (
  notifEnabled: Record<CategoryId, boolean>,
  notifOffset: Partial<Record<CategoryId, NotifOffset>>,
  coords: Coords | null,
  methodId: MethodId,
  madhab: Madhab,
  wakingUpMinutes: number,
  beforeBedMinutes: number,
  notifSound: NotifSoundId,
  allDayMinutes: number,
): Promise<void> => {
  const args: ScheduleArgs = {
    notifEnabled, notifOffset, coords, methodId, madhab,
    wakingUpMinutes, beforeBedMinutes, notifSound, allDayMinutes,
  };

  if (_scheduling) {
    // Already running — queue latest args so the current run re-fires with the freshest state.
    _pendingArgs = args;
    return;
  }

  _scheduling = true;
  try {
    await _doSchedule(args);
  } finally {
    _scheduling = false;
    const next = _pendingArgs;
    if (next) {
      _pendingArgs = null;
      scheduleAllNotifications(
        next.notifEnabled, next.notifOffset, next.coords, next.methodId, next.madhab,
        next.wakingUpMinutes, next.beforeBedMinutes, next.notifSound, next.allDayMinutes,
      ).catch(() => {});
    }
  }
};

const _doSchedule = async (a: ScheduleArgs): Promise<void> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  _soundEnabled = a.notifSound !== 'none';

  const soundValue: boolean | string =
    a.notifSound === 'none'    ? false
  : a.notifSound === 'default' ? true
  : Platform.OS === 'android'  ? a.notifSound
  : (NOTIF_SOUND_FILENAME[a.notifSound] ?? true);
  _streakSoundValue = soundValue;

  // Cancel ALL existing first. Wipes any duplicates left over from past race conditions,
  // and guarantees the fresh set we're about to write is the only one in the system.
  // Runs before the coords guard so streak notifs are (re)scheduled even without a location.
  await Notifications.cancelAllScheduledNotificationsAsync().catch(() => {});

  const now = new Date();

  const scheduleNotif = async (
    title: string,
    body: string,
    date: Date,
    categoryId?: CategoryId,
    secondaryId?: CategoryId,
  ): Promise<void> => {
    // Combined-pair notifs carry both ids so that page-visit dismissal works
    // from either side (e.g. opening Morning clears a Fajr+Morning combined).
    const data = categoryId
      ? secondaryId
        ? { categoryId, categoryIds: [categoryId, secondaryId] }
        : { categoryId }
      : undefined;
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: soundValue,
        ...(data ? { data } : {}),
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  };

  // Prayer/adhkar and Friday notifs need a location. Streak notifs do not —
  // schedule them and bail when there are no coordinates.
  if (!a.coords) {
    await refreshStreakNotifications();
    return;
  }

  for (let dayOffset = 0; dayOffset < 4; dayOffset++) {
    const targetDate = new Date(now);
    targetDate.setDate(targetDate.getDate() + dayOffset);
    targetDate.setHours(0, 0, 0, 0);

    const ext = computeExtendedTimes(a.coords, targetDate, a.methodId, a.madhab);
    const tomorrowFajr = computeTomorrowFajr(a.coords, targetDate, a.methodId, a.madhab);
    const windows = computeCategoryWindows(ext, tomorrowFajr, a.wakingUpMinutes, a.beforeBedMinutes, targetDate);

    const categoryIds = Object.keys(a.notifEnabled) as CategoryId[];
    const plans = new Map<CategoryId, Date>();
    for (const id of categoryIds) {
      if (!a.notifEnabled[id]) continue;
      const win: TimeWindow | undefined = windows[id];
      if (!win) continue;

      const offset = PRAYER_OFFSET_IDS.has(id) ? (a.notifOffset[id] ?? 0) : 0;
      const triggerTime = id === 'all_day'
        ? addMinutesToDate(targetDate, a.allDayMinutes)
        : addMinutesToDate(win.start, offset);

      if (triggerTime <= now) continue;
      plans.set(id, triggerTime);
    }

    // Detect combinable pairs that land on the same wall-clock minute.
    // Combined notif replaces the two individual ones; tap routes to the primary.
    const combinedIds = new Set<CategoryId>();

    for (const pair of COMBINE_PAIRS) {
      const primaryAt = plans.get(pair.primary);
      const secondaryAt = plans.get(pair.secondary);
      if (!primaryAt || !secondaryAt) continue;
      if (!sameMinute(primaryAt, secondaryAt)) continue;

      const { titles, bodies } = COMBINED_MESSAGES[pair.key];
      await scheduleNotif(pickRandom(titles), pickRandom(bodies), primaryAt, pair.primary, pair.secondary);
      combinedIds.add(pair.primary);
      combinedIds.add(pair.secondary);
    }

    for (const [id, triggerTime] of plans) {
      if (combinedIds.has(id)) continue;
      const { titles, bodies } = CATEGORY_MESSAGES[id];
      await scheduleNotif(pickRandom(titles), pickRandom(bodies), triggerTime, id);
    }
  }

  // Weekly Friday fallback. Always-on safety net for users who don't open the app
  // for >3 days (past the daily-notif horizon). Skip the upcoming Friday if scheduling
  // is happening within its Thu 00:00 -> Fri 12:00 window — the user is already active.
  const fridays = getNextFridaysAtNoon(now, WEEKLY_REMINDER_COUNT);
  for (let i = 0; i < fridays.length; i++) {
    const friday = fridays[i];
    if (friday <= now) continue;
    if (i === 0 && isInActiveWindowForFriday(now, friday)) continue;

    const { titles, bodies } = FRIDAY_REMINDER_MESSAGES;
    await scheduleNotif(pickRandom(titles), pickRandom(bodies), friday);
  }

  // Re-add streak warnings (the cancelAll above wiped them too). Runs through
  // the shared refresh so the per-completion path and this path stay in sync.
  await refreshStreakNotifications();
};

// Mutex + replay-latest for the streak refresh, mirroring scheduleAllNotifications.
let _streakScheduling = false;
let _streakPending = false;

// Recompute the (at most two) streak-loss notifications without disturbing the
// prayer/Friday set. Called on every dhikr completion, on day rollover, and at
// the end of every full schedule. Cheap and idempotent.
export const refreshStreakNotifications = async (): Promise<void> => {
  if (_streakScheduling) {
    _streakPending = true;
    return;
  }
  _streakScheduling = true;
  try {
    await _doRefreshStreak();
  } finally {
    _streakScheduling = false;
    if (_streakPending) {
      _streakPending = false;
      refreshStreakNotifications().catch(() => {});
    }
  }
};

const _doRefreshStreak = async (): Promise<void> => {
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') return;

  // Cancel only our own streak-tagged notifications — leave prayer/Friday alone.
  const all = await Notifications.getAllScheduledNotificationsAsync().catch(() => []);
  for (const n of all) {
    const data = n.content?.data as { type?: unknown } | null | undefined;
    if (data?.type === STREAK_NOTIF_TYPE) {
      await Notifications.cancelScheduledNotificationAsync(n.identifier).catch(() => {});
    }
  }

  const today = todayKey();
  const last = await getMeta(META_KEY_LAST_STREAK_DATE);
  const cur = Number((await getMeta(META_KEY_CURRENT_STREAK)) ?? '0');

  let completedToday = 0;
  try {
    const rows = await getDailyStatsForDate(today);
    completedToday = rows[0]?.dhikrsCompleted ?? 0;
  } catch {}

  const now = new Date();
  const securedToday = last === today;
  const aliveFromYesterday = !!last && daysBetween(last, today) === 1;

  const scheduleStreak = async (date: Date, title: string, body: string): Promise<void> => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        sound: _streakSoundValue,
        data: { type: STREAK_NOTIF_TYPE },
        ...(Platform.OS === 'android' ? { channelId: 'default' } : {}),
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date,
      },
    });
  };

  // Today's warning: live streak carried in from yesterday, not yet secured today.
  if (aliveFromYesterday && completedToday < STREAK_DHIKR_THRESHOLD) {
    const today8pm = new Date(now);
    today8pm.setHours(STREAK_NOTIF_HOUR, 0, 0, 0);
    if (now < today8pm) {
      const x = STREAK_DHIKR_THRESHOLD - completedToday;
      await scheduleStreak(today8pm, pickRandom(STREAK_SAVE_TITLES), pickRandom(STREAK_SAVE_BODIES)(x, cur));
    }
  }

  // Tomorrow's reminder: only once today's streak is secured (so Y is known).
  if (securedToday) {
    const tomorrow8pm = new Date(now);
    tomorrow8pm.setDate(tomorrow8pm.getDate() + 1);
    tomorrow8pm.setHours(STREAK_NOTIF_HOUR, 0, 0, 0);
    await scheduleStreak(tomorrow8pm, pickRandom(STREAK_KEEP_TITLES), pickRandom(STREAK_KEEP_BODIES)(cur));
  }
};

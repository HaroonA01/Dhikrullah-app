import { useCallback, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { CheckCircle2, Clock, Flame, Sparkles } from 'lucide-react-native';
import { GradientBackground } from '@/components/GradientBackground';
import { StatTile } from '@/components/StatTile';
import { TimeSpentTile } from '@/components/TimeSpentTile';
import {
  StatBarChart,
  type ChartDatum,
  type ChartRange,
} from '@/components/StatBarChart';
import { CategoryHeatmap } from '@/components/CategoryHeatmap';
import { useDhikrContent } from '@/context/CounterContext';
import { useTheme } from '@/context/ThemeContext';
import {
  getCategoryProgressInRange,
  getCompletionTimestampsInRange,
  getDailyStatsRange,
  getMeta,
} from '@/db/queries';
import {
  formatHM,
  formatCompactCount,
  getDisplayStreak,
  lastNDays,
  lastNMonths,
  META_KEY_LIFETIME_DHIKR,
  META_KEY_LIFETIME_SECONDS,
  META_KEY_LONGEST_STREAK,
  META_KEY_LONGEST_STREAK_END,
  monthEndDateKey,
  STREAK_DHIKR_THRESHOLD,
  todayKey,
} from '@/lib/stats';

const MONTHS_RANGE = 6;
const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatStreakRange(count: number, endKey: string | null): string {
  if (!endKey || count === 0) return '—';
  const [ey, em, ed] = endKey.split('-').map(Number);
  const end = new Date(ey, em - 1, ed);
  const start = new Date(ey, em - 1, ed - (count - 1));
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${end.getDate()}`;
  }
  return `${MONTH_NAMES[start.getMonth()]} ${start.getDate()} – ${MONTH_NAMES[end.getMonth()]} ${end.getDate()}`;
}

async function buildChartData(range: ChartRange): Promise<ChartDatum[]> {
  if (range === '6m') {
    const monthKeys = lastNMonths(MONTHS_RANGE);
    const start = monthKeys[0];
    const end = monthEndDateKey(monthKeys[monthKeys.length - 1]);
    const rows = await getDailyStatsRange(start, end);
    const totals = new Map<string, number>(monthKeys.map((k) => [k, 0]));
    for (const r of rows) {
      const monthKey = `${r.date.slice(0, 7)}-01`;
      totals.set(monthKey, (totals.get(monthKey) ?? 0) + r.dhikrCount);
    }
    return monthKeys.map((k) => ({ date: k, value: totals.get(k) ?? 0 }));
  }

  const n = range === '7d' ? 7 : 10;
  const dayKeys = lastNDays(n);
  const rows = await getDailyStatsRange(dayKeys[0], dayKeys[dayKeys.length - 1]);
  const byDate = new Map(rows.map((r) => [r.date, r.dhikrCount]));
  return dayKeys.map((d) => ({ date: d, value: byDate.get(d) ?? 0 }));
}

export default function StatsScreen() {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { categories } = useDhikrContent();

  const [streak, setStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);
  const [longestStreakEnd, setLongestStreakEnd] = useState<string | null>(null);
  const [lifetimeDhikr, setLifetimeDhikr] = useState(0);
  const [lifetimeSeconds, setLifetimeSeconds] = useState(0);
  const [todayCompleted, setTodayCompleted] = useState(0);
  const [dhikrsCompletedToday, setDhikrsCompletedToday] = useState(0);
  const [todaySeconds, setTodaySeconds] = useState(0);
  const [yesterdaySeconds, setYesterdaySeconds] = useState(0);
  const [thisWeekSeconds, setThisWeekSeconds] = useState(0);
  const [lastWeekSeconds, setLastWeekSeconds] = useState(0);
  const [chartRange, setChartRange] = useState<ChartRange>('7d');
  const [chartData, setChartData] = useState<ChartDatum[]>([]);
  const [heatmapDates, setHeatmapDates] = useState<string[]>(() => lastNDays(30));
  const [percents, setPercents] = useState<Map<string, number>>(new Map());
  const [completedAtMap, setCompletedAtMap] = useState<Map<string, number>>(new Map());
  const [refreshing, setRefreshing] = useState(false);

  const loadAll = useCallback(async () => {
    const days30 = lastNDays(30);
    const days14 = lastNDays(14);
    const todayK = todayKey();

    const [
      s,
      lt,
      ls,
      longestCount,
      longestEnd,
      chart,
      progressRows,
      completionRows,
      timeRangeRows,
    ] = await Promise.all([
      getDisplayStreak(),
      getMeta(META_KEY_LIFETIME_DHIKR),
      getMeta(META_KEY_LIFETIME_SECONDS),
      getMeta(META_KEY_LONGEST_STREAK),
      getMeta(META_KEY_LONGEST_STREAK_END),
      buildChartData(chartRange),
      getCategoryProgressInRange(days30[0], days30[29]),
      getCompletionTimestampsInRange(days30[0], days30[29]),
      getDailyStatsRange(days14[0], days14[13]),
    ]);

    setStreak(s);
    setLongestStreak(Number(longestCount ?? '0'));
    setLongestStreakEnd(longestEnd);
    setLifetimeDhikr(Number(lt ?? '0'));
    setLifetimeSeconds(Number(ls ?? '0'));
    setChartData(chart);
    setHeatmapDates(days30);
    setPercents(
      new Map(progressRows.map((r) => [`${r.date}|${r.categoryId}`, r.percent])),
    );
    setCompletedAtMap(
      new Map(completionRows.map((r) => [`${r.date}|${r.categoryId}`, r.completedAt])),
    );

    const timeByDate = new Map(timeRangeRows.map((r) => [r.date, r]));
    const todayRow = timeByDate.get(todayK);
    setTodayCompleted(todayRow?.categoriesCompleted ?? 0);
    setDhikrsCompletedToday(todayRow?.dhikrsCompleted ?? 0);
    setTodaySeconds(todayRow?.timeSeconds ?? 0);
    setYesterdaySeconds(timeByDate.get(days14[12])?.timeSeconds ?? 0);
    setThisWeekSeconds(
      days14.slice(7).reduce((sum, d) => sum + (timeByDate.get(d)?.timeSeconds ?? 0), 0),
    );
    setLastWeekSeconds(
      days14.slice(0, 7).reduce((sum, d) => sum + (timeByDate.get(d)?.timeSeconds ?? 0), 0),
    );
  }, [chartRange]);

  useFocusEffect(
    useCallback(() => {
      let cancelled = false;
      (async () => {
        try {
          await loadAll();
        } catch {}
        if (cancelled) return;
      })();
      return () => {
        cancelled = true;
      };
    }, [loadAll]),
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await loadAll();
    } catch {}
    setRefreshing(false);
  }, [loadAll]);

  const totalCategories = categories.length;
  const todayK = todayKey();

  // If current streak is at least as long as recorded longest, it's ongoing — use today as end
  const effectiveLongestEnd =
    longestStreak > 0 && streak >= longestStreak ? todayK : longestStreakEnd;
  const longestStreakCaption = formatStreakRange(longestStreak, effectiveLongestEnd);

  // While today's threshold is unmet, show a live progress nudge with the
  // remaining count in the theme accent. Once met, fall back to the generic
  // explainer so the tile reads the same as before.
  const dhikrsRemainingToday = Math.max(
    0,
    STREAK_DHIKR_THRESHOLD - dhikrsCompletedToday,
  );
  const currentStreakCaption =
    dhikrsRemainingToday > 0 ? (
      <>
        <Text style={{ color: palette.accent, fontWeight: '700' }}>
          {dhikrsRemainingToday}
        </Text>
        {dhikrsRemainingToday === 1
          ? ' dhikr left to increase your streak'
          : ' dhikrs left to increase your streak'}
      </>
    ) : (
      `+1 each day you complete ${STREAK_DHIKR_THRESHOLD} dhikrs`
    );

  return (
    <View style={styles.root}>
      <GradientBackground />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.wordmark, { color: palette.accent }]}>Dhikrullah</Text>
        <Text style={[styles.title, { color: palette.textDark }]}>Stats</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.list,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={palette.accent}
            colors={[palette.accent]}
          />
        }
      >
        {/* Row 1: Current Streak | Longest Streak */}
        <View style={styles.row}>
          <StatTile
            Icon={Flame}
            label="Current Streak"
            value={streak === 1 ? '1 day' : `${streak} days`}
            caption={currentStreakCaption}
          />
          <StatTile
            Icon={Flame}
            label="Longest Streak"
            value={longestStreak === 1 ? '1 day' : `${longestStreak} days`}
            caption={longestStreakCaption}
          />
        </View>

        {/* Row 2: Time Spent | Total Time */}
        <View style={styles.row}>
          <TimeSpentTile
            todaySeconds={todaySeconds}
            yesterdaySeconds={yesterdaySeconds}
            thisWeekSeconds={thisWeekSeconds}
            lastWeekSeconds={lastWeekSeconds}
          />
          <StatTile
            Icon={Clock}
            label="Total Time"
            value={lifetimeSeconds > 0 ? formatHM(lifetimeSeconds) : '0m'}
            caption="Active time in the dhikr counter"
          />
        </View>

        {/* Row 3: Lifetime Dhikr | Today */}
        <View style={styles.row}>
          <StatTile
            Icon={Sparkles}
            label="Lifetime Dhikr"
            value={formatCompactCount(lifetimeDhikr)}
            caption="Total recitations counted to date"
          />
          <StatTile
            Icon={CheckCircle2}
            label="Today"
            value={`${todayCompleted} / `}
            valueSuffix={String(totalCategories || 0)}
            caption="Categories completed today"
          />
        </View>

        <StatBarChart
          title="Daily Activity"
          data={chartData}
          range={chartRange}
          onRangeChange={setChartRange}
        />

        <CategoryHeatmap
          categories={categories}
          dates={heatmapDates}
          percents={percents}
          completedAtMap={completedAtMap}
        />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  wordmark: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '600',
    opacity: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 2,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
});

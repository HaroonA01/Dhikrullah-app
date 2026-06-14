import { useMemo, useRef, useState, useEffect } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Check, ChevronLeft, ChevronRight } from 'lucide-react-native';
import type { Category } from '@/types';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/context/ThemeContext';
import { dateKeyFor } from '@/lib/stats';

interface Props {
  categories: Category[];
  dates: string[];                   // last 30 days, oldest→newest
  percents: Map<string, number>;     // "date|categoryId" → 0-100
  completedAtMap: Map<string, number>; // "date|categoryId" → Unix epoch
}

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];
const MONTH_NAMES = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const WEEKDAY_NAMES_LONG = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const LABEL_COL_WIDTH = 92;
const CELL_GAP = 4;
const CELL_MAX = 28;
const CELL_MIN = 18;
const HEADER_ROW_H = 24;
const HEADER_ROW_MB = 6;

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function formatDetailDate(key: string, weekdayIndex: number): string {
  const d = parseDateKey(key);
  return `${WEEKDAY_NAMES_LONG[weekdayIndex]}, ${d.getDate()} ${MONTH_NAMES[d.getMonth()]}`;
}

function formatTime(unixEpoch: number): string {
  const d = new Date(unixEpoch * 1000);
  let h = d.getHours();
  const m = d.getMinutes();
  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12 || 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

function formatWeekRange(week: (string | null)[]): string {
  const valid = week.filter(Boolean) as string[];
  if (!valid.length) return '';
  const first = parseDateKey(valid[0]);
  const last = parseDateKey(valid[valid.length - 1]);
  const m1 = MONTH_NAMES[first.getMonth()];
  const m2 = MONTH_NAMES[last.getMonth()];
  if (first.getMonth() === last.getMonth()) {
    return `${m1} ${first.getDate()} – ${last.getDate()}`;
  }
  return `${m1} ${first.getDate()} – ${m2} ${last.getDate()}`;
}

function groupIntoWeeks(dates: string[]): (string | null)[][] {
  if (!dates.length) return [];
  const dateSet = new Set(dates);
  const todayStr = dates[dates.length - 1];

  const firstDate = parseDateKey(dates[0]);
  const firstOffset = (firstDate.getDay() + 6) % 7;
  const monday = new Date(firstDate.getFullYear(), firstDate.getMonth(), firstDate.getDate() - firstOffset);

  const lastDate = parseDateKey(todayStr);
  const lastOffset = (lastDate.getDay() + 6) % 7;
  const sunday = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate() + (6 - lastOffset));

  const weeks: (string | null)[][] = [];
  let cursor = new Date(monday);

  while (cursor <= sunday) {
    const week: (string | null)[] = [];
    for (let d = 0; d < 7; d++) {
      const key = dateKeyFor(cursor);
      // Include if in 30-day range OR a future day in the current week (renders as empty non-pressable cell)
      week.push(dateSet.has(key) || key > todayStr ? key : null);
      cursor = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
    }
    weeks.push(week);
  }

  return weeks;
}

function alphaHex(alpha: number): string {
  return Math.round(Math.max(0, Math.min(1, alpha)) * 255)
    .toString(16)
    .padStart(2, '0');
}

function tintForPercent(percent: number, accent: string): string | null {
  if (percent <= 0) return null;
  if (percent >= 100) return accent;
  const min = 0.12;
  const max = 0.95;
  const alpha = min + (max - min) * (percent / 100);
  return `${accent}${alphaHex(alpha)}`;
}

export function CategoryHeatmap({
  categories,
  dates,
  percents,
  completedAtMap,
}: Props) {
  const { palette } = useTheme();
  const pagerRef = useRef<PagerView>(null);
  const [cardWidth, setCardWidth] = useState(0);
  const [currentWeek, setCurrentWeek] = useState(0);
  const [selected, setSelected] = useState<{
    categoryId: string;
    categoryLabel: string;
    date: string;
    weekdayIndex: number;
    percent: number;
  } | null>(null);

  const weekGroups = useMemo(() => groupIntoWeeks(dates), [dates]);
  const todayStr = useMemo(() => dates[dates.length - 1] ?? '', [dates]);

  const sortedCategories = useMemo(
    () => [...categories].sort((a, b) => a.sortOrder - b.sortOrder),
    [categories],
  );

  useEffect(() => {
    const lastIdx = weekGroups.length - 1;
    setCurrentWeek(lastIdx);
    setSelected(null);
  }, [weekGroups.length]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== cardWidth) setCardWidth(w);
  };

  const cellSize = useMemo(() => {
    if (cardWidth <= 0) return CELL_MIN;
    const available = cardWidth - LABEL_COL_WIDTH - CELL_GAP * 7;
    const raw = available / 7;
    return Math.max(CELL_MIN, Math.min(CELL_MAX, Math.floor(raw)));
  }, [cardWidth]);

  const pagerHeight = useMemo(
    () => HEADER_ROW_H + HEADER_ROW_MB + sortedCategories.length * (cellSize + CELL_GAP),
    [sortedCategories.length, cellSize],
  );

  const currentWeekGroup = weekGroups[currentWeek] ?? null;

  const detailText = useMemo(() => {
    if (!selected) return 'Tap a cell for details';
    const dateLabel = formatDetailDate(selected.date, selected.weekdayIndex);
    if (selected.percent <= 0) return `${selected.categoryLabel} · ${dateLabel} — Not started`;
    if (selected.percent >= 100) {
      const ts = completedAtMap.get(`${selected.date}|${selected.categoryId}`);
      const timeStr = ts ? ` at ${formatTime(ts)}` : '';
      return `${selected.categoryLabel} · ${dateLabel} — Completed${timeStr}`;
    }
    return `${selected.categoryLabel} · ${dateLabel} — ${selected.percent}% complete`;
  }, [selected, completedAtMap]);

  const canGoPrev = currentWeek > 0;
  const canGoNext = currentWeek < weekGroups.length - 1;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.navRow}>
        <Pressable
          onPress={() => { if (canGoPrev) pagerRef.current?.setPage(currentWeek - 1); }}
          disabled={!canGoPrev}
          hitSlop={12}
        >
          <ChevronLeft
            size={16}
            color={canGoPrev ? palette.accent : palette.textDim}
            strokeWidth={2.5}
          />
        </Pressable>
        <View style={styles.titleBlock}>
          <Text style={[styles.title, { color: palette.textDark }]}>
            {currentWeekGroup ? formatWeekRange(currentWeekGroup) : 'This Week'}
          </Text>
          <Text style={[styles.subtitle, { color: palette.textMid }]}>
            Category progress
          </Text>
        </View>
        <Pressable
          onPress={() => { if (canGoNext) pagerRef.current?.setPage(currentWeek + 1); }}
          disabled={!canGoNext}
          hitSlop={12}
        >
          <ChevronRight
            size={16}
            color={canGoNext ? palette.accent : palette.textDim}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>

      {/* Width measurement anchor */}
      <View style={styles.sizer} onLayout={onLayout} />

      {cardWidth > 0 && weekGroups.length > 0 && (
        <PagerView
          key={weekGroups.length}
          ref={pagerRef}
          style={{ height: pagerHeight }}
          initialPage={weekGroups.length - 1}
          onPageSelected={e => {
            setCurrentWeek(e.nativeEvent.position);
            setSelected(null);
          }}
        >
          {weekGroups.map((week, pageIdx) => (
            <View key={pageIdx} style={styles.pageWrap}>
              {/* Weekday header */}
              <View style={styles.headerRow}>
                <View style={{ width: LABEL_COL_WIDTH }} />
                {WEEKDAY_LABELS.map((lbl, i) => {
                  const date = week[i];
                  const isToday = !!date && date === todayStr;
                  return (
                    <View
                      key={i}
                      style={[styles.weekdayCell, { width: cellSize, marginLeft: CELL_GAP }]}
                    >
                      <Text
                        style={[
                          styles.weekdayText,
                          { color: isToday ? palette.accent : palette.textDark },
                        ]}
                      >
                        {lbl}
                      </Text>
                    </View>
                  );
                })}
              </View>

              {/* Category rows */}
              {sortedCategories.map((cat) => (
                <View key={cat.id} style={styles.row}>
                  <Text
                    style={[styles.rowLabel, { color: palette.textMid }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {cat.label}
                  </Text>
                  {week.map((date, i) => {
                    if (!date) {
                      return (
                        <View
                          key={i}
                          style={[
                            styles.cellBase,
                            { width: cellSize, height: cellSize, marginLeft: CELL_GAP },
                          ]}
                        />
                      );
                    }
                    const mapKey = `${date}|${cat.id}`;
                    const percent = percents.get(mapKey) ?? 0;
                    const tint = tintForPercent(percent, palette.accent);
                    const isComplete = percent >= 100;
                    const isFuture = date > todayStr;
                    const isSelected =
                      selected?.categoryId === cat.id && selected.date === date;

                    return (
                      <Pressable
                        key={i}
                        disabled={isFuture}
                        onPress={() =>
                          setSelected({
                            categoryId: cat.id,
                            categoryLabel: cat.label,
                            date,
                            weekdayIndex: i,
                            percent,
                          })
                        }
                        style={({ pressed }) => [
                          styles.cellBase,
                          {
                            width: cellSize,
                            height: cellSize,
                            marginLeft: CELL_GAP,
                          },
                          tint
                            ? { backgroundColor: tint }
                            : {
                                backgroundColor: 'transparent',
                                borderWidth: 1,
                                borderColor: palette.glassBorder,
                              },
                          isSelected && {
                            borderWidth: 2,
                            borderColor: palette.accent,
                          },
                          pressed && !isFuture && styles.cellPressed,
                        ]}
                      >
                        {isComplete ? (
                          <Check
                            size={Math.max(10, cellSize - 12)}
                            color="#FFFFFF"
                            strokeWidth={3}
                          />
                        ) : null}
                      </Pressable>
                    );
                  })}
                </View>
              ))}
            </View>
          ))}
        </PagerView>
      )}

      <Text style={[styles.detail, { color: palette.textDim }]}>{detailText}</Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  navRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  titleBlock: {
    alignItems: 'center',
    flex: 1,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  subtitle: {
    fontSize: 11,
    marginTop: 2,
  },
  sizer: {
    width: '100%',
    height: 0,
  },
  pageWrap: {
    width: '100%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
    height: HEADER_ROW_H,
  },
  weekdayCell: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: CELL_GAP,
  },
  rowLabel: {
    width: LABEL_COL_WIDTH,
    paddingRight: 8,
    textAlign: 'right',
    fontSize: 11,
    fontWeight: '600',
  },
  cellBase: {
    borderRadius: 5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cellPressed: {
    opacity: 0.7,
  },
  detail: {
    marginTop: 12,
    fontSize: 11,
    textAlign: 'center',
  },
});

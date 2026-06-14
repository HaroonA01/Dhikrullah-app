import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export type TimerMode = 'session' | 'today' | 'hidden';

const MODE_ORDER: TimerMode[] = ['session', 'today', 'hidden'];

interface Props {
  // Persisted seconds across all dhikirs in the current category (Islamic day).
  sessionPersistedSeconds: number;
  // Persisted seconds across *all* dhikrs in the active Islamic day.
  todayPersistedSeconds: number;
  // ms timestamp the user resumed viewing the current dhikr — the pill adds
  // (Date.now() − startedAt) to the persisted values for a live readout.
  // Pass null when no live tick is running (screen blurred).
  startedAt: number | null;
  // Category name (e.g. "Morning") shown as the session-mode label.
  categoryName?: string | null;
  // Optional ref to the outer pill view, used by the tutorial spotlight so it
  // can highlight only the pill bounds, not the surrounding row.
  pillRef?: React.RefObject<View | null>;
  // Freeze the session-mode readout (current category fully complete). When
  // true, session display shows exactly the persisted seconds.
  sessionFrozen?: boolean;
  // Freeze the today-mode readout (all categories complete for the day).
  todayFrozen?: boolean;
}

const pad2 = (n: number) => String(Math.floor(n)).padStart(2, '0');

const formatHMS = (totalSeconds: number): string => {
  if (totalSeconds < 0) totalSeconds = 0;
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = Math.floor(totalSeconds % 60);
  if (h > 0) return `${h}:${pad2(m)}:${pad2(s)}`;
  return `${pad2(m)}:${pad2(s)}`;
};

export function DhikrTimerPill({
  sessionPersistedSeconds,
  todayPersistedSeconds,
  startedAt,
  categoryName,
  pillRef,
  sessionFrozen = false,
  todayFrozen = false,
}: Props) {
  const { palette } = useTheme();
  const [mode, setMode] = useState<TimerMode>('session');
  const [, setTick] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Whether the currently displayed mode should be advancing past the persisted value.
  const currentModeLive =
    mode !== 'hidden' &&
    startedAt != null &&
    !(mode === 'session' && sessionFrozen) &&
    !(mode === 'today' && todayFrozen);

  useEffect(() => {
    if (!currentModeLive) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }
    intervalRef.current = setInterval(() => setTick((t) => t + 1), 1000);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [currentModeLive]);

  const liveDelta = startedAt != null ? (Date.now() - startedAt) / 1000 : 0;

  let display: string;
  let label: string;
  if (mode === 'hidden') {
    display = '--:--';
    label = 'Timer hidden';
  } else if (mode === 'session') {
    const delta = sessionFrozen ? 0 : liveDelta;
    display = formatHMS(sessionPersistedSeconds + delta);
    label = categoryName ? categoryName : 'This dhikr';
  } else {
    const delta = todayFrozen ? 0 : liveDelta;
    display = formatHMS(todayPersistedSeconds + delta);
    label = 'Today';
  }

  const handlePress = () => {
    setMode((cur) => {
      const idx = MODE_ORDER.indexOf(cur);
      return MODE_ORDER[(idx + 1) % MODE_ORDER.length];
    });
  };

  return (
    <Pressable
      ref={pillRef}
      onPress={handlePress}
      hitSlop={6}
      style={({ pressed }) => [
        styles.pill,
        {
          backgroundColor: palette.glassBg,
          borderColor: palette.glassBorder,
        },
        pressed && { opacity: 0.75 },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Timer mode: ${label}. Tap to change.`}
    >
      <View style={styles.labelRow}>
        <Clock size={11} color={palette.accent} strokeWidth={2} />
        <Text
          style={[styles.label, { color: palette.textMid }]}
          numberOfLines={1}
        >
          {label}
        </Text>
      </View>
      <Text
        style={[
          styles.time,
          {
            color: mode === 'hidden' ? palette.textDim : palette.textDark,
          },
        ]}
      >
        {display}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'column',
    alignItems: 'center',
    alignSelf: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: StyleSheet.hairlineWidth,
    minWidth: 140,
    maxWidth: 240,
  },
  labelRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    maxWidth: '100%',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    flexShrink: 1,
  },
  time: {
    marginTop: 2,
    fontSize: 15,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
    letterSpacing: 0.4,
  },
});

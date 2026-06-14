import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Clock } from 'lucide-react-native';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/context/ThemeContext';
import { formatHM } from '@/lib/stats';

interface Props {
  todaySeconds: number;
  yesterdaySeconds: number;
  thisWeekSeconds: number;
  lastWeekSeconds: number;
}

export function TimeSpentTile({
  todaySeconds,
  yesterdaySeconds,
  thisWeekSeconds,
  lastWeekSeconds,
}: Props) {
  const { palette } = useTheme();
  const [mode, setMode] = useState<'day' | 'week'>('day');

  const current = mode === 'day' ? todaySeconds : thisWeekSeconds;
  const previous = mode === 'day' ? yesterdaySeconds : lastWeekSeconds;

  const pct =
    previous > 0
      ? Math.round(Math.abs((current - previous) / previous) * 100)
      : null;
  const isUp = current >= previous;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.topRow}>
        <Clock size={20} color={palette.accent} strokeWidth={1.5} />
        <View style={[styles.toggle, { backgroundColor: palette.accentLight }]}>
          {(['day', 'week'] as const).map((m) => {
            const active = m === mode;
            return (
              <Pressable
                key={m}
                onPress={() => setMode(m)}
                style={({ pressed }) => [
                  styles.toggleBtn,
                  active && { backgroundColor: palette.accent },
                  pressed && !active && styles.toggleBtnPressed,
                ]}
                hitSlop={4}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: active ? '#FFFFFF' : palette.accent },
                  ]}
                >
                  {m === 'day' ? 'Day' : 'Week'}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Text style={[styles.label, { color: palette.textDark }]}>Time Spent</Text>
      <Text
        style={[styles.value, { color: palette.textDark }]}
        numberOfLines={1}
        adjustsFontSizeToFit
      >
        {current > 0 ? formatHM(current) : '0m'}
      </Text>

      {pct !== null ? (
        <Text style={[styles.comparison, { color: palette.textDark }]}>
          {isUp ? '↑' : '↓'} {pct}% vs {mode === 'day' ? 'yesterday' : 'last week'}
        </Text>
      ) : (
        <Text style={[styles.comparison, { color: palette.textDark }]}>
          ✦ First entry
        </Text>
      )}
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 16,
    minHeight: 120,
    justifyContent: 'flex-start',
  },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
  },
  toggleBtnPressed: {
    opacity: 0.7,
  },
  toggleText: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  label: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  value: {
    fontSize: 26,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  comparison: {
    fontSize: 10,
    marginTop: 6,
    lineHeight: 13,
  },
});

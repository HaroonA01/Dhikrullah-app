import { useEffect, useMemo, useState } from 'react';
import {
  LayoutChangeEvent,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Svg, { Line, Rect } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/context/ThemeContext';

const AnimatedRect = Animated.createAnimatedComponent(Rect);

export type ChartRange = '7d' | '10d' | '6m';
export interface ChartDatum {
  date: string;
  value: number;
}

interface Props {
  title: string;
  data: ChartDatum[];
  range: ChartRange;
  onRangeChange: (r: ChartRange) => void;
}

const RANGE_ORDER: ChartRange[] = ['7d', '10d', '6m'];
const RANGE_LABELS: Record<ChartRange, string> = {
  '7d': '7D',
  '10d': '10D',
  '6m': '6M',
};

const CHART_HEIGHT = 150;
const TOP_PADDING = 12;
const BOTTOM_LABEL_AREA = 24;

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const MONTH_ABBREV = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function parseDateKey(key: string): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function labelFor(date: string, range: ChartRange): string {
  const d = parseDateKey(date);
  if (range === '7d') return WEEKDAY_LETTERS[d.getDay()];
  if (range === '10d') return String(d.getDate());
  return MONTH_ABBREV[d.getMonth()];
}

function footerFor(
  selectedIndex: number | null,
  data: ChartDatum[],
  maxValue: number,
): string {
  if (selectedIndex !== null && data[selectedIndex]) {
    const d = data[selectedIndex];
    const date = parseDateKey(d.date);
    const label = `${DAY_NAMES[date.getDay()]}, ${date.getDate()} ${MONTH_ABBREV[date.getMonth()]}`;
    return `${label} · ${d.value.toLocaleString()} dhikr`;
  }
  return maxValue === 0
    ? 'No activity yet in this range'
    : `Peak: ${maxValue.toLocaleString()} dhikr`;
}

interface BarProps {
  x: number;
  width: number;
  value: number;
  maxValue: number;
  innerHeight: number;
  baseY: number;
  fill: string;
  dimmed: boolean;
}

function AnimatedBar({ x, width, value, maxValue, innerHeight, baseY, fill, dimmed }: BarProps) {
  const ratio = useSharedValue(0);
  const opacity = useSharedValue(1);

  useEffect(() => {
    const target = maxValue > 0 ? Math.max(0, value) / maxValue : 0;
    ratio.value = withTiming(target, { duration: 450 });
  }, [value, maxValue, ratio]);

  useEffect(() => {
    opacity.value = withTiming(dimmed ? 0.3 : 1, { duration: 200 });
  }, [dimmed, opacity]);

  const animatedProps = useAnimatedProps(() => {
    const h = Math.max(2, ratio.value * innerHeight);
    return { height: h, y: baseY - h, opacity: opacity.value };
  });

  return (
    <AnimatedRect
      x={x}
      width={width}
      rx={3}
      ry={3}
      fill={fill}
      animatedProps={animatedProps}
    />
  );
}

export function StatBarChart({ title, data, range, onRangeChange }: Props) {
  const { palette } = useTheme();
  const [chartWidth, setChartWidth] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  useEffect(() => {
    setSelectedIndex(null);
  }, [data, range]);

  const onLayout = (e: LayoutChangeEvent) => {
    const w = e.nativeEvent.layout.width;
    if (w !== chartWidth) setChartWidth(w);
  };

  const maxValue = useMemo(
    () => data.reduce((m, d) => (d.value > m ? d.value : m), 0),
    [data],
  );

  const innerHeight = CHART_HEIGHT - TOP_PADDING - BOTTOM_LABEL_AREA;
  const baseY = TOP_PADDING + innerHeight;

  const barLayout = useMemo(() => {
    if (chartWidth <= 0 || data.length === 0) return [];
    const gapRatio = 0.4;
    const slot = chartWidth / data.length;
    const barW = slot * (1 - gapRatio);
    return data.map((_, i) => ({
      x: i * slot + (slot - barW) / 2,
      width: barW,
      slotCenter: i * slot + slot / 2,
    }));
  }, [chartWidth, data]);

  const hasSelection = selectedIndex !== null;

  return (
    <GlassCard style={styles.card}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: palette.textDark }]}>{title}</Text>
        <View style={[styles.toggle, { backgroundColor: palette.accentLight }]}>
          {RANGE_ORDER.map((r) => {
            const active = r === range;
            return (
              <Pressable
                key={r}
                onPress={() => onRangeChange(r)}
                style={({ pressed }) => [
                  styles.toggleBtn,
                  active && { backgroundColor: palette.accent },
                  pressed && !active && styles.toggleBtnPressed,
                ]}
                hitSlop={6}
              >
                <Text
                  style={[
                    styles.toggleText,
                    { color: active ? '#FFFFFF' : palette.accent },
                  ]}
                >
                  {RANGE_LABELS[r]}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <View style={styles.chartWrap} onLayout={onLayout}>
        {chartWidth > 0 && (
          <Svg width={chartWidth} height={CHART_HEIGHT}>
            <Line
              x1={0}
              y1={baseY}
              x2={chartWidth}
              y2={baseY}
              stroke={palette.glassBorder}
              strokeWidth={1}
            />
            {barLayout.map((b, i) => (
              <AnimatedBar
                key={data[i].date}
                x={b.x}
                width={b.width}
                value={data[i].value}
                maxValue={maxValue}
                innerHeight={innerHeight}
                baseY={baseY}
                fill={palette.accent}
                dimmed={hasSelection && selectedIndex !== i}
              />
            ))}
          </Svg>
        )}

        {chartWidth > 0 && (
          <View style={styles.labelRow} pointerEvents="none">
            {barLayout.map((b, i) => (
              <Text
                key={data[i].date}
                style={[
                  styles.label,
                  { color: palette.textMid, left: b.slotCenter - 18, width: 36 },
                ]}
                numberOfLines={1}
              >
                {labelFor(data[i].date, range)}
              </Text>
            ))}
          </View>
        )}

        {chartWidth > 0 && (
          <View style={StyleSheet.absoluteFill} pointerEvents="box-none">
            {barLayout.map((b, i) => (
              <Pressable
                key={data[i]?.date ?? i}
                style={{
                  position: 'absolute',
                  left: b.x,
                  width: b.width,
                  top: TOP_PADDING,
                  bottom: BOTTOM_LABEL_AREA,
                }}
                onPress={() => setSelectedIndex(prev => prev === i ? null : i)}
              />
            ))}
          </View>
        )}
      </View>

      <Text style={[styles.footer, { color: palette.textDim }]}>
        {footerFor(selectedIndex, data, maxValue)}
      </Text>
    </GlassCard>
  );
}

const styles = StyleSheet.create({
  card: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  title: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  toggle: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    gap: 2,
  },
  toggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 7,
  },
  toggleBtnPressed: {
    opacity: 0.7,
  },
  toggleText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  chartWrap: {
    height: CHART_HEIGHT,
    width: '100%',
    position: 'relative',
  },
  labelRow: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: BOTTOM_LABEL_AREA,
  },
  label: {
    position: 'absolute',
    bottom: 2,
    fontSize: 10,
    textAlign: 'center',
    fontWeight: '600',
  },
  footer: {
    fontSize: 11,
    marginTop: 6,
    textAlign: 'right',
  },
});

import { View, Text, StyleSheet } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import { Check } from 'lucide-react-native';

const SIZE = 40;
const STROKE = 3.5;
const R = (SIZE - STROKE) / 2;
const CIRCUMFERENCE = 2 * Math.PI * R;

interface Props {
  percent: number; // 0–100
}

export function CircleProgress({ percent }: Props) {
  const { palette } = useTheme();
  const clamped = Math.min(100, Math.max(0, percent));
  const dash = (clamped / 100) * CIRCUMFERENCE;
  const complete = clamped >= 100;

  const trackColor = `${palette.accent}28`;

  return (
    <View style={styles.wrap}>
      <Svg width={SIZE} height={SIZE} style={StyleSheet.absoluteFill}>
        {/* track */}
        <Circle
          cx={SIZE / 2}
          cy={SIZE / 2}
          r={R}
          stroke={trackColor}
          strokeWidth={STROKE}
          fill="none"
        />
        {/* progress arc */}
        {clamped > 0 && (
          <Circle
            cx={SIZE / 2}
            cy={SIZE / 2}
            r={R}
            stroke={palette.accent}
            strokeWidth={STROKE}
            fill="none"
            strokeDasharray={`${dash} ${CIRCUMFERENCE}`}
            strokeLinecap="round"
            rotation={-90}
            origin={`${SIZE / 2}, ${SIZE / 2}`}
          />
        )}
      </Svg>

      <View style={styles.center}>
        {complete ? (
          <Check size={14} color={palette.accent} strokeWidth={3} />
        ) : (
          <Text style={[styles.pct, { color: palette.accent }]}>
            {Math.round(clamped)}
            <Text style={styles.pctSign}>%</Text>
          </Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    width: SIZE,
    height: SIZE,
    alignItems: 'center',
    justifyContent: 'center',
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pct: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: -0.5,
    fontVariant: ['tabular-nums'],
    lineHeight: 12,
  },
  pctSign: {
    fontSize: 7,
    fontWeight: '600',
  },
});

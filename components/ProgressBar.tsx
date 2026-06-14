import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  percent: number;
  completed?: number;
  total?: number;
  // Optional ref to the bar's track element. Used by the tutorial spotlight
  // so it can highlight only the bar itself, not the surrounding label row.
  trackRef?: React.RefObject<View | null>;
}

export function ProgressBar({ percent, completed, total, trackRef }: Props) {
  const { palette } = useTheme();
  const progress = useSharedValue(percent);

  useEffect(() => {
    progress.value = withSpring(percent, { damping: 18, stiffness: 90, mass: 0.9 });
  }, [percent, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: `${Math.max(0, Math.min(100, progress.value))}%`,
  }));

  const showCounts = completed !== undefined && total !== undefined;

  return (
    <View style={styles.wrap}>
      <View
        ref={trackRef}
        collapsable={false}
        style={[
          styles.track,
          { backgroundColor: palette.glassBg },
        ]}
      >
        <Animated.View
          style={[styles.fill, { backgroundColor: palette.accent }, fillStyle]}
        />
        <View
          pointerEvents="none"
          style={[
            StyleSheet.absoluteFill,
            styles.borderOverlay,
            { borderColor: palette.glassBorder },
          ]}
        />
      </View>
      <View style={styles.labelRow}>
        <Text style={[styles.labelLeft, { color: palette.textMid }]}>
          {showCounts ? `${completed} / ${total}` : ''}
        </Text>
        <Text style={[styles.labelRight, { color: palette.textMid }]}>
          {percent >= 100 ? 100 : Math.min(99, Math.round(percent))}%
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  track: {
    width: '100%',
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
  },
  borderOverlay: {
    borderWidth: 1,
    borderRadius: 5,
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  labelLeft: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
  labelRight: {
    fontSize: 12,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
});

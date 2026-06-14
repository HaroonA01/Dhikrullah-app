import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  count: number;
  target: number;
  reachedTarget?: boolean;
}

export function CountDisplay({ count, target, reachedTarget = false }: Props) {
  const { palette } = useTheme();
  const scale = useSharedValue(1);

  useEffect(() => {
    scale.value = withSequence(
      withTiming(1.15, { duration: 90 }),
      withSpring(1, { damping: 8, stiffness: 180 }),
    );
  }, [count, scale]);

  const animStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const denomOpacity = reachedTarget ? 1 : 0.5;

  return (
    <View style={styles.wrap}>
      <Animated.View style={animStyle}>
        <Text style={styles.row}>
          <Text style={[styles.count, { color: palette.accent }]}>{count}</Text>
          <Text style={[styles.sep, { color: palette.accent, opacity: denomOpacity }]}> / </Text>
          <Text style={[styles.target, { color: palette.accent, opacity: denomOpacity }]}>
            {target}
          </Text>
        </Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 4,
  },
  row: {
    textAlign: 'center',
    letterSpacing: 0.5,
  },
  count: {
    fontSize: 26,
    fontWeight: '700',
  },
  sep: {
    fontSize: 18,
    fontWeight: '400',
  },
  target: {
    fontSize: 18,
    fontWeight: '500',
  },
});

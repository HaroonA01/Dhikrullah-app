import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  SharedValue,
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  interpolate,
} from 'react-native-reanimated';
import { ChevronUp } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  progress: SharedValue<number>;
  bottomOffset: number;
}

export function SwipeChevron({ progress, bottomOffset }: Props) {
  const { palette } = useTheme();
  const bounce = useSharedValue(0);

  useEffect(() => {
    bounce.value = withRepeat(
      withTiming(-14, {
        duration: 620,
        easing: Easing.inOut(Easing.cubic),
      }),
      -1,
      true,
    );
  }, [bounce]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: interpolate(progress.value, [0, 0.35], [1, 0]),
    transform: [{ translateY: bounce.value }],
  }));

  return (
    <Animated.View style={[styles.wrap, { bottom: bottomOffset + 16 }, containerStyle]}>
      <View style={styles.chevronStack}>
        <ChevronUp size={22} color={palette.accent} strokeWidth={2.2} />
        <ChevronUp
          size={22}
          color={palette.accent}
          strokeWidth={2.2}
          style={styles.chevronTop}
        />
      </View>
      <Text style={[styles.label, { color: palette.textDim }]}>swipe up</Text>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 2,
  },
  chevronStack: {
    alignItems: 'center',
  },
  chevronTop: {
    marginTop: -14,
  },
  label: {
    fontSize: 11,
    letterSpacing: 1,
  },
});

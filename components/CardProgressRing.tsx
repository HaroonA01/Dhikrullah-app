import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import Animated, {
  useAnimatedProps,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import {
  MIHRAB_PATH_D,
  MIHRAB_PATH_LENGTH,
  MIHRAB_VIEWBOX,
} from './mihrabPath';

const AnimatedPath = Animated.createAnimatedComponent(Path);

interface Props {
  percent: number;
  width: number;
  height: number;
  stroke?: number;
}

export function CardProgressRing({ percent, width, height, stroke = 3 }: Props) {
  const { palette } = useTheme();
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withSpring(Math.max(0, Math.min(100, percent)), {
      damping: 18,
      stiffness: 90,
      mass: 0.9,
    });
  }, [percent, progress]);

  const animatedProps = useAnimatedProps(() => ({
    strokeDashoffset: MIHRAB_PATH_LENGTH * (1 - progress.value / 100),
  }));

  if (width <= 0 || height <= 0) return null;

  return (
    <View pointerEvents="none" style={[styles.wrap, { width, height }]}>
      <Svg
        width={width}
        height={height}
        viewBox={MIHRAB_VIEWBOX}
      >
        <Path
          d={MIHRAB_PATH_D}
          fill="none"
          stroke={palette.glassBorder}
          strokeWidth={stroke}
        />
        <AnimatedPath
          d={MIHRAB_PATH_D}
          fill="none"
          stroke={palette.accent}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={`${MIHRAB_PATH_LENGTH} ${MIHRAB_PATH_LENGTH}`}
          animatedProps={animatedProps}
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
    top: 0,
    left: 0,
  },
});

import React, { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  total: number;
  active: number;
}

const ACTIVE_W = 32;
const INACTIVE_W = 8;
const HEIGHT = 6;

function Pill({ activeFlag, accent, dim }: { activeFlag: boolean; accent: string; dim: string }) {
  const width = useSharedValue(activeFlag ? ACTIVE_W : INACTIVE_W);
  const colorMix = useSharedValue(activeFlag ? 1 : 0);

  useEffect(() => {
    width.value = withSpring(activeFlag ? ACTIVE_W : INACTIVE_W, {
      damping: 18,
      stiffness: 180,
    });
    colorMix.value = withSpring(activeFlag ? 1 : 0, { damping: 18, stiffness: 180 });
  }, [activeFlag, width, colorMix]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
    backgroundColor: colorMix.value > 0.5 ? accent : dim,
  }));

  return <Animated.View style={[styles.pill, animStyle]} />;
}

export function OnboardingProgress({ total, active }: Props) {
  const { palette } = useTheme();
  return (
    <View style={styles.row}>
      {Array.from({ length: total }).map((_, i) => (
        <Pill
          key={i}
          activeFlag={i === active}
          accent={palette.accent}
          dim={palette.glassBorder}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
  },
  pill: {
    height: HEIGHT,
    borderRadius: HEIGHT / 2,
  },
});

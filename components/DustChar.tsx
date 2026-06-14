import { useEffect, useMemo } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

const LETTER_APPEAR_DUR = 300;
const LETTER_DISAPPEAR_DUR = 400;
const PARTICLES_PER_LETTER = 6;
const PARTICLE_DRIFT_DUR = 750;

function mulberry32(a: number) {
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function LetterParticle({
  fireAt,
  seed,
  color,
}: {
  fireAt: number;
  seed: number;
  color: string;
}) {
  const { dx, dy, size, delay } = useMemo(() => {
    const r = mulberry32(seed);
    return {
      dx: (r() - 0.5) * 28,
      dy: -14 - r() * 26,
      size: 1.5 + r() * 1.8,
      delay: r() * 140,
    };
  }, [seed]);

  const opacity = useSharedValue(0);
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);

  useEffect(() => {
    opacity.value = withDelay(
      fireAt + delay,
      withSequence(
        withTiming(0.9, { duration: 120 }),
        withTiming(0, { duration: PARTICLE_DRIFT_DUR - 120 })
      )
    );
    tx.value = withDelay(fireAt + delay, withTiming(dx, { duration: PARTICLE_DRIFT_DUR }));
    ty.value = withDelay(fireAt + delay, withTiming(dy, { duration: PARTICLE_DRIFT_DUR }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [
      { translateX: -size / 2 + tx.value },
      { translateY: -size / 2 + ty.value },
    ],
  }));

  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: '50%',
          top: '50%',
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

interface Props {
  char: string;
  index: number;
  appearDelay: number;
  holdDur: number;
  disappearStart: number;
}

export function DustChar({ char, index, appearDelay, holdDur, disappearStart }: Props) {
  const { palette } = useTheme();
  const opacity = useSharedValue(0);
  const ty = useSharedValue(14);

  useEffect(() => {
    opacity.value = withDelay(
      appearDelay,
      withSequence(
        withTiming(1, { duration: LETTER_APPEAR_DUR }),
        withDelay(Math.max(0, holdDur), withTiming(0, { duration: LETTER_DISAPPEAR_DUR }))
      )
    );
    ty.value = withDelay(
      appearDelay,
      withSequence(
        withTiming(0, { duration: LETTER_APPEAR_DUR }),
        withDelay(Math.max(0, holdDur), withTiming(-18, { duration: LETTER_DISAPPEAR_DUR }))
      )
    );
  }, []);

  const letterStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  const particleSeeds = useMemo(
    () => Array.from({ length: PARTICLES_PER_LETTER }, (_, i) => index * 31 + i + 1),
    [index]
  );

  return (
    <View style={styles.wrap}>
      <Animated.Text style={[styles.char, { color: palette.textDark }, letterStyle]}>
        {char}
      </Animated.Text>
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        {particleSeeds.map((seed) => (
          <LetterParticle
            key={seed}
            fireAt={disappearStart}
            seed={seed}
            color={palette.accent}
          />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  char: {
    fontSize: 44,
    fontWeight: '700',
    letterSpacing: 1,
  },
});

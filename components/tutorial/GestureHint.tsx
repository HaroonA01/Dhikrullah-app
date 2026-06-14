import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';
import { FontSwipeHint } from '@/components/onboarding/FontSwipeHint';
import type { HintKind, Rect } from '@/components/CounterTutorial';

interface Props {
  kind: HintKind;
  rect: Rect;
}

export function GestureHint({ kind, rect }: Props) {
  if (!kind) return null;
  if (kind === 'tap' || kind === 'longPress') {
    return <TapHint rect={rect} long={kind === 'longPress'} />;
  }
  // Horizontal swipe reuses the onboarding font-carousel hint (hand + nudging
  // chevrons) so the "swipe to read" cue matches what the user saw in onboarding.
  if (kind === 'swipeH') return <OnboardingSwipeHint rect={rect} />;
  return <SwipeHint rect={rect} axis="y" />;
}

// Centres the onboarding FontSwipeHint over the target rect.
function OnboardingSwipeHint({ rect }: { rect: Rect }) {
  const cy = rect.y + rect.height / 2;
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <View style={[styles.onboardingHint, { top: cy - 16 }]}>
        <FontSwipeHint dismissed={false} />
      </View>
    </View>
  );
}

function TapHint({ rect, long }: { rect: Rect; long: boolean }) {
  const { palette } = useTheme();
  const t = useSharedValue(0);

  useEffect(() => {
    t.value = 0;
    t.value = withRepeat(
      withSequence(
        withTiming(1, { duration: long ? 2400 : 1400, easing: Easing.out(Easing.cubic) }),
        withTiming(0, { duration: 0 }),
      ),
      -1,
      false,
    );
  }, [t, long]);

  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const SIZE = 84;

  const ringStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.1, 1], [0, 0.45, 0]),
    transform: [{ scale: interpolate(t.value, [0, 1], [0.4, 1.6]) }],
  }));

  const dotStyle = useAnimatedStyle(() => ({
    opacity: interpolate(t.value, [0, 0.15, 0.55, 1], [0, 0.6, 0.6, 0]),
    transform: [{ scale: interpolate(t.value, [0, 0.2, 1], [0.6, 1, 0.85]) }],
  }));

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Animated.View
        style={[
          styles.tapRing,
          {
            top: cy - SIZE / 2,
            left: cx - SIZE / 2,
            width: SIZE,
            height: SIZE,
            borderRadius: SIZE / 2,
            borderColor: palette.accent,
          },
          ringStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.tapDot,
          {
            top: cy - 14,
            left: cx - 14,
            backgroundColor: palette.accent,
            shadowColor: palette.accent,
          },
          dotStyle,
        ]}
      />
    </View>
  );
}

function SwipeHint({ rect, axis }: { rect: Rect; axis: 'x' | 'y' }) {
  const { palette } = useTheme();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);

  useEffect(() => {
    const STEP = 180;
    const FADE = 260;
    const PAUSE = 520;
    const seq = (delay: number) =>
      withDelay(
        delay,
        withRepeat(
          withSequence(
            withTiming(1, { duration: FADE, easing: Easing.out(Easing.cubic) }),
            withTiming(0, { duration: FADE, easing: Easing.in(Easing.cubic) }),
            withTiming(0, { duration: PAUSE }),
          ),
          -1,
          false,
        ),
      );
    a.value = 0; b.value = 0; c.value = 0;
    a.value = seq(0);
    b.value = seq(STEP);
    c.value = seq(STEP * 2);
  }, [a, b, c]);

  const aStyle = useAnimatedStyle(() => ({ opacity: a.value }));
  const bStyle = useAnimatedStyle(() => ({ opacity: b.value }));
  const cStyle = useAnimatedStyle(() => ({ opacity: c.value }));

  const horizontal = axis === 'x';
  const cx = rect.x + rect.width / 2;
  const cy = rect.y + rect.height / 2;
  const FONT = 44;
  const SPACING = 26;
  const char = horizontal ? '›' : '∨';
  const chevronStyles = [aStyle, bStyle, cStyle];

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {[-1, 0, 1].map((off, i) => (
        <Animated.View
          key={i}
          style={[
            styles.chevron,
            horizontal
              ? { left: cx + off * SPACING - FONT * 0.28, top: cy - FONT * 0.58 }
              : { left: cx - FONT * 0.28, top: cy + off * SPACING - FONT * 0.58 },
            chevronStyles[i],
          ]}
        >
          <Text style={[styles.chevronChar, { color: palette.accent, fontSize: FONT }]}>
            {char}
          </Text>
        </Animated.View>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  tapRing: {
    position: 'absolute',
    borderWidth: 2.5,
  },
  tapDot: {
    position: 'absolute',
    width: 28,
    height: 28,
    borderRadius: 14,
    shadowOpacity: 0.7,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 8,
  },
  chevron: {
    position: 'absolute',
  },
  onboardingHint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  chevronChar: {
    fontWeight: '200',
    lineHeight: 44,
  },
});

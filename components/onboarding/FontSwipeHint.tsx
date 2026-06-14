import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Hand } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

// Animated "swipe sideways" hint shown on the onboarding font carousel so the
// user realises there are more fonts to swipe through. Three chevrons fade in
// sequence left→right and the cluster nudges right, reading as a drag motion.
// Reuses the sequenced-chevron technique from tutorial/GestureHint's SwipeHint,
// kept local to avoid coupling to the tutorial Rect/HintKind types.
export function FontSwipeHint({ dismissed }: { dismissed: boolean }) {
  const { palette } = useTheme();
  const a = useSharedValue(0);
  const b = useSharedValue(0);
  const c = useSharedValue(0);
  const nudge = useSharedValue(0);
  const gone = useSharedValue(0);

  useEffect(() => {
    const FADE = 280;
    const PAUSE = 540;
    const STEP = 170;
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
    a.value = seq(0);
    b.value = seq(STEP);
    c.value = seq(STEP * 2);
    nudge.value = withRepeat(
      withSequence(
        withTiming(12, { duration: 620, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 620, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 260 }),
      ),
      -1,
      false,
    );
  }, [a, b, c, nudge]);

  useEffect(() => {
    gone.value = withTiming(dismissed ? 1 : 0, { duration: 220 });
  }, [dismissed, gone]);

  const containerStyle = useAnimatedStyle(() => ({
    opacity: 1 - gone.value,
    transform: [{ translateX: nudge.value }],
  }));
  const aStyle = useAnimatedStyle(() => ({ opacity: a.value }));
  const bStyle = useAnimatedStyle(() => ({ opacity: b.value }));
  const cStyle = useAnimatedStyle(() => ({ opacity: c.value }));
  const chevronStyles = [aStyle, bStyle, cStyle];

  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.wrap, containerStyle]}
    >
      <Hand size={18} color={palette.accent} strokeWidth={2} />
      <View style={styles.chevrons}>
        {chevronStyles.map((s, i) => (
          <Animated.View key={i} style={s}>
            <Text style={[styles.chevron, { color: palette.accent }]}>›</Text>
          </Animated.View>
        ))}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  chevrons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 1,
  },
  chevron: {
    fontSize: 22,
    fontWeight: '300',
    lineHeight: 24,
  },
});

import { useCallback, useEffect, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Path } from 'react-native-svg';
import { Sparkles } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useBackdropDim } from '@/lib/useBackdropDim';
import { hapticsLight, hapticsStrong } from '@/lib/haptics';
import { streakBumpEvents, type StreakBumpPayload } from '@/lib/streakBumpEvents';
import { MIHRAB_PATH_D, MIHRAB_VIEWBOX } from '@/components/mihrabPath';
import type { Palette } from '@/constants/themes';

const SCREEN_H = Dimensions.get('window').height;

// Suspenseful entry timeline (ms from mount):
//   0    backdrop starts fading in (slow)
// 650    title pill begins sliding down from top
//1250    badge starts rising from bottom (slow)
//2050    OLD streak fades into the badge (textDark colour)
//2650    OLD slides up + fades out, NEW streak slides up + bounces in (accent colour)
//2950    sparkle pulse
const BACKDROP_FADE_DURATION = 650;
const TITLE_DELAY = 650;
const TITLE_DURATION = 600;
const CARD_DELAY = 1250;
const CARD_DURATION = 800;
const OLD_NUMBER_DELAY = 2050;
const TRANSITION_DELAY = 2650;
const SPARKLE_DELAY = 2950;
const EXIT_DURATION = 360;

export function StreakBumpHost() {
  const [event, setEvent] = useState<(StreakBumpPayload & { key: number }) | null>(null);

  useEffect(
    () =>
      streakBumpEvents.subscribe((payload) => {
        setEvent((prev) => ({ ...payload, key: (prev?.key ?? 0) + 1 }));
      }),
    [],
  );

  if (!event) return null;

  return (
    <StreakBumpModal
      key={event.key}
      from={event.from}
      to={event.to}
      onDone={() => setEvent(null)}
    />
  );
}

interface ModalProps {
  from: number;
  to: number;
  onDone: () => void;
}

function StreakBumpModal({ from, to, onDone }: ModalProps) {
  const { palette } = useTheme();
  const backdrop = useBackdropDim(0.45);
  const insets = useSafeAreaInsets();
  const cardY = useSharedValue(SCREEN_H);
  const cardOpacity = useSharedValue(0);
  const titleY = useSharedValue(-160);
  const titleOpacity = useSharedValue(0);
  const sparkleScale = useSharedValue(0);
  const backdropOpacity = useSharedValue(0);
  const oldOpacity = useSharedValue(0);
  const oldY = useSharedValue(0);
  const newScale = useSharedValue(0);
  const newOpacity = useSharedValue(0);
  const newY = useSharedValue(40);
  const pillOpacity = useSharedValue(0);
  const pillY = useSharedValue(20);
  const [closing, setClosing] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  // Entry animation — slow build-up, no auto-dismiss timer.
  useEffect(() => {
    cardY.value = SCREEN_H;
    cardOpacity.value = 0;
    titleY.value = -160;
    titleOpacity.value = 0;
    sparkleScale.value = 0;
    backdropOpacity.value = 0;
    oldOpacity.value = 0;
    oldY.value = 0;
    newScale.value = 0;
    newOpacity.value = 0;
    newY.value = 40;

    backdropOpacity.value = withTiming(1, {
      duration: BACKDROP_FADE_DURATION,
      easing: Easing.inOut(Easing.cubic),
    });

    titleY.value = withDelay(
      TITLE_DELAY,
      withTiming(0, {
        duration: TITLE_DURATION,
        easing: Easing.out(Easing.back(1.1)),
      }),
    );
    titleOpacity.value = withDelay(
      TITLE_DELAY,
      withTiming(1, { duration: 320 }),
    );

    cardY.value = withDelay(
      CARD_DELAY,
      withTiming(0, {
        duration: CARD_DURATION,
        easing: Easing.out(Easing.cubic),
      }),
    );
    cardOpacity.value = withDelay(
      CARD_DELAY,
      withTiming(1, { duration: 360 }),
    );

    // OLD streak: fade in plain (textDark), hold, then fade out at the
    // transition beat. withSequence so the fade-out doesn't overwrite the
    // fade-in (which happens if you set .value twice in the same JS frame).
    const oldHoldMs = TRANSITION_DELAY - OLD_NUMBER_DELAY - 280;
    oldOpacity.value = withDelay(
      OLD_NUMBER_DELAY,
      withSequence(
        withTiming(1, { duration: 280 }),
        withDelay(oldHoldMs, withTiming(0, { duration: 280 })),
      ),
    );
    oldY.value = withDelay(
      TRANSITION_DELAY,
      withTiming(-40, { duration: 320, easing: Easing.in(Easing.cubic) }),
    );
    newOpacity.value = withDelay(
      TRANSITION_DELAY + 100,
      withTiming(1, { duration: 280 }),
    );
    newY.value = withDelay(
      TRANSITION_DELAY + 100,
      withTiming(0, {
        duration: 360,
        easing: Easing.out(Easing.back(1.6)),
      }),
    );
    newScale.value = withDelay(
      TRANSITION_DELAY + 100,
      withSequence(
        withTiming(1.25, { duration: 300, easing: Easing.out(Easing.back(2.2)) }),
        withTiming(1, { duration: 220 }),
      ),
    );
    sparkleScale.value = withDelay(
      SPARKLE_DELAY,
      withSequence(
        withTiming(1.4, { duration: 280 }),
        withTiming(1, { duration: 220 }, (finished) => {
          if (finished) runOnJS(setAnimationComplete)(true);
        }),
      ),
    );

    // Haptic beats reinforce the build.
    const t1 = setTimeout(hapticsLight, TITLE_DELAY);
    const t2 = setTimeout(hapticsLight, CARD_DELAY);
    const t3 = setTimeout(hapticsLight, OLD_NUMBER_DELAY);
    const t4 = setTimeout(hapticsStrong, TRANSITION_DELAY + 100);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Reveal Continue pill once the entry timeline finishes.
  useEffect(() => {
    if (!animationComplete) return;
    pillOpacity.value = withTiming(1, { duration: 320 });
    pillY.value = withTiming(0, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationComplete, pillOpacity, pillY]);

  const finish = useCallback(() => {
    onDone();
  }, [onDone]);

  const handleDismiss = useCallback(() => {
    if (closing) return;
    if (!animationComplete) return;
    setClosing(true);
    pillOpacity.value = withTiming(0, { duration: EXIT_DURATION });
    backdropOpacity.value = withTiming(0, { duration: EXIT_DURATION });
    titleY.value = withTiming(-160, {
      duration: EXIT_DURATION,
      easing: Easing.in(Easing.cubic),
    });
    titleOpacity.value = withTiming(0, { duration: EXIT_DURATION });
    oldOpacity.value = withTiming(0, { duration: EXIT_DURATION });
    newOpacity.value = withTiming(0, { duration: EXIT_DURATION });
    cardOpacity.value = withTiming(0, { duration: EXIT_DURATION });
    cardY.value = withTiming(
      SCREEN_H,
      { duration: EXIT_DURATION, easing: Easing.in(Easing.cubic) },
      (finished) => {
        if (finished) runOnJS(finish)();
      },
    );
  }, [
    closing,
    animationComplete,
    backdropOpacity,
    cardOpacity,
    cardY,
    titleOpacity,
    titleY,
    oldOpacity,
    newOpacity,
    pillOpacity,
    finish,
  ]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ translateY: cardY.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const sparkleStyle = useAnimatedStyle(() => ({
    transform: [{ scale: sparkleScale.value }],
    opacity: sparkleScale.value === 0 ? 0 : 1,
  }));
  const oldNumberStyle = useAnimatedStyle(() => ({
    opacity: oldOpacity.value,
    transform: [{ translateY: oldY.value }],
  }));
  const newNumberStyle = useAnimatedStyle(() => ({
    opacity: newOpacity.value,
    transform: [{ translateY: newY.value }, { scale: newScale.value }],
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: pillY.value }],
  }));

  return (
    <Modal transparent animationType="none" visible onRequestClose={handleDismiss}>
      <View style={styles.root}>
        <Animated.View style={[styles.backdrop, { backgroundColor: backdrop }, backdropStyle]} />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={animationComplete ? handleDismiss : undefined}
        />

        {/* Top title pill */}
        <View
          pointerEvents="none"
          style={[styles.titleDock, { top: insets.top + 16 }]}
        >
          <Animated.View
            style={[
              styles.titlePill,
              {
                backgroundColor: palette.bgMid,
                borderColor: palette.glassBorder,
              },
              titleStyle,
            ]}
          >
            <Sparkles size={18} color={palette.accent} strokeWidth={2} />
            <Text style={[styles.titleText, { color: palette.textDark }]}>
              Streak Updated
            </Text>
          </Animated.View>
        </View>

        {/* Bottom mihrab badge — raised to leave room for the Continue pill */}
        <View
          pointerEvents="none"
          style={[styles.cardDock, { bottom: insets.bottom + 118 }]}
        >
          <Animated.View style={cardStyle}>
            <MihrabBadge
              from={from}
              to={to}
              palette={palette}
              sparkleStyle={sparkleStyle}
              oldNumberStyle={oldNumberStyle}
              newNumberStyle={newNumberStyle}
            />
          </Animated.View>
        </View>

        {/* Continue pill — appears only after the entry animation completes */}
        <View
          pointerEvents={animationComplete && !closing ? 'box-none' : 'none'}
          style={[styles.pillDock, { bottom: insets.bottom + 32 }]}
        >
          <Animated.View style={pillStyle}>
            <Pressable
              onPress={() => {
                hapticsLight();
                handleDismiss();
              }}
              style={[styles.continuePill, { backgroundColor: palette.accent }]}
              hitSlop={8}
            >
              <Text style={[styles.continueLabel, { color: '#FFFFFF' }]}>
                Continue
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

function MihrabBadge({
  from,
  to,
  palette,
  sparkleStyle,
  oldNumberStyle,
  newNumberStyle,
}: {
  from: number;
  to: number;
  palette: Palette;
  sparkleStyle: ReturnType<typeof useAnimatedStyle>;
  oldNumberStyle: ReturnType<typeof useAnimatedStyle>;
  newNumberStyle: ReturnType<typeof useAnimatedStyle>;
}) {
  // Shrink the digits as the streak grows so a 3- or 4-digit number still fits
  // inside the mihrab interior (numberStack is 160 wide).
  const digits = Math.max(String(from).length, String(to).length);
  const { fontSize, lineHeight } =
    digits <= 2 ? { fontSize: 104, lineHeight: 112 }
    : digits === 3 ? { fontSize: 78, lineHeight: 88 }
    : digits === 4 ? { fontSize: 60, lineHeight: 70 }
    : { fontSize: 48, lineHeight: 56 };
  const numSize = { fontSize, lineHeight };
  return (
    <View
      style={[
        styles.badge,
        {
          backgroundColor: palette.bgMid,
          borderColor: palette.glassBorder,
        },
      ]}
    >
      <Svg width={200} height={342} viewBox={MIHRAB_VIEWBOX}>
        <Path
          d={MIHRAB_PATH_D}
          fill={palette.accent}
          opacity={0.16}
          stroke={palette.accent}
          strokeWidth={6}
        />
      </Svg>
      <View style={styles.inner}>
        <Animated.View style={sparkleStyle}>
          <Sparkles size={32} color={palette.accent} strokeWidth={2} />
        </Animated.View>
        <View style={styles.numberStack}>
          <Animated.Text
            style={[styles.num, numSize, { color: palette.textDark }, oldNumberStyle]}
          >
            {from}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.num,
              styles.numberAbs,
              numSize,
              { color: palette.accent },
              newNumberStyle,
            ]}
          >
            {to}
          </Animated.Text>
        </View>
        <Text style={[styles.label, { color: palette.textMid }]}>day streak</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  titleDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  titlePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 24,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  titleText: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  cardDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  badge: {
    width: 240,
    paddingHorizontal: 8,
    paddingVertical: 16,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 10,
  },
  inner: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  numberStack: {
    width: 160,
    height: 112,
    alignItems: 'center',
    justifyContent: 'center',
  },
  num: {
    fontSize: 104,
    fontWeight: '700',
    includeFontPadding: false,
    lineHeight: 112,
    textAlign: 'center',
  },
  numberAbs: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  label: {
    fontSize: 13,
    letterSpacing: 1.6,
  },
  pillDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  continuePill: {
    minWidth: 200,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.22,
    shadowRadius: 14,
    elevation: 8,
  },
  continueLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

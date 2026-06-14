import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  Easing,
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';
import { useRouter } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { hapticsLight } from '@/lib/haptics';

const EXIT_DURATION = 360;
const BACKDROP_FADE_IN = 600;

interface Props {
  /** Total time (ms) the lock window covers — Go Home pill reveals when this elapses. */
  entryDurationMs: number;
  onClose: () => void;
  /** Custom backdrop colour. Defaults to translucent black. */
  backdropColor?: string;
  children: ReactNode;
}

export function CategoryCompletionShell({
  entryDurationMs,
  onClose,
  backdropColor = 'rgba(0,0,0,0.75)',
  children,
}: Props) {
  const router = useRouter();
  const { palette } = useTheme();
  const insets = useSafeAreaInsets();
  const [closing, setClosing] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);

  const backdropOpacity = useSharedValue(0);
  const pillOpacity = useSharedValue(0);
  const pillY = useSharedValue(20);

  useEffect(() => {
    backdropOpacity.value = withTiming(1, {
      duration: BACKDROP_FADE_IN,
      easing: Easing.inOut(Easing.cubic),
    });
    const t = setTimeout(() => setAnimationComplete(true), entryDurationMs);
    return () => clearTimeout(t);
  }, [entryDurationMs, backdropOpacity]);

  useEffect(() => {
    if (!animationComplete) return;
    pillOpacity.value = withTiming(1, { duration: 320 });
    pillY.value = withTiming(0, {
      duration: 360,
      easing: Easing.out(Easing.cubic),
    });
  }, [animationComplete, pillOpacity, pillY]);

  const playExit = useCallback(
    (after: () => void) => {
      pillOpacity.value = withTiming(0, { duration: EXIT_DURATION });
      backdropOpacity.value = withTiming(
        0,
        { duration: EXIT_DURATION },
        (finished) => {
          if (finished) runOnJS(after)();
        },
      );
    },
    [backdropOpacity, pillOpacity],
  );

  const handleBackdropPress = useCallback(() => {
    if (closing) return;
    if (!animationComplete) return;
    setClosing(true);
    playExit(onClose);
  }, [animationComplete, closing, onClose, playExit]);

  const handleGoHome = useCallback(() => {
    if (closing) return;
    if (!animationComplete) return;
    hapticsLight();
    setClosing(true);
    playExit(() => {
      if (router.canGoBack()) router.back();
      else router.replace('/(tabs)');
      onClose();
    });
  }, [animationComplete, closing, onClose, playExit, router]);

  const backdropStyle = useAnimatedStyle(() => ({
    opacity: backdropOpacity.value,
  }));
  const pillStyle = useAnimatedStyle(() => ({
    opacity: pillOpacity.value,
    transform: [{ translateY: pillY.value }],
  }));

  return (
    <Modal
      transparent
      animationType="none"
      visible
      onRequestClose={handleBackdropPress}
    >
      <View style={styles.root}>
        <Animated.View
          style={[styles.backdrop, { backgroundColor: backdropColor }, backdropStyle]}
        />
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={animationComplete ? handleBackdropPress : undefined}
        />

        {/* variant-specific content */}
        <View pointerEvents="none" style={StyleSheet.absoluteFill}>
          {children}
        </View>

        {/* Go Home pill */}
        <View
          pointerEvents={animationComplete && !closing ? 'box-none' : 'none'}
          style={[styles.pillDock, { bottom: insets.bottom + 32 }]}
        >
          <Animated.View style={pillStyle}>
            <Pressable
              onPress={handleGoHome}
              style={[styles.pill, { backgroundColor: palette.accent }]}
              hitSlop={8}
            >
              <Text style={[styles.pillLabel, { color: '#FFFFFF' }]}>
                Go Home
              </Text>
            </Pressable>
          </Animated.View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  backdrop: { ...StyleSheet.absoluteFillObject },
  pillDock: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pill: {
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
  pillLabel: {
    fontSize: 17,
    fontWeight: '600',
    letterSpacing: 0.3,
  },
});

import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { EdgeConfetti } from '@/components/EdgeConfetti';
import { useTheme } from '@/context/ThemeContext';
import { CATEGORY_ICONS } from '@/lib/categoryIcons';
import type { Category } from '@/types';
import { CategoryCompletionShell } from './CategoryCompletionShell';

interface Props {
  category: Category;
  onClose: () => void;
  backdropDim?: number;
}

const ENTRY_DURATION = 2400;

export function CategoryCompletionV1Confetti({ category, onClose, backdropDim }: Props) {
  const { palette } = useTheme();
  const Icon = CATEGORY_ICONS[category.id];
  const [confettiTick, setConfettiTick] = useState(0);

  const cardScale = useSharedValue(0.6);
  const cardOpacity = useSharedValue(0);
  const iconScale = useSharedValue(0);
  const labelOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleY = useSharedValue(20);

  useEffect(() => {
    // EdgeConfetti compares incoming triggerKey against its initial ref
    // and bails if equal — so fire it on next tick from a non-zero value.
    const id = setTimeout(() => setConfettiTick((t) => t + 1), 0);
    return () => clearTimeout(id);
  }, []);

  useEffect(() => {
    cardOpacity.value = withTiming(1, { duration: 380 });
    cardScale.value = withTiming(1, {
      duration: 520,
      easing: Easing.out(Easing.back(1.6)),
    });
    iconScale.value = withDelay(
      280,
      withSequence(
        withTiming(1.15, { duration: 340, easing: Easing.out(Easing.back(2)) }),
        withTiming(1, { duration: 220 }),
      ),
    );
    titleOpacity.value = withDelay(700, withTiming(1, { duration: 360 }));
    titleY.value = withDelay(
      700,
      withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    labelOpacity.value = withDelay(950, withTiming(1, { duration: 360 }));
  }, [cardOpacity, cardScale, iconScale, labelOpacity, titleOpacity, titleY]);

  const cardStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
    transform: [{ scale: cardScale.value }],
  }));
  const iconStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleY.value }],
  }));
  const labelStyle = useAnimatedStyle(() => ({ opacity: labelOpacity.value }));

  return (
    <CategoryCompletionShell
      entryDurationMs={ENTRY_DURATION}
      onClose={onClose}
      backdropColor={
        backdropDim != null ? `rgba(0,0,0,${backdropDim})` : undefined
      }
    >
      <EdgeConfetti
        triggerKey={confettiTick}
        colors={[
          palette.accent,
          palette.bgTop,
          palette.bgMid,
          palette.bgBottom,
          palette.textMid,
        ]}
      />
      <View style={styles.centerWrap} pointerEvents="none">
        <Animated.View
          style={[
            styles.card,
            {
              backgroundColor: palette.bgMid,
              borderColor: palette.glassBorder,
            },
            cardStyle,
          ]}
        >
          <Animated.View style={iconStyle}>
            <Icon size={64} color={palette.accent} strokeWidth={1.6} />
          </Animated.View>
          <Animated.Text
            style={[styles.title, { color: palette.textDark }, titleStyle]}
          >
            {category.label}
          </Animated.Text>
          <Animated.Text
            style={[styles.label, { color: palette.accent }, labelStyle]}
          >
            COMPLETE
          </Animated.Text>
        </Animated.View>
      </View>
    </CategoryCompletionShell>
  );
}

const styles = StyleSheet.create({
  centerWrap: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    width: 280,
    paddingVertical: 36,
    paddingHorizontal: 24,
    borderRadius: 24,
    borderWidth: 1,
    alignItems: 'center',
    gap: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.28,
    shadowRadius: 24,
    elevation: 14,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
  },
  label: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 4,
  },
});

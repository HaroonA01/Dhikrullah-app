import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { ChevronsDown } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  count: number;
  active: number;
  // When set, the dot at this index is replaced by a gently-bouncing down
  // chevron (a "scroll for more" hint). Reverts to a normal dot when null.
  chevronIndex?: number | null;
}

export function PageDots({ count, active, chevronIndex = null }: Props) {
  const { palette } = useTheme();
  const inactiveColor =
    palette.scheme === 'dark' ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.15)';
  return (
    <View style={styles.row}>
      {Array.from({ length: count }).map((_, i) =>
        i === chevronIndex ? (
          <DotChevron key={i} color={palette.accent} />
        ) : (
          <View
            key={i}
            style={[
              styles.dot,
              { backgroundColor: i === active ? palette.accent : inactiveColor },
            ]}
          />
        ),
      )}
    </View>
  );
}

function DotChevron({ color }: { color: string }) {
  const bounce = useSharedValue(0);
  useEffect(() => {
    bounce.value = withRepeat(
      withSequence(
        withTiming(2.5, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
        withTiming(0, { duration: 600, easing: Easing.inOut(Easing.cubic) }),
      ),
      -1,
      false,
    );
  }, [bounce]);
  const style = useAnimatedStyle(() => ({ transform: [{ translateY: bounce.value }] }));
  // Occupy the same 8px footprint as a dot so the row spacing doesn't shift when
  // toggling between dot and chevron; the larger glyph overflows the slot.
  return (
    <Animated.View style={[styles.chevronSlot, style]}>
      <ChevronsDown size={14} color={color} strokeWidth={2.6} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
    gap: 8,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  chevronSlot: { width: 8, height: 8, alignItems: 'center', justifyContent: 'center' },
});

import { ComponentType } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { LucideProps } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { hapticsLight } from '@/lib/haptics';

interface Props {
  Icon: ComponentType<LucideProps>;
  onPress: () => void;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function GhostArrow({ Icon, onPress }: Props) {
  const { palette } = useTheme();
  const scale = useSharedValue(1);
  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withTiming(0.92, { duration: 70 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      onPress={() => {
        hapticsLight();
        onPress();
      }}
      hitSlop={10}
      style={[
        styles.btn,
        { backgroundColor: palette.glassBg },
        style,
      ]}
    >
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFill,
          styles.borderOverlay,
          { borderColor: palette.glassBorder },
        ]}
      />
      <Icon size={22} color={palette.accent} strokeWidth={2.2} />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  borderOverlay: {
    borderWidth: 1,
    borderRadius: 22,
  },
});

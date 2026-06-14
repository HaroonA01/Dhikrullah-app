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
  disabled?: boolean;
  active?: boolean;
  iconFill?: boolean;
}

const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

export function ActionPill({
  Icon,
  onPress,
  disabled,
  active = false,
  iconFill = false,
}: Props) {
  const { palette } = useTheme();
  const scale = useSharedValue(1);

  const style = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }));

  const showFill = iconFill && active;

  return (
    <AnimatedPressable
      onPressIn={() => {
        scale.value = withTiming(0.92, { duration: 70 });
      }}
      onPressOut={() => {
        scale.value = withSpring(1, { damping: 12, stiffness: 220 });
      }}
      onPress={() => {
        if (disabled) return;
        hapticsLight();
        onPress();
      }}
      disabled={disabled}
      style={[
        styles.btn,
        { backgroundColor: palette.glassBg },
        disabled && styles.disabled,
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
      <Icon
        size={22}
        color={palette.accent}
        strokeWidth={2}
        fill={showFill ? palette.accent : 'none'}
      />
    </AnimatedPressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    width: 54,
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  borderOverlay: {
    borderWidth: 1,
    borderRadius: 27,
  },
  disabled: {
    opacity: 0.3,
  },
});

import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from 'react-native-reanimated';
import { useTheme } from '@/context/ThemeContext';

type Variant = 'filled' | 'outline';

interface Props {
  label: string;
  onPress: () => void;
  loading?: boolean;
  disabled?: boolean;
  variant?: Variant;
}

export function PrimaryButton({ label, onPress, loading, disabled, variant = 'filled' }: Props) {
  const { palette } = useTheme();
  const scale = useSharedValue(1);
  const isDisabled = disabled || loading;

  const animStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));

  const isOutline = variant === 'outline';
  const surface = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';
  const bg = isOutline ? surface : palette.accent;
  const textColor = isOutline ? palette.accent : '#fff';
  const borderColor = isOutline ? palette.accent : 'transparent';

  return (
    <Animated.View style={animStyle}>
      <Pressable
        onPress={onPress}
        disabled={isDisabled}
        onPressIn={() => {
          scale.value = withSpring(0.97, { damping: 18, stiffness: 220 });
        }}
        onPressOut={() => {
          scale.value = withSpring(1, { damping: 18, stiffness: 220 });
        }}
        style={[
          styles.btn,
          { backgroundColor: bg, borderColor, opacity: isDisabled ? 0.55 : 1 },
          isOutline && styles.outline,
        ]}
      >
        {loading ? (
          <ActivityIndicator color={textColor} />
        ) : (
          <Text style={[styles.label, { color: textColor }]}>{label}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 54,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 24,
    borderWidth: 0,
  },
  outline: {
    borderWidth: 1.5,
  },
  label: {
    fontSize: 17,
    fontWeight: '600',
  },
});

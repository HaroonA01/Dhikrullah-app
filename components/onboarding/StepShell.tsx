import React, { useEffect } from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  children: React.ReactNode;
  footer?: React.ReactNode;
  style?: ViewStyle;
  topPad?: number;
}

export function StepShell({ children, footer, style, topPad = 24 }: Props) {
  const insets = useSafeAreaInsets();
  const opacity = useSharedValue(0);
  const ty = useSharedValue(24);

  useEffect(() => {
    opacity.value = withTiming(1, { duration: 400 });
    ty.value = withSpring(0, { damping: 16, stiffness: 120 });
  }, [opacity, ty]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: ty.value }],
  }));

  return (
    <View style={[styles.root, { paddingTop: insets.top + topPad }, style]}>
      <Animated.View style={[styles.body, animStyle]}>{children}</Animated.View>
      {footer ? (
        <Animated.View style={[styles.footer, { paddingBottom: insets.bottom + 24 }, animStyle]}>
          {footer}
        </Animated.View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    paddingHorizontal: 24,
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingTop: 12,
  },
});

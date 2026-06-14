import React, { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { CheckCircle2 } from 'lucide-react-native';
import * as Haptics from 'expo-haptics';
import { router } from 'expo-router';
import { useTheme } from '@/context/ThemeContext';
import { usePrefs } from '@/context/PrefsContext';
import { StepShell } from '@/components/onboarding/StepShell';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';

export function DoneStep() {
  const { palette } = useTheme();
  const { markLocationPromptShown, location, notifEnabled } = usePrefs();

  const enabledCount = Object.values(notifEnabled).filter(Boolean).length;
  const summary = location
    ? `${location.label} · ${enabledCount} reminder${enabledCount === 1 ? '' : 's'} on`
    : 'You can add a location anytime in Settings.';

  const iconScale = useSharedValue(0);
  const iconOpacity = useSharedValue(0);
  const titleOpacity = useSharedValue(0);
  const titleTy = useSharedValue(16);
  const summaryOpacity = useSharedValue(0);

  useEffect(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
    iconOpacity.value = withTiming(1, { duration: 350 });
    iconScale.value = withSpring(1, { damping: 11, stiffness: 110, mass: 0.9 });
    titleOpacity.value = withDelay(300, withTiming(1, { duration: 450 }));
    titleTy.value = withDelay(300, withSpring(0, { damping: 18, stiffness: 130 }));
    summaryOpacity.value = withDelay(600, withTiming(1, { duration: 500 }));
  }, [iconOpacity, iconScale, titleOpacity, titleTy, summaryOpacity]);

  const iconStyle = useAnimatedStyle(() => ({
    opacity: iconOpacity.value,
    transform: [{ scale: iconScale.value }],
  }));
  const titleStyle = useAnimatedStyle(() => ({
    opacity: titleOpacity.value,
    transform: [{ translateY: titleTy.value }],
  }));
  const summaryStyle = useAnimatedStyle(() => ({ opacity: summaryOpacity.value }));

  const finish = () => {
    markLocationPromptShown();
    router.replace('/(tabs)');
  };

  return (
    <StepShell footer={<PrimaryButton label="Get Started" onPress={finish} />}>
      <View style={styles.center}>
        <Animated.View style={[styles.iconWrap, { backgroundColor: palette.accentLight }, iconStyle]}>
          <CheckCircle2 size={48} color={palette.accent} strokeWidth={2} />
        </Animated.View>
        <Animated.Text style={[styles.title, { color: palette.textDark }, titleStyle]}>
          You&apos;re all set
        </Animated.Text>
        <Animated.Text style={[styles.summary, { color: palette.textMid }, summaryStyle]}>
          {summary}
        </Animated.Text>
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconWrap: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 28,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
  },
  summary: {
    fontSize: 15,
    lineHeight: 22,
    textAlign: 'center',
    paddingHorizontal: 12,
  },
});

import React, { useEffect } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { Bell, Compass, MapPin, Type, Volume2 } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { GlassCard } from '@/components/GlassCard';
import { StepShell } from '@/components/onboarding/StepShell';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';

type IconType = typeof MapPin;

const ROWS: { Icon: IconType; title: string; body: string }[] = [
  { Icon: MapPin, title: 'Set your location', body: 'For accurate prayer times.' },
  { Icon: Compass, title: 'Pick a calculation method', body: 'In London? East London Mosque is at the top.' },
  { Icon: Volume2, title: 'Choose a notification sound', body: 'Preview the tone your reminders will play.' },
  { Icon: Bell, title: 'Choose your reminders', body: 'Toggle the ones that fit your day.' },
  { Icon: Type, title: 'Pick fonts and sizes', body: 'Arabic and English, each at a comfortable size.' },
];

function Row({ index, Icon, title, body }: { index: number; Icon: IconType; title: string; body: string }) {
  const { palette } = useTheme();
  const opacity = useSharedValue(0);
  const tx = useSharedValue(-20);

  useEffect(() => {
    opacity.value = withDelay(150 + index * 90, withTiming(1, { duration: 400 }));
    tx.value = withDelay(150 + index * 90, withSpring(0, { damping: 18, stiffness: 130 }));
  }, [index, opacity, tx]);

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateX: tx.value }],
  }));

  return (
    <Animated.View style={animStyle}>
      <GlassCard style={styles.card}>
        <View style={[styles.iconWrap, { backgroundColor: palette.accentLight }]}>
          <Icon size={22} color={palette.accent} strokeWidth={2} />
        </View>
        <View style={styles.copy}>
          <Text style={[styles.cardTitle, { color: palette.textDark }]}>{title}</Text>
          <Text style={[styles.cardBody, { color: palette.textMid }]}>{body}</Text>
        </View>
      </GlassCard>
    </Animated.View>
  );
}

export function PreviewStep({ fontsReady }: { fontsReady: boolean }) {
  const { palette } = useTheme();
  const { goNext } = useOnboarding();

  return (
    <StepShell
      footer={
        <PrimaryButton
          label={fontsReady ? 'Continue' : 'Loading fonts…'}
          onPress={goNext}
          disabled={!fontsReady}
        />
      }
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: palette.textDark }]}>Let&apos;s set things up</Text>
        <Text style={[styles.subtitle, { color: palette.textMid }]}>
          A few quick choices to make Dhikrullah yours.
        </Text>
      </View>
      <ScrollView
        contentContainerStyle={styles.scroll}
        showsVerticalScrollIndicator={false}
      >
        {ROWS.map((r, i) => (
          <Row key={r.title} index={i} Icon={r.Icon} title={r.title} body={r.body} />
        ))}
      </ScrollView>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginTop: 12,
    marginBottom: 18,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 15,
    marginTop: 8,
    lineHeight: 22,
  },
  scroll: {
    gap: 10,
    paddingBottom: 24,
  },
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 14,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
  },
  copy: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '600',
  },
  cardBody: {
    fontSize: 13,
    marginTop: 2,
  },
});

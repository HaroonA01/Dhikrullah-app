import React, { useEffect, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { useFonts } from 'expo-font';
import { GradientBackground } from '@/components/GradientBackground';
import { GOOGLE_FONT_ASSETS } from '@/lib/fonts';
import { OnboardingProvider, useOnboarding } from '@/context/OnboardingContext';
import { OnboardingProgress } from '@/components/onboarding/OnboardingProgress';
import { PreviewStep } from '@/components/onboarding/steps/PreviewStep';
import { LocationStep } from '@/components/onboarding/steps/LocationStep';
import { MethodStep } from '@/components/onboarding/steps/MethodStep';
import { NotificationStep } from '@/components/onboarding/steps/NotificationStep';
import { ArabicFontStep } from '@/components/onboarding/steps/ArabicFontStep';
import { EnglishFontStep } from '@/components/onboarding/steps/EnglishFontStep';
import { DoneStep } from '@/components/onboarding/steps/DoneStep';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

function ActiveStep({ fontsReady }: { fontsReady: boolean }) {
  const { currentStep } = useOnboarding();
  switch (currentStep) {
    case 'preview':
      return <PreviewStep fontsReady={fontsReady} />;
    case 'location':
      return <LocationStep />;
    case 'prayerMethod':
      return <MethodStep />;
    case 'notifications':
      return <NotificationStep />;
    case 'arabicFont':
      return <ArabicFontStep />;
    case 'englishFont':
      return <EnglishFontStep />;
    case 'done':
      return <DoneStep />;
    default:
      return null;
  }
}

function ProgressBar() {
  const insets = useSafeAreaInsets();
  const { stepIndex, totalSteps } = useOnboarding();
  return (
    <View style={[styles.progressBar, { paddingTop: insets.top + 8 }]}>
      <OnboardingProgress total={totalSteps} active={stepIndex} />
    </View>
  );
}

function StepHost({ fontsReady }: { fontsReady: boolean }) {
  const { currentStep, stepIndex } = useOnboarding();
  return (
    <View style={styles.root}>
      {currentStep !== 'done' ? <ProgressBar /> : null}
      <View key={stepIndex} style={styles.stepWrap}>
        <ActiveStep fontsReady={fontsReady} />
      </View>
    </View>
  );
}

export default function OnboardingRoot() {
  const [fontsLoaded] = useFonts(GOOGLE_FONT_ASSETS);
  const [fontsReady, setFontsReady] = useState(false);

  useEffect(() => {
    if (fontsLoaded) setFontsReady(true);
  }, [fontsLoaded]);

  return (
    <View style={styles.root}>
      <GradientBackground />
      <OnboardingProvider>
        <StepHost fontsReady={fontsReady} />
      </OnboardingProvider>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  progressBar: {
    paddingHorizontal: 24,
  },
  stepWrap: {
    flex: 1,
  },
});

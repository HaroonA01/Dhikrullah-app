import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePrefs } from '@/context/PrefsContext';
import { ARABIC_FONTS, ARABIC_SIZE } from '@/lib/fonts';
import { ARABIC_PREVIEW_PHRASE } from '@/lib/onboarding/copy';
import { StepShell } from '@/components/onboarding/StepShell';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';
import { FontPagerCards } from '@/components/onboarding/FontPagerCards';
import { TextSizePicker } from '@/components/onboarding/TextSizePicker';

export function ArabicFontStep() {
  const { palette } = useTheme();
  const { goNext } = useOnboarding();
  const { arabicFont, setArabicFont, arabicTextSize, setArabicTextSize } = usePrefs();

  return (
    <StepShell
      footer={
        <View>
          <Text style={[styles.sizeLabel, { color: palette.textMid }]}>SIZE</Text>
          <TextSizePicker value={arabicTextSize} onChange={setArabicTextSize} />
          <View style={styles.gap} />
          <PrimaryButton label="Continue" onPress={goNext} />
        </View>
      }
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: palette.textDark }]}>Arabic font</Text>
        <Text style={[styles.subtitle, { color: palette.textMid }]}>
          Swipe to preview. Tap below to size.
        </Text>
      </View>
      <FontPagerCards
        fonts={ARABIC_FONTS}
        selectedId={arabicFont}
        onChange={(id) => setArabicFont(id)}
        previewText={ARABIC_PREVIEW_PHRASE}
        fontSize={ARABIC_SIZE[arabicTextSize]}
        isArabic
      />
    </StepShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: 8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  sizeLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    marginBottom: 8,
  },
  gap: {
    height: 16,
  },
});

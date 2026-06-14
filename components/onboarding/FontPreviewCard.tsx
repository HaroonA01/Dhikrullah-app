import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  label: string;
  previewText: string;
  fontFamily: string | null;
  fontSize: number;
  isArabic?: boolean;
}

export function FontPreviewCard({ label, previewText, fontFamily, fontSize, isArabic }: Props) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      <GlassCard style={styles.card}>
        <Text style={[styles.label, { color: palette.textMid }]}>{label}</Text>
        <View style={styles.previewBox}>
          <Text
            style={{
              color: palette.textDark,
              fontFamily: fontFamily ?? undefined,
              fontSize,
              lineHeight: fontSize * (isArabic ? 1.6 : 1.4),
              textAlign: 'center',
              writingDirection: isArabic ? 'rtl' : 'ltr',
            }}
          >
            {previewText}
          </Text>
        </View>
      </GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  card: {
    paddingHorizontal: 22,
    paddingVertical: 28,
    minHeight: 260,
  },
  label: {
    fontSize: 13,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: 0.4,
    marginBottom: 18,
    textTransform: 'uppercase',
  },
  previewBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

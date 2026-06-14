import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  body: string;
  attribution?: string;
}

export function QuoteBlock({ body, attribution }: Props) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.wrap,
        {
          backgroundColor: palette.accentLight,
          borderColor: palette.glassBorder,
        },
      ]}
    >
      <Text
        style={[styles.glyph, { color: palette.accent }]}
        accessibilityElementsHidden
        importantForAccessibility="no"
      >
        “
      </Text>
      <View style={styles.body}>
        <Text style={[styles.text, { color: palette.textDark }]}>{body}</Text>
        {attribution ? (
          <Text style={[styles.attribution, { color: palette.textMid }]}>
            — {attribution}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius: 14,
    borderWidth: 1,
    paddingTop: 10,
    paddingHorizontal: 18,
    paddingBottom: 16,
    overflow: 'hidden',
  },
  glyph: {
    fontSize: 56,
    lineHeight: 56,
    fontWeight: '700',
    height: 36,
    marginBottom: 2,
  },
  body: {
    gap: 8,
  },
  text: {
    fontSize: 15,
    lineHeight: 23,
    fontStyle: 'italic',
  },
  attribution: {
    fontSize: 12,
    fontStyle: 'italic',
    fontWeight: '500',
  },
});

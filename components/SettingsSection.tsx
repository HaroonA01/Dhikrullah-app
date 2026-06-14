import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { GlassCard } from '@/components/GlassCard';

interface Props {
  title: string;
  children: React.ReactNode;
}

export function SettingsSection({ title, children }: Props) {
  const { palette } = useTheme();
  return (
    <View style={styles.wrap}>
      <Text style={[styles.title, { color: palette.accent }]}>
        {title.toUpperCase()}
      </Text>
      <GlassCard style={styles.card}>{children}</GlassCard>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 14,
  },
  title: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 6,
    paddingHorizontal: 6,
  },
  card: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});

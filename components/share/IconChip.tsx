import { StyleSheet, View, ViewStyle } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

export type IconChipSize = 'sm' | 'md' | 'lg';

interface Props {
  Icon: LucideIcon;
  size?: IconChipSize;
  style?: ViewStyle | ViewStyle[];
}

const DIMS: Record<IconChipSize, { box: number; icon: number; stroke: number }> = {
  sm: { box: 28, icon: 14, stroke: 1.8 },
  md: { box: 40, icon: 18, stroke: 1.6 },
  lg: { box: 72, icon: 32, stroke: 1.5 },
};

export function IconChip({ Icon, size = 'sm', style }: Props) {
  const { palette } = useTheme();
  const { box, icon, stroke } = DIMS[size];
  return (
    <View
      style={[
        styles.chip,
        {
          width: box,
          height: box,
          borderRadius: box / 2,
          backgroundColor: palette.accentLight,
          borderColor: palette.glassBorder,
        },
        style,
      ]}
    >
      <Icon size={icon} color={palette.accent} strokeWidth={stroke} />
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },
});

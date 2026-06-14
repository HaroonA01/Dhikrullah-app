import { StyleSheet, View } from 'react-native';
import type { LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';
import { IconChip } from './IconChip';

interface Props {
  Icon: LucideIcon;
}

const INNER = 72;
const HALO_GAP = 10;
const HALO = INNER + HALO_GAP * 2;

export function HeroLogo({ Icon }: Props) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.halo,
        {
          width: HALO,
          height: HALO,
          borderRadius: HALO / 2,
          borderColor: palette.glassBorder,
        },
      ]}
    >
      <IconChip Icon={Icon} size="lg" />
    </View>
  );
}

const styles = StyleSheet.create({
  halo: {
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

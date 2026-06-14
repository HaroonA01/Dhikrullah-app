import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ChevronRight, type LucideIcon } from 'lucide-react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  label: string;
  detail?: string;
  Icon?: LucideIcon;
  trailing?: React.ReactNode;
  trailingBelow?: boolean;
  onPress?: () => void;
  showChevron?: boolean;
  isLast?: boolean;
}

export function SettingsRow({
  label,
  detail,
  Icon,
  trailing,
  trailingBelow,
  onPress,
  showChevron,
  isLast,
}: Props) {
  const { palette } = useTheme();

  const topRow = (
    <View style={styles.row}>
      {Icon ? (
        <View style={[styles.iconTile, { backgroundColor: palette.accentLight }]}>
          <Icon size={16} color={palette.accent} strokeWidth={2} />
        </View>
      ) : null}
      <View style={styles.left}>
        <Text style={[styles.label, { color: palette.textDark }]}>{label}</Text>
        {detail ? (
          <Text style={[styles.detail, { color: palette.textMid }]}>
            {detail}
          </Text>
        ) : null}
      </View>
      <View style={styles.right}>
        {trailingBelow ? null : trailing}
        {showChevron ? (
          <ChevronRight size={18} color={palette.textDim} strokeWidth={2} />
        ) : null}
      </View>
    </View>
  );

  const wrappedTopRow = onPress ? (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [pressed && styles.pressed]}
    >
      {topRow}
    </Pressable>
  ) : (
    topRow
  );

  return (
    <View
      style={[
        styles.container,
        !isLast && {
          borderBottomColor: palette.glassBorder,
          borderBottomWidth: StyleSheet.hairlineWidth,
        },
      ]}
    >
      {wrappedTopRow}
      {trailingBelow && trailing ? (
        <View style={styles.belowSlot}>{trailing}</View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 11,
    minHeight: 52,
    gap: 12,
  },
  belowSlot: {
    paddingBottom: 12,
    alignItems: 'center',
  },
  iconTile: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  left: {
    flex: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
  detail: {
    fontSize: 12,
    marginTop: 2,
  },
  right: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  pressed: {
    opacity: 0.6,
  },
});

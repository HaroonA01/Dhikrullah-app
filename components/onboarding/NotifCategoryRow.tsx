import React from 'react';
import { StyleSheet, Switch, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { usePrefs } from '@/context/PrefsContext';
import { CATEGORY_DESCRIPTIONS } from '@/lib/onboarding/copy';
import type { CategoryId } from '@/types';

interface Props {
  id: CategoryId;
}

export function NotifCategoryRow({ id }: Props) {
  const { palette } = useTheme();
  const { notifEnabled, setNotifEnabled } = usePrefs();
  const value = !!notifEnabled[id];
  const entry = CATEGORY_DESCRIPTIONS[id];

  return (
    <View style={[styles.row, { borderBottomColor: palette.glassBorder }]}>
      <View style={styles.text}>
        <Text style={[styles.label, { color: palette.textDark }]}>{entry.label}</Text>
        <Text style={[styles.desc, { color: palette.textMid }]}>{entry.description}</Text>
      </View>
      <Switch
        value={value}
        onValueChange={(v) => setNotifEnabled(id, v)}
        trackColor={{ false: palette.glassBorder, true: palette.accent }}
        thumbColor="#fff"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 12,
  },
  text: {
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
  },
  desc: {
    fontSize: 13,
    marginTop: 2,
  },
});

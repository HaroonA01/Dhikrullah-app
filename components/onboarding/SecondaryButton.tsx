import React from 'react';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  label: string;
  onPress: () => void;
}

export function SecondaryButton({ label, onPress }: Props) {
  const { palette } = useTheme();
  return (
    <Pressable onPress={onPress} hitSlop={12} style={styles.btn}>
      <Text style={[styles.label, { color: palette.textMid }]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: '500',
  },
});

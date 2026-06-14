import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/context/ThemeContext';
import { TEXT_SIZE_OPTIONS, type TextSizeId } from '@/lib/fonts';

const SAMPLE_SIZE: Record<TextSizeId, number> = {
  xs: 12,
  sm: 14,
  md: 16,
  lg: 18,
  xl: 20,
  xxl: 22,
};

interface Props {
  value: TextSizeId;
  onChange: (v: TextSizeId) => void;
}

export function TextSizePicker({ value, onChange }: Props) {
  const { palette } = useTheme();

  return (
    <View style={[styles.row, { backgroundColor: palette.glassBg, borderColor: palette.glassBorder }]}>
      {TEXT_SIZE_OPTIONS.map((opt) => {
        const active = value === opt.id;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[
              styles.cell,
              active && { backgroundColor: palette.accent },
            ]}
          >
            <Text
              style={{
                fontSize: SAMPLE_SIZE[opt.id],
                fontWeight: '600',
                color: active ? '#fff' : palette.textMid,
              }}
            >
              A
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    gap: 4,
  },
  cell: {
    flex: 1,
    height: 44,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

import { useMemo } from 'react';
import { Confetti } from '@/components/Confetti';
import { useTheme } from '@/context/ThemeContext';

interface Props {
  triggerKey: number;
}

export function D1Confetti({ triggerKey }: Props) {
  const { palette } = useTheme();
  const colors = useMemo(
    () => [palette.accent, palette.accent, palette.accent, '#FFFFFF', '#FFFFFF'],
    [palette.accent],
  );
  return <Confetti triggerKey={triggerKey} colors={colors} />;
}

import { useTheme } from '@/context/ThemeContext';

// Returns the modal backdrop color, slightly darker in dark mode so popups
// feel weightier against an already-dark background. Light mode unchanged.
// `lightOpacity` is the value the modal uses today; dark mode bumps it by 0.2
// (capped at 0.85 so we don't blackout the screen).
export function useBackdropDim(lightOpacity = 0.45): string {
  const { palette } = useTheme();
  const opacity =
    palette.scheme === 'dark'
      ? Math.min(0.92, lightOpacity + 0.28)
      : lightOpacity;
  return `rgba(0,0,0,${opacity})`;
}

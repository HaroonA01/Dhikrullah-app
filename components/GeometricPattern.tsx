import { useWindowDimensions } from 'react-native';
import Svg, { Defs, Pattern, Rect, Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

export function GeometricPattern() {
  const { width, height } = useWindowDimensions();
  const { palette } = useTheme();

  const tilePath = [
    'M24,4 L44,24 L24,44 L4,24 Z',
    'M0,24 L48,24 M24,0 L24,48',
    'M0,0 L4,24 M48,0 L44,24 M0,48 L4,24 M48,48 L44,24',
  ].join(' ');

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', top: 0, left: 0 }}
      opacity={0.06}
      pointerEvents="none"
    >
      <Defs>
        <Pattern id="geo" x="0" y="0" width="48" height="48" patternUnits="userSpaceOnUse">
          <Path
            d={tilePath}
            stroke={palette.accent}
            strokeWidth="0.8"
            fill="none"
            strokeLinecap="round"
          />
        </Pattern>
      </Defs>
      <Rect x="0" y="0" width={width} height={height} fill="url(#geo)" />
    </Svg>
  );
}

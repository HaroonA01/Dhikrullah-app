import { Pressable, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Polygon,
  Stop,
} from 'react-native-svg';
import type { Theme } from '@/constants/themes';
import { useTheme } from '@/context/ThemeContext';

type Props = {
  theme: Theme;
  selected: boolean;
  onPress: () => void;
  size?: number;
};

export function ThemeSwatch(props: Props) {
  const { selected, onPress, size = 56 } = props;
  const { palette } = useTheme();
  const r = size / 2;

  const theme = props.theme;
  const ringWidth = selected ? 2.5 : 1;
  const ringColor = selected ? palette.accent : palette.glassBorder;
  const innerR = r - ringWidth;
  const clipId = `swatch-clip-${theme.id}`;
  const lightSheenId = `swatch-sheen-light-${theme.id}`;
  const darkSheenId = `swatch-sheen-dark-${theme.id}`;
  const lightTri = `0,0 ${size},0 ${size},${size}`;
  const darkTri = `0,0 0,${size} ${size},${size}`;

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.wrap,
        { width: size + 8, height: size + 8 },
        pressed && styles.pressed,
      ]}
      hitSlop={6}
    >
      <Svg width={size} height={size}>
        <Defs>
          <ClipPath id={clipId}>
            <Circle cx={r} cy={r} r={innerR} />
          </ClipPath>
          <LinearGradient
            id={lightSheenId}
            x1={0}
            y1={0}
            x2={0}
            y2={size}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.22} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.05} />
          </LinearGradient>
          <LinearGradient
            id={darkSheenId}
            x1={0}
            y1={0}
            x2={0}
            y2={size}
            gradientUnits="userSpaceOnUse"
          >
            <Stop offset="0" stopColor="#FFFFFF" stopOpacity={0.12} />
            <Stop offset="1" stopColor="#000000" stopOpacity={0.18} />
          </LinearGradient>
        </Defs>
        <G clipPath={`url(#${clipId})`}>
          <Polygon points={lightTri} fill={theme.light.accent} />
          <Polygon points={lightTri} fill={`url(#${lightSheenId})`} />
          <Polygon points={darkTri} fill={theme.dark.accent} />
          <Polygon points={darkTri} fill={`url(#${darkSheenId})`} />
        </G>
        <Circle
          cx={r}
          cy={r}
          r={r - ringWidth / 2}
          fill="none"
          stroke={ringColor}
          strokeWidth={ringWidth}
        />
      </Svg>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.6,
  },
});

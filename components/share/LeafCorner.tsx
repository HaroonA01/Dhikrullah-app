import { StyleSheet, View } from 'react-native';
import Svg, { Ellipse, Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';

export type LeafPosition = 'topLeft' | 'topRight' | 'bottomLeft' | 'bottomRight';

interface Props {
  position: LeafPosition;
  size?: number;
  opacity?: number;
}

const TRANSFORMS: Record<LeafPosition, { scaleX: number; scaleY: number }> = {
  topLeft: { scaleX: 1, scaleY: 1 },
  topRight: { scaleX: -1, scaleY: 1 },
  bottomLeft: { scaleX: 1, scaleY: -1 },
  bottomRight: { scaleX: -1, scaleY: -1 },
};

const POSITION_STYLE: Record<LeafPosition, object> = {
  topLeft: { top: 0, left: 0 },
  topRight: { top: 0, right: 0 },
  bottomLeft: { bottom: 0, left: 0 },
  bottomRight: { bottom: 0, right: 0 },
};

export function LeafCorner({ position, size = 90, opacity = 0.32 }: Props) {
  const { palette } = useTheme();
  const { scaleX, scaleY } = TRANSFORMS[position];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.wrap,
        POSITION_STYLE[position],
        { width: size, height: size, opacity, transform: [{ scaleX }, { scaleY }] },
      ]}
    >
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Path
          d="M 4 4 C 14 18 22 32 30 50 C 36 64 42 78 50 92"
          stroke={palette.accent}
          strokeWidth={1.4}
          fill="none"
          strokeLinecap="round"
        />
        <Ellipse
          cx="14"
          cy="22"
          rx="7"
          ry="3"
          fill={palette.accent}
          transform="rotate(-35 14 22)"
        />
        <Ellipse
          cx="24"
          cy="20"
          rx="5.5"
          ry="2.6"
          fill={palette.accent}
          transform="rotate(55 24 20)"
        />
        <Ellipse
          cx="28"
          cy="44"
          rx="7"
          ry="3"
          fill={palette.accent}
          transform="rotate(-25 28 44)"
        />
        <Ellipse
          cx="40"
          cy="48"
          rx="5.5"
          ry="2.6"
          fill={palette.accent}
          transform="rotate(65 40 48)"
        />
        <Ellipse
          cx="38"
          cy="70"
          rx="7"
          ry="3"
          fill={palette.accent}
          transform="rotate(-18 38 70)"
        />
        <Ellipse
          cx="52"
          cy="76"
          rx="5.5"
          ry="2.6"
          fill={palette.accent}
          transform="rotate(75 52 76)"
        />
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'absolute',
  },
});

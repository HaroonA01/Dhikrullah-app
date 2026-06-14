import React from 'react';
import { StyleSheet, View, ViewStyle } from 'react-native';
import Svg, { Defs, FeDropShadow, Filter, Path } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import {
  MIHRAB_ASPECT,
  MIHRAB_PATH_D,
  MIHRAB_VIEWBOX,
} from './mihrabPath';

interface Props {
  width: number;
  children: React.ReactNode;
  style?: ViewStyle | ViewStyle[];
}

// Linear blend between two hex colors. Returns opaque hex string. Used to
// derive an opaque tile fill that visually matches the legacy translucent
// "glass" look while still blocking background effects (DNA, etc.) from
// bleeding through the tile.
function mixHex(bgHex: string, targetHex: string, alpha: number): string {
  const parse = (h: string): [number, number, number] | null => {
    const c = h.replace('#', '');
    if (c.length !== 6) return null;
    return [
      parseInt(c.slice(0, 2), 16),
      parseInt(c.slice(2, 4), 16),
      parseInt(c.slice(4, 6), 16),
    ];
  };
  const a = parse(bgHex);
  const b = parse(targetHex);
  if (!a || !b) return targetHex;
  const t = Math.max(0, Math.min(1, alpha));
  const lerp = (x: number, y: number) => Math.round(x * (1 - t) + y * t);
  const toHex = (n: number) =>
    Math.max(0, Math.min(255, n)).toString(16).padStart(2, '0');
  return `#${toHex(lerp(a[0], b[0]))}${toHex(lerp(a[1], b[1]))}${toHex(lerp(a[2], b[2]))}`;
}

export function MihrabTile({ width, children, style }: Props) {
  const { palette } = useTheme();
  const height = width * MIHRAB_ASPECT;

  // Source background colour to blend toward white.
  const baseHex =
    palette.bgMid ??
    (palette.scheme === 'dark' ? '#0A0A0A' : '#FFFFFF');

  // Original look was rgba(255,255,255,0.07) in dark mode (subtle lift) and
  // rgba(255,255,255,0.92) in light mode (near-white). Reproduce those by
  // mixing the background colour toward white at the same alpha — but the
  // resulting fill is fully opaque, so nothing behind shows through.
  const fill = mixHex(baseHex, '#FFFFFF', palette.scheme === 'dark' ? 0.07 : 0.92);

  return (
    <View style={[styles.wrap, { width, height }, style]}>
      <Svg
        width={width}
        height={height}
        viewBox={MIHRAB_VIEWBOX}
        style={StyleSheet.absoluteFill}
      >
        <Defs>
          <Filter
            id="mihrabShadow"
            x="-20%"
            y="-10%"
            width="140%"
            height="125%"
          >
            <FeDropShadow
              dx="0"
              dy="2"
              stdDeviation="3"
              floodColor="#000"
              floodOpacity="0.12"
            />
          </Filter>
        </Defs>
        <Path
          d={MIHRAB_PATH_D}
          fill={fill}
          stroke={palette.glassBorder}
          strokeWidth={1}
          strokeLinejoin="round"
          filter="url(#mihrabShadow)"
        />
      </Svg>
      <View style={styles.inner}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    position: 'relative',
  },
  inner: {
    ...StyleSheet.absoluteFillObject,
  },
});

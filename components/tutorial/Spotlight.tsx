import { useEffect } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Path, Rect as SvgRect } from 'react-native-svg';
import { useTheme } from '@/context/ThemeContext';
import type { Rect } from '@/components/CounterTutorial';
import {
  MIHRAB_PATH_D,
  MIHRAB_VIEWBOX_HEIGHT,
  MIHRAB_VIEWBOX_WIDTH,
} from '@/components/mihrabPath';

interface Props {
  rect: Rect;
  padding?: number;
  radius?: number;
  // 'rect' (default) cuts a rounded rectangle out of the dim. 'mihrab' uses
  // the mihrab silhouette so the tile step traces the shape instead of a box.
  shape?: 'rect' | 'mihrab';
}

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

function MihrabSpotlight({ rect, palette }: { rect: Rect; palette: ReturnType<typeof useTheme>['palette'] }) {
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, rect.x, rect.y, rect.width, rect.height]);

  // Pulse the outline via a native View opacity (UI thread) instead of animating
  // an SVG path prop per frame — the latter repaints the whole SVG each frame
  // and made concurrent animations (confetti, progress ring, pager) stutter.
  const strokeStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
  }));

  const sx = rect.width / MIHRAB_VIEWBOX_WIDTH;
  const sy = rect.height / MIHRAB_VIEWBOX_HEIGHT;
  const transform = `translate(${rect.x}, ${rect.y}) scale(${sx}, ${sy})`;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Static dim with the mihrab cut out — drawn once, never re-rendered. */}
      <Svg width={SCREEN_W} height={SCREEN_H}>
        <Defs>
          <Mask id="mihrabHole" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
            {/* White = dim, black = transparent (hole). */}
            <SvgRect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="white" />
            <Path d={MIHRAB_PATH_D} transform={transform} fill="black" />
          </Mask>
        </Defs>
        <SvgRect
          x="0"
          y="0"
          width={SCREEN_W}
          height={SCREEN_H}
          fill="black"
          opacity={0.45}
          mask="url(#mihrabHole)"
        />
      </Svg>
      {/* Pulsing outline — only this layer's opacity animates, natively. */}
      <Animated.View style={[StyleSheet.absoluteFill, strokeStyle]}>
        <Svg width={SCREEN_W} height={SCREEN_H}>
          <Path
            d={MIHRAB_PATH_D}
            transform={transform}
            fill="none"
            stroke={palette.accent}
            strokeWidth={2 / Math.min(sx, sy)}
            strokeLinejoin="round"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

export function Spotlight({ rect, padding = 8, radius = 14, shape = 'rect' }: Props) {
  const { palette } = useTheme();
  const pulse = useSharedValue(0);

  useEffect(() => {
    pulse.value = 0;
    pulse.value = withRepeat(
      withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.quad) }),
      -1,
      true,
    );
  }, [pulse, rect.x, rect.y, rect.width, rect.height]);

  const ringStyle = useAnimatedStyle(() => ({
    opacity: 0.55 + pulse.value * 0.45,
    transform: [{ scale: 1 + pulse.value * 0.04 }],
  }));

  if (shape === 'mihrab') {
    return <MihrabSpotlight rect={rect} palette={palette} />;
  }

  const left = rect.x - padding;
  const top = rect.y - padding;
  const width = rect.width + padding * 2;
  const height = rect.height + padding * 2;
  // Clamp the corner radius so it never exceeds half the smaller side (which
  // would otherwise render as a full pill / distort). Lets small targets like
  // the page dots round into a tidy pill that the ring traces exactly.
  const r = Math.min(radius, width / 2, height / 2);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {/* Rounded-rect hole cut from the dim via an SVG mask so the cleared area
          matches the rounded ring exactly — no square corners poking out. */}
      <Svg width={SCREEN_W} height={SCREEN_H}>
        <Defs>
          <Mask id="rectHole" x="0" y="0" width={SCREEN_W} height={SCREEN_H}>
            <SvgRect x="0" y="0" width={SCREEN_W} height={SCREEN_H} fill="white" />
            <SvgRect x={left} y={top} width={width} height={height} rx={r} ry={r} fill="black" />
          </Mask>
        </Defs>
        <SvgRect
          x="0"
          y="0"
          width={SCREEN_W}
          height={SCREEN_H}
          fill="black"
          opacity={0.45}
          mask="url(#rectHole)"
        />
      </Svg>
      {/* ring */}
      <Animated.View
        style={[
          styles.ring,
          {
            top,
            left,
            width,
            height,
            borderRadius: r,
            borderColor: palette.accent,
            shadowColor: palette.accent,
          },
          ringStyle,
        ]}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    position: 'absolute',
    borderWidth: 2,
    shadowOpacity: 0.5,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
});

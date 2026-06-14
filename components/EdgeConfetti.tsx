import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const PIECES_PER_SIDE = 35;
const DURATION = 3200;
const MAX_DELAY = 350;

type Side = 'top' | 'bottom' | 'left' | 'right';

interface PieceConfig {
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  rotateStart: number;
  rotateEnd: number;
  size: number;
  color: string;
  delay: number;
}

function rand(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

function pieceFromSide(side: Side, w: number, h: number, color: string, delay: number): PieceConfig {
  let startX = 0, startY = 0, endX = 0, endY = 0;
  if (side === 'top') {
    startX = rand(0, w);
    startY = -20;
    endX = startX + rand(-w * 0.35, w * 0.35);
    endY = h * rand(0.55, 1.05);
  } else if (side === 'bottom') {
    startX = rand(0, w);
    startY = h + 20;
    endX = startX + rand(-w * 0.35, w * 0.35);
    endY = -h * rand(0.05, 0.55);
  } else if (side === 'left') {
    startX = -20;
    startY = rand(0, h);
    endX = w * rand(0.55, 1.05);
    endY = startY + rand(-h * 0.35, h * 0.35);
  } else {
    startX = w + 20;
    startY = rand(0, h);
    endX = -w * rand(0.05, 0.55);
    endY = startY + rand(-h * 0.35, h * 0.35);
  }
  return {
    startX, startY, endX, endY,
    rotateStart: rand(0, 360),
    rotateEnd: rand(360, 1440) * (Math.random() < 0.5 ? -1 : 1),
    size: rand(6, 11),
    color,
    delay,
  };
}

function buildPieces(width: number, height: number, colors: string[]): PieceConfig[] {
  const pieces: PieceConfig[] = [];
  (['top', 'bottom', 'left', 'right'] as Side[]).forEach((side) => {
    for (let i = 0; i < PIECES_PER_SIDE; i++) {
      pieces.push(
        pieceFromSide(
          side,
          width,
          height,
          colors[Math.floor(Math.random() * colors.length)],
          rand(0, MAX_DELAY),
        ),
      );
    }
  });
  return pieces;
}

export function EdgeConfetti({
  triggerKey,
  colors,
}: {
  triggerKey: number;
  colors: string[];
}) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(
    () => buildPieces(width, height, colors),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [width, height, triggerKey],
  );
  const [active, setActive] = useState(false);
  const mountKeyRef = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey <= 0 || triggerKey === mountKeyRef.current) return;
    mountKeyRef.current = triggerKey;
    setActive(true);
    const t = setTimeout(() => setActive(false), DURATION + MAX_DELAY + 300);
    return () => clearTimeout(t);
  }, [triggerKey]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={`${triggerKey}-${i}`} cfg={p} triggerKey={triggerKey} />
      ))}
    </View>
  );
}

function Piece({ cfg, triggerKey }: { cfg: PieceConfig; triggerKey: number }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = 0;
    progress.value = withTiming(1, {
      duration: DURATION + cfg.delay,
      easing: Easing.out(Easing.quad),
    });
  }, [triggerKey, progress, cfg.delay]);

  const style = useAnimatedStyle(() => {
    const p = progress.value;
    const x = interpolate(p, [0, 1], [cfg.startX, cfg.endX]);
    const y = interpolate(p, [0, 1], [cfg.startY, cfg.endY]);
    const rot = interpolate(p, [0, 1], [cfg.rotateStart, cfg.rotateEnd]);
    let opacity = 0;
    if (p < 0.05) opacity = interpolate(p, [0, 0.05], [0, 1]);
    else if (p < 0.85) opacity = 1;
    else opacity = interpolate(p, [0.85, 1], [1, 0]);
    return {
      opacity,
      transform: [
        { translateX: x },
        { translateY: y },
        { rotate: `${rot}deg` },
      ],
    };
  });

  return (
    <Animated.View
      style={[
        styles.piece,
        {
          left: -cfg.size / 2,
          top: -cfg.size / 2,
          width: cfg.size,
          height: cfg.size,
          backgroundColor: cfg.color,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  piece: {
    position: 'absolute',
    borderRadius: 1.5,
  },
});

import { useEffect, useMemo, useRef, useState } from 'react';
import { Dimensions, StyleSheet, View } from 'react-native';
import Animated, {
  Easing,
  interpolate,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

const DEFAULT_COLORS = ['#2D6A4F', '#52B788', '#95D5B2', '#1B4332', '#40916C'];
const PIECE_COUNT = 40;
const DURATION = 2800;
const MAX_DELAY = 180;

interface PieceConfig {
  startX: number;
  peakX: number;
  endX: number;
  peakY: number;
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

function buildPieces(width: number, height: number, colors: string[]): PieceConfig[] {
  const centerX = width / 2;
  return Array.from({ length: PIECE_COUNT }, () => {
    const dir = Math.random() < 0.5 ? -1 : 1;
    const startX = centerX + rand(-40, 40);
    const peakX = startX + dir * rand(40, width * 0.45);
    const endX = peakX + dir * rand(10, 60);
    return {
      startX,
      peakX,
      endX,
      peakY: -rand(height * 0.55, height * 0.85),
      endY: -rand(height * 0.05, height * 0.25),
      rotateStart: rand(0, 360),
      rotateEnd: rand(360, 1080) * (dir as number),
      size: rand(5, 9),
      color: colors[Math.floor(Math.random() * colors.length)],
      delay: rand(0, MAX_DELAY),
    };
  });
}

export function Confetti({ triggerKey, colors = DEFAULT_COLORS }: { triggerKey: number; colors?: string[] }) {
  const { width, height } = Dimensions.get('window');
  const pieces = useMemo(() => buildPieces(width, height, colors), [width, height, colors]);
  const [active, setActive] = useState(false);
  const mountKeyRef = useRef(triggerKey);

  useEffect(() => {
    if (triggerKey <= 0 || triggerKey === mountKeyRef.current) return;
    setActive(true);
    const t = setTimeout(() => setActive(false), DURATION + MAX_DELAY + 200);
    return () => clearTimeout(t);
  }, [triggerKey]);

  if (!active) return null;

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {pieces.map((p, i) => (
        <Piece key={`${triggerKey}-${i}`} cfg={p} triggerKey={triggerKey} bottomY={height} />
      ))}
    </View>
  );
}

function Piece({
  cfg,
  triggerKey,
  bottomY,
}: {
  cfg: PieceConfig;
  triggerKey: number;
  bottomY: number;
}) {
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
    const x = interpolate(p, [0, 0.5, 1], [cfg.startX, cfg.peakX, cfg.endX]);
    const y = interpolate(p, [0, 0.5, 1], [0, cfg.peakY, cfg.endY]);
    const rot = interpolate(p, [0, 1], [cfg.rotateStart, cfg.rotateEnd]);
    let opacity = 0;
    if (p < 0.05) opacity = interpolate(p, [0, 0.05], [0, 1]);
    else if (p < 0.8) opacity = 1;
    else opacity = interpolate(p, [0.8, 1], [1, 0]);
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
          top: bottomY - 20,
          left: -cfg.size / 2,
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

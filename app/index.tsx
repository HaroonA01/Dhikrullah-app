import { useEffect, useRef, useState } from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import Animated, {
  Easing,
  interpolate,
  useSharedValue,
  useAnimatedStyle,
  useAnimatedProps,
  withTiming,
  withDelay,
  withSequence,
} from 'react-native-reanimated';
import Svg, { Defs, Mask, Rect as SvgRect, Text as SvgText } from 'react-native-svg';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassCard } from '@/components/GlassCard';
import { DustChar } from '@/components/DustChar';
import { MosqueSilhouette } from '@/components/MosqueSilhouette';
import { useRandomQuote } from '@/hooks/useRandomQuote';
import { useTheme } from '@/context/ThemeContext';
import { usePrefs } from '@/context/PrefsContext';
import { pendingDeepLink } from '@/lib/pendingDeepLink';
import { getMeta, setMeta } from '@/db/queries';
import { isKnownCategoryId } from '@/types';

// 3-day gating: the animated splash plays at most once every 72 hours. Cold
// starts inside the window skip straight to the destination.
const META_KEY_SPLASH_LAST_SHOWN_AT = 'splash_last_shown_at';
const SPLASH_REPLAY_MS = 72 * 60 * 60 * 1000;
type SplashDecision = 'pending' | 'play' | 'skip';

const APPEAR_DUR = 420;
const STAGGER = 84;
const DIS_STAGGER = 50;
const EN_START = 210;
const EN_N = 10;

const EN_DISAPPEAR_START = EN_START + (EN_N - 1) * STAGGER + APPEAR_DUR + 490;

const AR_START = 3500;
const AR_APPEAR_DUR = 700;
const AR_HOLD = 700;
const AR_DISAPPEAR_DUR = 560;

const NAVIGATE_AT_DEFAULT = 5500;
const NAVIGATE_AT_DEEPLINK = 1000;

const ENGLISH_CHARS = 'Dhikrullah'.split('');
const ARABIC_TEXT = 'ذكر الله';

// SVG canvas for the Arabic so the shimmer can be masked to the glyph shapes.
const AR_SVG_W = 320;
const AR_SVG_H = 96;
const AR_SVG_BASELINE = 66;
const AR_FONT_SIZE = 56;
const SHIMMER_BAND = 48;
const AnimatedSvgRect = Animated.createAnimatedComponent(SvgRect);

export default function Loading() {
  const { palette } = useTheme();
  const { hydrated, locationPromptShown } = usePrefs();
  const quote = useRandomQuote();
  const arabicOpacity = useSharedValue(0);
  const arabicTy = useSharedValue(14);
  const quoteOpacity = useSharedValue(0);
  const shimmer = useSharedValue(0);

  // Capture deep-link target synchronously if already set when splash mounts.
  const [initialTarget] = useState<string | null>(() => {
    const candidate = pendingDeepLink.peek();
    if (candidate && isKnownCategoryId(candidate)) return candidate;
    return null;
  });

  const navigatedRef = useRef(false);
  const [timerDone, setTimerDone] = useState(false);
  const [decision, setDecision] = useState<SplashDecision>('pending');

  // Resolve play-or-skip from meta. Splash plays if it's been at least
  // SPLASH_REPLAY_MS since the last time it was shown; otherwise skip.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await getMeta(META_KEY_SPLASH_LAST_SHOWN_AT);
        if (cancelled) return;
        const last = raw ? Number(raw) : NaN;
        const fresh = Number.isFinite(last) && Date.now() - last < SPLASH_REPLAY_MS;
        setDecision(fresh ? 'skip' : 'play');
      } catch {
        if (!cancelled) setDecision('play');
      }
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (decision === 'pending') return;
    if (decision === 'skip') {
      setTimerDone(true);
      return;
    }

    quoteOpacity.value = withDelay(800, withTiming(1, { duration: 400 }));

    arabicOpacity.value = withDelay(
      AR_START,
      withSequence(
        withTiming(1, { duration: AR_APPEAR_DUR }),
        withDelay(AR_HOLD, withTiming(0, { duration: AR_DISAPPEAR_DUR }))
      )
    );
    arabicTy.value = withDelay(
      AR_START,
      withSequence(
        withTiming(0, { duration: AR_APPEAR_DUR }),
        withDelay(AR_HOLD, withTiming(-20, { duration: AR_DISAPPEAR_DUR }))
      )
    );

    // Light sweeps diagonally across the Arabic once it has appeared.
    shimmer.value = withDelay(
      AR_START + AR_APPEAR_DUR,
      withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) })
    );

    let timer: ReturnType<typeof setTimeout>;
    const initialDelay = initialTarget ? NAVIGATE_AT_DEEPLINK : NAVIGATE_AT_DEFAULT;
    timer = setTimeout(() => setTimerDone(true), initialDelay);

    const unsubscribe = pendingDeepLink.subscribe(() => {
      if (navigatedRef.current) return;
      clearTimeout(timer);
      timer = setTimeout(() => setTimerDone(true), NAVIGATE_AT_DEEPLINK);
    });

    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [decision, initialTarget]); // eslint-disable-line react-hooks/exhaustive-deps

  // Navigate once both the splash timer has fired AND prefs are hydrated.
  useEffect(() => {
    if (navigatedRef.current) return;
    if (!timerDone) return;
    if (!hydrated) return;
    navigatedRef.current = true;
    pendingDeepLink.markSplashDone();
    // Stamp the timestamp only when the animation actually played; on skip
    // the previous stamp still gates the next window.
    if (decision === 'play') {
      setMeta(META_KEY_SPLASH_LAST_SHOWN_AT, String(Date.now())).catch(() => {});
    }
    const target = pendingDeepLink.consume();
    if (target && isKnownCategoryId(target)) {
      router.replace(`/counter/${target}`);
      return;
    }
    if (!locationPromptShown) {
      router.replace('/(onboarding)');
      return;
    }
    router.replace('/(tabs)');
  }, [timerDone, hydrated, locationPromptShown, decision]);

  const arabicStyle = useAnimatedStyle(() => ({
    opacity: arabicOpacity.value,
    transform: [{ translateY: arabicTy.value }],
  }));

  const quoteStyle = useAnimatedStyle(() => ({ opacity: quoteOpacity.value }));

  // Drives a bright vertical band that sweeps across the Arabic — masked to the
  // glyph shapes so the shimmer only lands on the letters, not the whole block.
  const shimmerRectProps = useAnimatedProps(() => ({
    x: interpolate(shimmer.value, [0, 1], [-SHIMMER_BAND, AR_SVG_W]),
    opacity: interpolate(shimmer.value, [0, 0.1, 0.9, 1], [0, 0.75, 0.75, 0]),
  }));

  // Android renders the Arabic as native <Text> (SVG text doesn't shape the
  // "الله" ligature correctly there). The shimmer is a sweeping bar clipped to
  // the word's bounds instead of a per-glyph mask.
  const shimmerBarStyle = useAnimatedStyle(() => ({
    opacity: interpolate(shimmer.value, [0, 0.1, 0.9, 1], [0, 0.7, 0.7, 0]),
    transform: [
      { translateX: interpolate(shimmer.value, [0, 1], [-90, 90]) },
      { rotate: '18deg' },
    ],
  }));

  // Tap anywhere during the animation to skip straight to the destination.
  const skip = () => {
    if (!navigatedRef.current) setTimerDone(true);
  };

  // On skip, keep the gradient so the brief moment before navigate doesn't
  // flash black, but suppress the title / silhouette / quote.
  if (decision === 'skip' || decision === 'pending') {
    return (
      <View style={styles.wrap}>
        <GradientBackground />
      </View>
    );
  }

  return (
    <View style={styles.wrap} onStartShouldSetResponder={() => true} onResponderRelease={skip}>
      <GradientBackground />

      <MosqueSilhouette style={styles.silhouetteAnchor} />

      <View style={styles.inner}>
        <View style={styles.titleArea}>
          <View style={[styles.titleRow, StyleSheet.absoluteFillObject]}>
            {ENGLISH_CHARS.map((char, i) => {
              const appearDelay = EN_START + i * STAGGER;
              const disappearStart = EN_DISAPPEAR_START + i * DIS_STAGGER;
              const holdDur = disappearStart - (appearDelay + APPEAR_DUR);
              return (
                <DustChar
                  key={i}
                  char={char}
                  index={i}
                  appearDelay={appearDelay}
                  holdDur={holdDur}
                  disappearStart={disappearStart}
                />
              );
            })}
          </View>

          {/* iOS: Arabic in SVG so the shimmer band is masked to the glyphs.
              Android: SVG text mis-shapes "الله", so use native <Text> with a
              clipped sweeping shimmer bar instead. */}
          <Animated.View style={[StyleSheet.absoluteFillObject, styles.arabicWrap, arabicStyle]}>
            {Platform.OS === 'ios' ? (
              <Svg width={AR_SVG_W} height={AR_SVG_H}>
                <Defs>
                  <Mask id="arGlyphs" x="0" y="0" width={AR_SVG_W} height={AR_SVG_H}>
                    <SvgText
                      x={AR_SVG_W / 2}
                      y={AR_SVG_BASELINE}
                      textAnchor="middle"
                      fontSize={AR_FONT_SIZE}
                      fontWeight="500"
                      fill="white"
                    >
                      {ARABIC_TEXT}
                    </SvgText>
                  </Mask>
                </Defs>
                <SvgText
                  x={AR_SVG_W / 2}
                  y={AR_SVG_BASELINE}
                  textAnchor="middle"
                  fontSize={AR_FONT_SIZE}
                  fontWeight="500"
                  fill={palette.accent}
                >
                  {ARABIC_TEXT}
                </SvgText>
                <AnimatedSvgRect
                  y={0}
                  width={SHIMMER_BAND}
                  height={AR_SVG_H}
                  fill="#FFFFFF"
                  mask="url(#arGlyphs)"
                  animatedProps={shimmerRectProps}
                />
              </Svg>
            ) : (
              <View style={styles.arabicNativeClip}>
                <Text style={[styles.arabicNative, { color: palette.accent }]}>
                  {ARABIC_TEXT}
                </Text>
                <Animated.View pointerEvents="none" style={[styles.shimmerBarNative, shimmerBarStyle]} />
              </View>
            )}
          </Animated.View>
        </View>

        <Animated.View style={[styles.quoteWrap, quoteStyle]}>
          <GlassCard style={styles.quoteCard}>
            <Text style={[styles.quoteText, { color: palette.textDark }]}>
              &ldquo;{quote.text}&rdquo;
            </Text>
            {quote.source ? (
              <Text style={[styles.quoteSource, { color: palette.textMid }]}>
                — {quote.source}
              </Text>
            ) : null}
          </GlassCard>
        </Animated.View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  silhouetteAnchor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
  },
  inner: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 80,
  },
  titleArea: {
    height: 88,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 18,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicWrap: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  arabicNativeClip: {
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  arabicNative: {
    fontSize: AR_FONT_SIZE,
    fontWeight: '500',
    textAlign: 'center',
    includeFontPadding: false,
  },
  shimmerBarNative: {
    position: 'absolute',
    top: -20,
    bottom: -20,
    width: 40,
    backgroundColor: 'rgba(255,255,255,0.55)',
  },
  quoteWrap: {
    width: '100%',
  },
  quoteCard: {
    paddingHorizontal: 24,
    paddingVertical: 20,
    width: '100%',
  },
  quoteText: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 26,
    opacity: 0.85,
    fontStyle: 'italic',
  },
  quoteSource: {
    fontSize: 12,
    marginTop: 10,
    textAlign: 'center',
  },
});

import { useEffect, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, { FadeIn, FadeOut } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Spotlight } from '@/components/tutorial/Spotlight';
import { GestureHint } from '@/components/tutorial/GestureHint';
import type { Palette } from '@/constants/themes';

export type HintKind = 'tap' | 'swipeH' | 'swipeV' | 'longPress' | null;
export interface Rect { x: number; y: number; width: number; height: number; }

export type CounterTutorialTargetId =
  | 'progressBar'
  | 'xOfY'
  | 'countDisplay'
  | 'tile'
  | 'plus'
  | 'minus'
  | 'heart'
  | 'arrowRight'
  | 'arrowLeft'
  | 'infoBtn'
  | 'audioBtn'
  | 'pager'
  | 'pageDots'
  | 'timerPill';

interface CounterTutorialStep {
  targetId: CounterTutorialTargetId;
  title: string;
  body: string;
  hint: HintKind;
  // Spotlight cutout shape — defaults to 'rect'. The tile uses 'mihrab' so the
  // cutout traces the mihrab silhouette instead of a rounded rectangle.
  shape?: 'rect' | 'mihrab';
  // When false, the highlighted element is NOT tappable during the step (pure
  // info step). Defaults to true. Info steps still show the spotlight + card.
  interactive?: boolean;
}

const STEPS: CounterTutorialStep[] = [
  {
    targetId: 'progressBar',
    title: 'Your progress',
    body: 'The bar shows how many dhikrs in this category you have completed overall.',
    hint: null,
    interactive: false,
  },
  {
    targetId: 'timerPill',
    title: 'Timer pill',
    body: 'Tap the pill to switch between time on this category, total time on dhikr today, and a hidden view. You can turn it off in Settings.',
    hint: 'tap',
  },
  {
    targetId: 'xOfY',
    title: 'Dhikr count',
    body: 'Shows which dhikr you are on and how many are in this category.',
    hint: null,
    interactive: false,
  },
  {
    targetId: 'countDisplay',
    title: 'Your count',
    body: 'The number shows how many times you have recited this dhikr out of your target.',
    hint: null,
    interactive: false,
  },
  {
    targetId: 'tile',
    title: 'Tap to count',
    body: 'Tap anywhere on the tile to count one recitation.',
    hint: 'tap',
    shape: 'mihrab',
  },
  {
    targetId: 'plus',
    title: 'Or use +',
    body: 'The + button at the bottom also counts — handy when your thumb is lower.',
    hint: 'tap',
  },
  {
    targetId: 'minus',
    title: 'Made a mistake?',
    body: 'The − button removes the last count.',
    hint: 'tap',
  },
  {
    targetId: 'heart',
    title: 'Save a favourite',
    body: 'Tap the heart to save this dhikr to your Favourites tab.',
    hint: 'tap',
  },
  {
    targetId: 'arrowRight',
    title: 'Next dhikr',
    body: 'Tap the right arrow to move to the next dhikr in the category.',
    hint: 'tap',
  },
  {
    targetId: 'arrowLeft',
    title: 'Previous dhikr',
    body: 'Go back to a previous dhikr at any time.',
    hint: 'tap',
  },
  {
    targetId: 'infoBtn',
    title: 'View source',
    body: 'Tap the corner button to see the reference and grading for this dhikr.',
    hint: 'tap',
  },
  {
    targetId: 'audioBtn',
    title: 'Listen along',
    body: 'Tap the speaker to hear the dhikr recited aloud (where available).',
    hint: 'tap',
  },
  {
    targetId: 'tile',
    title: 'Swipe to read',
    body: 'Swipe the text left or right to switch between Arabic, transliteration, and translation.',
    hint: 'swipeH',
    shape: 'mihrab',
  },
  {
    targetId: 'pageDots',
    title: 'When there is more to read',
    body: 'The dots mark each view. When one becomes an arrow (like now), there is more text below — swipe down to read it.',
    hint: null,
  },
];

interface Props {
  visible: boolean;
  onDismiss: () => void;
  rects: Partial<Record<CounterTutorialTargetId, Rect | null>>;
  palette: Palette;
  timerVisible?: boolean;
  // Reports the target of the currently-shown step (null when hidden) so the
  // host can react — e.g. force the page-dots chevron on for the dots step.
  onActiveTargetChange?: (id: CounterTutorialTargetId | null) => void;
  // Temporarily hide the overlay (card + blockers) without resetting progress —
  // used while the reference/info modal is open on the info step.
  paused?: boolean;
  // Increments each time the user swipes the pager; on a swipe step this hides
  // the gesture hint once the user has performed the swipe.
  swipeSignal?: number;
}

const { height: SCREEN_H } = Dimensions.get('window');

// Padding around the highlighted rect that stays interactive (matches the
// Spotlight cutout padding). Touches outside this hole are swallowed.
const TOUCH_PAD = 10;

export function CounterTutorial({ visible, onDismiss, rects, palette, timerVisible = true, onActiveTargetChange, paused = false, swipeSignal = 0 }: Props) {
  const [index, setIndex] = useState(0);
  const [hintGone, setHintGone] = useState(false);
  const insets = useSafeAreaInsets();

  // Filter out the timer-pill step when the pill is hidden via Settings.
  const steps = timerVisible
    ? STEPS
    : STEPS.filter((s) => s.targetId !== 'timerPill');

  useEffect(() => {
    if (visible) setIndex(0);
  }, [visible]);

  // Reset the "hint dismissed" flag whenever the step changes.
  useEffect(() => { setHintGone(false); }, [index]);

  // On a swipe step, hide the gesture hint once the user actually swipes.
  const swipeStepActive = steps[index]?.hint === 'swipeH' || steps[index]?.hint === 'swipeV';
  useEffect(() => {
    if (swipeSignal > 0 && swipeStepActive) setHintGone(true);
  }, [swipeSignal, swipeStepActive]);

  const activeTarget = visible ? steps[index]?.targetId ?? null : null;
  useEffect(() => {
    onActiveTargetChange?.(activeTarget);
  }, [activeTarget, onActiveTargetChange]);

  if (!visible || paused) return null;

  const step = steps[index];
  const rect = rects[step.targetId] ?? null;
  const isFirst = index === 0;
  const isLast = index === steps.length - 1;
  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';

  let anchor: 'top' | 'bottom' | 'centre' = 'bottom';
  if (!rect) anchor = 'centre';
  else if (rect.y + rect.height / 2 < SCREEN_H / 2) anchor = 'bottom';
  else anchor = 'top';

  const positionStyle =
    anchor === 'top'
      ? { top: insets.top + 24, left: 24, right: 24 }
      : anchor === 'bottom'
        ? { bottom: insets.bottom + 28, left: 24, right: 24 }
        : { top: SCREEN_H / 2 - 110, left: 24, right: 24 };

  const handleNext = () => {
    if (isLast) { onDismiss(); return; }
    setIndex(i => i + 1);
  };

  const handlePrev = () => {
    if (!isFirst) setIndex(i => i - 1);
  };

  // Touch-blocker panels around the highlighted rect. Only the hole passes
  // touches through (to the real element below) — so the user can interact with
  // just the element being explained. No rect yet → block the whole screen.
  const holeTop = rect ? rect.y - TOUCH_PAD : 0;
  const holeBottom = rect ? rect.y + rect.height + TOUCH_PAD : 0;
  const holeLeft = rect ? rect.x - TOUCH_PAD : 0;
  const holeRight = rect ? rect.x + rect.width + TOUCH_PAD : 0;
  const block = () => true;
  // Info-only steps (interactive === false) block the whole screen so the user
  // can't, e.g., tap the mihrab to count while the count number is highlighted.
  const allowInteraction = rect != null && step.interactive !== false;

  return (
    <View style={[StyleSheet.absoluteFill, styles.root]} pointerEvents="box-none">
      {/* When rect is available, Spotlight handles dimming with cutout. Fallback to full dim when rect not yet measured. */}
      {!rect && <View style={styles.dim} pointerEvents="none" />}
      {rect && <Spotlight rect={rect} padding={10} radius={14} shape={step.shape ?? 'rect'} />}
      {!!rect && !!step.hint && !hintGone && <GestureHint kind={step.hint} rect={rect} />}

      {/* Touch gating: swallow taps everywhere except the highlighted hole. */}
      {allowInteraction ? (
        <>
          <View style={[styles.blocker, { top: 0, left: 0, right: 0, height: Math.max(0, holeTop) }]} onStartShouldSetResponder={block} />
          <View style={[styles.blocker, { top: holeBottom, left: 0, right: 0, bottom: 0 }]} onStartShouldSetResponder={block} />
          <View style={[styles.blocker, { top: holeTop, height: Math.max(0, holeBottom - holeTop), left: 0, width: Math.max(0, holeLeft) }]} onStartShouldSetResponder={block} />
          <View style={[styles.blocker, { top: holeTop, height: Math.max(0, holeBottom - holeTop), left: holeRight, right: 0 }]} onStartShouldSetResponder={block} />
        </>
      ) : (
        <View style={StyleSheet.absoluteFill} onStartShouldSetResponder={block} />
      )}

      <Animated.View
        key={index}
        entering={FadeIn.duration(200)}
        exiting={FadeOut.duration(140)}
        style={[
          styles.card,
          positionStyle,
          {
            backgroundColor: cardBg,
            borderColor: palette.glassBorder,
            shadowColor: palette.accent,
          },
        ]}
        pointerEvents="box-none"
      >
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: palette.textDark }]}>{step.title}</Text>
          <Pressable
            onPress={onDismiss}
            hitSlop={10}
            style={({ pressed }) => [styles.skip, pressed && styles.pressed]}
          >
            <Text style={[styles.skipText, { color: palette.textMid }]}>Skip</Text>
          </Pressable>
        </View>
        <Text style={[styles.body, { color: palette.textMid }]}>{step.body}</Text>

        <View style={styles.row}>
          <Pressable
            onPress={handlePrev}
            disabled={isFirst}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: palette.accentLight, opacity: isFirst ? 0.3 : pressed ? 0.7 : 1 },
            ]}
          >
            <Text style={[styles.btnText, { color: palette.accent }]}>← Prev</Text>
          </Pressable>

          <Text style={[styles.counter, { color: palette.textDim }]}>
            {index + 1} / {steps.length}
          </Text>

          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [
              styles.btn,
              { backgroundColor: palette.accent },
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.nextText}>{isLast ? 'Done' : 'Next →'}</Text>
          </Pressable>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // Android: elevation forces this overlay above siblings that may have
    // implicit stacking (SVG-backed mihrab tile + Reanimated entering view).
    // iOS already obeys sibling order.
    zIndex: 100,
    elevation: 30,
  },
  dim: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.50)',
  },
  blocker: {
    position: 'absolute',
  },
  card: {
    position: 'absolute',
    borderRadius: 18,
    padding: 18,
    paddingTop: 14,
    borderWidth: 1,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    shadowOffset: { width: 0, height: 8 },
    elevation: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 6,
  },
  skip: {
    paddingVertical: 4,
    paddingHorizontal: 4,
  },
  skipText: {
    fontSize: 13,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.7,
  },
  title: {
    flex: 1,
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.2,
  },
  body: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  btn: {
    paddingVertical: 9,
    paddingHorizontal: 16,
    borderRadius: 12,
  },
  btnText: {
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  nextText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  counter: {
    flex: 1,
    fontSize: 12,
    textAlign: 'center',
    letterSpacing: 1,
  },
});

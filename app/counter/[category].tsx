import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppState,
  Dimensions,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, { useSharedValue, withSpring, withTiming, runOnJS } from 'react-native-reanimated';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  ChevronLeft,
  ChevronRight,
  Heart,
  Info,
  Minus,
  Plus,
} from 'lucide-react-native';
import { CategoryId } from '@/types';
import { useDhikrContent } from '@/context/CounterContext';
import { useCounter } from '@/hooks/useCounter';
import { useFavourites } from '@/context/FavouritesContext';
import { useTheme } from '@/context/ThemeContext';
import { resolveAudio } from '@/db/audioMap';
import {
  getCategoryTimeForDate,
  getDhikrTimeTotalForDate,
  getMeta,
  incrementDhikrTime,
  incrementTimeSecondsForDate,
  setMeta,
} from '@/db/queries';
import { META_KEY_LIFETIME_SECONDS, todayKey } from '@/lib/stats';
import { islamicDayKey } from '@/lib/islamicDay';
import { dismissCategoryNotifications } from '@/lib/notificationCleanup';
import { usePrefs } from '@/context/PrefsContext';
import { DhikrTimerPill } from '@/components/DhikrTimerPill';
import { DhikrPager } from '@/components/DhikrPager';
import { GradientBackground } from '@/components/GradientBackground';
import { MihrabTile } from '@/components/MihrabTile';
import { MIHRAB_ASPECT } from '@/components/mihrabPath';
import { ProgressBar } from '@/components/ProgressBar';
import { CountDisplay } from '@/components/CountDisplay';
import { ActionPill } from '@/components/ActionPill';
import { GhostArrow } from '@/components/GhostArrow';
import { InfoModal } from '@/components/InfoModal';
import { AudioButton } from '@/components/AudioButton';
import { DhikrCompletionRenderer } from '@/components/dhikrCompletion/DhikrCompletionRenderer';
import { CardProgressRing } from '@/components/CardProgressRing';
import {
  CounterTutorial,
  type CounterTutorialTargetId,
  type Rect,
} from '@/components/CounterTutorial';

const SCREEN_W = Dimensions.get('window').width;
const TILE_WIDTH = Math.min(SCREEN_W - 112, 300);
const TILE_HEIGHT = TILE_WIDTH * MIHRAB_ASPECT;

type TutorialRects = Partial<Record<CounterTutorialTargetId, Rect | null>>;

function measureRef(
  ref: React.RefObject<View | null>,
  id: CounterTutorialTargetId,
  setter: React.Dispatch<React.SetStateAction<TutorialRects>>,
) {
  // measure() uses pageX/pageY which are reliable on both iOS and Android.
  // measureInWindow on Android can be offset by the status bar height.
  ref.current?.measure((_x, _y, width, height, pageX, pageY) => {
    if (width > 0 && height > 0) {
      setter(prev => ({ ...prev, [id]: { x: pageX, y: pageY, width, height } }));
    }
  });
}

export default function CounterScreen() {
  const { category } = useLocalSearchParams<{ category: string }>();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const { palette } = useTheme();
  const categoryId = category as CategoryId;
  const { categories, dhikrsByCategory, states: allStates } = useDhikrContent();
  const meta = categories.find((c) => c.id === categoryId);
  const dhikrs = dhikrsByCategory[categoryId] ?? [];

  // Dismiss any delivered notif tagged for this category from the tray —
  // the user is on the page, so the reminder has served its purpose.
  useFocusEffect(
    useCallback(() => {
      if (categoryId) dismissCategoryNotifications(categoryId);
    }, [categoryId]),
  );

  const {
    hydrated,
    state,
    confettiTick,
    confettiVariant,
    incrementCurrent,
    decrementCurrent,
    nextDhikr,
    prevDhikr,
    beginTutorialSandbox,
    endTutorialSandbox,
    resetTutorialSandbox,
  } = useCounter(categoryId);
  const { toggle, isFavourite } = useFavourites();
  // Favourites toggled during the tutorial stay local (never persisted).
  const [tutorialFavs, setTutorialFavs] = useState<Set<string>>(new Set());
  // Bumped on each pager swipe — lets the tutorial hide its swipe hint.
  const [pagerSwipes, setPagerSwipes] = useState(0);
  const { location, prayerMethodId, madhab, timerVisible } = usePrefs();
  const [infoOpen, setInfoOpen] = useState(false);
  const [tileRowH, setTileRowH] = useState(0);
  // Uniform scale applied to the mihrab tile so it fits the available row
  // height between the timer pill and the action buttons. 1 on tall screens
  // (iPhone) → unchanged; shrinks on short Android phones. Floored so the tile
  // never becomes unreadably small.
  const [tileScale, setTileScale] = useState(1);
  const [tutorialVisible, setTutorialVisible] = useState(false);
  const [tutorialTarget, setTutorialTarget] = useState<CounterTutorialTargetId | null>(null);
  const [tutorialRects, setTutorialRects] = useState<TutorialRects>({});
  // Timer pill state: persisted seconds for the current category + today total
  // (today = Islamic day fajr→fajr; civil 00:00–23:59 if no location). The
  // live tick handle (`viewerStartedAt`) flips to null when blurred so the
  // pill freezes the readout while not visible.
  const [persistedSessionSec, setPersistedSessionSec] = useState(0);
  const [persistedTodaySec, setPersistedTodaySec] = useState(0);
  const [viewerStartedAt, setViewerStartedAt] = useState<number | null>(null);
  const activeDhikrIdRef = useRef<string | null>(null);
  const startMsRef = useRef<number>(Date.now());
  // True while the tutorial is running — gates time crediting + guards the
  // one-shot sandbox begin/end.
  const tutorialActiveRef = useRef(false);
  // Mirrors `categoryComplete` so flushTimers (stable callback) can gate the
  // dhikir-credit + session/today bumps without being re-created on every
  // toggle. Synced via an effect declared *after* the completion-flush effect
  // so the final flush still credits the last few seconds before freezing.
  const categoryCompleteRef = useRef(false);
  // Tile is rendered in an absolute floater so the completion burst can render
  // in front of other UI without occluding the main tile. The placeholder
  // inside tileRow preserves flex layout; measureInWindow gives screen coords.
  const tilePlaceholderRef = useRef<View>(null);
  const rootRef = useRef<View>(null);
  const [tileFloaterPos, setTileFloaterPos] = useState<{ x: number; y: number } | null>(null);
  // Measure the placeholder relative to the root View (not the window). The
  // floater is an absolute child of root, so its top/left live in root's
  // coordinate space. measureInWindow returns window coords, which on Android
  // (edge-to-edge + translucent status bar) are offset from root by the status
  // bar height — shifting the floater up over the timer pill. measureLayout
  // against root removes that offset and is correct on both platforms.
  const measureTileFloater = useCallback(() => {
    const node = rootRef.current;
    const ph = tilePlaceholderRef.current;
    if (!node || !ph) return;
    ph.measureLayout(
      node,
      (x, y) => {
        if (Number.isFinite(x) && Number.isFinite(y)) {
          setTileFloaterPos({ x, y });
        }
      },
      () => {},
    );
  }, []);

  const refs: Record<CounterTutorialTargetId, React.RefObject<View | null>> = {
    progressBar: useRef<View>(null),
    xOfY: useRef<View>(null),
    countDisplay: useRef<View>(null),
    tile: useRef<View>(null),
    plus: useRef<View>(null),
    minus: useRef<View>(null),
    heart: useRef<View>(null),
    arrowRight: useRef<View>(null),
    arrowLeft: useRef<View>(null),
    infoBtn: useRef<View>(null),
    audioBtn: useRef<View>(null),
    pager: useRef<View>(null),
    pageDots: useRef<View>(null),
    timerPill: useRef<View>(null),
  };

  const directionSV = useSharedValue(1); // 1 = forward (next), -1 = backward (prev)
  const SCREEN_W = Dimensions.get('window').width;

  const handleNext = useCallback(() => {
    directionSV.value = 1;
    nextDhikr();
  }, [nextDhikr]);

  const handlePrev = useCallback(() => {
    directionSV.value = -1;
    prevDhikr();
  }, [prevDhikr]);

  function tileEntering() {
    'worklet';
    return {
      initialValues: { transform: [{ translateX: directionSV.value * SCREEN_W }] },
      animations: { transform: [{ translateX: withSpring(0, { damping: 50, stiffness: 160 }) }] },
    };
  }

  function tileExiting() {
    'worklet';
    return {
      initialValues: { transform: [{ translateX: 0 }] },
      animations: { transform: [{ translateX: withTiming(-directionSV.value * SCREEN_W, { duration: 280 }) }] },
    };
  }

  const measureAll = useCallback(() => {
    const ids = Object.keys(refs) as CounterTutorialTargetId[];
    ids.forEach(id => measureRef(refs[id], id, setTutorialRects));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Re-measure when tutorial becomes visible — animations are guaranteed done by then.
  useEffect(() => {
    if (tutorialVisible) measureAll();
  }, [tutorialVisible, measureAll]);

  // Unified flush: credits elapsed seconds since startMsRef to (a) civil-day
  // dailyStats + lifetime (existing behaviour) and (b) the active dhikr's
  // Islamic-day time bucket (new behaviour, used by the timer pill).
  const flushTimers = useCallback(async () => {
    // No time is credited during the tutorial — keep the clock anchored to now.
    if (tutorialActiveRef.current) {
      startMsRef.current = Date.now();
      setViewerStartedAt((cur) => (cur == null ? cur : startMsRef.current));
      return;
    }
    const seconds = Math.round((Date.now() - startMsRef.current) / 1000);
    startMsRef.current = Date.now();
    // Keep the pill's live tick anchored to the same instant — otherwise the
    // delta since the (stale) viewerStartedAt double-counts seconds already
    // credited in this flush. Skip when blurred (viewerStartedAt == null).
    setViewerStartedAt((cur) => (cur == null ? cur : startMsRef.current));
    if (seconds <= 0) return;
    const dhikrIdForCredit = activeDhikrIdRef.current;
    // Snapshot synchronously: if the category is complete, the dhikir/session/
    // today buckets must stop accumulating even though the screen is still
    // focused. Civil-day app-time stats still tick (they measure app usage).
    const skipDhikrCredit = categoryCompleteRef.current;
    try {
      await incrementTimeSecondsForDate(todayKey(), seconds);
      const lifetime = Number(
        (await getMeta(META_KEY_LIFETIME_SECONDS)) ?? '0',
      );
      await setMeta(META_KEY_LIFETIME_SECONDS, String(lifetime + seconds));
      if (dhikrIdForCredit && !skipDhikrCredit) {
        const key = islamicDayKey(new Date(), location, prayerMethodId, madhab);
        await incrementDhikrTime(key, dhikrIdForCredit, seconds);
        setPersistedTodaySec((t) => t + seconds);
        // Session timer is per-category. The credited dhikir is always one of
        // this category's dhikirs (the screen mounts per category), so every
        // credit contributes to the session total.
        setPersistedSessionSec((s) => s + seconds);
      }
    } catch {}
  }, [location, prayerMethodId, madhab]);

  useFocusEffect(
    useCallback(() => {
      startMsRef.current = Date.now();
      setViewerStartedAt(startMsRef.current);
      const sub = AppState.addEventListener('change', (next) => {
        if (next === 'active') {
          startMsRef.current = Date.now();
          setViewerStartedAt(startMsRef.current);
        } else {
          flushTimers();
          setViewerStartedAt(null);
        }
      });

      const showTutorial = async () => {
        const done = await getMeta('counter_tutorial_done');
        const shouldShow = !done;
        // Snapshot + enter sandbox once, before the user can touch anything.
        if (shouldShow && !tutorialActiveRef.current) {
          tutorialActiveRef.current = true;
          beginTutorialSandbox();
          setTutorialVisible(true);
        }
      };
      showTutorial();

      return () => {
        flushTimers();
        setViewerStartedAt(null);
        sub.remove();
      };
    }, [flushTimers]),
  );

  // Pre-compute current dhikr id BEFORE the early-return guards so React's
  // rules-of-hooks hold for the effect below.
  const activeDhikrIdCandidate = state?.currentDhikrIndex != null
    ? dhikrs[state.currentDhikrIndex]?.id ?? null
    : null;

  // Whether the *current* dhikir has reached its target. Hoisted above the
  // early-return guards so the effect below stays in stable hook order.
  const currentDhikrEarly = state?.currentDhikrIndex != null
    ? dhikrs[state.currentDhikrIndex]
    : undefined;
  const reachedTargetEarly = !!currentDhikrEarly
    && (state?.counts?.[currentDhikrEarly.id] ?? 0) >= currentDhikrEarly.target;

  // Auto-advance after completion is always forward — pre-set the direction
  // shared value the moment the current dhikir hits its target, so the new
  // tile that mounts ~2.25 s later enters from the next-direction side. Without
  // this, a prior prev press would leave `directionSV` at -1 and the
  // auto-advanced tile would slide the wrong way.
  useEffect(() => {
    if (reachedTargetEarly) directionSV.value = 1;
  }, [reachedTargetEarly, directionSV]);

  // Stable list of dhikir IDs for this category — used to sum the session
  // timer (per-category) from the per-dhikir time log.
  const dhikrIdsKey = useMemo(
    () => dhikrs.map((d) => d.id).join('|'),
    [dhikrs],
  );

  // On dhikr change: flush time credited to the previous dhikr, then reload
  // the per-category session sum + the Islamic-day total for the pill.
  useEffect(() => {
    if (!activeDhikrIdCandidate) return;
    let cancelled = false;
    (async () => {
      await flushTimers();
      if (cancelled) return;
      activeDhikrIdRef.current = activeDhikrIdCandidate;
      try {
        const key = islamicDayKey(new Date(), location, prayerMethodId, madhab);
        const ids = dhikrIdsKey ? dhikrIdsKey.split('|') : [];
        const [s, t] = await Promise.all([
          getCategoryTimeForDate(key, ids),
          getDhikrTimeTotalForDate(key),
        ]);
        if (cancelled) return;
        setPersistedSessionSec(s);
        setPersistedTodaySec(t);
      } catch {}
    })();
    return () => { cancelled = true; };
  }, [activeDhikrIdCandidate, dhikrIdsKey, flushTimers, location, prayerMethodId, madhab]);

  const handleTutorialDismiss = useCallback(async () => {
    setTutorialVisible(false);
    tutorialActiveRef.current = false;
    endTutorialSandbox();            // restore counts + jump to first dhikr
    setTutorialFavs(new Set());      // discard tutorial-only favourites
    startMsRef.current = Date.now(); // fresh timing after the tutorial
    await setMeta('counter_tutorial_done', '1');
  }, [endTutorialSandbox]);

  const { percent, completed } = useMemo(() => {
    if (!dhikrs.length) return { percent: 0, completed: 0 };
    let totalTarget = 0;
    let totalCount = 0;
    let done = 0;
    for (const d of dhikrs) {
      totalTarget += d.target;
      const c = state?.counts[d.id] ?? 0;
      totalCount += Math.min(c, d.target);
      if (c >= d.target) done += 1;
    }
    return {
      percent: totalTarget ? (totalCount / totalTarget) * 100 : 0,
      completed: done,
    };
  }, [dhikrs, state]);

  const categoryComplete = dhikrs.length > 0 && completed === dhikrs.length;

  const allCategoriesComplete = useMemo(() => {
    if (!categories.length) return false;
    return categories.every((c) => {
      const list = dhikrsByCategory[c.id] ?? [];
      if (list.length === 0) return false;
      const cs = allStates[c.id]?.counts ?? {};
      return list.every((d) => (cs[d.id] ?? 0) >= d.target);
    });
  }, [categories, dhikrsByCategory, allStates]);

  // Credit the final seconds the moment the category becomes complete, so the
  // persisted total is up-to-date before the pill freezes.
  useEffect(() => {
    if (categoryComplete) flushTimers();
  }, [categoryComplete, flushTimers]);

  // If the user completes the whole category during the tutorial, don't show the
  // completion animation or navigate away — just loop back to the first dhikr
  // and keep the tutorial going.
  useEffect(() => {
    if (tutorialVisible && categoryComplete) {
      resetTutorialSandbox();
    }
  }, [tutorialVisible, categoryComplete, resetTutorialSandbox]);

  // Mirror categoryComplete into the ref AFTER the final flush effect has run
  // (effects run in declaration order). The sync call inside the flush above
  // captures the *previous* ref value, so the last delta still credits before
  // the screen freezes. Subsequent flushes (blur, dhikir change) see ref=true
  // and skip the dhikir/session/today bumps entirely.
  useEffect(() => {
    categoryCompleteRef.current = categoryComplete;
  }, [categoryComplete]);

  if (!hydrated) {
    return (
      <View style={styles.fallback}>
        <GradientBackground />
        <Text style={{ color: palette.textMid }}>Loading…</Text>
      </View>
    );
  }

  if (!meta) {
    return (
      <View style={styles.fallback}>
        <GradientBackground />
        <Text style={{ color: palette.textMid }}>
          Unknown category: {String(category)}
        </Text>
      </View>
    );
  }

  // Scaled tile dimensions. All slot offsets below are percentages of these, so
  // the whole tile (text, count, corner buttons, arrows) scales uniformly.
  const tileW = TILE_WIDTH * tileScale;
  const tileH = TILE_HEIGHT * tileScale;

  const currentDhikr = dhikrs[state.currentDhikrIndex];
  const count = currentDhikr ? state.counts[currentDhikr.id] ?? 0 : 0;
  const reachedTarget = !!currentDhikr && count >= currentDhikr.target;
  const favourited = currentDhikr
    ? (tutorialVisible ? tutorialFavs.has(currentDhikr.id) : isFavourite(currentDhikr.id))
    : false;

  // Heart: during the tutorial toggle a local set only (no persistence).
  const handleHeart = useCallback(() => {
    if (!currentDhikr) return;
    if (tutorialVisible) {
      setTutorialFavs((prev) => {
        const next = new Set(prev);
        if (next.has(currentDhikr.id)) next.delete(currentDhikr.id);
        else next.add(currentDhikr.id);
        return next;
      });
    } else {
      toggle(currentDhikr.id);
    }
  }, [currentDhikr, tutorialVisible, toggle]);
  const dhikrPercent = currentDhikr
    ? (Math.min(count, currentDhikr.target) / currentDhikr.target) * 100
    : 0;

  const tapGesture = useMemo(
    () => Gesture.Tap()
      .maxDeltaX(10)
      .maxDeltaY(10)
      .onEnd(() => { runOnJS(incrementCurrent)(); }),
    [incrementCurrent],
  );

  return (
    <View ref={rootRef} style={styles.root}>
      <Stack.Screen options={{ headerShown: false }} />
      <GradientBackground />

      <View style={[styles.header, { paddingTop: insets.top + 10 }]}>
        <Pressable
          onPress={() => {
            if (router.canGoBack()) router.back();
            else router.replace('/(tabs)');
          }}
          style={styles.headerBtn}
          hitSlop={12}
        >
          <ChevronLeft size={24} color={palette.accent} strokeWidth={2} />
        </Pressable>
        <View style={styles.headerCenter}>
          <Text style={[styles.headerBrand, { color: palette.accent }]}>
            DHIKRULLAH
          </Text>
          <Text style={[styles.headerLabel, { color: palette.textDark }]}>
            {meta.label}
          </Text>
          <View
            ref={refs.xOfY}
            collapsable={false}
          >
            <Text style={[styles.headerSub, { color: palette.textMid }]}>
              {state.currentDhikrIndex + 1} of {dhikrs.length}
            </Text>
          </View>
        </View>
        <View style={styles.headerBtn} />
      </View>

      <ProgressBar
        percent={percent}
        completed={completed}
        total={dhikrs.length}
        trackRef={refs.progressBar}
      />

      {timerVisible && (
        <View style={styles.timerPillSlot}>
          <DhikrTimerPill
            sessionPersistedSeconds={persistedSessionSec}
            todayPersistedSeconds={persistedTodaySec}
            startedAt={viewerStartedAt}
            categoryName={meta.label}
            pillRef={refs.timerPill}
            sessionFrozen={categoryComplete}
            todayFrozen={allCategoriesComplete}
          />
        </View>
      )}

      <View
        style={[styles.content, { paddingBottom: insets.bottom + 16 }]}
      >
        {currentDhikr ? (
          <View
            style={styles.tileRow}
            onLayout={e => {
              const h = e.nativeEvent.layout.height;
              setTileRowH(h);
              // Shrink the tile to fit the row (less an 8px breathing margin) on
              // short screens; never enlarge past full size, never below 0.6.
              setTileScale(Math.min(1, Math.max(0.6, (h - 8) / TILE_HEIGHT)));
              measureTileFloater();
              // Wait for entrance animation (260ms) + layout pass to settle before measuring.
              setTimeout(measureAll, 350);
            }}
          >
            {/* Placeholder reserves tile space in flex layout. Real interactive
                tile is rendered in <tileFloater> below. */}
            <View
              ref={tilePlaceholderRef}
              onLayout={measureTileFloater}
              style={[styles.tileWrap, { width: tileW, height: tileH }]}
              pointerEvents="none"
            />

            <View
              ref={refs.arrowLeft}
              collapsable={false}
              style={[styles.arrowLeft, tileRowH > 0 && {
                top: (tileRowH - tileH) / 2 + tileH * 0.60 - 32,
              }]}
              pointerEvents="box-none"
            >
              <GhostArrow Icon={ChevronLeft} onPress={handlePrev} />
            </View>
            <View
              ref={refs.arrowRight}
              collapsable={false}
              style={[styles.arrowRight, tileRowH > 0 && {
                top: (tileRowH - tileH) / 2 + tileH * 0.60 - 32,
              }]}
              pointerEvents="box-none"
            >
              <GhostArrow Icon={ChevronRight} onPress={handleNext} />
            </View>
          </View>
        ) : (
          <Text style={{ color: palette.textMid, textAlign: 'center' }}>
            No dhikrs in this category.
          </Text>
        )}

        <View style={styles.actions}>
          <View ref={refs.minus} collapsable={false}>
            <ActionPill
              Icon={Minus}
              onPress={decrementCurrent}
              disabled={count === 0}
            />
          </View>
          <View ref={refs.heart} collapsable={false}>
            <ActionPill
              Icon={Heart}
              onPress={handleHeart}
              disabled={!currentDhikr}
              active={favourited}
              iconFill
            />
          </View>
          <View ref={refs.plus} collapsable={false}>
            <ActionPill Icon={Plus} onPress={incrementCurrent} />
          </View>
        </View>
      </View>

      {currentDhikr && tileFloaterPos && (
        <View
          pointerEvents="box-none"
          style={[
            styles.tileFloater,
            {
              left: tileFloaterPos.x,
              top: tileFloaterPos.y,
              width: tileW,
              height: tileH,
            },
          ]}
        >
          <Animated.View
            key={currentDhikr.id}
            entering={tileEntering}
            exiting={tileExiting}
            style={[styles.tileWrap, { width: tileW, height: tileH }]}
          >
            <GestureDetector gesture={tapGesture}>
              <View
                ref={refs.tile}
                collapsable={false}
                style={{ width: tileW, height: tileH }}
              >
                <MihrabTile width={tileW}>
                  <View style={[styles.countSlot, { top: tileH * 0.07 }]}>
                    <View ref={refs.countDisplay} collapsable={false}>
                      <CountDisplay
                        count={count}
                        target={currentDhikr.target}
                        reachedTarget={reachedTarget}
                      />
                    </View>
                  </View>
                  <View
                    style={[styles.pagerSlot, {
                      top: tileH * 0.28,
                      left: tileW * 0.035,
                      right: tileW * 0.035,
                      bottom: tileH * 0.08,
                    }]}
                  >
                    <View ref={refs.pager} collapsable={false} style={{ flex: 1 }}>
                      <DhikrPager
                        dhikr={currentDhikr}
                        dotsRef={refs.pageDots}
                        forceChevron={tutorialTarget === 'pageDots'}
                        onSwipe={() => setPagerSwipes((n) => n + 1)}
                      />
                    </View>
                  </View>
                </MihrabTile>
              </View>
            </GestureDetector>
            <CardProgressRing
              percent={dhikrPercent}
              width={tileW}
              height={tileH}
              stroke={4}
            />
            <Pressable
              ref={refs.infoBtn}
              onPress={() => setInfoOpen(true)}
              style={[
                styles.cornerLeft,
                { top: tileH * 0.24, backgroundColor: palette.glassBg },
              ]}
              hitSlop={10}
            >
              <View
                pointerEvents="none"
                style={[
                  StyleSheet.absoluteFill,
                  styles.cornerLeftBorder,
                  { borderColor: palette.glassBorder },
                ]}
              />
              <Info size={18} color={palette.accent} strokeWidth={2} />
            </Pressable>
            <View ref={refs.audioBtn} collapsable={false} style={[styles.cornerRight, { top: tileH * 0.24 }]}>
              <AudioButton
                source={resolveAudio(currentDhikr.audioFilename)}
                dhikrId={currentDhikr.id}
              />
            </View>
          </Animated.View>
        </View>
      )}

      {/* Confetti renders above the mihrab tile floater (zIndex 100) so the
          completion burst is visible in front of the tile, not behind it. */}
      <View pointerEvents="none" style={styles.confettiLayer}>
        <DhikrCompletionRenderer
          triggerKey={confettiTick}
          variantId={confettiVariant}
        />
      </View>

      <InfoModal
        visible={infoOpen}
        description={currentDhikr?.description ?? null}
        reference={currentDhikr?.reference ?? null}
        grade={currentDhikr?.grade ?? null}
        onClose={() => setInfoOpen(false)}
      />

      <CounterTutorial
        visible={tutorialVisible}
        onDismiss={handleTutorialDismiss}
        rects={tutorialRects}
        palette={palette}
        timerVisible={timerVisible}
        onActiveTargetChange={setTutorialTarget}
        paused={infoOpen}
        swipeSignal={pagerSwipes}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  fallback: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    marginBottom: 10,
  },
  headerBtn: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerBrand: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 2,
    marginBottom: 2,
  },
  headerLabel: {
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  headerSub: {
    fontSize: 11,
    marginTop: 2,
    letterSpacing: 0.5,
  },
  timerPillSlot: {
    alignItems: 'center',
    marginTop: -8,
    marginBottom: -2,
  },
  content: {
    flex: 1,
    paddingHorizontal: 0,
    paddingTop: 8,
    justifyContent: 'space-between',
  },
  tileRow: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  arrowLeft: {
    position: 'absolute',
    left: 12,
    top: 0,
  },
  arrowRight: {
    position: 'absolute',
    right: 12,
    top: 0,
  },
  // width/height applied inline (scaled per-screen).
  tileWrap: {
    position: 'relative',
  },
  tileFloater: {
    position: 'absolute',
    zIndex: 100,
  },
  confettiLayer: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 150,
  },
  // top applied inline (tileH * 0.07).
  countSlot: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  // top applied inline (tileH * 0.24).
  cornerLeft: {
    position: 'absolute',
    left: 24,
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },
  cornerLeftBorder: {
    borderWidth: 1,
    borderRadius: 17,
  },
  // top applied inline (tileH * 0.24).
  cornerRight: {
    position: 'absolute',
    right: 24,
    zIndex: 2,
  },
  // top / left / right / bottom applied inline (scaled). Inset matches the
  // mihrab body wall (~1.87% of width per side from mihrabPath.ts) plus a small
  // safety margin for italic glyph overhang.
  pagerSlot: {
    position: 'absolute',
    justifyContent: 'center',
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 24,
    marginTop: 12,
    paddingHorizontal: 16,
  },
});

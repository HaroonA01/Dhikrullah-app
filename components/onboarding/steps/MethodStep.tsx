import React, { useCallback, useMemo, useRef, useState } from 'react';
import { ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { useTheme } from '@/context/ThemeContext';
import { useOnboarding } from '@/context/OnboardingContext';
import { usePrefs } from '@/context/PrefsContext';
import { GlassCard } from '@/components/GlassCard';
import { PageDots } from '@/components/PageDots';
import { StepShell } from '@/components/onboarding/StepShell';
import { PrimaryButton } from '@/components/onboarding/PrimaryButton';
import { FontSwipeHint } from '@/components/onboarding/FontSwipeHint';
import {
  METHODS,
  computePrayerTimes,
  type MethodId,
  type PrayerMethodEntry,
} from '@/lib/prayer';
import type { CategoryId } from '@/types';

const PRAYER_ROWS: { id: CategoryId; label: string }[] = [
  { id: 'fajr', label: 'Fajr' },
  { id: 'dhuhr', label: 'Dhuhr' },
  { id: 'asr', label: 'Asr' },
  { id: 'maghrib', label: 'Maghrib' },
  { id: 'isha', label: 'Isha' },
];

function isLondonLabel(label: string | undefined): boolean {
  if (!label) return false;
  return label.includes('London') && label.includes('United Kingdom');
}

function formatTime(d: Date | undefined): string {
  if (!d) return '—';
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function MethodCard({
  method,
  times,
}: {
  method: PrayerMethodEntry;
  times: Map<CategoryId, Date> | null;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.cardWrap}>
      <GlassCard style={styles.card}>
        <Text style={[styles.methodLabel, { color: palette.textDark }]} numberOfLines={2}>
          {method.label}
        </Text>
        <Text style={[styles.methodDesc, { color: palette.textMid }]}>
          {method.description}
        </Text>
        <View style={[styles.divider, { backgroundColor: palette.glassBorder }]} />
        <View style={styles.timesBlock}>
          {times == null ? (
            <Text style={[styles.fallback, { color: palette.textMid }]}>
              Prayer times unavailable.
            </Text>
          ) : (
            PRAYER_ROWS.map((row) => {
              const t = times.get(row.id);
              return (
                <View key={row.id} style={styles.timeRow}>
                  <Text style={[styles.timeLabel, { color: palette.textMid }]}>{row.label}</Text>
                  <Text style={[styles.timeValue, { color: palette.textDark }]}>{formatTime(t)}</Text>
                </View>
              );
            })
          )}
        </View>
      </GlassCard>
    </View>
  );
}

export function MethodStep() {
  const { palette } = useTheme();
  const { goNext } = useOnboarding();
  const { location, prayerMethodId, setPrayerMethodId, madhab, setMadhab } = usePrefs();

  const orderedMethods = useMemo<PrayerMethodEntry[]>(() => {
    const london = isLondonLabel(location?.label);
    if (london) return METHODS; // ELM already first
    const elm = METHODS.find((m) => m.id === 'ELM');
    const rest = METHODS.filter((m) => m.id !== 'ELM');
    return elm ? [...rest, elm] : rest;
  }, [location]);

  const initialPage = useMemo(() => {
    const idx = orderedMethods.findIndex((m) => m.id === prayerMethodId);
    return idx < 0 ? 0 : idx;
  }, [orderedMethods, prayerMethodId]);

  const activePage = useRef(initialPage);
  const [page, setPage] = useState(initialPage);
  const [hasSwiped, setHasSwiped] = useState(false);

  // Vertically centre the swipe hint in the dead space between the bottom of the
  // Hanafi box and the page dots. Both edges are dynamic (vary with screen
  // height), so measure them relative to the area wrapper and place the hint at
  // the midpoint.
  const areaRef = useRef<View>(null);
  const madhabRef = useRef<View>(null);
  const dotsRef = useRef<View>(null);
  const [hintTop, setHintTop] = useState<number | null>(null);
  const HINT_H = 24;
  const measureHint = useCallback(() => {
    const area = areaRef.current;
    const madhab = madhabRef.current;
    const dots = dotsRef.current;
    if (!area || !madhab || !dots) return;
    madhab.measureLayout(
      area,
      (_x, mTop, _w, mH) => {
        dots.measureLayout(
          area,
          (_x2, dTop) => {
            const center = (mTop + mH + dTop) / 2;
            setHintTop(center - HINT_H / 2);
          },
          () => {},
        );
      },
      () => {},
    );
  }, []);

  const timesByMethod = useMemo(() => {
    if (!location) return null;
    const out = new Map<MethodId, Map<CategoryId, Date>>();
    const now = new Date();
    for (const m of orderedMethods) {
      try {
        const t = computePrayerTimes({ lat: location.lat, lon: location.lon }, now, m.id, madhab);
        out.set(m.id, t);
      } catch {
        // skip — fall through to fallback rendering in card
      }
    }
    return out;
  }, [location, orderedMethods, madhab]);

  const handlePageSelected = (pos: number) => {
    if (pos === activePage.current) return;
    activePage.current = pos;
    setPage(pos);
    setHasSwiped(true);
    const next = orderedMethods[pos];
    if (next) {
      setPrayerMethodId(next.id);
      Haptics.selectionAsync().catch(() => {});
    }
  };

  return (
    <StepShell
      footer={<PrimaryButton label="Continue" onPress={goNext} />}
    >
      <View style={styles.heading}>
        <Text style={[styles.title, { color: palette.textDark }]}>Prayer method</Text>
        <Text style={[styles.subtitle, { color: palette.textMid }]}>
          Swipe to compare. Times update for {location?.label ?? 'your location'}.
        </Text>
      </View>
      <View ref={areaRef} style={styles.area} onLayout={measureHint}>
        <View style={styles.pagerWrap}>
          <PagerView
            style={styles.pager}
            initialPage={initialPage}
            onPageSelected={(e) => handlePageSelected(e.nativeEvent.position)}
          >
            {orderedMethods.map((m, idx) => (
              <View key={m.id} style={styles.page}>
                <ScrollView contentContainerStyle={styles.pageScroll} showsVerticalScrollIndicator={false}>
                  <MethodCard method={m} times={timesByMethod?.get(m.id) ?? null} />
                  <View
                    ref={idx === 0 ? madhabRef : undefined}
                    onLayout={idx === 0 ? measureHint : undefined}
                    collapsable={false}
                    style={[styles.madhabRow, { backgroundColor: palette.glassBg, borderColor: palette.glassBorder }]}
                  >
                    <View style={styles.madhabText}>
                      <Text style={[styles.madhabLabel, { color: palette.textMid }]}>HANAFI ASR</Text>
                      <Text style={[styles.madhabHint, { color: palette.textDim }]}>
                        Use the later Hanafi Asr time
                      </Text>
                    </View>
                    <Switch
                      value={madhab === 'hanafi'}
                      onValueChange={(v) => {
                        setMadhab(v ? 'hanafi' : 'shafi');
                        Haptics.selectionAsync().catch(() => {});
                      }}
                      trackColor={{ false: palette.glassBorder, true: palette.accent }}
                      thumbColor="#FFFFFF"
                    />
                  </View>
                </ScrollView>
              </View>
            ))}
          </PagerView>
        </View>
        {hintTop != null && (
          <View style={[styles.hint, { top: hintTop }]} pointerEvents="none">
            <FontSwipeHint dismissed={hasSwiped} />
          </View>
        )}
        <View ref={dotsRef} collapsable={false} onLayout={measureHint}>
          <PageDots count={orderedMethods.length} active={page} />
        </View>
      </View>
    </StepShell>
  );
}

const styles = StyleSheet.create({
  heading: {
    marginBottom: 12,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
  },
  subtitle: {
    fontSize: 14,
    marginTop: 6,
    lineHeight: 20,
  },
  area: {
    flex: 1,
    position: 'relative',
  },
  pagerWrap: {
    flex: 1,
  },
  hint: {
    position: 'absolute',
    left: 0,
    right: 0,
    alignItems: 'center',
  },
  pager: {
    flex: 1,
  },
  page: {
    flex: 1,
  },
  pageScroll: {
    paddingVertical: 4,
    paddingHorizontal: 0,
  },
  cardWrap: {
    paddingVertical: 4,
  },
  card: {
    padding: 18,
    minHeight: 280,
  },
  methodLabel: {
    fontSize: 20,
    fontWeight: '700',
  },
  methodDesc: {
    fontSize: 13,
    lineHeight: 19,
    marginTop: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginVertical: 14,
  },
  timesBlock: {
    gap: 6,
  },
  timeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 32,
  },
  timeLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  timeValue: {
    fontSize: 14,
    fontWeight: '700',
    fontVariant: ['tabular-nums'],
  },
  fallback: {
    fontSize: 13,
    fontStyle: 'italic',
  },
  madhabRow: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  madhabText: {
    flex: 1,
    paddingRight: 12,
  },
  madhabLabel: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
  },
  madhabHint: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  gap: {
    height: 12,
  },
});

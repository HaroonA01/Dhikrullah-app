import { RefObject, useRef, useState } from 'react';
import {
  LayoutChangeEvent,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import PagerView from 'react-native-pager-view';
import { Dhikr } from '@/types';
import { useTheme } from '@/context/ThemeContext';
import { usePrefs } from '@/context/PrefsContext';
import { ARABIC_FONTS, ENGLISH_FONTS, ARABIC_SIZE, TRANSLIT_SIZE, TRANSLATION_SIZE } from '@/lib/fonts';
import { PageDots } from './PageDots';

type Triple = [number, number, number];

export function DhikrPager({
  dhikr,
  dotsRef,
  forceChevron = false,
  onSwipe,
}: {
  dhikr: Dhikr;
  dotsRef?: RefObject<View | null>;
  // Force the active page's dot to show the "more below" chevron regardless of
  // overflow — used by the tutorial to demonstrate the indicator.
  forceChevron?: boolean;
  // Fired when the user changes page (horizontal swipe) — the tutorial uses
  // this to dismiss the swipe hint once the user has swiped.
  onSwipe?: () => void;
}) {
  const { palette } = useTheme();
  const { arabicFont, englishFont, arabicTextSize, englishTextSize } = usePrefs();
  const [page, setPage] = useState(0);
  const lastPageRef = useRef(0);
  // All three pages share the same viewport height; content height differs.
  const [viewH, setViewH] = useState(0);
  const [contentH, setContentH] = useState<Triple>([0, 0, 0]);
  const [scrolled, setScrolled] = useState<[boolean, boolean, boolean]>([false, false, false]);

  const arabicFF = ARABIC_FONTS.find(f => f.id === arabicFont)?.fontFamily ?? undefined;
  const englishFF = ENGLISH_FONTS.find(f => f.id === englishFont)?.fontFamily ?? undefined;

  const onContentSize = (i: number) => (_w: number, h: number) =>
    setContentH(prev => (prev[i] === h ? prev : (Object.assign([...prev], { [i]: h }) as Triple)));
  const onScrollLayout = (e: LayoutChangeEvent) => setViewH(e.nativeEvent.layout.height);
  const onScroll = (i: number) => (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (e.nativeEvent.contentOffset.y > 2) {
      setScrolled(prev => (prev[i] ? prev : (Object.assign([...prev], { [i]: true }) as typeof prev)));
    }
  };

  // When the visible page overflows and hasn't been scrolled, morph the current
  // page's dot into a "scroll for more" chevron. Reverts once the user scrolls.
  const moreBelow =
    forceChevron || (viewH > 0 && contentH[page] > viewH + 4 && !scrolled[page]);

  return (
    <View style={styles.wrap}>
      <PagerView
        key={dhikr.id}
        style={styles.pager}
        initialPage={0}
        onPageSelected={e => {
          // Read off the synthetic event synchronously (it's pooled/nullified
          // before any async work runs).
          const pos = e.nativeEvent.position;
          if (pos !== lastPageRef.current) onSwipe?.();
          lastPageRef.current = pos;
          setPage(pos);
        }}
      >
        <View key="ar" style={styles.page}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEventThrottle={16}
            onLayout={onScrollLayout}
            onContentSizeChange={onContentSize(0)}
            onScroll={onScroll(0)}
          >
            <Text style={[styles.arabic, { color: palette.textDark, fontSize: ARABIC_SIZE[arabicTextSize], lineHeight: ARABIC_SIZE[arabicTextSize] * 1.6, fontFamily: arabicFF }]}>
              {dhikr.arabic}
            </Text>
          </ScrollView>
        </View>
        <View key="tr" style={styles.page}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEventThrottle={16}
            onContentSizeChange={onContentSize(1)}
            onScroll={onScroll(1)}
          >
            <Text style={[styles.translit, { color: palette.textDark, fontSize: TRANSLIT_SIZE[englishTextSize], fontFamily: englishFF }]}>
              {dhikr.transliteration}
            </Text>
          </ScrollView>
        </View>
        <View key="en" style={styles.page}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled
            scrollEventThrottle={16}
            onContentSizeChange={onContentSize(2)}
            onScroll={onScroll(2)}
          >
            <Text style={[styles.translation, { color: palette.textDark, fontSize: TRANSLATION_SIZE[englishTextSize], lineHeight: TRANSLATION_SIZE[englishTextSize] * 1.5, fontFamily: englishFF }]}>
              {dhikr.translation}
            </Text>
          </ScrollView>
        </View>
      </PagerView>
      <View ref={dotsRef} collapsable={false} style={styles.dotsAnchor}>
        <PageDots count={3} active={page} chevronIndex={moreBelow ? page : null} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { width: '100%', flex: 1 },
  // Hug the dots so the tutorial spotlight traces just the 3 circles, not the
  // full-width row.
  dotsAnchor: { alignSelf: 'center' },
  pager: { flex: 1 },
  page: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Pager slot is already inset to the mihrab body width in
    // app/counter/[category].tsx; only a small inner gutter is needed here.
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  arabic: { textAlign: 'center' },
  translit: { fontStyle: 'italic', fontWeight: '400', textAlign: 'center' },
  translation: { fontWeight: '400', textAlign: 'center' },
});

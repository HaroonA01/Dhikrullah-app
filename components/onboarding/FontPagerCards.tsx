import React, { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import PagerView from 'react-native-pager-view';
import * as Haptics from 'expo-haptics';
import { PageDots } from '@/components/PageDots';
import { FontPreviewCard } from '@/components/onboarding/FontPreviewCard';
import { FontSwipeHint } from '@/components/onboarding/FontSwipeHint';

interface FontEntry {
  readonly id: string;
  readonly label: string;
  readonly fontFamily: string | null;
}

interface Props<T extends FontEntry> {
  fonts: readonly T[];
  selectedId: string;
  onChange: (id: T['id']) => void;
  previewText: string;
  fontSize: number;
  isArabic?: boolean;
}

export function FontPagerCards<T extends FontEntry>({
  fonts,
  selectedId,
  onChange,
  previewText,
  fontSize,
  isArabic,
}: Props<T>) {
  const initialPage = useMemo(() => {
    const idx = fonts.findIndex((f) => f.id === selectedId);
    return idx < 0 ? 0 : idx;
  }, [fonts, selectedId]);

  const activePage = useRef(initialPage);
  const [page, setPage] = React.useState(initialPage);
  const [hasSwiped, setHasSwiped] = React.useState(false);

  return (
    <View style={styles.wrap}>
      <PagerView
        style={styles.pager}
        initialPage={initialPage}
        onPageSelected={(e) => {
          const pos = e.nativeEvent.position;
          if (pos === activePage.current) return;
          activePage.current = pos;
          setPage(pos);
          setHasSwiped(true);
          const next = fonts[pos];
          if (next) {
            onChange(next.id as T['id']);
            Haptics.selectionAsync().catch(() => {});
          }
        }}
      >
        {fonts.map((f) => (
          <View key={f.id} style={styles.page}>
            <FontPreviewCard
              label={f.label}
              previewText={previewText}
              fontFamily={f.fontFamily}
              fontSize={fontSize}
              isArabic={isArabic}
            />
          </View>
        ))}
      </PagerView>
      <View style={styles.hint} pointerEvents="none">
        <FontSwipeHint dismissed={hasSwiped} />
      </View>
      <PageDots count={fonts.length} active={page} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flex: 1,
  },
  hint: {
    position: 'absolute',
    bottom: 36,
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
});

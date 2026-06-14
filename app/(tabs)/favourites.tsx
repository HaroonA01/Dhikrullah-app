import { useEffect, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Heart } from 'lucide-react-native';
import { useFavourites } from '@/context/FavouritesContext';
import { useCounterContext } from '@/context/CounterContext';
import { getFavouriteDhikrs } from '@/db/queries';
import { GradientBackground } from '@/components/GradientBackground';
import { GlassCard } from '@/components/GlassCard';
import { useTheme } from '@/context/ThemeContext';
import { usePrefs } from '@/context/PrefsContext';
import { ARABIC_FONTS } from '@/lib/fonts';
import { isKnownCategoryId, type CategoryId } from '@/types';

interface FavItem {
  id: string;
  arabic: string;
  transliteration: string;
  categoryId: CategoryId;
  categoryLabel: string;
}

export default function FavouritesScreen() {
  const insets = useSafeAreaInsets();
  const { palette } = useTheme();
  const { arabicFont } = usePrefs();
  const arabicFF = ARABIC_FONTS.find((f) => f.id === arabicFont)?.fontFamily ?? undefined;
  const { favouriteIds, hydrated } = useFavourites();
  const { seekToDhikr } = useCounterContext();
  const [items, setItems] = useState<FavItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const rows = await getFavouriteDhikrs();
      if (!cancelled) {
        setItems(
          rows.map((r) => ({
            id: r.id,
            arabic: r.arabic,
            transliteration: r.transliteration,
            categoryId: isKnownCategoryId(r.categoryId)
              ? r.categoryId
              : (r.categoryId as CategoryId),
            categoryLabel: r.categoryLabel,
          })),
        );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [favouriteIds]);

  const openFav = (item: FavItem) => {
    seekToDhikr(item.categoryId, item.id);
    router.push(`/counter/${item.categoryId}`);
  };

  return (
    <View style={styles.root}>
      <GradientBackground />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.wordmark, { color: palette.accent }]}>Dhikrullah</Text>
        <Text style={[styles.title, { color: palette.textDark }]}>Favourites</Text>
      </View>

      {hydrated && items.length === 0 ? (
        <View style={styles.empty}>
          <Heart size={40} color={palette.accent} strokeWidth={1.5} style={{ opacity: 0.4 }} />
          <Text style={[styles.emptyTitle, { color: palette.textDark }]}>
            No favourites yet
          </Text>
          <Text style={[styles.emptyHint, { color: palette.textMid }]}>
            Tap the heart icon on any dhikr to save it here
          </Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={[styles.list, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {items.map((item) => (
            <Pressable
              key={item.id}
              onPress={() => openFav(item)}
              style={({ pressed }) => [pressed && styles.pressed]}
            >
              <GlassCard style={styles.card}>
                <Text style={[styles.categoryBadge, { color: palette.accent }]}>
                  {item.categoryLabel}
                </Text>
                <Text style={[styles.arabic, { color: palette.textDark, fontFamily: arabicFF }]}>
                  {item.arabic}
                </Text>
                <Text style={[styles.transliteration, { color: palette.textDim }]}>
                  {item.transliteration}
                </Text>
              </GlassCard>
            </Pressable>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  header: {
    paddingHorizontal: 20,
    marginBottom: 8,
  },
  wordmark: {
    fontSize: 12,
    letterSpacing: 1.5,
    fontWeight: '600',
    opacity: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    marginTop: 2,
  },
  empty: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 40,
    gap: 12,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    opacity: 0.7,
  },
  emptyHint: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
  list: {
    paddingHorizontal: 16,
    paddingTop: 8,
    gap: 12,
  },
  card: {
    paddingHorizontal: 18,
    paddingVertical: 14,
  },
  pressed: {
    opacity: 0.75,
  },
  categoryBadge: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  arabic: {
    fontSize: 22,
    textAlign: 'right',
    lineHeight: 36,
    marginBottom: 4,
  },
  transliteration: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});

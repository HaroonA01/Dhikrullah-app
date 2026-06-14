import { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { MapPin, Search, X } from 'lucide-react-native';
import { searchCities, type LocationData } from '@/lib/location';
import { useTheme } from '@/context/ThemeContext';
import { useBackdropDim } from '@/lib/useBackdropDim';

interface Props {
  visible: boolean;
  onSelect: (loc: LocationData) => void;
  onClose: () => void;
}

const DEBOUNCE_MS = 350;
const MIN_LEN = 2;

export function CitySearchModal({ visible, onSelect, onClose }: Props) {
  const { palette } = useTheme();
  const backdrop = useBackdropDim(0.4);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<LocationData[]>([]);
  const [busy, setBusy] = useState(false);
  const [searched, setSearched] = useState(false);
  const reqId = useRef(0);
  const inputRef = useRef<TextInput | null>(null);

  useEffect(() => {
    if (!visible) {
      setQuery('');
      setResults([]);
      setBusy(false);
      setSearched(false);
      reqId.current += 1;
      return;
    }
    const t = setTimeout(() => inputRef.current?.focus(), 80);
    return () => clearTimeout(t);
  }, [visible]);

  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_LEN) {
      setResults([]);
      setBusy(false);
      setSearched(false);
      return;
    }
    setBusy(true);
    const myId = ++reqId.current;
    const t = setTimeout(async () => {
      const found = await searchCities(trimmed);
      if (myId !== reqId.current) return;
      setResults(found);
      setBusy(false);
      setSearched(true);
    }, DEBOUNCE_MS);
    return () => clearTimeout(t);
  }, [query, visible]);

  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';

  const renderStatus = () => {
    if (query.trim().length < MIN_LEN) {
      return (
        <Text style={[styles.status, { color: palette.textDim }]}>
          Type at least {MIN_LEN} letters
        </Text>
      );
    }
    if (busy) {
      return (
        <View style={styles.statusRow}>
          <ActivityIndicator color={palette.accent} />
          <Text style={[styles.status, { color: palette.textMid, marginLeft: 8 }]}>
            Searching…
          </Text>
        </View>
      );
    }
    if (searched && results.length === 0) {
      return (
        <Text style={[styles.status, { color: palette.textMid }]}>
          No matches for &ldquo;{query.trim()}&rdquo;
        </Text>
      );
    }
    return null;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[styles.backdrop, { backgroundColor: backdrop }]} onPress={onClose}>
        <Pressable
          style={[
            styles.card,
            { backgroundColor: cardBg },
          ]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              styles.cardBorderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <View style={styles.headerRow}>
            <Text style={[styles.title, { color: palette.textDark }]}>
              Search city
            </Text>
            <Pressable onPress={onClose} hitSlop={10}>
              <X size={20} color={palette.textMid} strokeWidth={2} />
            </Pressable>
          </View>

          <View
            style={[
              styles.inputWrap,
              { backgroundColor: palette.glassBg },
            ]}
          >
            <View
              pointerEvents="none"
              style={[
                StyleSheet.absoluteFill,
                styles.inputBorderOverlay,
                { borderColor: palette.glassBorder },
              ]}
            />
            <Search size={16} color={palette.textDim} strokeWidth={2} />
            <TextInput
              ref={inputRef}
              value={query}
              onChangeText={setQuery}
              placeholder="e.g. Mecca, Tangier, Multan…"
              placeholderTextColor={palette.textDim}
              autoCorrect={false}
              autoCapitalize="words"
              returnKeyType="search"
              style={[styles.input, { color: palette.textDark }]}
            />
            {query.length > 0 ? (
              <Pressable onPress={() => setQuery('')} hitSlop={6}>
                <X size={14} color={palette.textDim} strokeWidth={2} />
              </Pressable>
            ) : null}
          </View>

          <View style={styles.body}>
            {results.length > 0 ? (
              <FlatList
                data={results}
                keyExtractor={(it, idx) => `${it.lat},${it.lon},${idx}`}
                keyboardShouldPersistTaps="handled"
                ItemSeparatorComponent={() => (
                  <View
                    style={[
                      styles.separator,
                      { backgroundColor: palette.glassBorder },
                    ]}
                  />
                )}
                renderItem={({ item }) => (
                  <Pressable
                    onPress={() => onSelect(item)}
                    style={({ pressed }) => [
                      styles.resultRow,
                      pressed && { opacity: 0.6 },
                    ]}
                  >
                    <View
                      style={[
                        styles.iconTile,
                        { backgroundColor: palette.accentLight },
                      ]}
                    >
                      <MapPin size={14} color={palette.accent} strokeWidth={2} />
                    </View>
                    <View style={styles.resultText}>
                      <Text
                        style={[styles.resultLabel, { color: palette.textDark }]}
                        numberOfLines={1}
                      >
                        {item.label}
                      </Text>
                      <Text
                        style={[styles.resultCoords, { color: palette.textDim }]}
                        numberOfLines={1}
                      >
                        {item.lat.toFixed(3)}°, {item.lon.toFixed(3)}°
                      </Text>
                    </View>
                  </Pressable>
                )}
              />
            ) : (
              renderStatus()
            )}
          </View>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    maxHeight: '70%',
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 18,
    paddingBottom: 14,
  },
  cardBorderOverlay: {
    borderWidth: 1,
    borderRadius: 18,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 10,
  },
  inputBorderOverlay: {
    borderWidth: 1,
    borderRadius: 12,
  },
  input: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  body: {
    minHeight: 80,
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    marginLeft: 56,
  },
  resultRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 12,
  },
  iconTile: {
    width: 32,
    height: 32,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  resultText: {
    flex: 1,
  },
  resultLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  resultCoords: {
    fontSize: 11,
    marginTop: 2,
    fontVariant: ['tabular-nums'],
  },
  status: {
    fontSize: 13,
    paddingVertical: 16,
    textAlign: 'center',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
  },
});

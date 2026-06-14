import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'expo-router';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  Alert,
  Linking,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useAudioPlayer } from 'expo-audio';
import Constants from 'expo-constants';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Bell,
  BellOff,
  BedDouble,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Clock,
  Compass,
  Coffee,
  Code,
  GraduationCap,
  Mail,
  MapPin,
  Palette as PaletteIcon,
  Play,
  Scale,
  ShieldCheck,
  Sparkles,
  SunMoon,
  Tag,
  Type,
  Vibrate,
  Volume2,
} from 'lucide-react-native';
import { runOnJS } from 'react-native-reanimated';
import { GradientBackground } from '@/components/GradientBackground';
import { SettingsSection } from '@/components/SettingsSection';
import { SettingsRow } from '@/components/SettingsRow';
import { ThemeSwatch } from '@/components/ThemeSwatch';
import { CitySearchModal } from '@/components/CitySearchModal';
import { useTheme, type Mode } from '@/context/ThemeContext';
import { usePrefs, PRAYER_CATEGORY_IDS, type NotifOffset } from '@/context/PrefsContext';
import { METHODS, type MethodId } from '@/lib/prayer';
import { requestDeviceLocation, type LocationData } from '@/lib/location';
import { requestNotificationPermission } from '@/lib/notifications';
import { setMeta } from '@/db/queries';
import { FEEDBACK_SUBJECT, SUPPORT_EMAIL } from '@/constants/about';
import { ARABIC_FONTS, ENGLISH_FONTS, TEXT_SIZE_OPTIONS } from '@/lib/fonts';
import { NOTIF_SOUND_LABELS, NOTIF_SOUND_ASSETS, type NotifSoundId } from '@/lib/soundMap';
import type { CategoryId } from '@/types';

const MODES: { id: Mode; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
  { id: 'system', label: 'System' },
];

const NOTIF_OFFSET_OPTIONS: { value: NotifOffset; label: string }[] = [
  { value: 0, label: 'Adhan' },
  { value: 10, label: '+10m' },
  { value: 30, label: '+30m' },
  { value: 60, label: '+1h' },
];

const ALL_CATEGORY_IDS: CategoryId[] = [
  'all_day', 'fajr', 'morning', 'waking_up', 'dhuhr', 'asr',
  'evening', 'maghrib', 'isha', 'witr', 'before_bed',
];

const CATEGORY_DISPLAY: Record<CategoryId, string> = {
  all_day: 'All Day',
  fajr: 'Fajr',
  morning: 'Morning',
  waking_up: 'Waking Up',
  dhuhr: 'Dhuhr',
  asr: 'Asr',
  evening: 'Evening',
  maghrib: 'Maghrib',
  isha: 'Isha',
  witr: 'Witr',
  before_bed: 'Before Bed',
};

const minutesToTimeString = (minutes: number): string => {
  const h = Math.floor(minutes / 60).toString().padStart(2, '0');
  const m = (minutes % 60).toString().padStart(2, '0');
  return `${h}:${m}`;
};

export default function SettingsScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const {
    palette, mode, setMode, themeId, setThemeId, themes,
    combinedThemes,
  } = useTheme();
  const {
    hapticsIndividual,
    setHapticsIndividual,
    hapticsComplete,
    setHapticsComplete,
    prayerMethodId,
    setPrayerMethodId,
    madhab,
    setMadhab,
    location,
    setLocation,
    wakingUpMinutes,
    setWakingUpMinutes,
    beforeBedMinutes,
    setBeforeBedMinutes,
    notifEnabled,
    setNotifEnabled,
    setAllNotifEnabled,
    notifOffset,
    setNotifOffset,
    arabicFont,
    setArabicFont,
    englishFont,
    setEnglishFont,
    arabicTextSize,
    setArabicTextSize,
    englishTextSize,
    setEnglishTextSize,
    notifSound,
    setNotifSound,
    allDayMinutes,
    setAllDayMinutes,
    timerVisible,
    setTimerVisible,
  } = usePrefs();

  const [methodPickerOpen, setMethodPickerOpen] = useState(false);
  const [locationPickerOpen, setLocationPickerOpen] = useState(false);
  const [citySearchOpen, setCitySearchOpen] = useState(false);
  const [timePickerOpen, setTimePickerOpen] = useState<'waking_up' | 'before_bed' | 'all_day' | null>(null);
  const [expandedPrayers, setExpandedPrayers] = useState<Set<CategoryId>>(new Set());
  const [arabicFontOpen, setArabicFontOpen] = useState(false);
  const [englishFontOpen, setEnglishFontOpen] = useState(false);
  const [soundPickerOpen, setSoundPickerOpen] = useState(false);

  const version = Constants.expoConfig?.version ?? '1.0.0';
  const currentMethod = METHODS.find((m) => m.id === prayerMethodId) ?? METHODS[0];
  const currentTheme = themes.find((t) => t.id === themeId) ?? themes[0];
  const displayThemeName = currentTheme.name;

  const applyLocation = (loc: LocationData) => {
    setLocation(loc);
    if (loc.label.includes('London') && loc.label.includes('United Kingdom')) {
      setPrayerMethodId('ELM');
    }
  };

  const useDeviceLocation = async () => {
    const result = await requestDeviceLocation();
    if (!result) {
      Alert.alert(
        'Location unavailable',
        'Permission denied or location lookup failed. Try searching for your city instead.',
      );
      return;
    }
    applyLocation(result);
    setLocationPickerOpen(false);
  };

  const handleCitySelect = (loc: LocationData) => {
    applyLocation(loc);
    setCitySearchOpen(false);
  };

  const openContact = () => {
    Linking.openURL(
      `mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(
        `${FEEDBACK_SUBJECT} (v${version})`,
      )}`,
    ).catch(() => {
      Alert.alert('Could not open email', `Please email ${SUPPORT_EMAIL}.`);
    });
  };

  const allEnabled = ALL_CATEGORY_IDS.every((id) => notifEnabled[id]);

  const handleToggleAll = async (val: boolean) => {
    if (val) {
      if (!location) {
        Alert.alert(
          'Location required',
          'Set your location first so notifications can be timed accurately.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Set Location', onPress: () => setLocationPickerOpen(true) },
          ],
        );
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Allow notifications in Settings to receive dhikr reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    if (!val) setExpandedPrayers(new Set());
    setAllNotifEnabled(val);
  };

  const handleNotifToggle = async (id: CategoryId, val: boolean) => {
    if (val) {
      if (!location) {
        Alert.alert(
          'Location required',
          'Set your location first so notifications can be timed accurately.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Set Location', onPress: () => setLocationPickerOpen(true) },
          ],
        );
        return;
      }
      const granted = await requestNotificationPermission();
      if (!granted) {
        Alert.alert(
          'Permission required',
          'Allow notifications in Settings to receive dhikr reminders.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Open Settings', onPress: () => Linking.openSettings() },
          ],
        );
        return;
      }
    }
    if (!val) {
      setExpandedPrayers((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
    setNotifEnabled(id, val);
  };

  const togglePrayerExpanded = (id: CategoryId) => {
    setExpandedPrayers((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  return (
    <View style={styles.root}>
      <GradientBackground />

      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={[styles.wordmark, { color: palette.accent }]}>Dhikrullah</Text>
        <Text style={[styles.title, { color: palette.textDark }]}>Settings</Text>
      </View>

      <ScrollView
        contentContainerStyle={[
          styles.scroll,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <SettingsSection title="Appearance">
          <SettingsRow
            label="Appearance"
            Icon={SunMoon}
            trailing={
              <Segmented
                options={MODES}
                value={mode}
                onChange={setMode}
                palette={palette}
              />
            }
          />
          <SettingsRow
            label="Theme"
            Icon={PaletteIcon}
            trailing={
              <Text style={[styles.trailingText, { color: palette.accent }]}>
                {displayThemeName}
              </Text>
            }
            isLast
          />
          <ThemeRow
            combinedThemes={combinedThemes}
            themeId={themeId}
            setThemeId={setThemeId}
            palette={palette}
          />
        </SettingsSection>

        <SettingsSection title="Haptics">
          <SettingsRow
            label="Individual dhikr"
            detail="Light tap on every count"
            Icon={Vibrate}
            trailing={
              <Switch
                value={hapticsIndividual}
                onValueChange={setHapticsIndividual}
                trackColor={{ false: palette.glassBorder, true: palette.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
          <SettingsRow
            label="Complete dhikr"
            detail="Stronger pulse when target reached"
            Icon={Sparkles}
            isLast
            trailing={
              <Switch
                value={hapticsComplete}
                onValueChange={setHapticsComplete}
                trackColor={{ false: palette.glassBorder, true: palette.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Timer">
          <SettingsRow
            label="Show timer"
            detail="Display the timer pill on the dhikr page"
            Icon={Clock}
            isLast
            trailing={
              <Switch
                value={timerVisible}
                onValueChange={setTimerVisible}
                trackColor={{ false: palette.glassBorder, true: palette.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Typography">
          <SettingsRow
            label="Arabic Font"
            Icon={Type}
            detail={ARABIC_FONTS.find(f => f.id === arabicFont)?.label}
            showChevron
            onPress={() => setArabicFontOpen(true)}
            trailingBelow
            trailing={
              <Segmented
                options={TEXT_SIZE_OPTIONS}
                value={arabicTextSize}
                onChange={setArabicTextSize}
                palette={palette}
                stretch
              />
            }
          />
          <SettingsRow
            label="English Font"
            Icon={Type}
            detail={ENGLISH_FONTS.find(f => f.id === englishFont)?.label}
            showChevron
            onPress={() => setEnglishFontOpen(true)}
            isLast
            trailingBelow
            trailing={
              <Segmented
                options={TEXT_SIZE_OPTIONS}
                value={englishTextSize}
                onChange={setEnglishTextSize}
                palette={palette}
                stretch
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Prayer Times">
          <SettingsRow
            label="Location"
            detail={location?.label ?? 'Not set'}
            Icon={MapPin}
            showChevron
            onPress={() => setLocationPickerOpen(true)}
          />
          <SettingsRow
            label="Calculation method"
            detail={currentMethod.label}
            Icon={Compass}
            showChevron
            onPress={() => setMethodPickerOpen(true)}
          />
          <SettingsRow
            label="Hanafi Asr"
            detail="Use the later Hanafi Asr time"
            Icon={Scale}
            isLast
            trailing={
              <Switch
                value={madhab === 'hanafi'}
                onValueChange={(v) => setMadhab(v ? 'hanafi' : 'shafi')}
                trackColor={{ false: palette.glassBorder, true: palette.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
        </SettingsSection>

        <SettingsSection title="Schedule">
          <SettingsRow
            label="Waking Up"
            detail={minutesToTimeString(wakingUpMinutes)}
            Icon={Coffee}
            showChevron
            onPress={() => setTimePickerOpen('waking_up')}
          />
          <SettingsRow
            label="Before Bed"
            detail={minutesToTimeString(beforeBedMinutes)}
            Icon={BedDouble}
            isLast
            showChevron
            onPress={() => setTimePickerOpen('before_bed')}
          />
        </SettingsSection>

        <SettingsSection title="Notifications">
          <SettingsRow
            label="Notification Sound"
            detail={NOTIF_SOUND_LABELS[notifSound]}
            Icon={Volume2}
            showChevron
            onPress={() => setSoundPickerOpen(true)}
          />
          <SettingsRow
            label="All Notifications"
            detail={allEnabled ? 'All reminders on' : 'All reminders off'}
            Icon={allEnabled ? Bell : BellOff}
            trailing={
              <Switch
                value={allEnabled}
                onValueChange={handleToggleAll}
                trackColor={{ false: palette.glassBorder, true: palette.accent }}
                thumbColor="#FFFFFF"
              />
            }
          />
          {!location ? (
            <View style={[styles.notifNote, { borderColor: palette.glassBorder }]}>
              <Text style={[styles.notifNoteText, { color: palette.textMid }]}>
                Set a location in Prayer Times to enable prayer-based notifications.
              </Text>
            </View>
          ) : null}
          {ALL_CATEGORY_IDS.map((id, i) => {
            const isPrayer = PRAYER_CATEGORY_IDS.includes(id);
            const enabled = notifEnabled[id] ?? false;
            const offset = notifOffset[id] ?? 0;
            const expanded = expandedPrayers.has(id);
            const isLast = i === ALL_CATEGORY_IDS.length - 1;
            const showOffset = isPrayer && enabled && expanded;
            return (
              <View key={id}>
                <SettingsRow
                  label={CATEGORY_DISPLAY[id]}
                  Icon={enabled ? Bell : BellOff}
                  isLast={isLast && !showOffset}
                  trailing={
                    <View style={styles.rowTrailing}>
                      {id === 'all_day' && enabled ? (
                        <Pressable
                          onPress={() => setTimePickerOpen('all_day')}
                          hitSlop={8}
                          style={[styles.timeChip, { backgroundColor: palette.accentLight, borderColor: palette.glassBorder }]}
                        >
                          <Text style={[styles.timeChipText, { color: palette.accent }]}>
                            {minutesToTimeString(allDayMinutes)}
                          </Text>
                        </Pressable>
                      ) : null}
                      {isPrayer && enabled ? (
                        <Pressable
                          onPress={() => togglePrayerExpanded(id)}
                          hitSlop={8}
                          style={styles.chevronBtn}
                        >
                          {expanded
                            ? <ChevronUp size={16} color={palette.accent} strokeWidth={2.5} />
                            : <ChevronDown size={16} color={palette.accent} strokeWidth={2.5} />
                          }
                        </Pressable>
                      ) : null}
                      <Switch
                        value={enabled}
                        onValueChange={(v) => handleNotifToggle(id, v)}
                        trackColor={{ false: palette.glassBorder, true: palette.accent }}
                        thumbColor="#FFFFFF"
                      />
                    </View>
                  }
                />
                {showOffset ? (
                  <View
                    style={[
                      styles.offsetRow,
                      isLast && styles.offsetRowLast,
                      { borderTopColor: palette.glassBorder },
                    ]}
                  >
                    <Text style={[styles.offsetLabel, { color: palette.textMid }]}>
                      Notify
                    </Text>
                    <Segmented
                      options={NOTIF_OFFSET_OPTIONS.map((o) => ({ id: String(o.value) as string & NotifOffset, label: o.label }))}
                      value={String(offset)}
                      onChange={(v) => setNotifOffset(id, Number(v) as NotifOffset)}
                      palette={palette}
                    />
                  </View>
                ) : null}
              </View>
            );
          })}
        </SettingsSection>

        <SettingsSection title="About">
          <SettingsRow
            label="Version"
            detail={version}
            Icon={Tag}
          />
          <SettingsRow
            label="Redo Tutorial"
            detail="Replay the counter page walkthrough"
            Icon={GraduationCap}
            showChevron
            onPress={async () => {
              await setMeta('counter_tutorial_done', '');
              router.push('/counter/fajr');
            }}
          />
          <SettingsRow
            label="Contact"
            detail={SUPPORT_EMAIL}
            Icon={Mail}
            showChevron
            onPress={openContact}
          />
          <SettingsRow
            label="Privacy Policy"
            detail="How your data is handled"
            Icon={ShieldCheck}
            showChevron
            onPress={() =>
              Linking.openURL(
                'https://sites.google.com/view/dhikrullah-privacy-policy/home',
              )
            }
          />
          <SettingsRow
            label="Open Source"
            detail="View on GitHub"
            Icon={Code}
            showChevron
            onPress={() => Linking.openURL('https://github.com/HaroonA01/Dhikrullah-app')}
            isLast
          />
        </SettingsSection>
      </ScrollView>

      <MethodPicker
        visible={methodPickerOpen}
        currentId={prayerMethodId}
        onSelect={(id) => {
          setPrayerMethodId(id);
          setMethodPickerOpen(false);
        }}
        onClose={() => setMethodPickerOpen(false)}
        palette={palette}
      />

      <LocationPickerModal
        visible={locationPickerOpen}
        onUseDevice={useDeviceLocation}
        onSearch={() => {
          setLocationPickerOpen(false);
          setTimeout(() => setCitySearchOpen(true), 250);
        }}
        onClose={() => setLocationPickerOpen(false)}
        palette={palette}
      />

      <CitySearchModal
        visible={citySearchOpen}
        onSelect={handleCitySelect}
        onClose={() => setCitySearchOpen(false)}
      />

      <TimePickerModal
        visible={timePickerOpen !== null}
        title={
          timePickerOpen === 'waking_up' ? 'Waking Up Time'
          : timePickerOpen === 'before_bed' ? 'Before Bed Time'
          : 'All Day Reminder Time'
        }
        currentMinutes={
          timePickerOpen === 'waking_up' ? wakingUpMinutes
          : timePickerOpen === 'before_bed' ? beforeBedMinutes
          : allDayMinutes
        }
        onSelect={(m) => {
          if (timePickerOpen === 'waking_up') setWakingUpMinutes(m);
          else if (timePickerOpen === 'before_bed') setBeforeBedMinutes(m);
          else if (timePickerOpen === 'all_day') setAllDayMinutes(m);
          setTimePickerOpen(null);
        }}
        onClose={() => setTimePickerOpen(null)}
        palette={palette}
      />

      <FontPickerModal
        visible={arabicFontOpen}
        title="Arabic Font"
        options={ARABIC_FONTS}
        currentId={arabicFont}
        onSelect={(id) => {
          setArabicFont(id);
          setArabicFontOpen(false);
        }}
        onClose={() => setArabicFontOpen(false)}
        palette={palette}
        isArabic
      />

      <FontPickerModal
        visible={englishFontOpen}
        title="English Font"
        options={ENGLISH_FONTS}
        currentId={englishFont}
        onSelect={(id) => {
          setEnglishFont(id);
          setEnglishFontOpen(false);
        }}
        onClose={() => setEnglishFontOpen(false)}
        palette={palette}
      />

      <SoundPickerModal
        visible={soundPickerOpen}
        currentId={notifSound}
        onSelect={(id) => {
          setNotifSound(id);
          setSoundPickerOpen(false);
        }}
        onClose={() => setSoundPickerOpen(false)}
        palette={palette}
      />
    </View>
  );
}

// ─── Time Picker Modal ─────────────────────────────────────────────────────

const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = [0, 15, 30, 45];

interface TimePickerProps {
  visible: boolean;
  title: string;
  currentMinutes: number;
  onSelect: (minutes: number) => void;
  onClose: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function TimePickerModal({ visible, title, currentMinutes, onSelect, onClose, palette }: TimePickerProps) {
  const [h, setH] = useState(Math.floor(currentMinutes / 60));
  const [m, setM] = useState(currentMinutes % 60 < 15 ? 0 : currentMinutes % 60 < 30 ? 15 : currentMinutes % 60 < 45 ? 30 : 45);

  useEffect(() => {
    if (visible) {
      setH(Math.floor(currentMinutes / 60));
      const raw = currentMinutes % 60;
      setM(raw < 15 ? 0 : raw < 30 ? 15 : raw < 45 ? 30 : 45);
    }
  }, [visible, currentMinutes]);

  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[pickerStyles.backdrop, { backgroundColor: palette.scheme === 'dark' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.4)' }]} onPress={onClose}>
        <Pressable
          style={[pickerStyles.card, { backgroundColor: cardBg }]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              pickerStyles.cardBorderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <Text style={[pickerStyles.title, { color: palette.textDark }]}>{title}</Text>

          <View style={timeStyles.row}>
            <View style={timeStyles.col}>
              <Text style={[timeStyles.colLabel, { color: palette.textMid }]}>Hour</Text>
              <ScrollView style={timeStyles.scroll} showsVerticalScrollIndicator={false}>
                {HOURS.map((hour) => (
                  <Pressable
                    key={hour}
                    onPress={() => setH(hour)}
                    style={[
                      timeStyles.item,
                      h === hour && { backgroundColor: palette.accent },
                    ]}
                  >
                    <Text style={[timeStyles.itemText, { color: h === hour ? '#FFF' : palette.textDark }]}>
                      {hour.toString().padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
            <Text style={[timeStyles.colon, { color: palette.textDark }]}>:</Text>
            <View style={timeStyles.col}>
              <Text style={[timeStyles.colLabel, { color: palette.textMid }]}>Min</Text>
              <View>
                {MINUTES.map((min) => (
                  <Pressable
                    key={min}
                    onPress={() => setM(min)}
                    style={[
                      timeStyles.item,
                      m === min && { backgroundColor: palette.accent },
                    ]}
                  >
                    <Text style={[timeStyles.itemText, { color: m === min ? '#FFF' : palette.textDark }]}>
                      {min.toString().padStart(2, '0')}
                    </Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <Pressable
            onPress={() => onSelect(h * 60 + m)}
            style={({ pressed }) => [
              timeStyles.confirm,
              { backgroundColor: palette.accent },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={timeStyles.confirmText}>Confirm</Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const timeStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'center',
    gap: 8,
    marginVertical: 16,
  },
  col: {
    alignItems: 'center',
    flex: 1,
  },
  colLabel: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  scroll: {
    maxHeight: 200,
  },
  item: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 2,
  },
  itemText: {
    fontSize: 16,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  colon: {
    fontSize: 22,
    fontWeight: '700',
    marginTop: 36,
  },
  confirm: {
    paddingVertical: 13,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 4,
  },
  confirmText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 15,
  },
});

// ─── Theme Row ─────────────────────────────────────────────────────────────

interface ThemeRowProps {
  combinedThemes: ReturnType<typeof useTheme>['combinedThemes'];
  themeId: string;
  setThemeId: (id: string) => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

// Fold a theme name into at most two lines so swatch labels never exceed the
// two-line box (e.g. "Crimson Dusk" → "Crimson" / "Dusk").
function twoLineName(name: string): string[] {
  const tokens = name.trim().split(/\s+/);
  if (tokens.length <= 1) return tokens;
  const mid = Math.ceil(tokens.length / 2);
  return [tokens.slice(0, mid).join(' '), tokens.slice(mid).join(' ')];
}

function ThemeRow({
  combinedThemes, themeId, setThemeId, palette,
}: ThemeRowProps) {
  const PAGE_SIZE = 4;
  const { width: screenWidth } = useWindowDimensions();
  // Width budget: screen − ScrollView padX (16*2) − GlassCard padX (4*2) −
  // themeBlock padX (6*2) − chevron tap regions (28*2) − inter-cell gap (8*3).
  // Cap at 56 to match the historical swatch size on wider devices.
  const SWATCH_SIZE = Math.max(
    40,
    Math.min(56, Math.floor((screenWidth - 32 - 8 - 12 - 56 - 24) / PAGE_SIZE)),
  );
  const totalPages = Math.ceil(combinedThemes.length / PAGE_SIZE);
  const currentIdx = combinedThemes.findIndex(
    (item) => item.theme.id === themeId,
  );
  const [page, setPage] = useState(currentIdx >= 0 ? Math.floor(currentIdx / PAGE_SIZE) : 0);

  const pageItems = combinedThemes.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const isSelected = (item: typeof combinedThemes[number]): boolean =>
    item.theme.id === themeId;

  // Chevron Pressables centre on the full swatch + label column: the outer row
  // uses alignItems 'center', so the fixed-height chevron boxes are centred
  // against the tallest column (swatch icon + its label).
  const chevronBoxStyle = {
    height: SWATCH_SIZE,
    width: 28,
    alignItems: 'center' as const,
    justifyContent: 'center' as const,
  };

  const goPrev = useCallback(() => setPage((p) => Math.max(0, p - 1)), []);
  const goNext = useCallback(
    () => setPage((p) => Math.min(totalPages - 1, p + 1)),
    [totalPages],
  );

  // Horizontal swipe across the swatch row flips pages. activeOffsetX keeps
  // swatch taps working (only a real drag activates the pan).
  const swipeGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX([-16, 16])
        .onEnd((e) => {
          if (e.translationX <= -40) runOnJS(goNext)();
          else if (e.translationX >= 40) runOnJS(goPrev)();
        }),
    [goNext, goPrev],
  );

  return (
    <View style={styles.themeBlock}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Pressable
          onPress={goPrev}
          disabled={page === 0}
          hitSlop={8}
          style={chevronBoxStyle}
        >
          <ChevronLeft
            size={20}
            color={page === 0 ? palette.textDim : palette.accent}
            strokeWidth={2.5}
          />
        </Pressable>

        <GestureDetector gesture={swipeGesture}>
        <View style={{ flex: 1, flexDirection: 'row', alignItems: 'flex-start' }}>
          {pageItems.map((item) => {
            const selected = isSelected(item);
            const labelColor = selected ? palette.accent : palette.textMid;
            const labelWeight: '500' | '700' = selected ? '700' : '500';
            return (
              <View key={item.theme.id} style={styles.swatchCol}>
                <ThemeSwatch
                  theme={item.theme}
                  selected={selected}
                  size={SWATCH_SIZE}
                  onPress={() => setThemeId(item.theme.id)}
                />
                <View style={styles.swatchLabelWrap}>
                  {twoLineName(item.theme.name).map((line, i) => (
                    <Text
                      key={i}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.5}
                      style={[
                        styles.swatchLabel,
                        { color: labelColor, fontWeight: labelWeight },
                      ]}
                    >
                      {line}
                    </Text>
                  ))}
                </View>
              </View>
            );
          })}
        </View>
        </GestureDetector>

        <Pressable
          onPress={goNext}
          disabled={page === totalPages - 1}
          hitSlop={8}
          style={chevronBoxStyle}
        >
          <ChevronRight
            size={20}
            color={page === totalPages - 1 ? palette.textDim : palette.accent}
            strokeWidth={2.5}
          />
        </Pressable>
      </View>
    </View>
  );
}

interface SegmentedProps<T extends string> {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  palette: ReturnType<typeof useTheme>['palette'];
  stretch?: boolean;
}

function Segmented<T extends string>({ options, value, onChange, palette, stretch }: SegmentedProps<T>) {
  return (
    <View
      style={[
        segStyles.wrap,
        { backgroundColor: palette.accentLight },
        stretch && segStyles.stretch,
      ]}
    >
      {options.map((opt) => {
        const active = opt.id === value;
        return (
          <Pressable
            key={opt.id}
            onPress={() => onChange(opt.id)}
            style={[
              segStyles.btn,
              stretch && segStyles.btnStretch,
              active && { backgroundColor: palette.accent },
            ]}
          >
            <Text
              style={[
                segStyles.text,
                { color: active ? '#FFFFFF' : palette.accent },
              ]}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const segStyles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
    gap: 2,
  },
  stretch: {
    alignSelf: 'stretch',
  },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  btnStretch: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
  },
  text: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
});

interface FontPickerModalProps<T extends string> {
  visible: boolean;
  title: string;
  options: readonly { id: T; label: string; fontFamily: string | null }[];
  currentId: T;
  onSelect: (id: T) => void;
  onClose: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
  isArabic?: boolean;
}

function FontPickerModal<T extends string>({
  visible,
  title,
  options,
  currentId,
  onSelect,
  onClose,
  palette,
  isArabic,
}: FontPickerModalProps<T>) {
  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[pickerStyles.backdrop, { backgroundColor: palette.scheme === 'dark' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.4)' }]} onPress={onClose}>
        <Pressable
          style={[
            pickerStyles.card,
            { backgroundColor: cardBg, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
          ]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              pickerStyles.cardBorderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <View style={{ height: 3, width: 40, backgroundColor: palette.accent, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
          <Text style={[pickerStyles.title, { color: palette.textDark }]}>
            {title}
          </Text>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {options.map((opt, i) => {
              const active = opt.id === currentId;
              const previewText = isArabic ? 'ذكر الله' : 'Dhikrullah';
              return (
                <Pressable
                  key={opt.id}
                  onPress={() => onSelect(opt.id)}
                  style={({ pressed }) => [
                    pickerStyles.row,
                    active && { backgroundColor: palette.accentLight, borderRadius: 8 },
                    i !== options.length - 1 && {
                      borderBottomColor: palette.glassBorder,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text
                    style={[
                      pickerStyles.rowLabel,
                      {
                        color: palette.textDark,
                        fontWeight: active ? '700' : '500',
                        fontFamily: opt.fontFamily ?? undefined,
                      },
                    ]}
                  >
                    {previewText}
                  </Text>
                  <View style={{ flex: 1 }} />
                  <Text
                    style={[
                      {
                        color: palette.textMid,
                        fontSize: 13,
                        fontWeight: active ? '700' : '500',
                      },
                    ]}
                  >
                    {opt.label}
                  </Text>
                  {active ? (
                    <Check size={18} color={palette.accent} strokeWidth={2.5} style={{ marginLeft: 8 }} />
                  ) : null}
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface SoundPickerModalProps {
  visible: boolean;
  currentId: NotifSoundId;
  onSelect: (id: NotifSoundId) => void;
  onClose: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function SoundPickerModal({ visible, currentId, onSelect, onClose, palette }: SoundPickerModalProps) {
  const previewPlayer = useAudioPlayer(null);

  useEffect(() => {
    if (!visible) {
      try {
        previewPlayer.pause();
      } catch {
        // ignore
      }
    }
  }, [visible, previewPlayer]);

  const playPreview = (id: NotifSoundId) => {
    const asset = NOTIF_SOUND_ASSETS[id];
    if (!asset) return;
    try {
      previewPlayer.replace(asset);
      previewPlayer.seekTo(0);
      previewPlayer.play();
    } catch (e) {
      if (__DEV__) console.warn('[SoundPicker] preview failed', e);
    }
  };

  const SOUND_IDS: NotifSoundId[] = ['default', 'chime', 'bell', 'glow', 'tap', 'breeze', 'ring', 'dot', 'none'];
  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[pickerStyles.backdrop, { backgroundColor: palette.scheme === 'dark' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.4)' }]} onPress={onClose}>
        <Pressable
          style={[
            pickerStyles.card,
            { backgroundColor: cardBg, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
          ]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              pickerStyles.cardBorderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <View style={{ height: 3, width: 40, backgroundColor: palette.accent, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
          <Text style={[pickerStyles.title, { color: palette.textDark }]}>
            Notification Sound
          </Text>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {SOUND_IDS.map((id, i) => {
              const active = id === currentId;
              const previewable = id !== 'default' && id !== 'none';
              return (
                <Pressable
                  key={id}
                  onPress={() => onSelect(id)}
                  style={({ pressed }) => [
                    pickerStyles.row,
                    active && { backgroundColor: palette.accentLight, borderRadius: 8 },
                    i !== SOUND_IDS.length - 1 && {
                      borderBottomColor: palette.glassBorder,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { opacity: 0.6 },
                  ]}
                >
                  <Text style={[pickerStyles.rowLabel, { color: palette.textDark, fontWeight: active ? '700' : '500' }]}>
                    {NOTIF_SOUND_LABELS[id]}
                  </Text>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    {previewable && (
                      <Pressable onPress={() => playPreview(id)} hitSlop={8}>
                        <Play size={16} color={palette.accent} strokeWidth={2} />
                      </Pressable>
                    )}
                    {active && <Check size={18} color={palette.accent} strokeWidth={2.5} />}
                  </View>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

interface MethodPickerProps {
  visible: boolean;
  currentId: MethodId;
  onSelect: (id: MethodId) => void;
  onClose: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function MethodPicker({ visible, currentId, onSelect, onClose, palette }: MethodPickerProps) {
  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[pickerStyles.backdrop, { backgroundColor: palette.scheme === 'dark' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.4)' }]} onPress={onClose}>
        <Pressable
          style={[
            pickerStyles.card,
            { backgroundColor: cardBg, borderRadius: 18, shadowColor: '#000', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 20, elevation: 10 },
          ]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              pickerStyles.cardBorderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <View style={{ height: 3, width: 40, backgroundColor: palette.accent, borderRadius: 2, alignSelf: 'center', marginBottom: 12 }} />
          <Text style={[pickerStyles.title, { color: palette.textDark }]}>
            Calculation method
          </Text>
          <ScrollView style={{ maxHeight: 360 }} showsVerticalScrollIndicator={false}>
            {METHODS.map((m, i) => {
              const active = m.id === currentId;
              return (
                <Pressable
                  key={m.id}
                  onPress={() => onSelect(m.id)}
                  style={({ pressed }) => [
                    pickerStyles.row,
                    active && { backgroundColor: palette.accentLight, borderRadius: 8 },
                    i !== METHODS.length - 1 && {
                      borderBottomColor: palette.glassBorder,
                      borderBottomWidth: StyleSheet.hairlineWidth,
                    },
                    pressed && { opacity: 0.6 },
                    { alignItems: 'flex-start', flexDirection: 'column', gap: 2 },
                  ]}
                >
                  <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                    <Text
                      style={[
                        pickerStyles.rowLabel,
                        { color: palette.textDark, fontWeight: active ? '700' : '500' },
                      ]}
                    >
                      {m.label}
                    </Text>
                    {active ? (
                      <Check size={18} color={palette.accent} strokeWidth={2.5} />
                    ) : null}
                  </View>
                  <Text style={{ fontSize: 12, color: palette.textMid, lineHeight: 17 }}>
                    {m.description}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const pickerStyles = StyleSheet.create({
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
    borderRadius: 18,
    paddingHorizontal: 18,
    paddingTop: 20,
    paddingBottom: 12,
  },
  cardBorderOverlay: {
    borderWidth: 1,
    borderRadius: 18,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    paddingHorizontal: 4,
  },
  rowLabel: {
    fontSize: 14,
    flex: 1,
  },
});

interface LocationPickerProps {
  visible: boolean;
  onUseDevice: () => void;
  onSearch: () => void;
  onClose: () => void;
  palette: ReturnType<typeof useTheme>['palette'];
}

function LocationPickerModal({
  visible,
  onUseDevice,
  onSearch,
  onClose,
  palette,
}: LocationPickerProps) {
  const cardBg = palette.scheme === 'dark' ? palette.bgMid : '#FFFFFF';
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[pickerStyles.backdrop, { backgroundColor: palette.scheme === 'dark' ? 'rgba(0,0,0,0.68)' : 'rgba(0,0,0,0.4)' }]} onPress={onClose}>
        <Pressable
          style={[
            pickerStyles.card,
            { backgroundColor: cardBg },
          ]}
          onPress={() => {}}
        >
          <View
            pointerEvents="none"
            style={[
              StyleSheet.absoluteFill,
              pickerStyles.cardBorderOverlay,
              { borderColor: palette.glassBorder },
            ]}
          />
          <Text style={[pickerStyles.title, { color: palette.textDark }]}>
            Set location
          </Text>

          <Pressable
            onPress={onUseDevice}
            style={({ pressed }) => [
              locStyles.action,
              { backgroundColor: palette.accent },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={locStyles.actionText}>Use device location</Text>
          </Pressable>

          <Pressable
            onPress={onSearch}
            style={({ pressed }) => [
              locStyles.actionSecondary,
              { borderColor: palette.accent },
              pressed && { opacity: 0.7 },
            ]}
          >
            <Text style={[locStyles.actionTextSecondary, { color: palette.accent }]}>
              Search for a city
            </Text>
          </Pressable>
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const locStyles = StyleSheet.create({
  action: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
    marginTop: 4,
  },
  actionText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  actionSecondary: {
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1.5,
    marginBottom: 4,
  },
  actionTextSecondary: {
    fontWeight: '700',
    fontSize: 14,
  },
});

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
  scroll: {
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  trailingText: {
    fontSize: 13,
    fontWeight: '600',
  },
  themeBlock: {
    paddingHorizontal: 6,
    paddingTop: 4,
    paddingBottom: 10,
  },
  swatchRow: {
    gap: 14,
    paddingHorizontal: 4,
  },
  swatchCol: {
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    paddingHorizontal: 2,
  },
  swatchLabelWrap: {
    marginTop: 6,
    width: '100%',
    height: 28,
    justifyContent: 'flex-start',
  },
  swatchLabel: {
    fontSize: 11,
    lineHeight: 14,
    textAlign: 'center',
    width: '100%',
  },
  notifNote: {
    marginHorizontal: 16,
    marginBottom: 8,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
  },
  notifNoteText: {
    fontSize: 12,
    lineHeight: 18,
  },
  rowTrailing: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  chevronBtn: {
    padding: 2,
  },
  timeChip: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: StyleSheet.hairlineWidth,
  },
  timeChipText: {
    fontSize: 13,
    fontWeight: '600',
    fontVariant: ['tabular-nums'],
  },
  offsetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  offsetRowLast: {
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 14,
  },
  offsetLabel: {
    fontSize: 12,
    fontWeight: '500',
  },
});

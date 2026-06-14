import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { getMeta, setMeta } from '@/db/queries';
import { setHapticPrefs } from '@/lib/haptics';
import {
  computeExtendedTimes,
  computeTomorrowFajr,
  computeCategoryWindows,
  DEFAULT_METHOD,
  type Madhab,
  type MethodId,
  type TimeWindow,
} from '@/lib/prayer';
import type { LocationData } from '@/lib/location';
import type { CategoryId } from '@/types';
import {
  ARABIC_FONT_IDS,
  ENGLISH_FONT_IDS,
  TEXT_SIZE_IDS,
  type ArabicFontId,
  type EnglishFontId,
  type TextSizeId,
} from '@/lib/fonts';
import type { NotifSoundId } from '@/lib/soundMap';

const KEY_HAPTIC_INDIV = 'prefs.hapticsIndividual';
const KEY_HAPTIC_COMPLETE = 'prefs.hapticsComplete';
const KEY_PRAYER_METHOD = 'prefs.prayerMethod';
const KEY_PRAYER_MADHAB = 'prefs.prayerMadhab';
const KEY_LOCATION = 'prefs.location';
const KEY_LOC_PROMPT_SHOWN = 'prefs.locationPromptShown';
const KEY_WAKING_UP_MINUTES = 'prefs.wakingUpMinutes';
const KEY_BEFORE_BED_MINUTES = 'prefs.beforeBedMinutes';
const KEY_NOTIF_ENABLED = 'prefs.notifEnabled';
const KEY_NOTIF_OFFSET = 'prefs.notifOffset';
const KEY_ARABIC_FONT = 'prefs.arabicFont';
const KEY_ENGLISH_FONT = 'prefs.englishFont';
const KEY_TEXT_SIZE = 'prefs.textSize'; // legacy — used as fallback for the new split keys
const KEY_ARABIC_TEXT_SIZE = 'prefs.arabicTextSize';
const KEY_ENGLISH_TEXT_SIZE = 'prefs.englishTextSize';
const KEY_NOTIF_SOUND = 'prefs.notifSound';
const KEY_ALL_DAY_MINUTES = 'prefs.allDayMinutes';
const KEY_TIMER_VISIBLE = 'prefs.timerVisible';

export type NotifOffset = 0 | 10 | 30 | 60;

export const PRAYER_CATEGORY_IDS: readonly CategoryId[] = [
  'fajr', 'dhuhr', 'asr', 'maghrib', 'isha', 'witr',
];

const DEFAULT_NOTIF_ENABLED: Record<CategoryId, boolean> = {
  all_day: false,
  fajr: false,
  waking_up: false,
  morning: false,
  dhuhr: false,
  asr: false,
  evening: false,
  maghrib: false,
  isha: false,
  witr: false,
  before_bed: false,
};

const DEFAULT_NOTIF_OFFSET: Partial<Record<CategoryId, NotifOffset>> = {
  fajr: 0,
  dhuhr: 0,
  asr: 0,
  maghrib: 0,
  isha: 0,
  witr: 0,
};

interface PrefsContextValue {
  hydrated: boolean;
  hapticsIndividual: boolean;
  hapticsComplete: boolean;
  setHapticsIndividual: (v: boolean) => void;
  setHapticsComplete: (v: boolean) => void;
  prayerMethodId: MethodId;
  setPrayerMethodId: (id: MethodId) => void;
  madhab: Madhab;
  setMadhab: (m: Madhab) => void;
  location: LocationData | null;
  setLocation: (loc: LocationData | null) => void;
  locationPromptShown: boolean;
  markLocationPromptShown: () => void;
  wakingUpMinutes: number;
  setWakingUpMinutes: (m: number) => void;
  beforeBedMinutes: number;
  setBeforeBedMinutes: (m: number) => void;
  notifEnabled: Record<CategoryId, boolean>;
  setNotifEnabled: (id: CategoryId, v: boolean) => void;
  setAllNotifEnabled: (v: boolean) => void;
  notifOffset: Partial<Record<CategoryId, NotifOffset>>;
  setNotifOffset: (id: CategoryId, v: NotifOffset) => void;
  arabicFont: ArabicFontId;
  setArabicFont: (v: ArabicFontId) => void;
  englishFont: EnglishFontId;
  setEnglishFont: (v: EnglishFontId) => void;
  arabicTextSize: TextSizeId;
  setArabicTextSize: (v: TextSizeId) => void;
  englishTextSize: TextSizeId;
  setEnglishTextSize: (v: TextSizeId) => void;
  notifSound: NotifSoundId;
  setNotifSound: (v: NotifSoundId) => void;
  allDayMinutes: number;
  setAllDayMinutes: (m: number) => void;
  timerVisible: boolean;
  setTimerVisible: (v: boolean) => void;
}

const PrefsContext = createContext<PrefsContextValue | null>(null);

export const PrefsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [hydrated, setHydrated] = useState(false);
  const [hapticsIndividual, setHI] = useState(true);
  const [hapticsComplete, setHC] = useState(true);
  const [prayerMethodId, setPM] = useState<MethodId>(DEFAULT_METHOD);
  const [madhab, setMad] = useState<Madhab>('shafi');
  const [location, setLoc] = useState<LocationData | null>(null);
  const [locationPromptShown, setLPS] = useState(false);
  const [wakingUpMinutes, setWUM] = useState(450); // 07:30
  const [beforeBedMinutes, setBBM] = useState(1350); // 22:30
  const [notifEnabled, setNE] = useState<Record<CategoryId, boolean>>(DEFAULT_NOTIF_ENABLED);
  const [notifOffset, setNO] = useState<Partial<Record<CategoryId, NotifOffset>>>(DEFAULT_NOTIF_OFFSET);
  const [arabicFont, setAF] = useState<ArabicFontId>('system');
  const [englishFont, setEF] = useState<EnglishFontId>('system');
  const [arabicTextSize, setATS] = useState<TextSizeId>('md');
  const [englishTextSize, setETS] = useState<TextSizeId>('md');
  const [notifSound, setNS] = useState<NotifSoundId>('default');
  const [allDayMinutes, setADM] = useState(540); // 09:00
  const [timerVisible, setTV] = useState(true);

  useEffect(() => {
    let cancelled = false;
    let attempts = 0;
    const tryHydrate = async () => {
      attempts += 1;
      try {
        const [hi, hc, pm, mad, locStr, lps, wum, bbm, ne, no, af, ef, ts, ats, ets, ns, adm, tv] = await Promise.all([
          getMeta(KEY_HAPTIC_INDIV),
          getMeta(KEY_HAPTIC_COMPLETE),
          getMeta(KEY_PRAYER_METHOD),
          getMeta(KEY_PRAYER_MADHAB),
          getMeta(KEY_LOCATION),
          getMeta(KEY_LOC_PROMPT_SHOWN),
          getMeta(KEY_WAKING_UP_MINUTES),
          getMeta(KEY_BEFORE_BED_MINUTES),
          getMeta(KEY_NOTIF_ENABLED),
          getMeta(KEY_NOTIF_OFFSET),
          getMeta(KEY_ARABIC_FONT),
          getMeta(KEY_ENGLISH_FONT),
          getMeta(KEY_TEXT_SIZE),
          getMeta(KEY_ARABIC_TEXT_SIZE),
          getMeta(KEY_ENGLISH_TEXT_SIZE),
          getMeta(KEY_NOTIF_SOUND),
          getMeta(KEY_ALL_DAY_MINUTES),
          getMeta(KEY_TIMER_VISIBLE),
        ]);
        if (cancelled) return;
        const hiVal = hi !== '0';
        const hcVal = hc !== '0';
        setHI(hiVal);
        setHC(hcVal);
        setHapticPrefs({ individual: hiVal, complete: hcVal });
        if (pm) setPM(pm as MethodId);
        if (mad === 'shafi' || mad === 'hanafi') setMad(mad);
        if (locStr) {
          try {
            const parsed = JSON.parse(locStr) as LocationData;
            if (typeof parsed.lat === 'number' && typeof parsed.lon === 'number') {
              setLoc(parsed);
            }
          } catch {}
        }
        if (lps === '1') setLPS(true);
        if (wum) {
          const n = parseInt(wum, 10);
          if (!isNaN(n)) setWUM(n);
        }
        if (bbm) {
          const n = parseInt(bbm, 10);
          if (!isNaN(n)) setBBM(n);
        }
        if (ne) {
          try { setNE({ ...DEFAULT_NOTIF_ENABLED, ...JSON.parse(ne) }); } catch {}
        }
        if (no) {
          try { setNO({ ...DEFAULT_NOTIF_OFFSET, ...JSON.parse(no) }); } catch {}
        }
        if (af && ARABIC_FONT_IDS.has(af as ArabicFontId)) setAF(af as ArabicFontId);
        if (ef && ENGLISH_FONT_IDS.has(ef as EnglishFontId)) setEF(ef as EnglishFontId);
        // Use new split keys when present, otherwise fall back to the legacy
        // shared `textSize` value so existing installs keep their previous size.
        const legacy = ts && TEXT_SIZE_IDS.has(ts as TextSizeId) ? (ts as TextSizeId) : null;
        if (ats && TEXT_SIZE_IDS.has(ats as TextSizeId)) {
          setATS(ats as TextSizeId);
        } else if (legacy) {
          setATS(legacy);
        }
        if (ets && TEXT_SIZE_IDS.has(ets as TextSizeId)) {
          setETS(ets as TextSizeId);
        } else if (legacy) {
          setETS(legacy);
        }
        // Validate the persisted notif sound against the available set; reset
        // anything unknown (incl. removed legacy ids) back to the default.
        if (
          ns === 'chime' ||
          ns === 'bell' ||
          ns === 'glow' ||
          ns === 'tap' ||
          ns === 'breeze' ||
          ns === 'ring' ||
          ns === 'dot' ||
          ns === 'none'
        ) {
          setNS(ns);
        } else if (ns && ns !== 'default') {
          setNS('default');
          setMeta(KEY_NOTIF_SOUND, 'default').catch(() => {});
        }
        if (adm) {
          const n = parseInt(adm, 10);
          if (!isNaN(n)) setADM(n);
        }
        // timerVisible: default true; only flip when explicitly stored as '0'.
        if (tv === '0') setTV(false);
        else if (tv === '1') setTV(true);
        setHydrated(true);
      } catch {
        if (cancelled || attempts >= 20) {
          if (!cancelled) setHydrated(true);
          return;
        }
        setTimeout(tryHydrate, 200);
      }
    };
    tryHydrate();
    return () => {
      cancelled = true;
    };
  }, []);

  const setHapticsIndividual = useCallback((v: boolean) => {
    setHI(v);
    setHapticPrefs({ individual: v });
    setMeta(KEY_HAPTIC_INDIV, v ? '1' : '0').catch(() => {});
  }, []);

  const setHapticsComplete = useCallback((v: boolean) => {
    setHC(v);
    setHapticPrefs({ complete: v });
    setMeta(KEY_HAPTIC_COMPLETE, v ? '1' : '0').catch(() => {});
  }, []);

  const setPrayerMethodId = useCallback((id: MethodId) => {
    setPM(id);
    setMeta(KEY_PRAYER_METHOD, id).catch(() => {});
  }, []);

  const setMadhab = useCallback((m: Madhab) => {
    setMad(m);
    setMeta(KEY_PRAYER_MADHAB, m).catch(() => {});
  }, []);

  const setLocation = useCallback((loc: LocationData | null) => {
    setLoc(loc);
    setMeta(KEY_LOCATION, loc ? JSON.stringify(loc) : '').catch(() => {});
  }, []);

  const markLocationPromptShown = useCallback(() => {
    setLPS(true);
    setMeta(KEY_LOC_PROMPT_SHOWN, '1').catch(() => {});
  }, []);

  const setWakingUpMinutes = useCallback((m: number) => {
    setWUM(m);
    setMeta(KEY_WAKING_UP_MINUTES, String(m)).catch(() => {});
  }, []);

  const setBeforeBedMinutes = useCallback((m: number) => {
    setBBM(m);
    setMeta(KEY_BEFORE_BED_MINUTES, String(m)).catch(() => {});
  }, []);

  const setNotifEnabled = useCallback((id: CategoryId, v: boolean) => {
    setNE((prev) => {
      const next = { ...prev, [id]: v };
      setMeta(KEY_NOTIF_ENABLED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setAllNotifEnabled = useCallback((v: boolean) => {
    setNE((prev) => {
      const next = Object.fromEntries(
        Object.keys(prev).map((k) => [k, v]),
      ) as Record<CategoryId, boolean>;
      setMeta(KEY_NOTIF_ENABLED, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setNotifOffset = useCallback((id: CategoryId, v: NotifOffset) => {
    setNO((prev) => {
      const next = { ...prev, [id]: v };
      setMeta(KEY_NOTIF_OFFSET, JSON.stringify(next)).catch(() => {});
      return next;
    });
  }, []);

  const setArabicFont = useCallback((v: ArabicFontId) => {
    setAF(v);
    setMeta(KEY_ARABIC_FONT, v).catch(() => {});
  }, []);

  const setEnglishFont = useCallback((v: EnglishFontId) => {
    setEF(v);
    setMeta(KEY_ENGLISH_FONT, v).catch(() => {});
  }, []);

  const setArabicTextSize = useCallback((v: TextSizeId) => {
    setATS(v);
    setMeta(KEY_ARABIC_TEXT_SIZE, v).catch(() => {});
  }, []);

  const setEnglishTextSize = useCallback((v: TextSizeId) => {
    setETS(v);
    setMeta(KEY_ENGLISH_TEXT_SIZE, v).catch(() => {});
  }, []);

  const setNotifSound = useCallback((v: NotifSoundId) => {
    setNS(v);
    setMeta(KEY_NOTIF_SOUND, v).catch(() => {});
  }, []);

  const setAllDayMinutes = useCallback((m: number) => {
    setADM(m);
    setMeta(KEY_ALL_DAY_MINUTES, String(m)).catch(() => {});
  }, []);

  const setTimerVisible = useCallback((v: boolean) => {
    setTV(v);
    setMeta(KEY_TIMER_VISIBLE, v ? '1' : '0').catch(() => {});
  }, []);

  const value = useMemo<PrefsContextValue>(
    () => ({
      hydrated,
      hapticsIndividual,
      hapticsComplete,
      setHapticsIndividual,
      setHapticsComplete,
      prayerMethodId,
      setPrayerMethodId,
      madhab,
      setMadhab,
      location,
      setLocation,
      locationPromptShown,
      markLocationPromptShown,
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
    }),
    [
      hydrated,
      hapticsIndividual,
      hapticsComplete,
      prayerMethodId,
      madhab,
      location,
      locationPromptShown,
      wakingUpMinutes,
      beforeBedMinutes,
      notifEnabled,
      notifOffset,
      arabicFont,
      englishFont,
      arabicTextSize,
      englishTextSize,
      notifSound,
      setHapticsIndividual,
      setHapticsComplete,
      setPrayerMethodId,
      setMadhab,
      setLocation,
      markLocationPromptShown,
      setWakingUpMinutes,
      setBeforeBedMinutes,
      setNotifEnabled,
      setAllNotifEnabled,
      setNotifOffset,
      setArabicFont,
      setEnglishFont,
      setArabicTextSize,
      setEnglishTextSize,
      setNotifSound,
      allDayMinutes,
      setAllDayMinutes,
      timerVisible,
      setTimerVisible,
    ],
  );

  return <PrefsContext.Provider value={value}>{children}</PrefsContext.Provider>;
};

export const usePrefs = (): PrefsContextValue => {
  const ctx = useContext(PrefsContext);
  if (!ctx) throw new Error('usePrefs must be used inside PrefsProvider');
  return ctx;
};

export const usePrayerTimes = (): Map<CategoryId, Date> | null => {
  const { location, prayerMethodId, madhab } = usePrefs();
  const [dayKey, setDayKey] = useState<string>(() => new Date().toDateString());

  useEffect(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 5, 0);
    const ms = Math.max(1000, next.getTime() - now.getTime());
    const t = setTimeout(() => setDayKey(new Date().toDateString()), ms);
    return () => clearTimeout(t);
  }, [dayKey]);

  return useMemo(() => {
    if (!location) return null;
    const ext = computeExtendedTimes(location, new Date(), prayerMethodId, madhab);
    return new Map<CategoryId, Date>([
      ['fajr', ext.fajr],
      ['dhuhr', ext.dhuhr],
      ['asr', ext.asr],
      ['maghrib', ext.maghrib],
      ['isha', ext.isha],
    ]);
  }, [location, prayerMethodId, madhab, dayKey]);
};

export const useCategoryWindows = (): Partial<Record<CategoryId, TimeWindow>> | null => {
  const { location, prayerMethodId, madhab, wakingUpMinutes, beforeBedMinutes } = usePrefs();
  const [dayKey, setDayKey] = useState<string>(() => new Date().toDateString());

  useEffect(() => {
    const now = new Date();
    const next = new Date(now);
    next.setHours(24, 0, 5, 0);
    const ms = Math.max(1000, next.getTime() - now.getTime());
    const t = setTimeout(() => setDayKey(new Date().toDateString()), ms);
    return () => clearTimeout(t);
  }, [dayKey]);

  return useMemo(() => {
    if (!location) return null;
    const now = new Date();
    const ext = computeExtendedTimes(location, now, prayerMethodId, madhab);
    const tomorrowFajr = computeTomorrowFajr(location, now, prayerMethodId, madhab);
    return computeCategoryWindows(ext, tomorrowFajr, wakingUpMinutes, beforeBedMinutes, now);
  }, [location, prayerMethodId, madhab, wakingUpMinutes, beforeBedMinutes, dayKey]);
};

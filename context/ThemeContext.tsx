import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  DEFAULT_THEME_ID,
  getTheme,
  THEMES,
  type Palette,
  type Theme,
} from '@/constants/themes';
import { getMeta, setMeta } from '@/db/queries';

export type Mode = 'light' | 'dark' | 'system';

export type CombinedThemeItem = { kind: 'regular'; theme: Theme };

interface ThemeContextValue {
  mode: Mode;
  themeId: string;
  palette: Palette;
  themes: Theme[];
  isDark: boolean;
  // Raw light/dark preference based on user setting + system. Use this when a
  // control must reflect the user's chosen mode (e.g. a swatch that previews
  // how a theme would look if picked).
  userIsDark: boolean;
  setMode: (m: Mode) => void;
  setThemeId: (id: string) => void;
  // merged + alphabetised regular themes, with Sage Garden, Khidir Kasbah,
  // Asphalt Azaan and Lapis Luqman pinned to the first four slots and
  // Crimson Dusk, Pearl Hijaz, Slate Gate, Violet Arch pinned to 5-8.
  combinedThemes: CombinedThemeItem[];
}

const PINNED_THEME_IDS: readonly string[] = [
  'sage-garden',
  'khidir-kasbah',
  'asphalt-azaan',
  'lapis-luqman',
  // Slots 5-8: pinned out of alphabetical order.
  'crimson-dusk',
  'pearl-hijaz',
  'slate-gate',
  'violet-arch',
];

// Migrate previously-saved theme ids that have since been renamed so existing
// users keep their selection instead of falling back to the default.
const RENAMED_THEME_IDS: Record<string, string> = {
  'desert-dawn': 'khidir-kasbah',
  'onyx': 'asphalt-azaan',
  'cobalt-sky': 'lapis-luqman',
  'lapis-dome': 'sapphire-dome',
};

const KEY_MODE = 'prefs.themeMode';
const KEY_THEME = 'prefs.themeId';

const ThemeContext = createContext<ThemeContextValue | null>(null);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const system = useColorScheme();
  const [mode, setModeState] = useState<Mode>('system');
  const [themeId, setThemeIdState] = useState<string>(DEFAULT_THEME_ID);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const [m, t] = await Promise.all([
          getMeta(KEY_MODE),
          getMeta(KEY_THEME),
        ]);
        if (cancelled) return;
        if (m === 'light' || m === 'dark' || m === 'system') setModeState(m);
        if (t) {
          const migrated = RENAMED_THEME_IDS[t] ?? t;
          setThemeIdState(migrated);
          if (migrated !== t) setMeta(KEY_THEME, migrated).catch(() => {});
        }
      } catch {
        // db not ready yet on first launch — defaults stay
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setMode = useCallback((m: Mode) => {
    setModeState(m);
    setMeta(KEY_MODE, m).catch(() => {});
  }, []);

  const setThemeId = useCallback((id: string) => {
    setThemeIdState(id);
    setMeta(KEY_THEME, id).catch(() => {});
  }, []);

  const combinedThemes = useMemo<CombinedThemeItem[]>(() => {
    const regular: CombinedThemeItem[] = THEMES.map(t => ({ kind: 'regular', theme: t }));
    const byId = new Map(regular.map(item => [item.theme.id, item]));
    const pinned = PINNED_THEME_IDS
      .map(id => byId.get(id))
      .filter((x): x is CombinedThemeItem => Boolean(x));
    const restRegular = regular
      .filter(item => !PINNED_THEME_IDS.includes(item.theme.id))
      .sort((a, b) => a.theme.name.localeCompare(b.theme.name));
    return [...pinned, ...restRegular];
  }, []);

  const userIsDark = useMemo(
    () => mode === 'dark' || (mode === 'system' && system === 'dark'),
    [mode, system],
  );

  const isDark = userIsDark;

  const palette = useMemo<Palette>(() => {
    const theme = getTheme(themeId);
    return isDark ? theme.dark : theme.light;
  }, [isDark, themeId]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      themeId,
      palette,
      themes: THEMES,
      isDark,
      userIsDark,
      setMode,
      setThemeId,
      combinedThemes,
    }),
    [mode, themeId, palette, isDark, userIsDark, setMode, setThemeId, combinedThemes],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextValue => {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used inside ThemeProvider');
  return ctx;
};
